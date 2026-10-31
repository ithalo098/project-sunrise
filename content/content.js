/**
 * WhatsGemini Pro - Engine Autônomo 100% Mãos-Livres
 * Injetado no WhatsApp Web (https://web.whatsapp.com)
 * 
 * Funcionalidades:
 * - Varredura autônoma contínua: monitora mensagens não lidas e abre sozinho
 * - Filtro estrito de grupos: NUNCA responde em grupos, responde APENAS pessoas reais
 * - Blacklist simplificada: permite ao usuário escolher quem NÃO responder
 * - Respostas de altíssima qualidade (Modo Íthalo): inteligentes, humanas e naturais
 * - Reconhecimento de mensagens de áudio
 */

(() => {
  let isProcessing = false;
  let respondedMessageKeys = new Set();
  let repliedChatsHistory = new Map(); // contactName -> lastRepliedText
  let scannerInterval = null;
  let floatingWidget = null;
  let currentHeaderContact = null;

  console.log(
    "%c[WhatsGemini Pro]%c Motor Autônomo Mãos-Livres Carregado!",
    "background: #25D366; color: black; font-weight: bold; padding: 4px 8px; border-radius: 4px;",
    ""
  );

  init();

  async function init() {
    await waitForWhatsAppLoad();

    createFloatingWidget();
    observeHeaderChanges();

    // Sincroniza alterações em tempo real do storage
    chrome.storage.onChanged.addListener((changes) => {
      if (changes.enabled) {
        updateWidgetState(changes.enabled.newValue);
        if (changes.enabled.newValue) startScanner();
        else stopScanner();
      }
      if (changes.repliesCount) {
        updateWidgetCount(changes.repliesCount.newValue);
      }
      if (changes.blacklist || changes.whitelist) {
        updateChatHeaderButtons();
      }
    });

    const config = await chrome.storage.local.get(["enabled", "repliesCount"]);
    updateWidgetState(config.enabled !== false);
    updateWidgetCount(config.repliesCount || 0);

    // Inicia a varredura autônoma imediata
    startScanner();
    showNotificationBanner("✨ WhatsGemini Pro: Modo 100% Autônomo Ativo!", 3500);
  }

  function waitForWhatsAppLoad() {
    return new Promise((resolve) => {
      const check = setInterval(() => {
        if (document.querySelector("#pane-side") || document.querySelector("#main")) {
          clearInterval(check);
          resolve();
        }
      }, 400);
      setTimeout(() => { clearInterval(check); resolve(); }, 15000);
    });
  }

  function startScanner() {
    if (scannerInterval) clearInterval(scannerInterval);
    // Varredura a cada 2 segundos
    scannerInterval = setInterval(autonomousScanCycle, 2000);
    console.log("[WhatsGemini Pro] Varredura autônoma rodando a cada 2s.");
  }

  function stopScanner() {
    if (scannerInterval) {
      clearInterval(scannerInterval);
      scannerInterval = null;
    }
    console.log("[WhatsGemini Pro] Varredura pausada.");
  }

  /**
   * Ciclo principal 100% autônomo (Mãos-Livres)
   */
  async function autonomousScanCycle() {
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

    // 1. Procura na lista lateral (#pane-side) por contatos com mensagens não lidas
    if (config.autoScanHandsFree !== false) {
      const handled = await findAndOpenNextUnreadPerson(config);
      if (handled) return;
    }

    // 2. Se nenhum chat novo precisou ser aberto, processa o chat já aberto no momento
    await processCurrentlyOpenChat(config);
  }

  /**
   * Varre a lista lateral de conversas procurando pessoas com selo de novas mensagens.
   * Filtra estritamente: ignora grupos e ignora contatos na blacklist.
   */
  async function findAndOpenNextUnreadPerson(config) {
    const paneSide = document.querySelector("#pane-side");
    if (!paneSide) return false;

    // Encontra todos os potenciais badges de não lidas no painel lateral
    const badges = findUnreadBadgesInPane(paneSide);
    if (!badges || badges.length === 0) return false;

    for (const badge of badges) {
      // Localiza a linha da conversa correspondente ao badge
      const chatRow = findChatRowFromBadge(badge, paneSide);
      if (!chatRow) continue;

      // REGRA FUNDAMENTAL: Ignorar grupos categoricamente
      if (config.ignoreGroups !== false && isGroupChatRow(chatRow)) {
        continue;
      }

      // Obtém nome do contato
      const contactName = extractRowContactName(chatRow);
      const cleanName = contactName.toLowerCase().trim();

      // REGRA: Ignorar pessoas que o usuário escolheu não responder (Blacklist)
      const isBlacklisted = (config.blacklist || []).some(b => 
        b && cleanName.includes(b.toLowerCase().trim())
      );
      if (isBlacklisted) {
        continue; // Não responde quem está bloqueado
      }

      // Se modo foco estiver ativo, responde apenas quem está na whitelist
      if (config.responseMode === "whitelist") {
        const isWhitelisted = (config.whitelist || []).some(w => 
          w && cleanName.includes(w.toLowerCase().trim())
        );
        if (!isWhitelisted) continue;
      }

      // Encontrou uma pessoa real com mensagem não lida!
      console.log(`[WhatsGemini Pro] Mensagem nova de pessoa real: "${contactName}". Abrindo conversa...`);
      showNotificationBanner(`📩 Abrindo conversa com ${contactName}...`);

      isProcessing = true;
      try {
        // Clica para abrir a conversa
        clickChatElement(chatRow);

        // Aguarda carregar mensagens no painel central (#main)
        await sleep(900);

        // Dupla checagem: confirma que não é grupo no cabeçalho do #main
        if (config.ignoreGroups !== false && isMainHeaderGroup()) {
          console.log(`[WhatsGemini Pro] Cabeçalho confirmou grupo. Pulando.`);
          return false;
        }

        // Responde de forma autônoma
        await executeAutonomousReply(contactName, config);
        return true;
      } catch (err) {
        console.error("[WhatsGemini Pro] Erro ao abrir/responder:", err);
      } finally {
        isProcessing = false;
      }
    }

    return false;
  }

  /**
   * Processa a conversa que já se encontra aberta na tela
   */
  async function processCurrentlyOpenChat(config) {
    const main = document.querySelector("#main");
    if (!main) return;

    // Ignora se for grupo
    if (config.ignoreGroups !== false && isMainHeaderGroup()) {
      return;
    }

    const contactName = extractMainContactName();
    const cleanName = contactName.toLowerCase().trim();

    // Checa blacklist
    if ((config.blacklist || []).some(b => b && cleanName.includes(b.toLowerCase().trim()))) {
      return;
    }

    // Checa whitelist se ativo
    if (config.responseMode === "whitelist") {
      const isWhitelisted = (config.whitelist || []).some(w => w && cleanName.includes(w.toLowerCase().trim()));
      if (!isWhitelisted) return;
    }

    isProcessing = true;
    try {
      await executeAutonomousReply(contactName, config);
    } catch (err) {
      console.error("[WhatsGemini Pro] Erro no chat aberto:", err);
    } finally {
      isProcessing = false;
    }
  }

  /**
   * Executa a resposta com Gemini Pro e envia no chat aberto
   */
  async function executeAutonomousReply(contactName, config) {
    const messages = extractChatMessages(config.contextDepth || 15);
    if (!messages || messages.length === 0) return;

    const lastMsg = messages[messages.length - 1];

    // Se a última mensagem foi enviada por mim, nada a responder
    if (lastMsg.fromMe) return;

    // Chave única para nunca repetir a mesma resposta para a mesma mensagem
    const msgKey = `${contactName}__${lastMsg.id || lastMsg.text}`;
    if (respondedMessageKeys.has(msgKey)) return;

    // Se já respondemos exatamente este texto recebido recentemente
    if (repliedChatsHistory.get(contactName) === lastMsg.text) return;

    console.log(`[WhatsGemini Pro] Respondendo automaticamente para "${contactName}": "${lastMsg.text}"`);
    showNotificationBanner(`🤖 Íthalo IA formulando resposta bem feita para ${contactName}...`);

    // Chama o background worker com o Gemini Pro
    const response = await sendMessageToBackground({
      action: "GENERATE_REPLY",
      data: {
        contactName: contactName,
        lastMessage: lastMsg.text,
        messageHistory: messages
      }
    });

    if (response && response.success && response.reply) {
      // Simulação rápida de digitação humana
      const delay = config.fastMode !== false ? getRandomDelay(0.8, 1.4) : getRandomDelay(2, 4);
      showNotificationBanner(`⚡ Enviando resposta para ${contactName} (${delay.toFixed(1)}s)...`);
      await sleep(delay * 1000);

      const sent = await typeAndSendMessage(response.reply);
      if (sent) {
        respondedMessageKeys.add(msgKey);
        repliedChatsHistory.set(contactName, lastMsg.text);

        console.log(`[WhatsGemini Pro] Resposta autônoma enviada com sucesso para ${contactName}!`);
        showNotificationBanner(`✅ Respondido automaticamente: ${contactName}!`, 3500);

        // Cancela qualquer reprodução de áudio residual
        if (window.speechSynthesis) {
          window.speechSynthesis.cancel();
        }
      }
    } else if (response && response.ignored) {
      console.log(`[WhatsGemini Pro] Mensagem ignorada: ${response.reason}`);
      respondedMessageKeys.add(msgKey);
    } else if (response && response.error) {
      console.warn("[WhatsGemini Pro] Erro retornado pela IA:", response.error);
      showNotificationBanner(`⚠️ ${response.error}`, 5000);
    }
  }

  // ========================================================
  // RECONHECIMENTO DE ELEMENTOS, NÃO LIDAS E GRUPOS
  // ========================================================

  /**
   * Localiza badges de mensagens não lidas no painel lateral
   */
  function findUnreadBadgesInPane(paneSide) {
    const unreadElements = [];

    // 1. Elementos com atributo de acessibilidade indicando mensagens não lidas
    const ariaMatches = paneSide.querySelectorAll(
      '[aria-label*="não lida"], [aria-label*="nao lida"], [aria-label*="unread"], [aria-label*="mensagem"]'
    );
    ariaMatches.forEach(el => unreadElements.push(el));

    // 2. Elementos span que contêm apenas números (ex: '1', '2', '25', '999+')
    const spans = paneSide.querySelectorAll('span');
    for (const span of spans) {
      const text = span.textContent.trim();
      // Apenas dígitos ou dígitos com '+' (ex: 1, 2, 25, 999+)
      // NÃO pode conter ':' (para não pegar horários como 13:30)
      if (/^\d{1,4}(\+)?$/.test(text) && !text.includes(':')) {
        const rect = span.getBoundingClientRect();
        if (rect.width > 0 && rect.width < 50 && rect.height > 0 && rect.height < 36) {
          if (!unreadElements.includes(span)) {
            unreadElements.push(span);
          }
        }
      }
    }

    return unreadElements;
  }

  /**
   * A partir de um badge, sobe a árvore DOM até a linha da conversa no #pane-side
   */
  function findChatRowFromBadge(badge, paneSide) {
    let curr = badge;
    while (curr && curr !== paneSide && curr !== document.body) {
      // Se tem role listitem, row ou cell-frame-container
      if (curr.getAttribute("role") === "listitem" || curr.getAttribute("role") === "row") {
        return curr;
      }
      if (curr.getAttribute("data-testid") === "cell-frame-container") {
        return curr;
      }
      // Se for um item filho direto de container de rolagem com altura de chat (~72px)
      if (curr.offsetHeight >= 50 && curr.offsetHeight <= 120 && curr.querySelector('span[title], span[dir="auto"]')) {
        return curr;
      }
      curr = curr.parentElement;
    }
    return badge.closest('div[tabindex="-1"]') || badge.parentElement;
  }

  /**
   * Verifica se a linha do chat pertence a um GRUPO
   */
  function isGroupChatRow(chatRow) {
    // 1. Ícones de grupo ou comunidade
    const groupIcon = chatRow.querySelector(
      'span[data-icon="default-group"], span[data-icon="community-outline"], span[data-icon="community-"], span[data-icon="announcements"], [data-testid="default-group"], [data-testid="community-icon"]'
    );
    if (groupIcon) return true;

    // 2. Prévia de mensagens de grupo (começam com 'Nome: Mensagem')
    // Ex: 'mael: Figurinha', '~ri gold: Figurinha'
    const rowText = chatRow.innerText || "";
    if (/\n~?[^:\n]{2,30}:\s/.test(rowText) || /:\s(Figurinha|Áudio|Foto|Vídeo)/i.test(rowText)) {
      return true;
    }

    // 3. Avisos administrativos típicos de grupo
    if (/membros do grupo|adicionou você|saiu do grupo|mudaram as configurações/i.test(rowText)) {
      return true;
    }

    return false;
  }

  /**
   * Verifica se o cabeçalho do chat aberto no centro (#main) pertence a um GRUPO
   */
  function isMainHeaderGroup() {
    const header = document.querySelector("#main header");
    if (!header) return false;

    // Ícone de grupo
    if (header.querySelector('span[data-icon="default-group"], [data-testid="default-group"], span[data-icon="community-outline"]')) {
      return true;
    }

    // Subtítulo: listas de membros contêm vírgulas ('Você, Maria, João...')
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

  function extractRowContactName(chatRow) {
    const titleEl = chatRow.querySelector('span[title], span[dir="auto"].x1lliihq, span[dir="auto"]');
    if (titleEl) {
      return titleEl.getAttribute("title") || titleEl.innerText.trim();
    }
    return "Contato";
  }

  function extractMainContactName() {
    const headerTitle = document.querySelector("#main header span[dir='auto'][title], #main header span[title]");
    if (headerTitle) {
      return headerTitle.getAttribute("title") || headerTitle.innerText.trim();
    }
    const fallback = document.querySelector("#main header span[dir='auto']");
    return fallback ? fallback.innerText.trim() : "Contato";
  }

  // ========================================================
  // LEITURA DE MENSAGENS E DIGITAÇÃO / ENVIO
  // ========================================================

  function extractChatMessages(maxCount = 15) {
    const main = document.querySelector("#main");
    if (!main) return [];

    const nodes = Array.from(main.querySelectorAll('div[data-id]'));
    const messages = [];

    for (const node of nodes) {
      const dataId = node.getAttribute("data-id") || "";

      // Verifica se a mensagem foi enviada por mim ou recebida do contato
      let fromMe = false;
      if (dataId.startsWith("true_")) {
        fromMe = true;
      } else if (dataId.startsWith("false_")) {
        fromMe = false;
      } else if (node.querySelector('span[data-icon="msg-dblcheck"], span[data-icon="msg-check"], span[data-icon="msg-time"]')) {
        // Mensagens minhas possuem os tiques de envio/leitura
        fromMe = true;
      } else if (node.classList.contains("message-out") || node.querySelector('.message-out')) {
        fromMe = true;
      } else {
        fromMe = false;
      }

      // Texto
      const textEl = node.querySelector('.selectable-text span, span.copyable-text, span._ao3e, span[dir="ltr"], span[dir="auto"]');
      let text = textEl ? textEl.innerText.trim() : "";

      // Áudio
      const isAudio = node.querySelector('span[data-icon="audio-play"], span[data-icon="ptt-play"], span[data-testid="audio-play"]');
      if (isAudio) {
        const durEl = node.querySelector('span[dir="auto"], span.x1rg5ohu');
        const duration = durEl && /\d+:\d+/.test(durEl.innerText) ? durEl.innerText.trim() : "";
        text = `[Mensagem de voz / Áudio ${duration}]`;
      }

      // Foto / Figurinha
      if (!text) {
        if (node.querySelector('img[src*="blob:"], [data-testid="image-thumb"]')) {
          text = "[Foto/Imagem]";
        } else if (node.querySelector('[data-testid="sticker"]')) {
          text = "[Figurinha]";
        }
      }

      if (text) {
        messages.push({ fromMe, text, id: dataId || text });
      }
    }

    return messages.slice(-maxCount);
  }

  async function typeAndSendMessage(text) {
    const input = document.querySelector(
      '#main footer div[contenteditable="true"][role="textbox"], #main footer div[contenteditable="true"]'
    );
    if (!input) return false;

    input.focus();
    await sleep(80);

    // Limpa texto anterior
    document.execCommand('selectAll', false, null);
    document.execCommand('delete', false, null);

    // Insere texto da resposta
    const inserted = document.execCommand('insertText', false, text);
    if (!inserted) input.innerText = text;

    // Dispara eventos de sincronização com o estado do React
    input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: text }));
    input.dispatchEvent(new Event('change', { bubbles: true }));

    await sleep(250);

    // Clica no botão de enviar
    const sendBtn = document.querySelector(
      '#main footer button[data-tab="11"], #main footer span[data-icon="send"], #main footer button[aria-label*="Enviar"], #main footer button[aria-label*="Send"], #main footer [data-testid="send"]'
    );

    if (sendBtn) {
      const clickTarget = sendBtn.closest('button') || sendBtn;
      clickTarget.click();
      return true;
    } else {
      // Fallback: Dispara tecla Enter
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

  function clickChatElement(element) {
    const target = element.querySelector('div[role="gridcell"], div._ak72, div[tabindex="-1"], span[title]') || element;
    const events = ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click'];
    events.forEach(t => target.dispatchEvent(new MouseEvent(t, { bubbles: true, cancelable: true, view: window })));
    if (typeof target.click === 'function') target.click();
  }

  // ========================================================
  // BOTÕES NO TOPO DO CHAT (#main header)
  // ========================================================

  function observeHeaderChanges() {
    setInterval(() => {
      const header = document.querySelector("#main header");
      if (!header) return;

      const contactName = extractMainContactName();
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

    const { blacklist = [] } = await chrome.storage.local.get(["blacklist"]);
    const clean = contactName.toLowerCase().trim();
    const isBlocked = blacklist.some(item => clean.includes(item.toLowerCase().trim()));

    // Permite ao usuário escolher facilmente quem NÃO quer responder com 1 clique!
    actions.innerHTML = `
      <button id="wg-btn-block" class="wg-action-btn ${isBlocked ? 'wg-btn-blocked' : ''}" title="${isBlocked ? 'Permitir que a IA responda este contato' : 'Bloquear: A IA NUNCA responderá esta pessoa'}">
        🚫 ${isBlocked ? 'IA Desativada para este contato' : 'Não Responder Esta Pessoa'}
      </button>
    `;

    document.getElementById("wg-btn-block")?.addEventListener("click", (e) => {
      e.stopPropagation();
      chrome.runtime.sendMessage({ action: "TOGGLE_BLOCK_CONTACT", contactName }, () => {
        injectChatHeaderButtons(header, contactName);
        showNotificationBanner(isBlocked ? `✅ ${contactName} agora PODE ser respondido!` : `🚫 ${contactName} BLOQUEADO! A IA não responderá.`, 3000);
      });
    });
  }

  function updateChatHeaderButtons() {
    const header = document.querySelector("#main header");
    const contactName = extractMainContactName();
    if (header && contactName) injectChatHeaderButtons(header, contactName);
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
        <span class="wg-status" id="wg-status-text">100% Autônomo (Mãos-Livres)</span>
      </div>
      <div class="wg-count" id="wg-count-badge" title="Respostas enviadas automaticamente">0</div>
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
      if (statusText) statusText.innerText = "100% Autônomo (Mãos-Livres)";
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
