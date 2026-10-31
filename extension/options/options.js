/**
 * WhatsGemini Pro - Options Controller (Total Control Edition)
 */

const DEFAULT_PERSONA_PROMPT = `Você é o próprio usuário respondendo mensagens no WhatsApp.
Diretrizes fundamentais:
- Responda SEMPRE na PRIMEIRA PESSOA ('eu', 'meu', 'comigo'), como se fosse exatamente a pessoa dona deste WhatsApp.
- Seja natural, objetivo, amigável e use gírias ou emojis comuns de conversa humana no WhatsApp (sem exageros).
- Respostas curtas e diretas (1 a 3 frases) como qualquer pessoa digita no WhatsApp.
- JAMAIS diga 'sou uma inteligência artificial', 'sou um assistente' ou 'o usuário não está disponível'. Você É ele.
- Se alguém perguntar algo muito confidencial, urgente ou que você não saiba responder, diga com naturalidade: 'Tô na correria aqui agora, mas já te dou um retorno certinho assim que der!' ou 'Opa, tô vendo aqui, já te respondo com calma!'.`;

document.addEventListener("DOMContentLoaded", async () => {
  const responseModeSelect = document.getElementById("response-mode-select");
  const speedModeSelect = document.getElementById("speed-mode-select");
  const whitelistInput = document.getElementById("whitelist-input");
  const blacklistInput = document.getElementById("blacklist-input");
  const userNameInput = document.getElementById("user-name");
  const contextDepthSelect = document.getElementById("context-depth");
  const customBioInput = document.getElementById("custom-bio");
  const systemPromptInput = document.getElementById("system-prompt");
  const btnResetPrompt = document.getElementById("btn-reset-prompt");
  const btnSaveAll = document.getElementById("btn-save-all");
  const saveStatus = document.getElementById("save-status");

  const config = await chrome.storage.local.get(null);

  if (config.responseMode) responseModeSelect.value = config.responseMode;
  speedModeSelect.value = config.fastMode !== false ? "fast" : "human";

  if (Array.isArray(config.whitelist)) whitelistInput.value = config.whitelist.join("\n");
  if (Array.isArray(config.blacklist)) blacklistInput.value = config.blacklist.join("\n");

  if (config.userName) userNameInput.value = config.userName;
  if (config.contextDepth) contextDepthSelect.value = config.contextDepth.toString();
  if (config.customBio) customBioInput.value = config.customBio;
  systemPromptInput.value = config.systemPrompt || DEFAULT_PERSONA_PROMPT;

  btnResetPrompt.addEventListener("click", () => {
    if (confirm("Restaurar o prompt padrão do Modo Eu?")) {
      systemPromptInput.value = DEFAULT_PERSONA_PROMPT;
    }
  });

  btnSaveAll.addEventListener("click", async () => {
    const whitelist = whitelistInput.value.split("\n").map(s => s.trim()).filter(Boolean);
    const blacklist = blacklistInput.value.split("\n").map(s => s.trim()).filter(Boolean);

    await chrome.storage.local.set({
      responseMode: responseModeSelect.value,
      fastMode: speedModeSelect.value === "fast",
      whitelist,
      blacklist,
      userName: userNameInput.value.trim() || "Eu",
      contextDepth: parseInt(contextDepthSelect.value, 10) || 15,
      customBio: customBioInput.value.trim(),
      systemPrompt: systemPromptInput.value.trim()
    });

    saveStatus.innerText = "✅ Todas as configurações de Controle Total foram salvas!";
    setTimeout(() => { saveStatus.innerText = ""; }, 4000);
  });
});
