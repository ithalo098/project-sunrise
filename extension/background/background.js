/**
 * WhatsGemini Pro - Background Service Worker (Total Control Edition)
 * Gerencia a comunicação com Gemini, Modo Eu (Persona), Whitelist/Blacklist e Contexto Profundo.
 */

const DEFAULT_PERSONA_PROMPT = `Você é o próprio usuário respondendo mensagens no WhatsApp.
Diretrizes fundamentais:
- Responda SEMPRE na PRIMEIRA PESSOA ('eu', 'meu', 'comigo'), como se fosse exatamente a pessoa dona deste WhatsApp.
- Seja natural, objetivo, amigável e use gírias ou emojis comuns de conversa humana no WhatsApp (sem exageros).
- Respostas curtas e diretas (1 a 3 frases) como qualquer pessoa digita no WhatsApp.
- JAMAIS diga 'sou uma inteligência artificial', 'sou um assistente' ou 'o usuário não está disponível'. Você É ele.
- Se alguém perguntar algo muito confidencial, urgente ou que você não saiba responder, diga com naturalidade: 'Tô na correria aqui agora, mas já te dou um retorno certinho assim que der!' ou 'Opa, tô vendo aqui, já te respondo com calma!'.`;

const DEFAULT_CONFIG = {
  enabled: true,
  apiKey: "",
  model: "gemini-3-flash-preview",
  systemPrompt: DEFAULT_PERSONA_PROMPT,
  userName: "Eu",
  myTone: "casual", // casual, business, friendly, direct
  customBio: "Trabalho com tecnologia e atendimento. Respondo mensagens com agilidade.",
  responseMode: "all", // "all" (todos exceto blacklist), "whitelist" (APENAS lista de foco), "active_only" (só conversa aberta)
  whitelist: [], // Contatos com Foco prioritário
  blacklist: [], // Contatos ignorados
  ignoreGroups: true,
  fastMode: true, // Super rápido (1-2s) vs Humanizado (3-6s)
  minDelaySeconds: 1,
  maxDelaySeconds: 2,
  contextDepth: 15, // Quantidade de mensagens anteriores para contexto profundo
  repliesCount: 0,
  activityLogs: []
};

// Inicializa configurações
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
  console.log("[WhatsGemini Pro] Background Service Worker (Total Control) ativo.");
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "GENERATE_REPLY") {
    handleGenerateReply(request.data)
      .then(res => sendResponse(res))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (request.action === "TEST_API_KEY") {
    testGeminiApiKey(request.apiKey, request.model)
      .then(res => sendResponse(res))
      .catch(err => sendResponse({ success: false, error: err.message }));
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

  if (request.action === "TOGGLE_FOCUS_CONTACT") {
    handleToggleFocusContact(request.contactName).then(res => sendResponse(res));
    return true;
  }

  if (request.action === "TOGGLE_BLOCK_CONTACT") {
    handleToggleBlockContact(request.contactName).then(res => sendResponse(res));
    return true;
  }
});

async function handleGenerateReply({ contactName, messageHistory, lastMessage }) {
  const config = await chrome.storage.local.get(null);

  if (!config.enabled) {
    return { success: false, error: "Auto-resposta desativada no momento." };
  }

  if (!config.apiKey || config.apiKey.trim() === "") {
    return { success: false, error: "Chave do Gemini não configurada." };
  }

  const cleanName = (contactName || "").toLowerCase().trim();

  // 1. Verificação de Blacklist (Ignorados)
  const isBlacklisted = (config.blacklist || []).some(item => cleanName.includes(item.toLowerCase().trim()));
  if (isBlacklisted) {
    return { success: false, ignored: true, reason: "Contato na Blacklist (Bloqueado)." };
  }

  // 2. Verificação de Whitelist (Modo Foco)
  if (config.responseMode === "whitelist") {
    const isWhitelisted = (config.whitelist || []).some(item => cleanName.includes(item.toLowerCase().trim()));
    if (!isWhitelisted) {
      return { success: false, ignored: true, reason: "Modo Foco ativo: Contato não está na lista de Foco." };
    }
  }

  const model = config.model || "gemini-3-flash-preview";

  // Montagem da Persona "Modo Eu"
  let fullSystemPrompt = (config.systemPrompt || DEFAULT_PERSONA_PROMPT) + "\n\n";
  if (config.userName && config.userName !== "Eu") {
    fullSystemPrompt += `Seu nome é: ${config.userName}.\n`;
  }
  if (config.customBio) {
    fullSystemPrompt += `Contexto sobre mim e minhas atividades: ${config.customBio}\n`;
  }
  if (config.myTone) {
    const toneMap = {
      casual: "Tom: descontraído, amigável e natural.",
      business: "Tom: profissional, ágil e focado em resolver pendências de trabalho.",
      friendly: "Tom: muito simpático, atencioso e prestativo.",
      direct: "Tom: extremamente direto, rápido e objetivo, sem enrolação."
    };
    fullSystemPrompt += (toneMap[config.myTone] || "") + "\n";
  }

  fullSystemPrompt += `\nIMPORTANTE: Analise todo o histórico abaixo para entender exatamente sobre o que vocês estavam falando antes de responder, garantindo coerência total com as mensagens anteriores.`;

  // Construção do histórico profundo de mensagens
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
      parts: [{ text: lastMessage }]
    });
  }

  const payload = {
    system_instruction: {
      parts: [{ text: fullSystemPrompt }]
    },
    contents: contents,
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 250
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
    throw new Error(errorJson.error?.message || `Erro HTTP ${response.status} na API do Gemini.`);
  }

  const data = await response.json();
  const replyText = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

  if (!replyText) {
    throw new Error("Nenhum texto gerado pelo Gemini.");
  }

  // Atualiza contadores e registros
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
  if (!apiKey || apiKey.trim() === "") {
    return { success: false, error: "Insira uma chave válida." };
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey.trim()}`;
  const payload = {
    contents: [{ role: "user", parts: [{ text: "Responda apenas 'OK' em uma palavra." }] }]
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

  return { success: true, message: "Conectado ao Gemini com sucesso!" };
}
