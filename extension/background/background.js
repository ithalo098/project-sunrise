/**
 * WhatsGemini Pro - Background Service Worker (Autonomous Hands-Free Engine)
 * Gerencia a comunicação com a API do Google Gemini, persistência, logs e controle de filtros.
 */

// Chave pré-configurada do usuário (ofuscada em base64 para validação contínua)
const FALLBACK_API_KEY = typeof atob === "function" 
  ? atob("QVEuQWI4Uk42SjRibkdjSVY0X3FQWmdYTVNWNWcyUjNsMlFndWxPYkRyaDlqWlJvbzQ0LWc=") 
  : "";

const DEFAULT_PERSONA_PROMPT = `Você é o próprio Íthalo respondendo mensagens no WhatsApp pessoal.
Diretrizes fundamentais para respostas DE ALTÍSSIMA QUALIDADE:
- Responda SEMPRE na PRIMEIRA PESSOA ('eu', 'meu', 'comigo'), exatamente como o Íthalo.
- Estilo: natural, inteligente, simpático, educado e descontraído, com o português impecável do Brasil (gírias leves de WhatsApp, pontuação agradável, emojis com moderação).
- Qualidade da resposta: leia com extrema atenção o que a pessoa falou ou perguntou. Seja prestativo, claro e objetivo. Respostas de 1 a 3 frases muito bem elaboradas.
- NUNCA diga 'sou uma inteligência artificial', 'sou um assistente' ou 'o Íthalo não está disponível'. Você É o Íthalo em pessoa.
- Se a mensagem for uma saudação ('oi', 'olá', 'tudo bem?'): responda de forma calorosa e atenciosa (ex: 'Opa, fala aí! Tudo certo por aí? Como posso te ajudar hoje?').
- Se for uma mensagem de voz/áudio ('[Mensagem de voz / Áudio]'): responda com simpatia dizendo que está sem fone ou ocupado agora e não consegue ouvir o áudio, e peça para mandar em texto rapidinho (ex: 'Opa! Tô sem fone agora e não consigo ouvir seu áudio, o que você falou? Me manda em texto rapidinho! 😊').
- Se perguntarem sobre compromissos, orçamentos, negócios ou algo urgente: responda com presteza e naturalidade (ex: 'Opa, tô finalizando uma demanda aqui agora, mas já te dou um retorno completo assim que der!').`;

const DEFAULT_CONFIG = {
  enabled: true,
  apiKey: FALLBACK_API_KEY,
  model: "gemini-3-flash-preview",
  systemPrompt: DEFAULT_PERSONA_PROMPT,
  userName: "Íthalo",
  myTone: "casual",
  customBio: "Trabalho com tecnologia e projetos. Respondo com agilidade.",
  responseMode: "all", // "all", "whitelist", "active_only"
  autoScanHandsFree: true, // Varredura 100% autônoma mãos-livres
  ignoreGroups: true, // Ignorar grupos sempre (apenas pessoas)
  audioMode: true, // Reconhecer áudios e interagir
  whitelist: [],
  blacklist: [], // Pessoas que o usuário escolheu NÃO responder
  fastMode: true,
  allowSelfTest: true,
  minDelaySeconds: 1,
  maxDelaySeconds: 2,
  contextDepth: 15,
  repliesCount: 0,
  activityLogs: []
};

// Inicializa configurações na instalação ou inicialização
chrome.runtime.onInstalled.addListener(async () => {
  await ensureDefaults();
  console.log("[WhatsGemini Pro] Background Service Worker inicializado com sucesso.");
});

chrome.runtime.onStartup.addListener(async () => {
  await ensureDefaults();
});

async function ensureDefaults() {
  const stored = await chrome.storage.local.get(null);
  const toSet = {};
  for (const [key, value] of Object.entries(DEFAULT_CONFIG)) {
    if (stored[key] === undefined || stored[key] === "" || (key === "apiKey" && !stored[key])) {
      toSet[key] = value;
    }
  }
  if (Object.keys(toSet).length > 0) {
    await chrome.storage.local.set(toSet);
  }
}

// Mensagens vindas do Content Script e Popup
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
    testGeminiApiKey(request.apiKey || FALLBACK_API_KEY, request.model)
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

  if (request.action === "TOGGLE_FOCUS_CONTACT") {
    handleToggleFocusContact(request.contactName).then(res => sendResponse(res));
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
        model: config.model || "gemini-3-flash-preview",
        responseMode: config.responseMode || "all",
        fastMode: config.fastMode !== false,
        autoScanHandsFree: config.autoScanHandsFree !== false,
        ignoreGroups: config.ignoreGroups !== false,
        blacklist: config.blacklist || [],
        repliesCount: config.repliesCount || 0
      });
    });
    return true;
  }
});

/**
 * Gera a resposta do Íthalo chamando a API do Google Gemini
 */
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

  // 1. Verificação de Blacklist (Pessoas que o usuário escolheu NÃO responder)
  const isBlacklisted = (config.blacklist || []).some(item => cleanName.includes(item.toLowerCase().trim()));
  if (isBlacklisted) {
    return { success: false, ignored: true, reason: `Contato "${contactName}" está na sua lista de pessoas para não responder.` };
  }

  // 2. Verificação de Whitelist (Modo Foco)
  if (config.responseMode === "whitelist") {
    const isWhitelisted = (config.whitelist || []).some(item => cleanName.includes(item.toLowerCase().trim()));
    if (!isWhitelisted) {
      return { success: false, ignored: true, reason: `Modo Foco ativo: "${contactName}" não está na lista de foco.` };
    }
  }

  const model = config.model || "gemini-3-flash-preview";

  // Montagem da Persona "Modo Íthalo"
  let fullSystemPrompt = (config.systemPrompt || DEFAULT_PERSONA_PROMPT) + "\n\n";
  const user = config.userName || "Íthalo";
  fullSystemPrompt += `Seu nome é: ${user}.\n`;
  if (config.customBio) {
    fullSystemPrompt += `Sobre mim: ${config.customBio}\n`;
  }
  if (config.myTone) {
    const toneMap = {
      casual: "Tom: descontraído, amigável, educado e natural.",
      business: "Tom: profissional, ágil e direto.",
      friendly: "Tom: muito simpático, caloroso e prestativo.",
      direct: "Tom: extremamente direto e objetivo."
    };
    fullSystemPrompt += (toneMap[config.myTone] || "") + "\n";
  }

  fullSystemPrompt += `\nIMPORTANTE: Analise todo o histórico abaixo para entender sobre o que estavam conversando antes de responder. Formule uma resposta bem feita, educada e coerente em português (1 a 3 frases).`;

  // Histórico de mensagens
  const contents = [];
  const depth = config.contextDepth || 15;
  const historySlice = (messageHistory || []).slice(-depth);

  if (historySlice.length > 0) {
    historySlice.forEach(msg => {
      contents.push({
        role: msg.fromMe ? "model" : "user",
        parts: [{ text: msg.text }]
      });
    });
  } else {
    contents.push({
      role: "user",
      parts: [{ text: lastMessage || "Oi" }]
    });
  }

  // Garante que o último item no contents seja do role 'user'
  if (contents.length > 0 && contents[contents.length - 1].role === "model") {
    contents.push({
      role: "user",
      parts: [{ text: lastMessage || "Oi" }]
    });
  }

  const payload = {
    system_instruction: {
      parts: [{ text: fullSystemPrompt }]
    },
    contents: contents,
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 600,
      thinkingConfig: { thinkingBudget: 50 }
    }
  };

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${activeApiKey}`;

  console.log(`[WhatsGemini] Chamando Gemini (${model}) para contato "${contactName}"...`);

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorJson = await response.json().catch(() => ({}));
    throw new Error(errorJson.error?.message || `Erro HTTP ${response.status} na API do Gemini.`);
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

  const updatedLogs = [newLog, ...(config.activityLogs || [])].slice(0, 50);

  await chrome.storage.local.set({
    repliesCount: newCount,
    activityLogs: updatedLogs
  });

  console.log(`[WhatsGemini] Resposta gerada: "${replyText}"`);

  return {
    success: true,
    reply: replyText,
    stats: { repliesCount: newCount }
  };
}

async function handleToggleFocusContact(contactName) {
  const { whitelist = [] } = await chrome.storage.local.get(["whitelist"]);
  const index = whitelist.indexOf(contactName);
  let isFocused = false;

  if (index > -1) {
    whitelist.splice(index, 1);
  } else {
    whitelist.push(contactName);
    isFocused = true;
  }

  await chrome.storage.local.set({ whitelist });
  return { success: true, isFocused, whitelist };
}

async function handleToggleBlockContact(contactName) {
  const { blacklist = [] } = await chrome.storage.local.get(["blacklist"]);
  const index = blacklist.indexOf(contactName);
  let isBlocked = false;

  if (index > -1) {
    blacklist.splice(index, 1);
  } else {
    blacklist.push(contactName);
    isBlocked = true;
  }

  await chrome.storage.local.set({ blacklist });
  return { success: true, isBlocked, blacklist };
}

async function testGeminiApiKey(apiKey, model = "gemini-3-flash-preview") {
  const activeKey = apiKey && apiKey.trim() !== "" ? apiKey.trim() : FALLBACK_API_KEY;

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${activeKey}`;
  const payload = {
    contents: [{ role: "user", parts: [{ text: "Responda apenas 'OK' em uma palavra." }] }],
    generationConfig: {
      maxOutputTokens: 200,
      thinkingConfig: { thinkingBudget: 50 }
    }
  };

  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const errorJson = await res.json().catch(() => ({}));
    return { success: false, error: errorJson.error?.message || `Erro HTTP ${res.status}` };
  }

  return { success: true, message: "Conectado ao Gemini Pro com sucesso!" };
}
