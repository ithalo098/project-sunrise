/**
 * WhatsGemini Pro - Popup Control Script (Autonomous Hands-Free Edition)
 */

document.addEventListener("DOMContentLoaded", async () => {
  // Inicialização de Elementos
  const masterToggle = document.getElementById("master-toggle");
  const statusLabel = document.getElementById("status-label");
  const pulseDot = document.getElementById("pulse-dot");

  const checkHandsFree = document.getElementById("check-hands-free");
  const checkIgnoreGroups = document.getElementById("check-ignore-groups");
  const checkFastMode = document.getElementById("check-fast-mode");

  const responseModeRadios = document.querySelectorAll('input[name="response-mode"]');
  const apiKeyInput = document.getElementById("api-key-input");
  const btnToggleKeyVis = document.getElementById("btn-toggle-key-visibility");
  const btnSaveKey = document.getElementById("btn-save-key");
  const btnTestKey = document.getElementById("btn-test-key");
  const testFeedback = document.getElementById("test-feedback");

  const inputNewFocus = document.getElementById("input-new-focus");
  const btnAddFocus = document.getElementById("btn-add-focus");
  const focusListContainer = document.getElementById("focus-list");

  const inputNewBlock = document.getElementById("input-new-block");
  const btnAddBlock = document.getElementById("btn-add-block");
  const blockListContainer = document.getElementById("block-list");

  const userNameInput = document.getElementById("user-name-input");
  const toneSelect = document.getElementById("tone-select");
  const customBioInput = document.getElementById("custom-bio-input");
  const contextDepthSelect = document.getElementById("context-depth-select");
  const btnSavePersona = document.getElementById("btn-save-persona");

  const statRepliesCount = document.getElementById("stat-replies-count");
  const logsList = document.getElementById("logs-list");
  const btnClearLogs = document.getElementById("btn-clear-logs");
  const btnOpenOptions = document.getElementById("btn-open-options");

  // Abas
  setupTabs();

  // Carrega configurações salvas
  const config = await chrome.storage.local.get([
    "enabled",
    "apiKey",
    "autoScanHandsFree",
    "ignoreGroups",
    "fastMode",
    "responseMode",
    "whitelist",
    "blacklist",
    "userName",
    "myTone",
    "customBio",
    "contextDepth",
    "repliesCount",
    "activityLogs"
  ]);

  // Master Switch
  const isEnabled = config.enabled !== false;
  masterToggle.checked = isEnabled;
  updateStatusVisuals(isEnabled);

  masterToggle.addEventListener("change", async () => {
    const val = masterToggle.checked;
    await chrome.storage.local.set({ enabled: val });
    updateStatusVisuals(val);
  });

  // Checkboxes
  checkHandsFree.checked = config.autoScanHandsFree !== false;
  checkHandsFree.addEventListener("change", () => {
    chrome.storage.local.set({ autoScanHandsFree: checkHandsFree.checked });
  });

  checkIgnoreGroups.checked = config.ignoreGroups !== false;
  checkIgnoreGroups.addEventListener("change", () => {
    chrome.storage.local.set({ ignoreGroups: checkIgnoreGroups.checked });
  });


  checkFastMode.checked = config.fastMode !== false;
  checkFastMode.addEventListener("change", () => {
    chrome.storage.local.set({ fastMode: checkFastMode.checked });
  });

  // Radio Response Mode
  const curMode = config.responseMode || "all";
  responseModeRadios.forEach(radio => {
    if (radio.value === curMode) radio.checked = true;
    radio.addEventListener("change", () => {
      chrome.storage.local.set({ responseMode: radio.value });
    });
  });

  // Chave API
  if (config.apiKey) apiKeyInput.value = config.apiKey;

  btnToggleKeyVis.addEventListener("click", () => {
    apiKeyInput.type = apiKeyInput.type === "password" ? "text" : "password";
  });

  btnSaveKey.addEventListener("click", async () => {
    const key = apiKeyInput.value.trim();
    await chrome.storage.local.set({ apiKey: key });
    showFeedback("✅ Chave salva com sucesso!", "success");
  });

  btnTestKey.addEventListener("click", () => {
    const key = apiKeyInput.value.trim();
    showFeedback("⏳ Testando conexão com Gemini...", "info");
    chrome.runtime.sendMessage({ action: "TEST_API_KEY", apiKey: key }, (res) => {
      if (res && res.success) {
        showFeedback("✅ Conectado ao Gemini Pro com sucesso!", "success");
      } else {
        showFeedback(`❌ Erro: ${res?.error || "Falha na conexão"}`, "error");
      }
    });
  });

  // Listas de Foco e Bloqueio
  let currentWhitelist = config.whitelist || [];
  let currentBlacklist = config.blacklist || [];

  renderTagList(focusListContainer, currentWhitelist, "whitelist");
  renderTagList(blockListContainer, currentBlacklist, "blacklist");

  btnAddFocus.addEventListener("click", async () => {
    const name = inputNewFocus.value.trim();
    if (!name) return;
    if (!currentWhitelist.includes(name)) {
      currentWhitelist.push(name);
      await chrome.storage.local.set({ whitelist: currentWhitelist });
      renderTagList(focusListContainer, currentWhitelist, "whitelist");
      inputNewFocus.value = "";
    }
  });

  btnAddBlock.addEventListener("click", async () => {
    const name = inputNewBlock.value.trim();
    if (!name) return;
    if (!currentBlacklist.includes(name)) {
      currentBlacklist.push(name);
      await chrome.storage.local.set({ blacklist: currentBlacklist });
      renderTagList(blockListContainer, currentBlacklist, "blacklist");
      inputNewBlock.value = "";
    }
  });

  // Persona "Modo Íthalo"
  userNameInput.value = config.userName || "Íthalo";
  if (config.myTone) toneSelect.value = config.myTone;
  if (config.customBio) customBioInput.value = config.customBio;
  if (config.contextDepth) contextDepthSelect.value = String(config.contextDepth);

  btnSavePersona.addEventListener("click", async () => {
    await chrome.storage.local.set({
      userName: userNameInput.value.trim() || "Íthalo",
      myTone: toneSelect.value,
      customBio: customBioInput.value.trim(),
      contextDepth: parseInt(contextDepthSelect.value, 10) || 15
    });
    btnSavePersona.innerText = "✅ Perfil Salvo!";
    setTimeout(() => { btnSavePersona.innerText = "Salvar Meu Perfil"; }, 2000);
  });

  // Histórico de Logs
  const count = config.repliesCount || 0;
  statRepliesCount.innerText = count;
  renderLogs(config.activityLogs || []);

  btnClearLogs.addEventListener("click", async () => {
    await chrome.storage.local.set({ activityLogs: [] });
    renderLogs([]);
  });

  btnOpenOptions?.addEventListener("click", (e) => {
    e.preventDefault();
    chrome.runtime.openOptionsPage();
  });

  function updateStatusVisuals(enabled) {
    if (enabled) {
      statusLabel.innerText = "IA ATIVA (MÃOS-LIVRES)";
      statusLabel.style.color = "#25D366";
      pulseDot.classList.add("active");
    } else {
      statusLabel.innerText = "IA PAUSADA";
      statusLabel.style.color = "#8696a0";
      pulseDot.classList.remove("active");
    }
  }

  function renderTagList(container, items, key) {
    container.innerHTML = "";
    if (items.length === 0) {
      container.innerHTML = `<span class="empty-tag">Nenhum contato adicionado</span>`;
      return;
    }

    items.forEach((item, index) => {
      const tag = document.createElement("span");
      tag.className = `tag-item ${key === 'whitelist' ? 'tag-focus' : 'tag-block'}`;
      tag.innerHTML = `
        ${escapeHtml(item)}
        <button class="tag-del" data-idx="${index}">✕</button>
      `;

      tag.querySelector(".tag-del").addEventListener("click", async () => {
        items.splice(index, 1);
        await chrome.storage.local.set({ [key]: items });
        renderTagList(container, items, key);
      });

      container.appendChild(tag);
    });
  }

  function renderLogs(logs) {
    logsList.innerHTML = "";
    if (!logs || logs.length === 0) {
      logsList.innerHTML = `<p class="empty-logs">Nenhuma resposta registrada ainda.</p>`;
      return;
    }

    logs.forEach(log => {
      const item = document.createElement("div");
      item.className = "log-item";
      item.innerHTML = `
        <div class="log-top">
          <span class="log-contact">👤 ${escapeHtml(log.contactName)}</span>
          <span class="log-time">${escapeHtml(log.timestamp || "")}</span>
        </div>
        <div class="log-msg log-in"><strong>Recebido:</strong> ${escapeHtml(log.incoming || "")}</div>
        <div class="log-msg log-out"><strong>Íthalo IA:</strong> ${escapeHtml(log.reply || "")}</div>
      `;
      logsList.appendChild(item);
    });
  }

  function showFeedback(msg, type) {
    testFeedback.innerText = msg;
    testFeedback.className = `feedback-msg ${type}`;
    testFeedback.style.display = "block";
  }

  function setupTabs() {
    const tabs = document.querySelectorAll(".tab-btn");
    const contents = document.querySelectorAll(".tab-content");

    tabs.forEach(tab => {
      tab.addEventListener("click", () => {
        tabs.forEach(t => t.classList.remove("active"));
        contents.forEach(c => c.classList.remove("active"));

        tab.classList.add("active");
        const target = document.getElementById(tab.getAttribute("data-tab"));
        if (target) target.classList.add("active");
      });
    });
  }

  function escapeHtml(str) {
    if (!str) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
});
