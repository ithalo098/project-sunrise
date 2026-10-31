/**
 * WhatsGemini Pro - Popup Controller (Total Control Edition)
 */

document.addEventListener("DOMContentLoaded", async () => {
  // Tabs
  const tabBtns = document.querySelectorAll(".tab-btn");
  const tabContents = document.querySelectorAll(".tab-content");

  tabBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      tabBtns.forEach(b => b.classList.remove("active"));
      tabContents.forEach(c => c.classList.remove("active"));
      btn.classList.add("active");
      const targetId = btn.getAttribute("data-tab");
      document.getElementById(targetId)?.classList.add("active");
    });
  });

  // Elementos TAB 1: Controle
  const masterToggle = document.getElementById("master-toggle");
  const pulseDot = document.getElementById("pulse-dot");
  const statusLabel = document.getElementById("status-label");
  const responseModeRadios = document.querySelectorAll("input[name='response-mode']");
  const checkFastMode = document.getElementById("check-fast-mode");
  const checkIgnoreGroups = document.getElementById("check-ignore-groups");
  const apiKeyInput = document.getElementById("api-key-input");
  const btnToggleKeyVis = document.getElementById("btn-toggle-key-visibility");
  const btnSaveKey = document.getElementById("btn-save-key");
  const btnTestKey = document.getElementById("btn-test-key");
  const testFeedback = document.getElementById("test-feedback");

  // Elementos TAB 2: Foco & Bloqueio
  const inputNewFocus = document.getElementById("input-new-focus");
  const btnAddFocus = document.getElementById("btn-add-focus");
  const focusList = document.getElementById("focus-list");

  const inputNewBlock = document.getElementById("input-new-block");
  const btnAddBlock = document.getElementById("btn-add-block");
  const blockList = document.getElementById("block-list");

  // Elementos TAB 3: Persona (Modo Eu)
  const userNameInput = document.getElementById("user-name-input");
  const toneSelect = document.getElementById("tone-select");
  const customBioInput = document.getElementById("custom-bio-input");
  const contextDepthSelect = document.getElementById("context-depth-select");
  const btnSavePersona = document.getElementById("btn-save-persona");

  // Elementos TAB 4: Histórico
  const statRepliesCount = document.getElementById("stat-replies-count");
  const logsList = document.getElementById("logs-list");
  const btnClearLogs = document.getElementById("btn-clear-logs");
  const btnOpenOptions = document.getElementById("btn-open-options");

  // Carrega configurações
  const config = await chrome.storage.local.get(null);

  // Tab 1 UI
  masterToggle.checked = config.enabled !== false;
  updateStatusUI(config.enabled !== false);

  responseModeRadios.forEach(radio => {
    if (radio.value === (config.responseMode || "all")) {
      radio.checked = true;
    }
    radio.addEventListener("change", () => {
      chrome.storage.local.set({ responseMode: radio.value });
    });
  });

  checkFastMode.checked = config.fastMode !== false;
  checkFastMode.addEventListener("change", () => {
    chrome.storage.local.set({ fastMode: checkFastMode.checked });
  });

  checkIgnoreGroups.checked = config.ignoreGroups !== false;
  checkIgnoreGroups.addEventListener("change", () => {
    chrome.storage.local.set({ ignoreGroups: checkIgnoreGroups.checked });
  });

  if (config.apiKey) apiKeyInput.value = config.apiKey;

  masterToggle.addEventListener("change", async () => {
    const active = masterToggle.checked;
    await chrome.storage.local.set({ enabled: active });
    updateStatusUI(active);
  });

  btnToggleKeyVis.addEventListener("click", () => {
    apiKeyInput.type = apiKeyInput.type === "password" ? "text" : "password";
    btnToggleKeyVis.innerText = apiKeyInput.type === "password" ? "👁️" : "🔒";
  });

  btnSaveKey.addEventListener("click", async () => {
    await chrome.storage.local.set({ apiKey: apiKeyInput.value.trim() });
    showFeedback("Chave salva com sucesso!", "success");
  });

  btnTestKey.addEventListener("click", () => {
    const key = apiKeyInput.value.trim();
    if (!key) {
      showFeedback("Insira sua chave primeiro.", "error");
      return;
    }
    showFeedback("Testando conexão com o Gemini...", "");
    btnTestKey.disabled = true;

    chrome.runtime.sendMessage({ action: "TEST_API_KEY", apiKey: key, model: config.model || "gemini-3-flash-preview" }, (res) => {
      btnTestKey.disabled = false;
      if (res && res.success) {
        showFeedback("✅ Conectado com sucesso!", "success");
      } else {
        showFeedback(`❌ ${res?.error || "Falha"}`, "error");
      }
    });
  });

  // Tab 2: Foco & Bloqueio Tags
  let currentWhitelist = config.whitelist || [];
  let currentBlacklist = config.blacklist || [];

  renderTags(focusList, currentWhitelist, "focus", removeFocusItem);
  renderTags(blockList, currentBlacklist, "block", removeBlockItem);

  btnAddFocus.addEventListener("click", () => {
    const val = inputNewFocus.value.trim();
    if (val && !currentWhitelist.includes(val)) {
      currentWhitelist.push(val);
      chrome.storage.local.set({ whitelist: currentWhitelist });
      renderTags(focusList, currentWhitelist, "focus", removeFocusItem);
      inputNewFocus.value = "";
    }
  });

  btnAddBlock.addEventListener("click", () => {
    const val = inputNewBlock.value.trim();
    if (val && !currentBlacklist.includes(val)) {
      currentBlacklist.push(val);
      chrome.storage.local.set({ blacklist: currentBlacklist });
      renderTags(blockList, currentBlacklist, "block", removeBlockItem);
      inputNewBlock.value = "";
    }
  });

  function removeFocusItem(item) {
    currentWhitelist = currentWhitelist.filter(i => i !== item);
    chrome.storage.local.set({ whitelist: currentWhitelist });
    renderTags(focusList, currentWhitelist, "focus", removeFocusItem);
  }

  function removeBlockItem(item) {
    currentBlacklist = currentBlacklist.filter(i => i !== item);
    chrome.storage.local.set({ blacklist: currentBlacklist });
    renderTags(blockList, currentBlacklist, "block", removeBlockItem);
  }

  // Tab 3: Persona (Modo Eu)
  if (config.userName) userNameInput.value = config.userName;
  if (config.myTone) toneSelect.value = config.myTone;
  if (config.customBio) customBioInput.value = config.customBio;
  if (config.contextDepth) contextDepthSelect.value = config.contextDepth.toString();

  btnSavePersona.addEventListener("click", async () => {
    await chrome.storage.local.set({
      userName: userNameInput.value.trim() || "Eu",
      myTone: toneSelect.value,
      customBio: customBioInput.value.trim(),
      contextDepth: parseInt(contextDepthSelect.value, 10) || 15
    });
    btnSavePersona.innerText = "✅ Perfil Salvo!";
    setTimeout(() => { btnSavePersona.innerText = "Salvar Meu Perfil"; }, 2000);
  });

  // Tab 4: Logs
  statRepliesCount.innerText = config.repliesCount || 0;
  renderLogs(config.activityLogs || []);

  btnClearLogs.addEventListener("click", async () => {
    await chrome.storage.local.set({ activityLogs: [], repliesCount: 0 });
    statRepliesCount.innerText = "0";
    renderLogs([]);
  });

  btnOpenOptions.addEventListener("click", (e) => {
    e.preventDefault();
    if (chrome.runtime.openOptionsPage) {
      chrome.runtime.openOptionsPage();
    } else {
      window.open(chrome.runtime.getURL("options/options.html"));
    }
  });

  function updateStatusUI(active) {
    if (active) {
      pulseDot.classList.add("active");
      statusLabel.innerText = "IA ATIVA";
      statusLabel.style.color = "#25D366";
    } else {
      pulseDot.classList.remove("active");
      statusLabel.innerText = "PAUSADO";
      statusLabel.style.color = "#8696a0";
    }
  }

  function showFeedback(text, type) {
    testFeedback.innerText = text;
    testFeedback.className = "feedback-msg " + type;
    setTimeout(() => { if (testFeedback.innerText === text) testFeedback.innerText = ""; }, 4000);
  }

  function renderTags(container, list, typeClass, onRemove) {
    if (!list || list.length === 0) {
      container.innerHTML = '<span class="empty-tags">Nenhum contato na lista.</span>';
      return;
    }
    container.innerHTML = "";
    list.forEach(item => {
      const tag = document.createElement("span");
      tag.className = `tag-item tag-${typeClass}`;
      tag.innerHTML = `<span>${escapeHtml(item)}</span><button class="tag-remove" title="Remover">✕</button>`;
      tag.querySelector(".tag-remove").addEventListener("click", () => onRemove(item));
      container.appendChild(tag);
    });
  }

  function renderLogs(logs) {
    if (!logs || logs.length === 0) {
      logsList.innerHTML = '<p class="empty-logs">Nenhuma resposta enviada ainda.</p>';
      return;
    }
    logsList.innerHTML = logs.map(item => `
      <div class="log-item">
        <div class="log-top">
          <span>${escapeHtml(item.contactName)}</span>
          <span class="log-time">${item.timestamp}</span>
        </div>
        <div class="log-incoming">"${escapeHtml(item.incoming)}"</div>
        <div class="log-reply">🤖 "${escapeHtml(item.reply)}"</div>
      </div>
    `).join("");
  }

  function escapeHtml(str) {
    if (!str) return "";
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
});
