/**
 * WhatsGemini Pro - Popup Controller
 */

document.addEventListener("DOMContentLoaded", async () => {
  // Elementos da UI
  const masterToggle = document.getElementById("master-toggle");
  const pulseDot = document.getElementById("pulse-dot");
  const statusLabel = document.getElementById("status-label");
  const apiKeyInput = document.getElementById("api-key-input");
  const btnToggleKeyVis = document.getElementById("btn-toggle-key-visibility");
  const modelSelect = document.getElementById("model-select");
  const btnSaveKey = document.getElementById("btn-save-key");
  const btnTestKey = document.getElementById("btn-test-key");
  const testFeedback = document.getElementById("test-feedback");
  const checkIgnoreGroups = document.getElementById("check-ignore-groups");
  const checkScanUnread = document.getElementById("check-scan-unread");
  const statRepliesCount = document.getElementById("stat-replies-count");
  const btnViewLogs = document.getElementById("btn-view-logs");
  const logsContainer = document.getElementById("logs-container");
  const logsList = document.getElementById("logs-list");
  const btnClearLogs = document.getElementById("btn-clear-logs");
  const btnOpenOptions = document.getElementById("btn-open-options");

  // Carrega configurações salvas
  const data = await chrome.storage.local.get([
    "enabled",
    "apiKey",
    "model",
    "ignoreGroups",
    "autoScanUnread",
    "repliesCount",
    "activityLogs"
  ]);

  // Atualiza estado do switch
  const isEnabled = data.enabled || false;
  masterToggle.checked = isEnabled;
  updateStatusUI(isEnabled);

  // Preenche campos
  if (data.apiKey) apiKeyInput.value = data.apiKey;
  if (data.model) modelSelect.value = data.model;
  checkIgnoreGroups.checked = data.ignoreGroups !== undefined ? data.ignoreGroups : true;
  checkScanUnread.checked = data.autoScanUnread !== undefined ? data.autoScanUnread : true;
  statRepliesCount.innerText = data.repliesCount || 0;

  renderLogs(data.activityLogs || []);

  // Evento Master Switch
  masterToggle.addEventListener("change", async () => {
    const active = masterToggle.checked;
    if (active && (!apiKeyInput.value || apiKeyInput.value.trim() === "")) {
      alert("Por favor, configure sua chave do Gemini Pro antes de ativar a auto-resposta.");
      masterToggle.checked = false;
      return;
    }

    await chrome.storage.local.set({ enabled: active });
    updateStatusUI(active);
  });

  // Visibilidade da chave
  btnToggleKeyVis.addEventListener("click", () => {
    if (apiKeyInput.type === "password") {
      apiKeyInput.type = "text";
      btnToggleKeyVis.innerText = "🔒";
    } else {
      apiKeyInput.type = "password";
      btnToggleKeyVis.innerText = "👁️";
    }
  });

  // Salvar Chave e Modelo
  btnSaveKey.addEventListener("click", async () => {
    const key = apiKeyInput.value.trim();
    const model = modelSelect.value;
    await chrome.storage.local.set({
      apiKey: key,
      model: model,
      ignoreGroups: checkIgnoreGroups.checked,
      autoScanUnread: checkScanUnread.checked
    });

    showFeedback("Configurações salvas!", "success");
  });

  // Mudança nos checkboxes salva automaticamente
  checkIgnoreGroups.addEventListener("change", () => {
    chrome.storage.local.set({ ignoreGroups: checkIgnoreGroups.checked });
  });

  checkScanUnread.addEventListener("change", () => {
    chrome.storage.local.set({ autoScanUnread: checkScanUnread.checked });
  });

  // Testar Chave
  btnTestKey.addEventListener("click", async () => {
    const key = apiKeyInput.value.trim();
    const model = modelSelect.value;

    if (!key) {
      showFeedback("Insira sua chave primeiro.", "error");
      return;
    }

    showFeedback("Testando conexão com o Google Gemini...", "");
    btnTestKey.disabled = true;

    chrome.runtime.sendMessage(
      { action: "TEST_API_KEY", apiKey: key, model: model },
      (response) => {
        btnTestKey.disabled = false;
        if (response && response.success) {
          showFeedback("✅ Chave válida! Conectado com sucesso.", "success");
        } else {
          showFeedback(`❌ ${response?.error || "Falha na conexão"}`, "error");
        }
      }
    );
  });

  // Ver / Ocultar Histórico
  btnViewLogs.addEventListener("click", () => {
    logsContainer.classList.toggle("hidden");
    btnViewLogs.innerText = logsContainer.classList.contains("hidden")
      ? "Ver histórico de mensagens ↓"
      : "Ocultar histórico ↑";
  });

  // Limpar Histórico
  btnClearLogs.addEventListener("click", async () => {
    await chrome.storage.local.set({ activityLogs: [], repliesCount: 0 });
    statRepliesCount.innerText = "0";
    renderLogs([]);
  });

  // Abrir Opções Avançadas
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
      statusLabel.innerText = "ATIVADO (IA Respondendo)";
      statusLabel.style.color = "#25D366";
    } else {
      pulseDot.classList.remove("active");
      statusLabel.innerText = "DESATIVADO (Pausado)";
      statusLabel.style.color = "#8696a0";
    }
  }

  function showFeedback(text, type) {
    testFeedback.innerText = text;
    testFeedback.className = "feedback-msg " + type;
    setTimeout(() => {
      if (testFeedback.innerText === text) {
        testFeedback.innerText = "";
      }
    }, 4500);
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
        <div class="log-incoming">Recebido: "${escapeHtml(item.incoming)}"</div>
        <div class="log-reply">🤖 IA: "${escapeHtml(item.reply)}"</div>
      </div>
    `).join("");
  }

  function escapeHtml(str) {
    if (!str) return "";
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
});
