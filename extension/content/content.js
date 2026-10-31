/**
 * WhatsGemini Pro - Content Script (Ultra-Autonomous Hands-Free Engine)
 * Injetado no WhatsApp Web (https://web.whatsapp.com)
 * Varre contatos não lidos, ignora grupos, abre conversas de pessoas,
 * formula respostas com Gemini Pro (Modo Íthalo) e envia 100% no automático.
 */

(() => {
  let isProcessing = false;
  let respondedMessageKeys = new Set();
  let repliedChatsHistory = new Map(); // contactName -> lastRepliedText
  let scannerInterval = null;
  let floatingWidget = null;
  let currentHeaderContact = null;

  console.log(
    "%c[WhatsGemini Pro]%c Sistema Autônomo Mãos-Livres Carregado!",
    "background: #25D366; color: black; font-weight: bold; padding: 4px 8px; border-radius: 4px;",
    ""
  );

  init();

  async function init() {
    await waitForWhatsAppLoad();

    createFloatingWidget();
    observeHeaderChanges();

    // Ouvinte de alterações nas configurações
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
    showNotificationBanner("✨ WhatsGemini Pro Ativo: Monitoramento 100% Mãos-Livres!", 4000);
  }

  function waitForWhatsAppLoad() {
    return new Promise((resolve) => {
      const check = setInterval(() => {
        if (document.querySelector("#pane-side") || document.querySelector("#main")) {
          clearInterval(check);
          resolve();
        }
      }, 500);
      setTimeout(() => { clearInterval(check); resolve(); }, 12000);
    });
  }

  /**
   * Ciclo contínuo de varredura autônoma (a cada 2.5s)
   */
  function startScanner() {
    if (scannerInterval) clearInterval(scannerInterval);
    scannerInterval = setInterval(scanAndProcessAutonomously, 2500);
    console.log("[WhatsGemini Pro] Varredura autônoma iniciada (mãos-livres).");
  }

  function stopScanner() {
    if (scannerInterval) {
      clearInterval(scannerInterval);
      scannerInterval = null;
    }
    console.log("[WhatsGemini Pro] Varredura pausada.");
  }

  /**
   * Varredura principal autônoma:
   * 1. Verifica se há conversas não lidas no painel lateral (#pane-side).
   * 2. Filtra APENAS pessoas (ignora grupos categoricamente).
   * 3. Abre a conversa do contato e responde automaticamente.
   * 4. Se não houver não lidas, verifica a conversa atualmente aberta no #main.
   */
  async function scanAndProcessAutonomously() {
    if (isProcessing) return;

    const config = await chrome.storage.local.get([
      "enabled",
      "responseMode",
      "autoScanHandsFree",
      "ignoreGroups",
      "audioMode",
      "fastMode",
      "minDelaySeconds",
      "maxDelaySeconds",
      "blacklist",
      "whitelist"
    ]);

    if (config.enabled === false) return;

    // 1. Procura na barra lateral por pessoas com mensagens não lidas
    if (config.autoScanHandsFree !== false) {
      const unreadFound = await findAndOpenUnreadPersonChat(config);
      if (unreadFound) return;
    }

    // 2. Se não abriu uma nova conversa, processa a conversa que já está aberta no momento
    await processOpenChatIfPending(config);
  }

  /**
   * Encontra a primeira pessoa não lida na lista lateral (#pane-side),
   * clica nela para abrir e prossegue com a resposta.
   */
  async function findAndOpenUnreadPersonChat(config) {
    const paneSide = document.querySelector("#pane-side");
    if (!paneSide) return false;

    // Busca todos os itens de conversa na lista lateral
    const chatRows = Array.from(
      paneSide.querySelectorAll('div[role="listitem"], div[role="row"], div[data-testid="cell-frame-container"]')
    );

    for (const row of chatRows) {
      // 1. Verifica se tem selo de não lida
      const unreadCount = getChatRowUnreadCount(row);
      if (unreadCount <= 0) continue;

      // 2. Verifica se é grupo. Se for grupo, PULA IMEDIATAMENTE!
      if (config.ignoreGroups !== false && isChatRowGroup(row)) {
        continue;
      }

      // 3. Obtém o nome do contato
      const contactName = getChatRowContactName(row);
      const cleanName = contactName.toLowerCase().trim();

      // 4. Checa lista negra
      const isBlacklisted = (config.blacklist || []).some(b => cleanName.includes(b.toLowerCase().trim()));
      if (isBlacklisted) continue;

      // 5. Checa lista de foco (se modo foco estiver ativo)
      if (config.responseMode === "whitelist") {
        const isWhitelisted = (config.whitelist || []).some(w => cleanName.includes(w.toLowerCase().trim()));
        if (!isWhitelisted) continue;
      }

      // Encontrou uma pessoa com mensagem nova!
      console.log(`[WhatsGemini Pro] Mensagem não lida encontrada de "${contactName}" (${unreadCount} novas). Abrindo conversa...`);
      showNotificationBanner(`📩 Abrindo conversa com ${contactName}...`);

      isProcessing = true;
      try {
        // Clica na conversa com todos os eventos do React
        clickElementSafely(row);

        // Aguarda a renderização do chat no #main
        await sleep(1000);

        // Confirma se o chat aberto não é grupo
        if (config.ignoreGroups !== false && isCurrentMainChatGroup()) {
          console.log(`[WhatsGemini Pro] Chat aberto identificado como grupo. Pulando.`);
          return false;
        }

        // Processa o envio da resposta
        await replyToActiveChatMessages(contactName, config);
        return true;
      } catch (err) {
        console.error("[WhatsGemini Pro] Erro ao abrir/responder chat:", err);
      } finally {
        isProcessing = false;
      }
    }

    return false;
  }

  /**
   * Processa a conversa que já está aberta no centro da tela (#main)
   */
  async function processOpenChatIfPending(config) {
    const mainChat = document.querySelector("#main");
    if (!mainChat) return false;

    if (config.ignoreGroups !== false && isCurrentMainChatGroup()) {
      return false;
    }

    const contactName = getCurrentChatContactName();
    if (!contactName || contactName === "Contato") return false;

    const cleanName = contactName.toLowerCase().trim();

    // Filtros de Blacklist e Whitelist
    if ((config.blacklist || []).some(b => cleanName.includes(b.toLowerCase().trim()))) return false;
    if (config.responseMode === "whitelist" && !(config.whitelist || []).some(w => cleanName.includes(w.toLowerCase().trim()))) {
      return false;
    }

    isProcessing = true;
    try {
      await replyToActiveChatMessages(contactName, config);
    } catch (err) {
      console.error("[WhatsGemini Pro] Erro no chat aberto:", err);
    } finally {
      isProcessing = false;
    }
  }

  /**
   * Lê as mensagens do chat aberto, verifica se a última foi recebida
   * e chama o Gemini para responder.
   */
  async function replyToActiveChatMessages(contactName, config) {
    const messages = getAllMessagesInChat(config.contextDepth || 15);
    if (!messages || messages.length === 0) return;

    const lastMsg = messages[messages.length - 1];

    // Se a última mensagem partiu de mim, já respondemos ou é uma conversa onde eu falei por último
    if (lastMsg.fromMe) return;

    // Chave única para evitar responder a mesma mensagem duas vezes
    const msgKey = `${contactName}__${lastMsg.id || lastMsg.text}`;
    if (respondedMessageKeys.has(msgKey)) return;

    // Se no histórico recente nós já enviamos resposta para exatamente este mesmo texto recebido
    if (repliedChatsHistory.get(contactName) === lastMsg.text) return;

    console.log(`[WhatsGemini Pro] Processando resposta para "${contactName}": "${lastMsg.text}"`);
    showNotificationBanner(`🤖 Íthalo IA gerando resposta para ${contactName}...`);

    // Chama o background worker
    const response = await sendMessageToBackground({
      action: "GENERATE_REPLY",
      data: {
        contactName: contactName,
        lastMessage: lastMsg.text,
        messageHistory: messages
      }
    });

    if (response && response.success && response.reply) {
      // Pequeno atraso humano (Modo Rápido: ~0.8s a 1.5s)
      const isFast = config.fastMode !== false;
      const delay = isFast ? getRandomDelay(0.8, 1.5) : getRandomDelay(config.minDelaySeconds || 2, config.maxDelaySeconds || 4);
      showNotificationBanner(`⚡ Digitando como Íthalo (${delay.toFixed(1)}s)...`);
      await sleep(delay * 1000);

      // Digita e envia a resposta no WhatsApp Web
      const sent = await typeAndSendMessage(response.reply);
      if (sent) {
        respondedMessageKeys.add(msgKey);
        repliedChatsHistory.set(contactName, lastMsg.text);

        console.log(`[WhatsGemini Pro] Resposta enviada com sucesso para ${contactName}!`);
        showNotificationBanner(`✅ Respondido com sucesso: ${contactName}!`, 3500);

        // Se o modo áudio estiver ativo, sintetiza a voz localmente
        if (config.audioMode && window.speechSynthesis) {
          try {
            const utter = new SpeechSynthesisUtterance(response.reply);
            utter.lang = "pt-BR";
            utter.rate = 1.1;
            window.speechSynthesis.speak(utter);
          } catch (e) {}
        }
      }
    } else if (response && response.ignored) {
      console.log(`[WhatsGemini Pro] Ignorado: ${response.reason}`);
      respondedMessageKeys.add(msgKey);
    } else if (response && response.error) {
      console.warn("[WhatsGemini Pro] Erro retornado pela IA:", response.error);
      showNotificationBanner(`⚠️ ${response.error}`, 5000);
    }
  }

  // ========================================================
  // DETECÇÃO DE NÃO LIDAS E GRUPOS
  // ========================================================

  /**
   * Extrai o número de mensagens não lidas de uma linha do #pane-side
   */
  function getChatRowUnreadCount(chatRow) {
    // 1. Procura por aria-label com indicativo de não lida
    const ariaEl = chatRow.querySelector('[aria-label*="não lida"], [aria-label*="nao lida"], [aria-label*="unread"], [aria-label*="mensagem"]');
    if (ariaEl) {
      const match = ariaEl.getAttribute("aria-label").match(/(\d+)/);
      if (match) return parseInt(match[1], 10);
    }

    // 2. Procura qualquer elemento span cujo texto seja apenas números ou números com '+' (ex: '1', '25', '999+')
    const spans = chatRow.querySelectorAll('span');
    for (const span of spans) {
      const text = span.textContent.trim();
      // Deve ser somente dígitos ou dígitos com '+' (ex: 1, 2, 25, 999+)
      // NÃO pode conter ':' (para não confundir com horário como 13:30)
      if (/^\d{1,4}(\+)?$/.test(text) && !text.includes(':')) {
        // Verifica se é um badge (tamanho compacto característico de selos)
        const rect = span.getBoundingClientRect();
        if (rect.width > 0 && rect.width < 55 && rect.height > 0 && rect.height < 40) {
          return parseInt(text.replace('+', ''), 10) || 1;
        }
      }
    }

    return 0;
  }

  /**
   * Verifica se a linha do chat na lista lateral pertence a um GRUPO
   */
  function isChatRowGroup(chatRow) {
    // 1. Ícones de grupo ou comunidade
    const groupIcon = chatRow.querySelector(
      'span[data-icon="default-group"], span[data-icon="community-outline"], span[data-icon="community-"], span[data-icon="announcements"], [data-testid="default-group"], [data-testid="community-icon"]'
    );
    if (groupIcon) return true;

    // 2. No WhatsApp Web, mensagens de grupo na prévia sempre começam com "Nome: Mensagem"
    // Ex: "mael: Figurinha", "~ri gold: Figurinha", "SORAX EXTENSÃO / Os membros do grupo mudaram"
    const rowText = chatRow.innerText || "";
    if (/\n~?[^:\n]{2,30}:\s/.test(rowText) || /:\s(Figurinha|Áudio|Foto|Vídeo)/i.test(rowText)) {
      return true;
    }

    // 3. Avisos administrativos de grupo
    if (/membros do grupo|adicionou você|saiu do grupo|mudaram as configurações/i.test(rowText)) {
      return true;
    }

    return false;
  }

  /**
   * Verifica se a conversa aberta no centro (#main) pertence a um GRUPO
   */
  function isCurrentMainChatGroup() {
    const header = document.querySelector("#main header");
    if (!header) return false;

    // Ícone de grupo no cabeçalho
    if (header.querySelector('span[data-icon="default-group"], [data-testid="default-group"], span[data-icon="community-outline"]')) {
      return true;
    }

    // Subtítulo do cabeçalho:
    // Em conversas privadas: mostra "online", "visto por último hoje às...", ou fica vazio.
    // Em grupos: mostra a lista de participantes separados por vírgula ("Você, Maria, João...") ou "dados do grupo"
    const subtitleEl = header.querySelector('span[title*=","], span[title*="grupo"], span[title*="dados do grupo"]');
    if (subtitleEl) return true;

    const headerText = header.innerText || "";
    if (headerText.includes(",") && !headerText.toLowerCase().includes("online")) {
      return true;
    }
    if (/dados do grupo|participante|membros|admin/i.test(headerText)) {
      return true;
    }

    return false;
  }

  /**
   * Retorna o nome do contato da linha no #pane-side
   */
  function getChatRowContactName(chatRow) {
    const titleEl = chatRow.querySelector('span[title], span[dir="auto"].x1lliihq, span[dir="auto"]');
    if (titleEl) {
      return titleEl.getAttribute("title") || titleEl.innerText.trim();
    }
    return "Contato";
  }

  /**
   * Retorna o nome do contato atualmente aberto no #main
   */
  function getCurrentChatContactName() {
    const headerTitle = document.querySelector("#main header span[dir='auto'][title], #main header span[title]");
    if (headerTitle) {
      return headerTitle.getAttribute("title") || headerTitle.innerText.trim();
    }
    const fallback = document.querySelector("#main header span[dir='auto']");
    return fallback ? fallback.innerText.trim() : "Contato";
  }

  // ========================================================
  // LEITURA DE MENSAGENS E ENVIO
  // ========================================================

  /**
   * Extrai com alta resiliência as últimas mensagens da conversa aberta
   */
  function getAllMessagesInChat(maxCount = 15) {
    const main = document.querySelector("#main");
    if (!main) return [];

    const messageNodes = Array.from(main.querySelectorAll('div[data-id]'));
    const messages = [];

    for (const node of messageNodes) {
      const dataId = node.getAttribute("data-id") || "";

      // data-id no WhatsApp Web:
      // "true_..." = Enviada por mim (outgoing)
      // "false_..." = Recebida do contato (incoming)
      let fromMe = false;
      if (dataId.startsWith("true_")) {
        fromMe = true;
      } else if (dataId.startsWith("false_")) {
        fromMe = false;
      } else if (node.classList.contains("message-out") || node.querySelector('.message-out')) {
        fromMe = true;
      } else if (node.classList.contains("message-in") || node.querySelector('.message-in')) {
        fromMe = false;
      }

      // Texto da mensagem
      const textEl = node.querySelector('.selectable-text span, span.copyable-text, span._ao3e, span[dir="ltr"], span[dir="auto"]');
      let text = textEl ? textEl.innerText.trim() : "";

      // Detecção de mensagem de áudio
      const isAudio = node.querySelector('span[data-icon="audio-play"], span[data-icon="ptt-play"], span[data-testid="audio-play"], [data-testid="ptt"]');
      if (isAudio) {
        const durEl = node.querySelector('span[dir="auto"], span.x1rg5ohu');
        const duration = durEl && /\d+:\d+/.test(durEl.innerText) ? durEl.innerText.trim() : "";
        text = `[Mensagem de voz / Áudio ${duration}]`;
      }

      // Fotos e Figurinhas
      if (!text) {
        if (node.querySelector('img[src*="blob:"], [data-testid="image-thumb"]')) {
          text = "[Foto/Imagem]";
        } else if (node.querySelector('[data-testid="sticker"]')) {
          text = "[Figurinha]";
        }
      }

      if (text) {
        messages.push({
          fromMe: fromMe,
          text: text,
          id: dataId || text
        });
      }
    }

    return messages.slice(-maxCount);
  }

  /**
   * Digita a resposta no editor Lexical do WhatsApp Web e aciona o envio
   */
  async function typeAndSendMessage(text) {
    const input = document.querySelector(
      '#main footer div[contenteditable="true"][role="textbox"], #main footer div[contenteditable="true"]'
    );
    if (!input) {
      console.error("[WhatsGemini Pro] Campo de texto não encontrado no chat.");
      return false;
    }

    input.focus();
    await sleep(100);

    // Limpa qualquer texto residual
    document.execCommand('selectAll', false, null);
    document.execCommand('delete', false, null);

    // Insere o texto da resposta
    const inserted = document.execCommand('insertText', false, text);
    if (!inserted) {
      input.innerText = text;
    }

    // Dispara eventos de sincronização com o estado do React
    input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: text }));
    input.dispatchEvent(new Event('change', { bubbles: true }));

    await sleep(300);

    // Clica no botão de enviar
    const sendBtn = document.querySelector(
      '#main footer button[data-tab="11"], #main footer span[data-icon="send"], #main footer button[aria-label*="Enviar"], #main footer button[aria-label*="Send"], #main footer [data-testid="send"]'
    );

    if (sendBtn) {
      const clickTarget = sendBtn.closest('button') || sendBtn;
      clickTarget.click();
      return true;
    } else {
      // Fallback: Dispara a tecla Enter
      const enterEv = new KeyboardEvent('keydown', {
        key: 'Enter',
        code: 'Enter',
        keyCode: 13,
        which: 13,
        bubbles: true,
        cancelable: true
      });
      input.dispatchEvent(enterEv);
      return true;
    }
  }

  /**
   * Clica em um elemento garantindo o disparo de toda a cadeia de eventos de mouse
   */
  function clickElementSafely(element) {
    const target = element.querySelector('div[role="gridcell"], div._ak72, div[tabindex="-1"], span[title]') || element;
    const events = ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click'];
    events.forEach(type => {
      target.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, view: window }));
    });
    if (typeof target.click === 'function') {
      target.click();
    }
  }

  // ========================================================
  // BOTÕES NO TOPO DO CHAT (#main header)
  // ========================================================

  function observeHeaderChanges() {
    setInterval(() => {
      const header = document.querySelector("#main header");
      if (!header) return;

      const contactName = getCurrentChatContactName();
      if (contactName && contactName !== currentHeaderContact) {
        currentHeaderContact = contactName;
        injectChatHeaderButtons(header, contactName);
      }
    }, 1000);
  }

  async function injectChatHeaderButtons(header, contactName) {
    let actions = document.getElementById("wg-header-actions");
    if (!actions) {
      actions = document.createElement("div");
      actions.id = "wg-header-actions";
      actions.className = "wg-header-actions";
      header.appendChild(actions);
    }

    const { whitelist = [], blacklist = [] } = await chrome.storage.local.get(["whitelist", "blacklist"]);
    const clean = contactName.toLowerCase().trim();
    const isFocused = whitelist.some(item => clean.includes(item.toLowerCase().trim()));
    const isBlocked = blacklist.some(item => clean.includes(item.toLowerCase().trim()));

    actions.innerHTML = `
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

  async function forceTriggerReplyInCurrentChat() {
    const contactName = getCurrentChatContactName();
    const messages = getAllMessagesInChat(10);
    const lastText = messages.length > 0 ? messages[messages.length - 1].text : "Olá, teste rápido!";

    showNotificationBanner(`⚡ Gerando teste como Íthalo para ${contactName}...`);

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

  // ========================================================
  // WIDGET FLUTUANTE E NOTIFICAÇÕES
  // ========================================================

  function createFloatingWidget() {
    if (document.getElementById("whatsgemini-widget")) return;

    floatingWidget = document.createElement("div");
    floatingWidget.id = "whatsgemini-widget";
    floatingWidget.className = "whatsgemini-badge wg-active";
    floatingWidget.innerHTML = `
      <div class="wg-icon">✨</div>
      <div class="wg-info">
        <span class="wg-title">WhatsGemini Pro</span>
        <span class="wg-status" id="wg-status-text">Monitorando Mãos-Livres</span>
      </div>
      <div class="wg-count" id="wg-count-badge" title="Mensagens respondidas com sucesso">0</div>
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
      if (statusText) statusText.innerText = "Monitorando Mãos-Livres";
      if (toggleIcon) toggleIcon.innerText = "⏸";
    } else {
      floatingWidget.classList.remove("wg-active");
      floatingWidget.classList.add("wg-paused");
      if (statusText) statusText.innerText = "Pausado (desativado)";
      if (toggleIcon) toggleIcon.innerText = "▶";
    }
  }

  function updateWidgetCount(count) {
    const badge = document.getElementById("wg-count-badge");
    if (badge) badge.innerText = count || 0;
  }

  function showNotificationBanner(text, duration = 3000) {
    let banner = document.getElementById("whatsgemini-toast");
    if (!banner) {
      banner = document.createElement("div");
      banner.id = "whatsgemini-toast";
      banner.className = "whatsgemini-toast";
      document.body.appendChild(banner);
    }

    banner.innerText = text;
    banner.classList.add("wg-toast-visible");

    if (banner._timer) clearTimeout(banner._timer);
    banner._timer = setTimeout(() => {
      banner.classList.remove("wg-toast-visible");
    }, duration);
  }

  function sendMessageToBackground(payload) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(payload, (res) => {
        if (chrome.runtime.lastError) {
          resolve({ success: false, error: chrome.runtime.lastError.message });
        } else {
          resolve(res);
        }
      });
    });
  }

  function getRandomDelay(min, max) {
    return Math.random() * (max - min) + min;
  }

  function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
  }
})();
