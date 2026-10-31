/**
 * WhatsGemini Pro - Servidor Autônomo WhatsApp com Conexão via QR Code
 * Executa um bot direto no WhatsApp Multi-Device (sem precisar da extensão nem de navegador aberto).
 */

import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  type WASocket
} from "@whiskeysockets/baileys";
import QRCode from "qrcode";
import pino from "pino";
import { existsSync, rmSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";

const PORT = 3333;
const AUTH_DIR = join(process.cwd(), "auth_info_baileys");
const CONFIG_FILE = join(process.cwd(), "bot_config.json");

// Chave da API do Google Gemini
const GEMINI_API_KEY = Buffer.from(
  "QVEuQWI4Uk42SjRibkdjSVY0X3FQWmdYTVNWNWcyUjNsMlFndWxPYkRyaDlqWlJvbzQ0LWc=",
  "base64"
).toString("utf-8");

// Configurações persistentes do Bot
interface BotConfig {
  enabled: boolean;
  userName: string;
  myTone: string;
  customBio: string;
  ignoreGroups: boolean;
  blacklist: string[]; // Números ou nomes a ignorar
}

let botConfig: BotConfig = {
  enabled: true,
  userName: "Íthalo",
  myTone: "casual",
  customBio: "Trabalho com tecnologia e projetos. Respondo com agilidade.",
  ignoreGroups: true,
  blacklist: []
};

// Carrega configurações se existirem
if (existsSync(CONFIG_FILE)) {
  try {
    botConfig = { ...botConfig, ...JSON.parse(readFileSync(CONFIG_FILE, "utf-8")) };
  } catch (e) {}
}

function saveConfig() {
  writeFileSync(CONFIG_FILE, JSON.stringify(botConfig, null, 2), "utf-8");
}

// Estado em memória
let currentQR: string | null = null;
let currentQRDataUrl: string | null = null;
let connectionStatus: "WAITING_QR" | "CONNECTING" | "CONNECTED" | "DISCONNECTED" = "DISCONNECTED";
let connectedUser: { id: string; name?: string } | null = null;
let sock: WASocket | null = null;

// Memória de histórico por contato (JID -> mensagens)
const chatHistories = new Map<string, Array<{ role: "user" | "model"; text: string }>>();
const recentRepliedKeys = new Set<string>();

// Estatísticas
const stats = {
  receivedCount: 0,
  repliedCount: 0,
  groupsIgnored: 0,
  blockedIgnored: 0
};

// Logs de atividade em tempo real
interface ActivityLog {
  id: number;
  timestamp: string;
  contact: string;
  incoming: string;
  reply: string;
  duration: number;
}
const activityLogs: ActivityLog[] = [];

// Clientes SSE (Server-Sent Events)
const sseClients = new Set<(data: string) => void>();

function broadcastSSE(type: string, payload: any) {
  const dataStr = `event: ${type}\ndata: ${JSON.stringify(payload)}\n\n`;
  for (const send of sseClients) {
    try {
      send(dataStr);
    } catch (e) {
      sseClients.delete(send);
    }
  }
}

/**
 * Inicializa a conexão com o WhatsApp usando Baileys
 */
async function startWhatsAppBot() {
  if (!existsSync(AUTH_DIR)) {
    mkdirSync(AUTH_DIR, { recursive: true });
  }

  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
  const { version } = await fetchLatestBaileysVersion();

  connectionStatus = "CONNECTING";
  broadcastSSE("status", { status: connectionStatus });

  sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: false,
    logger: pino({ level: "silent" })
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      currentQR = qr;
      currentQRDataUrl = await QRCode.toDataURL(qr, { width: 320, margin: 2 });
      connectionStatus = "WAITING_QR";
      console.log("[WhatsGemini Bot] Novo QR Code gerado! Aguardando escaneamento no celular...");
      broadcastSSE("qr", { qrDataUrl: currentQRDataUrl });
      broadcastSSE("status", { status: connectionStatus });
    }

    if (connection === "open") {
      connectionStatus = "CONNECTED";
      currentQR = null;
      currentQRDataUrl = null;
      connectedUser = sock?.user || null;
      const cleanPhone = (connectedUser?.id || "").split(":")[0] || "Desconhecido";
      console.log(`[WhatsGemini Bot] ✅ CONECTADO COM SUCESSO! Usuário: ${cleanPhone}`);
      broadcastSSE("status", {
        status: connectionStatus,
        user: { id: cleanPhone, name: connectedUser?.name || "Íthalo" }
      });
    }

    if (connection === "close") {
      const statusCode = (lastDisconnect?.error as any)?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
      console.log(`[WhatsGemini Bot] Conexão fechada (${statusCode}). Reconectar? ${shouldReconnect}`);
      connectionStatus = "DISCONNECTED";
      connectedUser = null;
      broadcastSSE("status", { status: connectionStatus });

      if (shouldReconnect) {
        setTimeout(startWhatsAppBot, 3000);
      } else {
        // Se foi deslogado, limpa auth para gerar novo QR
        try { rmSync(AUTH_DIR, { recursive: true, force: true }); } catch (e) {}
        setTimeout(startWhatsAppBot, 1000);
      }
    }
  });

  // Listener de mensagens recebidas em tempo real
  sock.ev.on("messages.upsert", async ({ messages, type }) => {
    if (!botConfig.enabled) return;

    for (const msg of messages) {
      // Ignora mensagens enviadas por mim mesmo
      if (msg.key.fromMe) continue;

      const remoteJid = msg.key.remoteJid || "";

      // 1. REGRA: Ignora Status / Broadcast
      if (remoteJid === "status@broadcast" || remoteJid.includes("broadcast")) continue;

      // 2. REGRA FUNDAMENTAL: Ignorar Grupos categoricamente (Apenas pessoas)
      if (remoteJid.endsWith("@g.us")) {
        stats.groupsIgnored++;
        broadcastSSE("stats", stats);
        continue;
      }

      // 3. REGRA: Checa Blacklist (pessoas que o usuário escolheu NÃO responder)
      const contactNumber = remoteJid.split("@")[0];
      const isBlacklisted = botConfig.blacklist.some(b => 
        b && (contactNumber.includes(b.trim()) || b.trim().includes(contactNumber))
      );
      if (isBlacklisted) {
        stats.blockedIgnored++;
        broadcastSSE("stats", stats);
        console.log(`[WhatsGemini Bot] 🚫 Contato ${contactNumber} está na lista de bloqueados. Ignorando.`);
        continue;
      }

      // Extrai o conteúdo da mensagem
      const messageId = msg.key.id || "";
      if (recentRepliedKeys.has(messageId)) continue;

      let incomingText = "";
      const m = msg.message;

      if (!m) continue;

      if (m.conversation) {
        incomingText = m.conversation.trim();
      } else if (m.extendedTextMessage?.text) {
        incomingText = m.extendedTextMessage.text.trim();
      } else if (m.audioMessage) {
        const sec = m.audioMessage.seconds || 0;
        incomingText = `[Mensagem de voz / Áudio de ${sec} segundos]`;
      } else if (m.imageMessage) {
        incomingText = m.imageMessage.caption ? `[Foto: ${m.imageMessage.caption}]` : "[Foto/Imagem]";
      } else if (m.stickerMessage) {
        incomingText = "[Figurinha]";
      }

      if (!incomingText) continue;

      stats.receivedCount++;
      broadcastSSE("stats", stats);

      const contactName = msg.pushName || contactNumber;
      console.log(`[WhatsGemini Bot] 📩 Nova mensagem de ${contactName} (${contactNumber}): "${incomingText}"`);

      // Marca para não responder duplicado
      recentRepliedKeys.add(messageId);

      // Gera resposta com o Google Gemini
      try {
        const t0 = Date.now();
        const replyText = await generateGeminiResponse(contactName, remoteJid, incomingText);
        const duration = (Date.now() - t0) / 1000;

        if (replyText && sock) {
          // Envia resposta no WhatsApp
          await sock.sendMessage(remoteJid, { text: replyText });

          stats.repliedCount++;
          const logItem: ActivityLog = {
            id: Date.now(),
            timestamp: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
            contact: `${contactName} (${contactNumber})`,
            incoming: incomingText,
            reply: replyText,
            duration: Number(duration.toFixed(2))
          };
          activityLogs.unshift(logItem);
          if (activityLogs.length > 50) activityLogs.pop();

          broadcastSSE("new_reply", logItem);
          broadcastSSE("stats", stats);

          console.log(`[WhatsGemini Bot] ✅ Resposta enviada para ${contactName} em ${duration.toFixed(2)}s: "${replyText}"`);
        }
      } catch (err: any) {
        console.error(`[WhatsGemini Bot] ❌ Erro ao responder ${contactName}:`, err?.message || err);
      }
    }
  });
}

/**
 * Chama o Google Gemini Pro para formular resposta de altíssima qualidade
 */
async function generateGeminiResponse(contactName: string, remoteJid: string, incomingMessage: string): Promise<string> {
  // Histórico da conversa
  if (!chatHistories.has(remoteJid)) {
    chatHistories.set(remoteJid, []);
  }
  const history = chatHistories.get(remoteJid)!;

  const systemPrompt = `Você é o próprio ${botConfig.userName} respondendo mensagens no WhatsApp pessoal.
Diretrizes fundamentais para respostas DE ALTÍSSIMA QUALIDADE:
- Responda SEMPRE na PRIMEIRA PESSOA ('eu', 'meu', 'comigo'), exatamente como o ${botConfig.userName}.
- Estilo: natural, inteligente, simpático, educado e descontraído, com o português perfeito do Brasil (gírias leves de WhatsApp, pontuação agradável, emojis com moderação).
- Qualidade da resposta: leia com atenção o que a pessoa falou. Seja prestativo, claro e objetivo. Respostas de 1 a 3 frases bem redigidas.
- NUNCA diga 'sou uma inteligência artificial', 'sou um assistente' ou 'o ${botConfig.userName} não está disponível'. Você É o ${botConfig.userName} em pessoa.
- Se a mensagem for uma saudação ('oi', 'olá', 'tudo bem?'): responda de forma calorosa (ex: 'Opa, fala aí! Tudo certo por aí? Como posso te ajudar hoje?').
- Se for uma mensagem de voz/áudio ('[Mensagem de voz / Áudio]'): responda com simpatia dizendo que está sem fone ou ocupado agora e não consegue ouvir o áudio, e peça para mandar em texto rapidinho (ex: 'Opa! Tô sem fone agora e não consigo ouvir seu áudio, o que você falou? Me manda em texto rapidinho! 😊').
- Se perguntarem sobre compromissos, orçamentos ou algo urgente: responda com presteza e naturalidade (ex: 'Opa, tô na correria aqui agora, mas já te dou um retorno completo assim que der!').
${botConfig.customBio ? `Sobre mim: ${botConfig.customBio}` : ""}`;

  const contents: any[] = [];
  const recentHistory = history.slice(-10);

  recentHistory.forEach(item => {
    contents.push({
      role: item.role,
      parts: [{ text: item.text }]
    });
  });

  contents.push({
    role: "user",
    parts: [{ text: incomingMessage }]
  });

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${GEMINI_API_KEY}`;
  const payload = {
    system_instruction: { parts: [{ text: systemPrompt }] },
    contents: contents,
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 600,
      thinkingConfig: { thinkingBudget: 50 }
    }
  };

  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Erro HTTP ${res.status}`);
  }

  const data = await res.json();
  const reply = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";

  if (reply) {
    // Atualiza histórico
    history.push({ role: "user", text: incomingMessage });
    history.push({ role: "model", text: reply });
    if (history.length > 20) history.splice(0, history.length - 20);
  }

  return reply;
}

// Inicia o Bot WhatsApp
startWhatsAppBot();

/**
 * Servidor Web para o Dashboard de Conexão com QR Code
 */
Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);

    // Endpoint SSE para atualizações em tempo real
    if (url.pathname === "/api/events") {
      let controller: ReadableStreamDefaultController;
      const stream = new ReadableStream({
        start(c) {
          controller = c;
          const send = (data: string) => {
            try {
              controller.enqueue(new TextEncoder().encode(data));
            } catch (e) {
              sseClients.delete(send);
            }
          };
          sseClients.add(send);

          // Envia estado inicial imediato
          send(`event: init\ndata: ${JSON.stringify({
            status: connectionStatus,
            qrDataUrl: currentQRDataUrl,
            user: connectedUser ? { id: (connectedUser.id || "").split(":")[0], name: connectedUser.name || "Íthalo" } : null,
            config: botConfig,
            stats: stats,
            logs: activityLogs
          })}\n\n`);
        },
        cancel() {
          // Removido no erro
        }
      });

      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive",
          "Access-Control-Allow-Origin": "*"
        }
      });
    }

    // API de status
    if (url.pathname === "/api/status") {
      return Response.json({
        status: connectionStatus,
        qrDataUrl: currentQRDataUrl,
        user: connectedUser ? { id: (connectedUser.id || "").split(":")[0], name: connectedUser.name || "Íthalo" } : null,
        config: botConfig,
        stats: stats
      });
    }

    // API para alternar liga/desliga do bot
    if (url.pathname === "/api/toggle" && req.method === "POST") {
      botConfig.enabled = !botConfig.enabled;
      saveConfig();
      broadcastSSE("config", botConfig);
      return Response.json({ success: true, enabled: botConfig.enabled });
    }

    // API de Blacklist (adicionar/remover contatos para não responder)
    if (url.pathname === "/api/blacklist" && req.method === "POST") {
      const body = await req.json();
      const { action, contact } = body;
      const clean = (contact || "").trim();

      if (clean) {
        if (action === "add" && !botConfig.blacklist.includes(clean)) {
          botConfig.blacklist.push(clean);
        } else if (action === "remove") {
          botConfig.blacklist = botConfig.blacklist.filter(b => b !== clean);
        }
        saveConfig();
        broadcastSSE("config", botConfig);
      }
      return Response.json({ success: true, blacklist: botConfig.blacklist });
    }

    // API para desconectar e resetar sessão QR
    if (url.pathname === "/api/disconnect" && req.method === "POST") {
      if (sock) {
        try { await sock.logout(); } catch (e) {}
      }
      try { rmSync(AUTH_DIR, { recursive: true, force: true }); } catch (e) {}
      connectionStatus = "DISCONNECTED";
      currentQR = null;
      currentQRDataUrl = null;
      connectedUser = null;
      broadcastSSE("status", { status: connectionStatus });
      setTimeout(startWhatsAppBot, 1000);
      return Response.json({ success: true });
    }

    // Página Principal (Dashboard com Leitor de QR Code)
    return new Response(renderDashboardHTML(), {
      headers: { "Content-Type": "text/html; charset=utf-8" }
    });
  }
});

console.log(`\n======================================================`);
console.log(`🌐 Servidor WhatsGemini Pro rodando em: http://localhost:${PORT}`);
console.log(`📱 Abra o link acima no navegador para escanear o QR Code!`);
console.log(`======================================================\n`);

/**
 * Renderiza o Dashboard HTML elegante em tema Dark
 */
function renderDashboardHTML() {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>WhatsGemini Pro - Conexão WhatsApp & Auto-Resposta</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    body { font-family: 'Plus Jakarta Sans', sans-serif; background-color: #0b141a; color: #e9edef; }
    .wa-green { color: #25D366; }
    .bg-wa-green { background-color: #25D366; }
    .bg-wa-dark { background-color: #111b21; }
    .bg-wa-card { background-color: #202c33; }
    .border-wa { border-color: rgba(134, 150, 160, 0.15); }
    .qr-frame {
      position: relative;
      background: white;
      padding: 16px;
      border-radius: 20px;
      box-shadow: 0 0 40px rgba(37, 211, 102, 0.2);
    }
  </style>
</head>
<body class="min-h-screen flex flex-col">
  <!-- Top Navigation -->
  <header class="bg-wa-dark border-b border-wa px-6 py-4 flex items-center justify-between sticky top-0 z-50">
    <div class="flex items-center gap-3">
      <div class="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#128C7E] to-[#25D366] flex items-center justify-center text-xl shadow-lg shadow-[#25D366]/20">
        ✨
      </div>
      <div>
        <h1 class="font-extrabold text-lg tracking-tight text-white flex items-center gap-2">
          WhatsGemini <span class="text-xs bg-[#25D366]/20 text-[#25D366] px-2 py-0.5 rounded-full font-bold">PRO SERVER</span>
        </h1>
        <p class="text-xs text-[#8696a0]">Auto-Resposta Autônoma com Gemini Pro</p>
      </div>
    </div>

    <!-- Status & Toggle -->
    <div class="flex items-center gap-4">
      <div id="conn-badge" class="flex items-center gap-2 bg-[#202c33] px-3 py-1.5 rounded-full border border-wa text-xs font-semibold">
        <span class="w-2.5 h-2.5 rounded-full bg-yellow-400 animate-pulse" id="conn-dot"></span>
        <span id="conn-text" class="text-yellow-400">Carregando...</span>
      </div>

      <button id="btn-toggle-bot" class="flex items-center gap-2 bg-[#25D366] hover:bg-[#20ba59] text-[#0b141a] font-bold text-xs px-4 py-2 rounded-full transition-all shadow-md shadow-[#25D366]/20">
        <span id="bot-status-text">ROBÔ ATIVO</span>
      </button>
    </div>
  </header>

  <main class="flex-1 max-w-6xl w-full mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
    <!-- COLUNA ESQUERDA: QR CODE & CONEXÃO (5 cols) -->
    <div class="lg:col-span-5 space-y-6">
      <!-- Card Conexão QR -->
      <div class="bg-wa-dark border border-wa rounded-2xl p-6 shadow-xl">
        <h2 class="text-base font-bold text-white flex items-center gap-2 mb-2">
          📱 Conectar seu WhatsApp
        </h2>
        <p class="text-xs text-[#8696a0] mb-5">
          Conecte sem precisar de extensão nem de navegador aberto. Aponte a câmera do seu WhatsApp para o QR Code abaixo:
        </p>

        <!-- Container do QR Code -->
        <div id="qr-container" class="flex flex-col items-center justify-center py-4">
          <div class="qr-frame mb-4" id="qr-wrapper">
            <div id="qr-loading" class="w-[280px] h-[280px] flex flex-col items-center justify-center text-slate-800 text-sm font-semibold">
              <div class="w-8 h-8 border-4 border-[#25D366] border-t-transparent rounded-full animate-spin mb-3"></div>
              Gerando QR Code...
            </div>
            <img id="qr-image" src="" alt="QR Code WhatsApp" class="w-[280px] h-[280px] rounded-lg hidden" />
          </div>

          <!-- Instruções de Escaneamento -->
          <div class="bg-wa-card border border-wa rounded-xl p-3.5 w-full text-xs text-[#8696a0] space-y-1.5" id="instructions-box">
            <p class="text-white font-semibold mb-1">Como escanear:</p>
            <p>1. Abra o WhatsApp no seu celular</p>
            <p>2. Toque em <strong>Mais opções</strong> (⋮) no Android ou <strong>Configurações</strong> no iPhone</p>
            <p>3. Toque em <strong>Aparelhos conectados</strong></p>
            <p>4. Toque em <strong>Conectar um aparelho</strong> e aponte para a tela</p>
          </div>
        </div>

        <!-- Tela de Conectado com Sucesso -->
        <div id="connected-view" class="hidden flex flex-col items-center justify-center py-8 text-center space-y-4">
          <div class="w-20 h-20 rounded-full bg-[#25D366]/20 border-2 border-[#25D366] flex items-center justify-center text-3xl shadow-xl shadow-[#25D366]/30 animate-bounce">
            🟢
          </div>
          <div>
            <h3 class="text-lg font-bold text-white">WhatsApp Conectado!</h3>
            <p class="text-sm text-[#25D366] font-semibold" id="connected-number">+55 ...</p>
            <p class="text-xs text-[#8696a0] mt-1">A IA está monitorando suas mensagens 100% no automático.</p>
          </div>

          <button id="btn-disconnect" class="text-xs text-red-400 hover:text-red-300 underline font-semibold pt-2">
            Desconectar este aparelho / Trocar número
          </button>
        </div>
      </div>

      <!-- Card Filtros & Pessoas Bloqueadas -->
      <div class="bg-wa-dark border border-wa rounded-2xl p-6 shadow-xl">
        <h2 class="text-base font-bold text-white flex items-center gap-2 mb-2">
          🚫 Pessoas que a IA NÃO vai responder
        </h2>
        <p class="text-xs text-[#8696a0] mb-4">
          Adicione o número ou nome de contatos que você quer ignorar (ex: chefe, cobrança, familiares):
        </p>

        <div class="flex gap-2 mb-4">
          <input type="text" id="input-blacklist" placeholder="Número ou nome..." class="flex-1 bg-wa-card border border-wa rounded-xl px-3.5 py-2 text-xs text-white placeholder-[#8696a0] focus:outline-none focus:border-[#25D366]">
          <button id="btn-add-blacklist" class="bg-red-500 hover:bg-red-600 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all">
            + Bloquear
          </button>
        </div>

        <div id="blacklist-tags" class="flex flex-wrap gap-2">
          <!-- Tags adicionadas -->
        </div>

        <div class="mt-4 pt-4 border-t border-wa flex items-center justify-between text-xs text-[#8696a0]">
          <span>Grupos de WhatsApp:</span>
          <span class="text-[#25D366] font-bold">100% IGNORADOS</span>
        </div>
      </div>
    </div>

    <!-- COLUNA DIREITA: FEED AO VIVO & ESTATÍSTICAS (7 cols) -->
    <div class="lg:col-span-7 space-y-6">
      <!-- Cards de Estatísticas -->
      <div class="grid grid-cols-3 gap-4">
        <div class="bg-wa-dark border border-wa rounded-2xl p-4 text-center">
          <span class="text-xs text-[#8696a0] block mb-1">Recebidas</span>
          <span class="text-2xl font-black text-white" id="stat-received">0</span>
        </div>
        <div class="bg-wa-dark border border-wa rounded-2xl p-4 text-center">
          <span class="text-xs text-[#8696a0] block mb-1">Respondidas pela IA</span>
          <span class="text-2xl font-black text-[#25D366]" id="stat-replied">0</span>
        </div>
        <div class="bg-wa-dark border border-wa rounded-2xl p-4 text-center">
          <span class="text-xs text-[#8696a0] block mb-1">Grupos Ignorados</span>
          <span class="text-2xl font-black text-slate-400" id="stat-groups">0</span>
        </div>
      </div>

      <!-- Feed de Atividades ao Vivo -->
      <div class="bg-wa-dark border border-wa rounded-2xl p-6 shadow-xl flex flex-col h-[520px]">
        <div class="flex items-center justify-between mb-4 pb-3 border-b border-wa">
          <div>
            <h2 class="text-base font-bold text-white flex items-center gap-2">
              ⚡ Atividade em Tempo Real
            </h2>
            <p class="text-xs text-[#8696a0]">Mensagens recebidas e respostas enviadas pela IA</p>
          </div>
          <span class="text-[11px] bg-[#25D366]/10 text-[#25D366] px-2.5 py-1 rounded-full font-bold flex items-center gap-1.5">
            <span class="w-1.5 h-1.5 rounded-full bg-[#25D366] animate-ping"></span> AO VIVO
          </span>
        </div>

        <!-- Lista de Mensagens Rolável -->
        <div id="logs-container" class="flex-1 overflow-y-auto space-y-3 pr-2">
          <div class="text-center py-16 text-[#8696a0] text-xs" id="empty-logs-msg">
            Nenhuma mensagem recebida ainda.<br>
            Assim que alguém mandar mensagem no seu WhatsApp, a resposta aparecerá aqui em tempo real!
          </div>
        </div>
      </div>
    </div>
  </main>

  <script>
    const qrContainer = document.getElementById("qr-container");
    const qrImage = document.getElementById("qr-image");
    const qrLoading = document.getElementById("qr-loading");
    const connectedView = document.getElementById("connected-view");
    const connectedNumber = document.getElementById("connected-number");
    const connBadge = document.getElementById("conn-badge");
    const connDot = document.getElementById("conn-dot");
    const connText = document.getElementById("conn-text");
    const btnToggleBot = document.getElementById("btn-toggle-bot");
    const botStatusText = document.getElementById("bot-status-text");
    const btnDisconnect = document.getElementById("btn-disconnect");

    const statReceived = document.getElementById("stat-received");
    const statReplied = document.getElementById("stat-replied");
    const statGroups = document.getElementById("stat-groups");
    const logsContainer = document.getElementById("logs-container");
    const emptyLogsMsg = document.getElementById("empty-logs-msg");

    const inputBlacklist = document.getElementById("input-blacklist");
    const btnAddBlacklist = document.getElementById("btn-add-blacklist");
    const blacklistTags = document.getElementById("blacklist-tags");

    let currentBlacklist = [];

    // Conecta ao fluxo de eventos em tempo real (SSE)
    const evtSource = new EventSource("/api/events");

    evtSource.addEventListener("init", (e) => {
      const data = JSON.parse(e.data);
      updateStatus(data.status, data.user);
      if (data.qrDataUrl) updateQR(data.qrDataUrl);
      if (data.config) updateConfig(data.config);
      if (data.stats) updateStats(data.stats);
      if (data.logs && data.logs.length > 0) {
        logsContainer.innerHTML = "";
        data.logs.forEach(addLogCard);
      }
    });

    evtSource.addEventListener("status", (e) => {
      const data = JSON.parse(e.data);
      updateStatus(data.status, data.user);
    });

    evtSource.addEventListener("qr", (e) => {
      const data = JSON.parse(e.data);
      updateQR(data.qrDataUrl);
    });

    evtSource.addEventListener("config", (e) => {
      const config = JSON.parse(e.data);
      updateConfig(config);
    });

    evtSource.addEventListener("stats", (e) => {
      const stats = JSON.parse(e.data);
      updateStats(stats);
    });

    evtSource.addEventListener("new_reply", (e) => {
      const log = JSON.parse(e.data);
      if (emptyLogsMsg) emptyLogsMsg.style.display = "none";
      addLogCard(log, true);
    });

    function updateStatus(status, user) {
      if (status === "CONNECTED") {
        connDot.className = "w-2.5 h-2.5 rounded-full bg-[#25D366]";
        connText.className = "text-[#25D366]";
        connText.innerText = "Conectado";
        qrContainer.classList.add("hidden");
        connectedView.classList.remove("hidden");
        if (user) connectedNumber.innerText = user.id ? "+" + user.id : "WhatsApp Ativo";
      } else if (status === "WAITING_QR") {
        connDot.className = "w-2.5 h-2.5 rounded-full bg-yellow-400 animate-pulse";
        connText.className = "text-yellow-400";
        connText.innerText = "Aguardando QR Code";
        qrContainer.classList.remove("hidden");
        connectedView.classList.add("hidden");
      } else {
        connDot.className = "w-2.5 h-2.5 rounded-full bg-slate-400";
        connText.className = "text-slate-400";
        connText.innerText = "Conectando...";
      }
    }

    function updateQR(dataUrl) {
      qrLoading.classList.add("hidden");
      qrImage.src = dataUrl;
      qrImage.classList.remove("hidden");
    }

    function updateConfig(config) {
      if (config.enabled) {
        btnToggleBot.className = "flex items-center gap-2 bg-[#25D366] hover:bg-[#20ba59] text-[#0b141a] font-bold text-xs px-4 py-2 rounded-full transition-all shadow-md shadow-[#25D366]/20";
        botStatusText.innerText = "ROBÔ ATIVO";
      } else {
        btnToggleBot.className = "flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-slate-300 font-bold text-xs px-4 py-2 rounded-full transition-all";
        botStatusText.innerText = "ROBÔ PAUSADO";
      }

      currentBlacklist = config.blacklist || [];
      renderBlacklist();
    }

    function updateStats(stats) {
      statReceived.innerText = stats.receivedCount || 0;
      statReplied.innerText = stats.repliedCount || 0;
      statGroups.innerText = stats.groupsIgnored || 0;
    }

    function addLogCard(log, prepend = false) {
      if (emptyLogsMsg) emptyLogsMsg.style.display = "none";

      const card = document.createElement("div");
      card.className = "bg-wa-card border border-wa rounded-xl p-3.5 space-y-2 text-xs transition-all hover:border-[#25D366]/40";
      card.innerHTML = \`
        <div class="flex items-center justify-between">
          <span class="font-bold text-white flex items-center gap-1.5">
            👤 \${log.contact}
          </span>
          <div class="flex items-center gap-2 text-[#8696a0] text-[11px]">
            <span>⚡ \${log.duration}s</span>
            <span>\${log.timestamp}</span>
          </div>
        </div>
        <div class="bg-[#111b21] p-2.5 rounded-lg text-slate-300">
          <span class="text-[#8696a0] block text-[10px] uppercase font-bold mb-0.5">Mensagem Recebida</span>
          \${log.incoming}
        </div>
        <div class="bg-[#25D366]/10 border border-[#25D366]/20 p-2.5 rounded-lg text-[#25D366]">
          <span class="text-[#25D366] block text-[10px] uppercase font-bold mb-0.5">Resposta do Íthalo (Gemini Pro)</span>
          \${log.reply}
        </div>
      \`;

      if (prepend && logsContainer.firstChild) {
        logsContainer.insertBefore(card, logsContainer.firstChild);
      } else {
        logsContainer.appendChild(card);
      }
    }

    function renderBlacklist() {
      blacklistTags.innerHTML = "";
      if (currentBlacklist.length === 0) {
        blacklistTags.innerHTML = '<span class="text-xs text-[#8696a0]">Nenhuma pessoa bloqueada. A IA responde todo mundo no privado.</span>';
        return;
      }

      currentBlacklist.forEach(contact => {
        const tag = document.createElement("span");
        tag.className = "inline-flex items-center gap-1.5 bg-red-500/10 border border-red-500/30 text-red-400 text-xs px-2.5 py-1 rounded-full font-medium";
        tag.innerHTML = \`
          <span>\${contact}</span>
          <button class="hover:text-red-200 font-bold ml-1" data-contact="\${contact}">✕</button>
        \`;
        tag.querySelector("button").addEventListener("click", () => {
          fetch("/api/blacklist", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "remove", contact })
          });
        });
        blacklistTags.appendChild(tag);
      });
    }

    // Ações de botões
    btnToggleBot.addEventListener("click", () => {
      fetch("/api/toggle", { method: "POST" });
    });

    btnAddBlacklist.addEventListener("click", () => {
      const val = inputBlacklist.value.trim();
      if (!val) return;
      fetch("/api/blacklist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "add", contact: val })
      });
      inputBlacklist.value = "";
    });

    btnDisconnect.addEventListener("click", () => {
      if (confirm("Deseja realmente desconectar este aparelho? Você precisará ler o QR Code novamente.")) {
        fetch("/api/disconnect", { method: "POST" });
      }
    });
  </script>
</body>
</html>`;
}
