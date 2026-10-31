/**
 * WhatsGemini Pro - Background Service Worker
 * Gerencia a comunicação com a API do Google Gemini, fila de mensagens e persistência.
 */

const DEFAULT_SYSTEM_PROMPT = `Você é um assistente pessoal inteligente respondendo mensagens no WhatsApp em meu nome.
Diretrizes:
- Seja sempre educado, amigável, direto ao ponto e natural (use português do Brasil).
- Use linguagem informal e emojis com moderação (como uma pessoa real conversando).
- Mantenha as respostas relativamente curtas e adequadas para o WhatsApp (1 a 3 frases na maioria das vezes).
- Se perguntarem sobre compromissos específicos, preços não definidos ou assuntos urgentes que você não sabe, responda de forma prestativa dizendo que eu vi a mensagem e já vou responder pessoalmente assim que puder.
- Nunca diga que você é um robô de spam. Apenas converse com naturalidade.`;

const DEFAULT_CONFIG = {
  enabled: true,
  apiKey: "",
  model: "gemini-3-flash-preview",
  systemPrompt: DEFAULT_SYSTEM_PROMPT,
  ignoreGroups: true,
  autoScanUnread: true,
  minDelaySeconds: 3,
  maxDelaySeconds: 6,
  blacklist: [],
  repliesCount: 0,
  activityLogs: []
};

// Inicializa configurações padrão caso não existam
chrome.runtime.onInstalled.addListener(async () => {
  const stored = await chrome.storage.local.get(null);
  const toSet = {};
  for (const [key, value] of Object.entries(DEFAULT_CONFIG)) {
    if (stored[key] === undefined) {
      toSet[key] = value;
    }
  }
  if (Object.keys(toSet).length > 0) {
    await chrome.storage.local.set(toSet);
  }
  console.log("[WhatsGemini] Background Service Worker inicializado com sucesso.");
});

// Listener para mensagens de Content Script e Popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "GENERATE_REPLY") {
    handleGenerateReply(request.data)
      .then(result => sendResponse(result))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true; // resposta assíncrona
  }

  if (request.action === "TEST_API_KEY") {
    testGeminiApiKey(request.apiKey, request.model)
      .then(result => sendResponse(result))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (request.action === "GET_STATS") {
    chrome.storage.local.get(["repliesCount", "activityLogs", "enabled"], (res) => {
      sendResponse({ success: true, data: res });
    });
    return true;
  }

  if (request.action === "TOGGLE_ENABLED") {
    chrome.storage.local.get(["enabled"], (res) => {
      const newState = !res.enabled;
      chrome.storage.local.set({ enabled: newState }, () => {
        sendResponse({ success: true, enabled: newState });
      });
    });
    return true;
  }
});

/**
 * Chama a API do Google Gemini para gerar a resposta
 */
async function handleGenerateReply({ contactName, messageHistory, lastMessage }) {
  const config = await chrome.storage.local.get([
    "enabled",
    "apiKey",
    "model",
    "systemPrompt",
    "blacklist",
    "repliesCount",
    "activityLogs"
  ]);

  if (!config.enabled) {
    return { success: false, error: "Auto-resposta está desativada no momento." };
  }

  if (!config.apiKey || config.apiKey.trim() === "") {
    return { success: false, error: "Chave de API do Gemini não configurada. Abra a extensão e insira sua chave." };
  }

  // Verifica se o contato está na lista de bloqueados
  if (config.blacklist && Array.isArray(config.blacklist)) {
    const isBlocked = config.blacklist.some(item => 
      contactName.toLowerCase().includes(item.toLowerCase().trim())
    );
    if (isBlocked) {
      return { success: false, ignored: true, reason: "Contato na lista de bloqueados (blacklist)." };
    }
  }

  const model = config.model || "gemini-1.5-pro";
  const systemPrompt = config.systemPrompt || DEFAULT_SYSTEM_PROMPT;

  // Monta histórico de mensagens para dar contexto à IA
  const contents = [];

  if (messageHistory && Array.isArray(messageHistory) && messageHistory.length > 0) {
    messageHistory.forEach(msg => {
      contents.push({
        role: msg.fromMe ? "model" : "user",
        parts: [{ text: msg.text }]
      });
    });
  } else {
    contents.push({
      role: "user",
      parts: [{ text: lastMessage }]
    });
  }

  const payload = {
    system_instruction: {
      parts: [{ text: systemPrompt }]
    },
    contents: contents,
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 300
    }
  };

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${config.apiKey.trim()}`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorJson = await response.json().catch(() => ({}));
    const errorMsg = errorJson.error?.message || `Erro HTTP ${response.status} na API do Gemini.`;
    throw new Error(errorMsg);
  }

  const data = await response.json();
  const replyText = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

  if (!replyText) {
    throw new Error("Nenhum texto retornado pelo modelo Gemini.");
  }

  // Atualiza contador e logs
  const newCount = (config.repliesCount || 0) + 1;
  const newLog = {
    id: Date.now(),
    timestamp: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
    contactName: contactName || "Contato",
    incoming: lastMessage || "",
    reply: replyText
  };

  const currentLogs = config.activityLogs || [];
  const updatedLogs = [newLog, ...currentLogs].slice(0, 50); // Mantém os 50 mais recentes

  await chrome.storage.local.set({
    repliesCount: newCount,
    activityLogs: updatedLogs
  });

  return {
    success: true,
    reply: replyText,
    stats: { repliesCount: newCount }
  };
}

/**
 * Valida a chave de API testando uma chamada simples
 */
async function testGeminiApiKey(apiKey, model = "gemini-1.5-pro") {
  if (!apiKey || apiKey.trim() === "") {
    return { success: false, error: "Insira uma chave de API válida." };
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey.trim()}`;
  const payload = {
    contents: [{ role: "user", parts: [{ text: "Responda apenas 'OK' em uma palavra." }] }]
  };

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorJson = await response.json().catch(() => ({}));
    return {
      success: false,
      error: errorJson.error?.message || `Falha na autenticação (Código HTTP ${response.status}). Verifique a chave.`
    };
  }

  return { success: true, message: "Chave Gemini Pro validada com sucesso!" };
}

