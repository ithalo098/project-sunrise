/**
 * WhatsGemini Pro - Content Script (Total Control Edition)
 * Injetado no WhatsApp Web (https://web.whatsapp.com)
 * Captura histórico profundo, insere botões de Foco/Bloqueio no cabeçalho e responde com velocidade.
 */

(() => {
  let isProcessing = false;
  let processedMessages = new Set();
  let scannerInterval = null;
  let floatingWidget = null;
  let lastRepliedChat = null;
  let lastRepliedTime = 0;
  let currentHeaderInjectedContact = null;

  console.log("%c[WhatsGemini Pro - Total Control]%c Extensão ativa no WhatsApp Web!", "background: #25D366; color: black; font-weight: bold; padding: 2px 6px; border-radius: 4px;", "");

  init();

  async function init() {
    await waitForElement("#pane-side, #main", 60000).catch(() => null);

    createFloatingWidget();
    observeHeaderChanges();

    chrome.storage.onChanged.addListener((changes) => {
      if (changes.enabled) {
        updateWidgetState(changes.enabled.newValue);
        if (changes.enabled.newValue) {
          startScanner();
        } else {
          stopScanner();
        }
      }
      if (changes.repliesCount) {
        updateWidgetCount(changes.repliesCount.newValue);
      }
      if (changes.whitelist || changes.blacklist) {
        updateChatHeaderButtons();
      }
    });

    const config = await chrome.storage.local.get(["enabled", "repliesCount"]);
    updateWidgetState(config.enabled !== false);
    updateWidgetCount(config.repliesCount || 0);

    if (config.enabled !== false) {
      startScanner();
    }
  }

  /**
   * Monitora quando o usuário troca de conversa para injetar os botões de Foco/Bloqueio
   */
  function observeHeaderChanges() {
    setInterval(() => {
      const header = document.querySelector("#main header");
      if (!header) return;

      const contactName = getCurrentChatContactName();
      if (contactName && contactName !== currentHeaderInjectedContact) {
        currentHeaderInjectedContact = contactName;
        injectChatHeaderButtons(header, contactName);
      }
    }, 1500);
  }

  /**
   * Injeta os botões rápidos de controle no topo do chat aberto
   */
  async function injectChatHeaderButtons(header, contactName) {
    let actionsContainer = document.getElementById("wg-header-actions");
    if (!actionsContainer) {
      actionsContainer = document.createElement("div");
      actionsContainer.id = "wg-header-actions";
      actionsContainer.className = "wg-header-actions";
      // Injeta antes dos botões de pesquisa/opções do WhatsApp
      header.appendChild(actionsContainer);
    }

    const { whitelist = [], blacklist = [] } = await chrome.storage.local.get(["whitelist", "blacklist"]);
    const clean = contactName.toLowerCase().trim();
    const isFocused = whitelist.some(item => clean.includes(item.toLowerCase().trim()));
    const isBlocked = blacklist.some(item => clean.includes(item.toLowerCase().trim()));

    actionsContainer.innerHTML = `
      <button id="wg-btn-focus" class="wg-action-btn ${isFocused ? 'wg-btn-focused' : ''}" title="${isFocused ? 'Remover Foco da IA' : 'Adicionar Foco Prioritário da IA'}">
        🎯 ${isFocused ? 'Foco: ATIVO' : 'Focar IA'}
      </button>
      <button id="wg-btn-block" class="wg-action-btn ${isBlocked ? 'wg-btn-blocked' : ''}" title="${isBlocked ? 'Desbloquear Contato' : 'Ignorar / Bloquear Resposta da IA'}">
        🚫 ${isBlocked ? 'Bloqueado' : 'Ignorar'}
      </button>
    `;

    document.getElementById("wg-btn-focus")?.addEventListener("click", (e) => {
      e.stopPropagation();
      chrome.runtime.sendMessage({ action: "TOGGLE_FOCUS_CONTACT", contactName }, () => {
        injectChatHeaderButtons(header, contactName);
        showNotificationBanner(isFocused ? `Foco removido de ${contactName}` : `🎯 ${contactName} adicionado à lista de FOCO!`, 2500);
      });
    });

    document.getElementById("wg-btn-block")?.addEventListener("click", (e) => {
      e.stopPropagation();
      chrome.runtime.sendMessage({ action: "TOGGLE_BLOCK_CONTACT", contactName }, () => {
        injectChatHeaderButtons(header, contactName);
        showNotificationBanner(isBlocked ? `${contactName} desbloqueado` : `🚫 ${contactName} BLOQUEADO (IA não responderá)`, 2500);
      });
    });
  }

  function updateChatHeaderButtons() {
    const header = document.querySelector("#main header");
    const contactName = getCurrentChatContactName();
    if (header && contactName) {
      injectChatHeaderButtons(header, contactName);
    }
  }

  /**
   * Widget Flutuante na tela do WhatsApp Web
   */
  function createFloatingWidget() {
    if (document.getElementById("whatsgemini-widget")) return;

    floatingWidget = document.createElement("div");
    floatingWidget.id = "whatsgemini-widget";
    floatingWidget.className = "whatsgemini-badge";
    floatingWidget.innerHTML = `
      <div class="wg-icon">✨</div>
      <div class="wg-info">
        <span class="wg-title">WhatsGemini Pro</span>
        <span class="wg-status" id="wg-status-text">Monitorando</span>
      </div>
      <div class="wg-count" id="wg-count-badge" title="Mensagens respondidas">0</div>
      <button class="wg-toggle-btn" id="wg-toggle-btn" title="Ativar/Pausar Auto-Resposta">
        <span id="wg-toggle-icon">⏸</span>
      </button>
    `;

    document.body.appendChild(floatingWidget);

    document.getElementById("wg-toggle-btn")?.addEventListener("click", () => {
      chrome.runtime.sendMessage({ action: "TOGGLE_ENABLED" }, (res) => {
        if (res && res.success) {
          updateWidgetState(res.enabled);
        }
      });
    });
  }

  function updateWidgetState(enabled) {
    if (!floatingWidget) return;
    const statusText = document.getElementById("wg-status-text");
    const toggleIcon = document.getElementById("wg-toggle-icon");

    if (enabled) {
      floatingWidget.classList.add("wg-active");
      floatingWidget.classList.remove("wg-paused");
      if (statusText) statusText.innerText = "IA Ativa (Total Control)";
      if (toggleIcon) toggleIcon.innerText = "⏸";
    } else {
      floatingWidget.classList.remove("wg-active");
      floatingWidget.classList.add("wg-paused");
      if (statusText) statusText.innerText = "Pausado";
      if (toggleIcon) toggleIcon.innerText = "▶";
    }
  }

  function updateWidgetCount(count) {
    const badge = document.getElementById("wg-count-badge");
    if (badge) badge.innerText = count || 0;
  }

  function startScanner() {
    if (scannerInterval) clearInterval(scannerInterval);
    scannerInterval = setInterval(scanAndProcess, 2500); // Varredura mais rápida
  }

  function stopScanner() {
    if (scannerInterval) {
      clearInterval(scannerInterval);
      scannerInterval = null;
    }
  }

  async function scanAndProcess() {
    if (isProcessing) return;

    const config = await chrome.storage.local.get([
      "enabled",
      "apiKey",
      "responseMode",
      "ignoreGroups",
      "fastMode",
      "minDelaySeconds",
      "maxDelaySeconds"
    ]);

    if (!config.enabled || !config.apiKey) return;

    // 1. Processar conversa aberta
    const activeHandled = await processCurrentActiveChat(config);
    if (activeHandled) return;

    // 2. Se configurado para varrer outros contatos
    if (config.responseMode !== "active_only") {
      await processNextUnreadChat(config);
    }
  }

  async function processCurrentActiveChat(config) {
    const mainChat = document.querySelector("#main");
    if (!mainChat) return false;

    if (config.ignoreGroups && isCurrentChatGroup()) {
      return false;
    }

    const contactName = getCurrentChatContactName();
    const messages = getMessagesFromActiveChat(config.contextDepth || 15);
    if (!messages || messages.length === 0) return false;

    const lastMsg = messages[messages.length - 1];

    // Se a última mensagem partiu do próprio usuário, não responder
    if (lastMsg.fromMe) return false;

    // Evita loop e repetições
    const messageId = `${contactName}_${lastMsg.text}_${lastMsg.time || ""}`;
    if (processedMessages.has(messageId)) return false;

    const now = Date.now();
    if (lastRepliedChat === contactName && (now - lastRepliedTime) < 3000) {
      return false;
    }

    isProcessing = true;
    showNotificationBanner(`Gerando resposta inteligente para ${contactName}...`);

    try {
      console.log(`[WhatsGemini Pro] Processando mensagem de "${contactName}": "${lastMsg.text}" com ${messages.length} mensagens de contexto.`);

      const response = await sendMessageToBackground({
        action: "GENERATE_REPLY",
        data: {
          contactName: contactName,
          lastMessage: lastMsg.text,
          messageHistory: messages // Histórico profundo de até 15-20 mensagens
        }
      });

      if (response && response.success && response.reply) {
        // Velocidade Super Rápida vs Humanizada
        let delayMs = 1200;
        if (config.fastMode) {
          delayMs = Math.floor(Math.random() * 800) + 700; // Entre 0.7s e 1.5s
        } else {
          const min = config.minDelaySeconds || 2;
          const max = config.maxDelaySeconds || 5;
          delayMs = (Math.floor(Math.random() * (max - min + 1)) + min) * 1000;
        }

        showNotificationBanner(`Digitando (${(delayMs/1000).toFixed(1)}s)...`);
        await sleep(delayMs);

        const sent = await typeAndSendMessage(response.reply);
        if (sent) {
          processedMessages.add(messageId);
          lastRepliedChat = contactName;
          lastRepliedTime = Date.now();
          showNotificationBanner(`✅ Respondido: ${contactName}`, 2500);
        }
      } else if (response && response.ignored) {
        console.log(`[WhatsGemini Pro] Mensagem ignorada: ${response.reason}`);
      } else if (response && response.error) {
        showNotificationBanner(`⚠️ ${response.error}`, 5000);
      }
    } catch (err) {
      console.error("[WhatsGemini Pro] Erro ao responder:", err);
    } finally {
      isProcessing = false;
    }

    return true;
  }

  async function processNextUnreadChat(config) {
    const paneSide = document.querySelector("#pane-side");
    if (!paneSide) return;

    const unreadBadges = paneSide.querySelectorAll(
      'span[aria-label*="não lida"], span[aria-label*="unread"], span[data-icon="unread-count"], [aria-label*="unread message"], span.x10l6tqk'
    );

    for (const badge of unreadBadges) {
      const text = badge.innerText || badge.getAttribute("aria-label") || "";
      const isUnread = /\d+/.test(text) || text.toLowerCase().includes("não lida") || text.toLowerCase().includes("unread");

      if (isUnread) {
        const chatItem = badge.closest('div[role="listitem"]') || badge.closest('div[role="row"]') || badge.closest('div._ak72') || badge.closest('div[tabindex="-1"]');
        if (chatItem) {
          if (config.ignoreGroups) {
            const hasGroupIcon = chatItem.querySelector('span[data-icon="default-group"], span[data-icon="community-outline"]');
            if (hasGroupIcon) continue;
          }

          chatItem.click();
          await sleep(1200);
          return;
        }
      }
    }
  }

  /**
   * Extrai histórico profundo de mensagens (até maxCount)
   */
  function getMessagesFromActiveChat(maxCount = 15) {
    const main = document.querySelector("#main");
    if (!main) return [];

    const messageNodes = main.querySelectorAll("div.message-in, div.message-out");
    const list = [];

    messageNodes.forEach(node => {
      const isFromMe = node.classList.contains("message-out");
      const textEl = node.querySelector(".selectable-text span, span.copyable-text, span._ao3e");
      if (textEl && textEl.innerText.trim()) {
        const text = textEl.innerText.trim();
        const timeEl = node.querySelector('span[dir="auto"].x1c4vz4f, div[data-pre-plain-text]');
        const time = timeEl ? timeEl.innerText : "";
        list.push({ fromMe: isFromMe, text, time });
      }
    });

    return list.slice(-maxCount);
  }

  function getCurrentChatContactName() {
    const headerTitle = document.querySelector("#main header span[dir='auto']");
    if (headerTitle) return headerTitle.innerText.trim();
    return "Contato";
  }

  function isCurrentChatGroup() {
    const header = document.querySelector("#main header");
    if (!header) return false;
    return !!header.querySelector('span[data-icon="default-group"]') || !!header.querySelector("span[title*=',']");
  }

  async function typeAndSendMessage(text) {
    const inputSelectors = [
      "#main footer div[contenteditable='true']",
      "div[data-tab='10'][contenteditable='true']",
      "div[data-lexical-editor='true']",
      "#main footer p.selectable-text"
    ];

    let inputEl = null;
    for (const sel of inputSelectors) {
      const el = document.querySelector(sel);
      if (el) {
        inputEl = el;
        break;
      }
    }

    if (!inputEl) return false;

    inputEl.focus();
    inputEl.innerHTML = "";

    const success = document.execCommand("insertText", false, text);
    if (!success || inputEl.innerText.trim() === "") {
      inputEl.textContent = text;
      inputEl.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: text }));
    }

    await sleep(250);

    const sendBtn = document.querySelector(
      "#main footer button[aria-label*='Enviar'], #main footer button[aria-label*='Send'], #main footer span[data-icon='send'], #main footer button span[data-icon='send']"
    );

    if (sendBtn) {
      (sendBtn.closest("button") || sendBtn).click();
      return true;
    } else {
      inputEl.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", code: "Enter", keyCode: 13, which: 13, bubbles: true }));
      return true;
    }
  }

  let bannerTimer = null;
  function showNotificationBanner(message, duration = 0) {
    let banner = document.getElementById("whatsgemini-banner");
    if (!banner) {
      banner = document.createElement("div");
      banner.id = "whatsgemini-banner";
      banner.className = "whatsgemini-banner";
      document.body.appendChild(banner);
    }

    banner.innerText = message;
    banner.classList.add("wg-show");

    if (bannerTimer) clearTimeout(bannerTimer);
    if (duration > 0) {
      bannerTimer = setTimeout(() => {
        banner.classList.remove("wg-show");
      }, duration);
    }
  }

  function sendMessageToBackground(payload) {
    return new Promise(resolve => {
      chrome.runtime.sendMessage(payload, res => resolve(res));
    });
  }

  function waitForElement(selector, timeout = 10000) {
    return new Promise((resolve, reject) => {
      const start = Date.now();
      const interval = setInterval(() => {
        const el = document.querySelector(selector);
        if (el) {
          clearInterval(interval);
          resolve(el);
        } else if (Date.now() - start > timeout) {
          clearInterval(interval);
          reject(new Error("Timeout " + selector));
        }
      }, 500);
    });
  }

  function sleep(ms) {
    return new Promise(res => setTimeout(res, ms));
  }
})();
