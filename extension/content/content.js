/**
 * WhatsGemini Pro - Content Script (Ultra-Resilient WhatsApp Web Engine)
 * Injetado no WhatsApp Web (https://web.whatsapp.com)
 */

(() => {
  let isProcessing = false;
  let processedMessageIds = new Set();
  let scannerInterval = null;
  let floatingWidget = null;
  let lastRepliedText = "";
  let lastRepliedTime = 0;
  let currentHeaderContact = null;

  console.log("%c[WhatsGemini Pro]%c Sistema de Auto-Resposta Carregado!", "background: #25D366; color: black; font-weight: bold; padding: 4px 8px; border-radius: 4px;", "");

  init();

  async function init() {
    // Aguarda o WhatsApp Web carregar completamente
    await waitForWhatsAppLoad();

    createFloatingWidget();
    observeHeaderChanges();

    // Escuta alterações de configurações
    chrome.storage.onChanged.addListener((changes) => {
      if (changes.enabled) {
        updateWidgetState(changes.enabled.newValue);
        if (changes.enabled.newValue) startScanner();
        else stopScanner();
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

    startScanner();
    showNotificationBanner("✨ WhatsGemini Pro Ativo e Monitorando Conversas!", 3500);
  }

  function waitForWhatsAppLoad() {
    return new Promise((resolve) => {
      const check = setInterval(() => {
        if (document.querySelector("#pane-side") || document.querySelector("#main")) {
          clearInterval(check);
          resolve();
        }
      }, 500);
      // Timeout de segurança em 10s
      setTimeout(() => { clearInterval(check); resolve(); }, 10000);
    });
  }

  /**
   * Monitora a troca de conversa para injetar botões no topo
   */
  function observeHeaderChanges() {
    setInterval(() => {
      const header = document.querySelector("#main header");
      if (!header) return;

      const contactName = getCurrentChatContactName();
      if (contactName && contactName !== currentHeaderContact) {
        currentHeaderContact = contactName;
        injectChatHeaderButtons(header, contactName);
      }
    }, 1200);
  }

  async function injectChatHeaderButtons(header, contactName) {
    let actionsContainer = document.getElementById("wg-header-actions");
    if (!actionsContainer) {
      actionsContainer = document.createElement("div");
      actionsContainer.id = "wg-header-actions";
      actionsContainer.className = "wg-header-actions";
      header.appendChild(actionsContainer);
    }

    const { whitelist = [], blacklist = [] } = await chrome.storage.local.get(["whitelist", "blacklist"]);
    const clean = contactName.toLowerCase().trim();
    const isFocused = whitelist.some(item => clean.includes(item.toLowerCase().trim()));
    const isBlocked = blacklist.some(item => clean.includes(item.toLowerCase().trim()));

    actionsContainer.innerHTML = `
      <button id="wg-btn-test-now" class="wg-action-btn wg-btn-test" title="Testar resposta imediata da IA nesta conversa">
        ⚡ Testar Resposta
      </button>
      <button id="wg-btn-focus" class="wg-action-btn ${isFocused ? 'wg-btn-focused' : ''}" title="${isFocused ? 'Remover Foco' : 'Adicionar à lista de Foco'}">
        🎯 ${isFocused ? 'Foco: ATIVO' : 'Focar IA'}
      </button>
      <button id="wg-btn-block" class="wg-action-btn ${isBlocked ? 'wg-btn-blocked' : ''}" title="${isBlocked ? 'Desbloquear' : 'Bloquear / Não Responder'}">
        🚫 ${isBlocked ? 'Bloqueado' : 'Ignorar'}
      </button>
    `;

    document.getElementById("wg-btn-test-now")?.addEventListener("click", (e) => {
      e.stopPropagation();
      forceTriggerReplyInCurrentChat();
    });

    document.getElementById("wg-btn-focus")?.addEventListener("click", (e) => {
      e.stopPropagation();
      chrome.runtime.sendMessage({ action: "TOGGLE_FOCUS_CONTACT", contactName }, () => {
        injectChatHeaderButtons(header, contactName);
        showNotificationBanner(isFocused ? `Foco removido de ${contactName}` : `🎯 ${contactName} está no FOCO da IA!`, 2500);
      });
    });

    document.getElementById("wg-btn-block")?.addEventListener("click", (e) => {
      e.stopPropagation();
      chrome.runtime.sendMessage({ action: "TOGGLE_BLOCK_CONTACT", contactName }, () => {
        injectChatHeaderButtons(header, contactName);
        showNotificationBanner(isBlocked ? `${contactName} desbloqueado` : `🚫 ${contactName} BLOQUEADO!`, 2500);
      });
    });
  }

  function updateChatHeaderButtons() {
    const header = document.querySelector("#main header");
    const contactName = getCurrentChatContactName();
    if (header && contactName) injectChatHeaderButtons(header, contactName);
  }

  /**
   * Widget Flutuante no WhatsApp Web
   */
  function createFloatingWidget() {
    if (document.getElementById("whatsgemini-widget")) return;

    floatingWidget = document.createElement("div");
    floatingWidget.id = "whatsgemini-widget";
    floatingWidget.className = "whatsgemini-badge wg-active";
    floatingWidget.innerHTML = `
      <div class="wg-icon">✨</div>
      <div class="wg-info">
        <span class="wg-title">WhatsGemini Pro</span>
        <span class="wg-status" id="wg-status-text">Monitorando mensagens</span>
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
      if (statusText) statusText.innerText = "Monitorando conversas";
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
    scannerInterval = setInterval(scanAndProcess, 2000); // Checagem a cada 2 segundos
  }

  function stopScanner() {
    if (scannerInterval) {
      clearInterval(scannerInterval);
      scannerInterval = null;
    }
  }

  /**
   * Ciclo principal de monitoramento
   */
  async function scanAndProcess() {
    if (isProcessing) return;

    const config = await chrome.storage.local.get([
      "enabled",
      "responseMode",
      "ignoreGroups",
      "fastMode",
      "minDelaySeconds",
      "maxDelaySeconds",
      "contextDepth",
      "allowSelfTest"
    ]);

    if (config.enabled === false) return;

    // 1. Processa conversa atualmente aberta no #main
    const handledActive = await processCurrentActiveChat(config);
    if (handledActive) return;

    // 2. Se configurado para varrer outros contatos, busca não lidas no #pane-side
    if (config.responseMode !== "active_only") {
      await processNextUnreadChat(config);
    }
  }

  /**
   * Processa a conversa aberta
   */
  async function processCurrentActiveChat(config) {
    const mainChat = document.querySelector("#main");
    if (!mainChat) return false;

    if (config.ignoreGroups && isCurrentChatGroup()) {
      return false;
    }

    const contactName = getCurrentChatContactName();
    const isSelfChat = isCurrentChatSelf();

    // Captura histórico de mensagens
    const messages = getAllMessagesInChat(config.contextDepth || 15);
    if (!messages || messages.length === 0) return false;

    const lastMsg = messages[messages.length - 1];

    // Se a última mensagem for do próprio usuário e NÃO for um teste consigo mesmo, não responder
    if (lastMsg.fromMe && !isSelfChat) {
      return false;
    }

    // Identificador único da mensagem para nunca responder duas vezes
    const msgId = `${contactName}_${lastMsg.text}_${lastMsg.time || ""}_${lastMsg.id || ""}`;
    if (processedMessageIds.has(msgId)) return false;

    // Evita loop no mesmo chat se a última resposta foi há menos de 4s com mesmo texto
    const now = Date.now();
    if (lastRepliedText === lastMsg.text && (now - lastRepliedTime) < 4000) {
      return false;
    }

    isProcessing = true;
    showNotificationBanner(`📩 Mensagem recebida de ${contactName}. Gerando resposta...`);

    try {
      console.log(`[WhatsGemini] Nova mensagem detectada de "${contactName}": "${lastMsg.text}"`);

      const response = await sendMessageToBackground({
        action: "GENERATE_REPLY",
        data: {
          contactName: contactName,
          lastMessage: lastMsg.text,
          messageHistory: messages
        }
      });

      if (response && response.success && response.reply) {
        // Delay (Modo Rápido = 0.8s a 1.5s, Modo Normal = 3s a 5s)
        let delayMs = 1000;
        if (config.fastMode !== false) {
          delayMs = Math.floor(Math.random() * 700) + 700;
        } else {
          const min = config.minDelaySeconds || 2;
          const max = config.maxDelaySeconds || 5;
          delayMs = (Math.floor(Math.random() * (max - min + 1)) + min) * 1000;
        }

        showNotificationBanner(`Digitando (${(delayMs/1000).toFixed(1)}s)...`);
        await sleep(delayMs);

        const sent = await typeAndSendMessage(response.reply);
        if (sent) {
          processedMessageIds.add(msgId);
          lastRepliedText = response.reply;
          lastRepliedTime = Date.now();
          console.log(`[WhatsGemini] Resposta enviada para ${contactName}: "${response.reply}"`);
          showNotificationBanner(`✅ Respondido com sucesso: ${contactName}`, 3000);
        } else {
          showNotificationBanner(`⚠️ Não foi possível inserir o texto no campo de mensagem.`, 4000);
        }
      } else if (response && response.ignored) {
        console.log(`[WhatsGemini] Ignorado: ${response.reason}`);
        processedMessageIds.add(msgId); // Marca para não ficar tentando
      } else if (response && response.error) {
        console.warn("[WhatsGemini] Erro retornado pela IA:", response.error);
        showNotificationBanner(`⚠️ ${response.error}`, 5000);
      }
    } catch (err) {
      console.error("[WhatsGemini] Erro:", err);
    } finally {
      isProcessing = false;
    }

    return true;
  }

  /**
   * Força uma resposta teste na conversa atual
   */
  async function forceTriggerReplyInCurrentChat() {
    const contactName = getCurrentChatContactName();
    const messages = getAllMessagesInChat(10);
    const lastText = messages.length > 0 ? messages[messages.length - 1].text : "Olá, teste rápido!";

    showNotificationBanner(`⚡ Testando resposta imediata para ${contactName}...`);

    const response = await sendMessageToBackground({
      action: "GENERATE_REPLY",
      data: {
        contactName: contactName,
        lastMessage: lastText,
        messageHistory: messages
      }
    });

    if (response && response.success && response.reply) {
      await typeAndSendMessage(response.reply);
      showNotificationBanner(`✅ Teste enviado: "${response.reply.substring(0, 30)}..."`, 3500);
    } else {
      showNotificationBanner(`❌ Falha no teste: ${response?.error || 'Erro'}`, 4500);
    }
  }

  /**
   * Procura chats com mensagens não lidas na lista lateral
   */
  async function processNextUnreadChat(config) {
    const paneSide = document.querySelector("#pane-side");
    if (!paneSide) return;

    // Seletores abrangentes para badges de mensagens não lidas
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

          console.log("[WhatsGemini] Abrindo conversa não lida...");
          chatItem.click();
          await sleep(1400);
          return;
        }
      }
    }
  }

  /**
   * Extração ultra-resiliente de mensagens do chat aberto
   */
  function getAllMessagesInChat(maxCount = 15) {
    const main = document.querySelector("#main");
    if (!main) return [];

    // Busca todos os balões com data-id (padrão oficial do WhatsApp Web) ou classes de fallback
    const messageElements = main.querySelectorAll(
      'div[data-id], div.message-in, div.message-out, div[data-testid="msg-container"]'
    );

    const list = [];

    messageElements.forEach((node) => {
      const dataId = node.getAttribute("data-id") || "";
      
      // No WhatsApp Web:
      // data-id="false_..." -> mensagem recebida (outro contato)
      // data-id="true_..."  -> mensagem enviada (eu)
      let fromMe = false;
      if (dataId.startsWith("true_") || node.classList.contains("message-out")) {
        fromMe = true;
      } else if (dataId.startsWith("false_") || node.classList.contains("message-in")) {
        fromMe = false;
      }

      // Captura o texto com múltiplos seletores
      let text = "";
      const textEl = node.querySelector('.selectable-text span, span.copyable-text, span._ao3e, span[dir="ltr"], span[dir="auto"]');
      if (textEl && textEl.innerText.trim()) {
        text = textEl.innerText.trim();
      } else {
        // Fallback: extrai texto direto limpando horários
        const clone = node.cloneNode(true);
        const timeBadge = clone.querySelector('span[dir="auto"].x1c4vz4f, div[data-pre-plain-text]');
        if (timeBadge) timeBadge.remove();
        text = clone.innerText.trim();
      }

      // Pula balões de sistema como "mensagens temporárias" ou datas
      if (!text || text.length === 0 || text.startsWith("Mensagens e chamadas são protegidas")) return;

      const timeEl = node.querySelector('span[dir="auto"].x1c4vz4f, div[data-pre-plain-text]');
      const time = timeEl ? timeEl.innerText.trim() : "";

      list.push({
        id: dataId,
        fromMe: fromMe,
        text: text,
        time: time
      });
    });

    return list.slice(-maxCount);
  }

  function getCurrentChatContactName() {
    const headerTitle = document.querySelector("#main header span[dir='auto'], #main header h2 span, #main header div[role='button'] span");
    if (headerTitle && headerTitle.innerText.trim()) {
      return headerTitle.innerText.trim();
    }
    return "Contato";
  }

  function isCurrentChatSelf() {
    const name = getCurrentChatContactName().toLowerCase();
    return name === "você" || name === "you" || name === "(você)" || name.includes("mensagens salvas");
  }

  function isCurrentChatGroup() {
    const header = document.querySelector("#main header");
    if (!header) return false;
    return !!header.querySelector('span[data-icon="default-group"]') || !!header.querySelector("span[title*=',']");
  }

  /**
   * Inserção e Envio no Editor Lexical do WhatsApp Web
   */
  async function typeAndSendMessage(text) {
    const inputSelectors = [
      '#main footer div[contenteditable="true"]',
      'div[data-tab="10"][contenteditable="true"]',
      'div[data-lexical-editor="true"]',
      '#main footer p.selectable-text',
      'footer div[role="textbox"]'
    ];

    let inputEl = null;
    for (const sel of inputSelectors) {
      const el = document.querySelector(sel);
      if (el) {
        inputEl = el;
        break;
      }
    }

    if (!inputEl) {
      console.error("[WhatsGemini] Campo de mensagem não encontrado!");
      return false;
    }

    // Foca o campo
    inputEl.focus();

    // Cria seleção para o comando de inserção
    const sel = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(inputEl);
    range.collapse(false);
    sel.removeAllRanges();
    sel.addRange(range);

    // Tenta inserção via execCommand
    let inserted = document.execCommand("insertText", false, text);

    // Se o execCommand falhou (comum em versões recentes do Lexical), usa InputEvent
    if (!inserted || !inputEl.innerText || inputEl.innerText.trim() === "") {
      try {
        const inputEvent = new InputEvent("beforeinput", {
          bubbles: true,
          cancelable: true,
          inputType: "insertText",
          data: text
        });
        inputEl.dispatchEvent(inputEvent);

        inputEl.innerText = text;
        inputEl.dispatchEvent(new InputEvent("input", { bubbles: true, composed: true }));
      } catch (e) {
        console.warn("[WhatsGemini] Fallback input error:", e);
      }
    }

    inputEl.dispatchEvent(new Event("change", { bubbles: true }));

    await sleep(350);

    // Clica no botão Enviar do WhatsApp
    const sendBtnSelectors = [
      '#main footer button[aria-label*="Enviar"]',
      '#main footer button[aria-label*="Send"]',
      '#main footer span[data-icon="send"]',
      '#main footer button[data-testid="compose-btn-send"]',
      '#main footer button span[data-icon="send"]'
    ];

    let sent = false;
    for (const s of sendBtnSelectors) {
      const btn = document.querySelector(s);
      if (btn) {
        (btn.closest("button") || btn).click();
        sent = true;
        break;
      }
    }

    // Se não achou o botão de clique, dispara Enter
    if (!sent) {
      const enterDown = new KeyboardEvent("keydown", {
        key: "Enter",
        code: "Enter",
        keyCode: 13,
        which: 13,
        bubbles: true,
        cancelable: true
      });
      inputEl.dispatchEvent(enterDown);
      sent = true;
    }

    return sent;
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

  function sleep(ms) {
    return new Promise(res => setTimeout(res, ms));
  }
})();
