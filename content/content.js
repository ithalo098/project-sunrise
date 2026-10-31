/**
 * WhatsGemini Pro - Content Script
 * Injetado no WhatsApp Web (https://web.whatsapp.com)
 * Monitora mensagens recebidas, conversa com Gemini via background e envia respostas.
 */

(() => {
  // Estado interno
  let isProcessing = false;
  let processedMessages = new Set();
  let scannerInterval = null;
  let floatingWidget = null;
  let lastRepliedChat = null;
  let lastRepliedTime = 0;

  console.log("%c[WhatsGemini Pro]%c Extensão carregada no WhatsApp Web!", "background: #25D366; color: black; font-weight: bold; padding: 2px 5px; border-radius: 3px;", "");

  // Inicialização
  init();

  async function init() {
    // Aguarda o WhatsApp Web carregar completamente o painel principal
    await waitForElement("#pane-side, #main", 60000).catch(() => null);

    // Cria o Widget Flutuante na tela do WhatsApp
    createFloatingWidget();

    // Inicia observador de configurações
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
    });

    const config = await chrome.storage.local.get(["enabled", "repliesCount"]);
    updateWidgetState(config.enabled || false);
    updateWidgetCount(config.repliesCount || 0);

    if (config.enabled) {
      startScanner();
    }
  }

  /**
   * Cria o widget flutuante no WhatsApp Web com status e controle rápido
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
        <span class="wg-status" id="wg-status-text">Iniciando...</span>
      </div>
      <div class="wg-count" id="wg-count-badge" title="Mensagens respondidas com IA">0</div>
      <button class="wg-toggle-btn" id="wg-toggle-btn" title="Ativar/Pausar Auto-Resposta">
        <span id="wg-toggle-icon">▶</span>
      </button>
    `;

    document.body.appendChild(floatingWidget);

    const toggleBtn = document.getElementById("wg-toggle-btn");
    toggleBtn.addEventListener("click", () => {
      chrome.runtime.sendMessage({ action: "TOGGLE_ENABLED" }, (response) => {
        if (response && response.success) {
          updateWidgetState(response.enabled);
        }
      });
    });
  }

  function updateWidgetState(enabled) {
    if (!floatingWidget) return;
    const statusText = document.getElementById("wg-status-text");
    const toggleIcon = document.getElementById("wg-toggle-icon");
    const toggleBtn = document.getElementById("wg-toggle-btn");

    if (enabled) {
      floatingWidget.classList.add("wg-active");
      floatingWidget.classList.remove("wg-paused");
      if (statusText) statusText.innerText = "Monitorando conversas";
      if (toggleIcon) toggleIcon.innerText = "⏸";
      if (toggleBtn) toggleBtn.title = "Pausar IA";
    } else {
      floatingWidget.classList.remove("wg-active");
      floatingWidget.classList.add("wg-paused");
      if (statusText) statusText.innerText = "Pausado (desativado)";
      if (toggleIcon) toggleIcon.innerText = "▶";
      if (toggleBtn) toggleBtn.title = "Ativar IA";
    }
  }

  function updateWidgetCount(count) {
    const badge = document.getElementById("wg-count-badge");
    if (badge) badge.innerText = count || 0;
  }

  /**
   * Inicia o ciclo de monitoramento e varredura de mensagens
   */
  function startScanner() {
    if (scannerInterval) clearInterval(scannerInterval);
    scannerInterval = setInterval(scanAndProcess, 4000);
    console.log("[WhatsGemini Pro] Monitoramento de conversas ativado.");
  }

  function stopScanner() {
    if (scannerInterval) {
      clearInterval(scannerInterval);
      scannerInterval = null;
    }
    console.log("[WhatsGemini Pro] Monitoramento pausado.");
  }

  /**
   * Varredura principal:
   * 1. Primeiro verifica se a conversa atualmente aberta possui uma mensagem recebida não respondida.
   * 2. Se a conversa aberta já estiver respondida, procura por conversas com selo de 'não lida' na lista lateral e abre uma por uma.
   */
  async function scanAndProcess() {
    if (isProcessing) return;

    const config = await chrome.storage.local.get([
      "enabled",
      "apiKey",
      "ignoreGroups",
      "minDelaySeconds",
      "maxDelaySeconds"
    ]);

    if (!config.enabled || !config.apiKey) return;

    // 1. Processar conversa aberta no momento
    const activeChatHandled = await processCurrentActiveChat(config);
    if (activeChatHandled) return;

    // 2. Se configurado para varrer todas as não lidas, busca na lista lateral
    await processNextUnreadChat(config);
  }

  /**
   * Processa mensagens da conversa atualmente aberta na tela (#main)
   */
  async function processCurrentActiveChat(config) {
    const mainChat = document.querySelector("#main");
    if (!mainChat) return false;

    // Verifica se é grupo e se grupos devem ser ignorados
    if (config.ignoreGroups && isCurrentChatGroup()) {
      return false;
    }

    const contactName = getCurrentChatContactName();
    const messages = getMessagesFromActiveChat();
    if (!messages || messages.length === 0) return false;

    const lastMsg = messages[messages.length - 1];

    // Se a última mensagem partiu de mim, nada a fazer
    if (lastMsg.fromMe) return false;

    // Se já respondemos essa mensagem específica, nada a fazer
    const messageId = `${contactName}_${lastMsg.text}_${lastMsg.time || ""}`;
    if (processedMessages.has(messageId)) return false;

    // Evita loop consecutivo no mesmo chat com intervalo menor que 4 segundos
    const now = Date.now();
    if (lastRepliedChat === contactName && (now - lastRepliedTime) < 4000) {
      return false;
    }

    isProcessing = true;
    showNotificationBanner(`Gerando resposta com Gemini para ${contactName}...`);

    try {
      console.log(`[WhatsGemini Pro] Mensagem recebida de "${contactName}": "${lastMsg.text}"`);

      // Envia para o background worker chamar o Gemini Pro
      const response = await sendMessageToBackground({
        action: "GENERATE_REPLY",
        data: {
          contactName: contactName,
          lastMessage: lastMsg.text,
          messageHistory: messages.slice(-5) // Últimas 5 mensagens de contexto
        }
      });

      if (response && response.success && response.reply) {
        // Simula tempo de digitação natural humano
        const delay = getRandomDelay(config.minDelaySeconds || 3, config.maxDelaySeconds || 6);
        showNotificationBanner(`Digitando resposta para ${contactName} (${delay}s)...`);
        await sleep(delay * 1000);

        // Digita e envia no WhatsApp Web
        const sent = await typeAndSendMessage(response.reply);
        if (sent) {
          processedMessages.add(messageId);
          lastRepliedChat = contactName;
          lastRepliedTime = Date.now();
          console.log(`[WhatsGemini Pro] Resposta enviada para ${contactName}!`);
          showNotificationBanner(`✅ Respondido com sucesso: ${contactName}`, 3000);
        }
      } else if (response && response.error) {
        console.warn("[WhatsGemini Pro] Erro:", response.error);
        showNotificationBanner(`⚠️ ${response.error}`, 5000);
      }
    } catch (err) {
      console.error("[WhatsGemini Pro] Falha ao responder chat:", err);
    } finally {
      isProcessing = false;
    }

    return true;
  }

  /**
   * Encontra a próxima conversa não lida na lista lateral (#pane-side) e clica nela
   */
  async function processNextUnreadChat(config) {
    const paneSide = document.querySelector("#pane-side");
    if (!paneSide) return;

    // Seletores comuns para badges de não lidas no WhatsApp Web
    const unreadBadges = paneSide.querySelectorAll(
      'span[aria-label*="não lida"], span[aria-label*="unread"], span[data-icon="unread-count"], [aria-label*="unread message"], span.x10l6tqk'
    );

    for (const badge of unreadBadges) {
      const text = badge.innerText || badge.getAttribute("aria-label") || "";
      const isUnreadNumber = /\d+/.test(text) || text.toLowerCase().includes("não lida") || text.toLowerCase().includes("unread");

      if (isUnreadNumber) {
        // Encontra o container clicável da linha da conversa
        const chatItem = badge.closest('div[role="listitem"]') || badge.closest('div[role="row"]') || badge.closest('div._ak72') || badge.closest('div[tabindex="-1"]');
        if (chatItem) {
          // Se for grupo e ignorar grupos estiver ativo
          if (config.ignoreGroups) {
            const hasGroupIcon = chatItem.querySelector('span[data-icon="default-group"], span[data-icon="community-outline"]');
            if (hasGroupIcon) continue; // Pula este grupo
          }

          console.log("[WhatsGemini Pro] Conversa não lida detectada! Abrindo chat...");
          chatItem.click();
          await sleep(1500); // Aguarda renderizar mensagens no #main
          return;
        }
      }
    }
  }

  /**
   * Extrai mensagens do chat aberto atualmente (#main)
   */
  function getMessagesFromActiveChat() {
    const main = document.querySelector("#main");
    if (!main) return [];

    const messageNodes = main.querySelectorAll("div.message-in, div.message-out");
    const list = [];

    messageNodes.forEach(node => {
      const isFromMe = node.classList.contains("message-out");
      // Tenta capturar o texto dentro do balão
      const textEl = node.querySelector(".selectable-text span, span.copyable-text, span._ao3e");
      if (textEl && textEl.innerText.trim()) {
        const text = textEl.innerText.trim();
        // Horário opcional
        const timeEl = node.querySelector('span[dir="auto"].x1c4vz4f, div[data-pre-plain-text]');
        const time = timeEl ? timeEl.innerText : "";
        list.push({ fromMe: isFromMe, text: text, time: time });
      }
    });

    return list;
  }

  /**
   * Obtém o nome ou número do contato do chat atual
   */
  function getCurrentChatContactName() {
    const headerTitle = document.querySelector("#main header span[dir='auto']");
    if (headerTitle) return headerTitle.innerText.trim();
    return "Contato";
  }

  /**
   * Verifica se o chat atual é um grupo
   */
  function isCurrentChatGroup() {
    const header = document.querySelector("#main header");
    if (!header) return false;

    // Se possui ícone de grupo ou subtítulo com múltiplos participantes (vírgulas)
    const groupIcon = header.querySelector('span[data-icon="default-group"]');
    if (groupIcon) return true;

    const subText = header.querySelector("span[title*=',']");
    if (subText) return true;

    return false;
  }

  /**
   * Digita a resposta na caixa de texto do WhatsApp Web e aciona o envio
   */
  async function typeAndSendMessage(text) {
    // Procura o input contenteditable do rodapé
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

    if (!inputEl) {
      console.error("[WhatsGemini Pro] Campo de texto de mensagem não encontrado!");
      return false;
    }

    // Foca o campo
    inputEl.focus();

    // Limpa caso haja rascunho anterior
    inputEl.innerHTML = "";

    // Tenta inserção via comando do navegador (compatível com Lexical editor do React)
    const success = document.execCommand("insertText", false, text);

    if (!success || inputEl.innerText.trim() === "") {
      // Fallback para input event
      inputEl.textContent = text;
      inputEl.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: text }));
    }

    await sleep(400);

    // Localiza e clica no botão de Enviar
    const sendButton = document.querySelector(
      "#main footer button[aria-label*='Enviar'], #main footer button[aria-label*='Send'], #main footer span[data-icon='send'], #main footer button span[data-icon='send']"
    );

    if (sendButton) {
      const clickTarget = sendButton.closest("button") || sendButton;
      clickTarget.click();
      return true;
    } else {
      // Fallback para tecla Enter
      const enterEvent = new KeyboardEvent("keydown", {
        key: "Enter",
        code: "Enter",
        keyCode: 13,
        which: 13,
        bubbles: true
      });
      inputEl.dispatchEvent(enterEvent);
      return true;
    }
  }

  /**
   * Banner de notificação visual discreto no topo da conversa
   */
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
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(payload, (res) => {
        resolve(res);
      });
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
          reject(new Error("Timeout waiting for " + selector));
        }
      }, 500);
    });
  }

  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  function getRandomDelay(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
})();
