/**
 * WhatsGemini Pro - Options Script (Autonomous Hands-Free Edition)
 */

document.addEventListener("DOMContentLoaded", async () => {
  const responseModeSelect = document.getElementById("response-mode-select");
  const speedModeSelect = document.getElementById("speed-mode-select");
  const checkAutoHandsFree = document.getElementById("check-auto-hands-free");
  const checkOptIgnoreGroups = document.getElementById("check-opt-ignore-groups");
  const whitelistInput = document.getElementById("whitelist-input");
  const blacklistInput = document.getElementById("blacklist-input");

  const apiKeyInput = document.getElementById("api-key-input");
  const modelSelect = document.getElementById("model-select");
  const btnTestKey = document.getElementById("btn-test-key");
  const testFeedback = document.getElementById("test-feedback");

  const userNameInput = document.getElementById("user-name-input");
  const toneSelect = document.getElementById("tone-select");
  const customBioInput = document.getElementById("custom-bio-input");
  const systemPromptInput = document.getElementById("system-prompt-input");

  const btnSaveAll = document.getElementById("btn-save-all");
  const saveStatus = document.getElementById("save-status");

  // Carrega configurações
  const config = await chrome.storage.local.get(null);

  if (config.responseMode) responseModeSelect.value = config.responseMode;
  speedModeSelect.value = config.fastMode !== false ? "fast" : "human";
  checkAutoHandsFree.checked = config.autoScanHandsFree !== false;
  checkOptIgnoreGroups.checked = config.ignoreGroups !== false;

  whitelistInput.value = (config.whitelist || []).join("\n");
  blacklistInput.value = (config.blacklist || []).join("\n");

  if (config.apiKey) apiKeyInput.value = config.apiKey;
  if (config.model) modelSelect.value = config.model;

  userNameInput.value = config.userName || "Íthalo";
  if (config.myTone) toneSelect.value = config.myTone;
  if (config.customBio) customBioInput.value = config.customBio;
  if (config.systemPrompt) systemPromptInput.value = config.systemPrompt;

  // Teste de chave
  btnTestKey.addEventListener("click", () => {
    const key = apiKeyInput.value.trim();
    const model = modelSelect.value;
    testFeedback.innerText = "⏳ Conectando ao Gemini...";
    testFeedback.className = "feedback-text info";

    chrome.runtime.sendMessage({ action: "TEST_API_KEY", apiKey: key, model: model }, (res) => {
      if (res && res.success) {
        testFeedback.innerText = "✅ Conexão bem-sucedida!";
        testFeedback.className = "feedback-text success";
      } else {
        testFeedback.innerText = `❌ ${res?.error || "Falha na conexão"}`;
        testFeedback.className = "feedback-text error";
      }
    });
  });

  // Salvar tudo
  btnSaveAll.addEventListener("click", async () => {
    const whitelist = whitelistInput.value.split("\n").map(s => s.trim()).filter(Boolean);
    const blacklist = blacklistInput.value.split("\n").map(s => s.trim()).filter(Boolean);

    await chrome.storage.local.set({
      responseMode: responseModeSelect.value,
      fastMode: speedModeSelect.value === "fast",
      autoScanHandsFree: checkAutoHandsFree.checked,
      ignoreGroups: checkOptIgnoreGroups.checked,
      whitelist: whitelist,
      blacklist: blacklist,
      apiKey: apiKeyInput.value.trim(),
      model: modelSelect.value,
      userName: userNameInput.value.trim() || "Íthalo",
      myTone: toneSelect.value,
      customBio: customBioInput.value.trim(),
      systemPrompt: systemPromptInput.value.trim()
    });

    saveStatus.innerText = "✅ Configurações salvas com sucesso!";
    setTimeout(() => { saveStatus.innerText = ""; }, 3000);
  });
});
