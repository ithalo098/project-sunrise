/**
 * WhatsGemini Pro - Background Service Worker (Multi-Model Fallback & Ultra-Natural Engine)
 */

// Chave pré-configurada do usuário (ofuscada em base64)
const FALLBACK_API_KEY = typeof atob === "function" 
  ? atob("QVEuQWI4Uk42SjRibkdjSVY0X3FQWmdYTVNWNWcyUjNsMlFndWxPYkRyaDlqWlJvbzQ0LWc=") 
  : "";

const NATURAL_HUMAN_PROMPT = `Você é o próprio Íthalo digitando no WhatsApp pessoal pelo celular.
REGRAS OBRIGATÓRIAS PARA SOAR 100% HUMANO E NUNCA PARECER IA:

1. PROIBIÇÕES CRÍTICAS (ISSO ENTREGA NA HORA QUE É UM ROBÔ):
- NUNCA use frases de telemarketing ou suporte como: "Como posso te ajudar?", "Como posso ajudar você hoje?", "Em que posso ser útil?", "Estou à disposição", "Fico no aguardo". Jamais fale isso!
- NUNCA responda textos gigantes. Ninguém escreve redação no WhatsApp.
- NUNCA diga que é assistente ou IA. Você É o Íthalo.

2. COMO O ÍTHALO REALMENTE DIGITA NO WHATSAPP:
- Respostas super curtas, rápidas e descontraídas (1 linha só, como qualquer brasileiro digita no celular).
- Se alguém falar "oi", "e aí", "oi ithalo": responda apenas: "Opa, e aí! Tudo certo?", "Opa, tudo certo? Fala aí", "E aí, beleza?", ou "Oi! Tudo bem?".
- Use gírias e palavras normais do dia a dia: "tô", "pra", "beleza", "tranquilo", "já te respondo", "opa".
- Se for áudio recebido: "Opa, tô sem fone agora e não consigo ouvir seu áudio, me conta por texto rapidinho".
- Se for trabalho ou compromisso: "Tô na correria aqui agora, mas já te dou um retorno certinho!".
- Emojis no máximo 1 simples (ex: 👍, 😅, 🙌) ou nenhum.`;

const DEFAULT_CONFIG = {
  enabled: true,
  apiKey: FALLBACK_API_KEY,
  model: "gemini-3.1-flash-lite-preview",
  systemPrompt: NATURAL_HUMAN_PROMPT,
  userName: "Íthalo",
  myTone: "casual",
  customBio: "Trabalho com tecnologia e projetos. Respondo com agilidade.",
  responseMode: "all",
  autoScanHandsFree: true,
  ignoreGroups: true,
  audioMode: true,
  whitelist: [],
  blacklist: [], // Persistente: contatos que o usuário escolheu NÃO responder
  fastMode: true,
  minDelaySeconds: 1,
  maxDelaySeconds: 2,
  contextDepth: 15,
  repliesCount: 0,
  activityLogs: []
};

// Modelos com cota ativa para fallback automático contra erro 429
const FALLBACK_MODELS = [
  "gemini-3.1-flash-lite-preview",
  "gemini-flash-lite-latest",
  "gemini-3.5-flash-lite",
  "gemini-3-flash-preview"
];

chrome.runtime.onInstalled.addListener(async () => {
  await ensureDefaults();
});

chrome.runtime.onStartup.addListener(async () => {
  await ensureDefaults();
});

async function ensureDefaults() {
  const stored = await chrome.storage.local.get(null);
  const toSet = {};
  for (const [key, value] of Object.entries(DEFAULT_CONFIG)) {
    if (stored[key] === undefined || (key === "apiKey" && !stored[key])) {
      toSet[key] = value;
    }
  }
  if (!stored.model || stored.model === "gemini-3-flash-preview" || stored.model === "gemini-1.5-pro") {
    toSet.model = "gemini-3.1-flash-lite-preview";
  }
  if (Object.keys(toSet).length > 0) {
    await chrome.storage.local.set(toSet);
  }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "GENERATE_REPLY") {
    handleGenerateReply(request.data)
      .then(res => sendResponse(res))
      .catch(err => {
        console.error("[WhatsGemini Background Error]", err);
        sendResponse({ success: false, error: err.message });
      });
    return true;
  }

  if (request.action === "TEST_API_KEY") {
    testGeminiApiKey(request.apiKey || FALLBACK_API_KEY)
      .then(res => sendResponse(res))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (request.action === "TOGGLE_ENABLED") {
    chrome.storage.local.get(["enabled"], (res) => {
      const newState = res.enabled === false ? true : false;
      chrome.storage.local.set({ enabled: newState }, () => {
        sendResponse({ success: true, enabled: newState });
      });
    });
    return true;
  }

  if (request.action === "TOGGLE_BLOCK_CONTACT") {
    handleToggleBlockContact(request.contactName).then(res => sendResponse(res));
    return true;
  }

  if (request.action === "GET_STATUS") {
    chrome.storage.local.get(null, (config) => {
      sendResponse({
        success: true,
        enabled: config.enabled !== false,
        hasKey: !!(config.apiKey || FALLBACK_API_KEY),
        model: config.model || "gemini-3.1-flash-lite-preview",
        responseMode: config.responseMode || "all",
        blacklist: config.blacklist || [],
        repliesCount: config.repliesCount || 0
      });
    });
    return true;
  }
});

async function handleGenerateReply({ contactName, messageHistory, lastMessage }) {
  const config = await chrome.storage.local.get(null);

  if (config.enabled === false) {
    return { success: false, error: "Auto-resposta está pausada na extensão." };
  }

  const activeApiKey = config.apiKey && config.apiKey.trim() !== "" ? config.apiKey.trim() : FALLBACK_API_KEY;

  if (!activeApiKey) {
    return { success: false, error: "Chave de API do Gemini não configurada." };
  }

  const cleanName = (contactName || "").toLowerCase().trim();

  // 1. Verificação permanente de Blacklist
  const isBlacklisted = (config.blacklist || []).some(item => 
    item && (cleanName.includes(item.toLowerCase().trim()) || item.toLowerCase().trim().includes(cleanName))
  );
  if (isBlacklisted) {
    return { success: false, ignored: true, reason: `Contato "${contactName}" está na sua lista de pessoas bloqueadas.` };
  }

  // 2. Verificação de Whitelist
  if (config.responseMode === "whitelist") {
    const isWhitelisted = (config.whitelist || []).some(item => cleanName.includes(item.toLowerCase().trim()));
    if (!isWhitelisted) {
      return { success: false, ignored: true, reason: `Modo Foco ativo: "${contactName}" não está na lista de foco.` };
    }
  }

  let fullSystemPrompt = (config.systemPrompt || NATURAL_HUMAN_PROMPT) + "\n\n";
  const user = config.userName || "Íthalo";
  fullSystemPrompt += `Seu nome é: ${user}.\n`;
  if (config.customBio) {
    fullSystemPrompt += `Sobre mim: ${config.customBio}\n`;
  }

  const contents = [];
  const depth = config.contextDepth || 10;
  const historySlice = (messageHistory || []).slice(-depth);

  if (historySlice.length > 0) {
    historySlice.forEach(msg => {
      contents.push({
        role: msg.fromMe ? "model" : "user",
        parts: [{ text: msg.text }]
      });
    });
  } else {
    contents.push({ role: "user", parts: [{ text: lastMessage || "Oi" }] });
  }

  if (contents.length > 0 && contents[contents.length - 1].role === "model") {
    contents.push({ role: "user", parts: [{ text: lastMessage || "Oi" }] });
  }

  const payload = {
    system_instruction: { parts: [{ text: fullSystemPrompt }] },
    contents: contents,
    generationConfig: {
      temperature: 0.85,
      maxOutputTokens: 150,
      thinkingConfig: { thinkingBudget: 50 }
    }
  };

  // MULTI-MODEL FALLBACK
  let replyText = "";
  let lastErrorMsg = "";

  for (const modelCandidate of FALLBACK_MODELS) {
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelCandidate}:generateContent?key=${activeApiKey}`;
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const data = await response.json();
        replyText = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
        if (replyText) {
          console.log(`[WhatsGemini] Resposta gerada via ${modelCandidate} para "${contactName}"`);
          break;
        }
      } else {
        const errJson = await response.json().catch(() => ({}));
        lastErrorMsg = errJson.error?.message || `HTTP ${response.status}`;
        console.warn(`[WhatsGemini] Modelo ${modelCandidate} falhou (${response.status}). Tentando próximo fallback...`);
      }
    } catch (err: any) {
      lastErrorMsg = err.message;
    }
  }

  if (!replyText) {
    throw new Error(lastErrorMsg || "Nenhum modelo disponível para gerar resposta no momento.");
  }

  replyText = replyText
    .replace(/Como posso (te|lhe) ajudar( hoje)?\??/gi, "")
    .replace(/Em que posso (ser útil|ajudar)\??/gi, "")
    .replace(/Estou (à|a) disposição\.?/gi, "")
    .trim();

  if (!replyText) {
    replyText = "Opa, tudo certo? Fala aí!";
  }

  const newCount = (config.repliesCount || 0) + 1;
  const newLog = {
    id: Date.now(),
    timestamp: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
    contactName: contactName || "Contato",
    incoming: lastMessage || "",
    reply: replyText
  };

  const updatedLogs = [newLog, ...(config.activityLogs || [])].slice(0, 50);

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

async function handleToggleBlockContact(contactName) {
  const { blacklist = [] } = await chrome.storage.local.get(["blacklist"]);
  const clean = contactName.trim();
  const index = blacklist.indexOf(clean);
  let isBlocked = false;

  if (index > -1) {
    blacklist.splice(index, 1);
  } else {
    blacklist.push(clean);
    isBlocked = true;
  }

  await chrome.storage.local.set({ blacklist });
  console.log(`[WhatsGemini] Blacklist salva permanentemente:`, blacklist);
  return { success: true, isBlocked, blacklist };
}

async function testGeminiApiKey(apiKey) {
  const activeKey = apiKey && apiKey.trim() !== "" ? apiKey.trim() : FALLBACK_API_KEY;

  for (const model of FALLBACK_MODELS) {
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${activeKey}`;
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: "oi" }] }],
          generationConfig: { maxOutputTokens: 20 }
        })
      });

      if (res.ok) {
        return { success: true, message: `Conectado com sucesso via ${model}!` };
      }
    } catch (e) {}
  }

  return { success: false, error: "Falha na conexão com a API do Gemini." };
}
