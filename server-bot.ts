/**
 * WhatsGemini Pro - Servidor Autônomo WhatsApp com Conexão via QR Code
 * Respostas ultra-naturais e humanas no estilo Íthalo (zero clichês de robô/IA).
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

interface BotConfig {
  enabled: boolean;
  userName: string;
  customExamples: string;
  ignoreGroups: boolean;
  blacklist: string[];
}

let botConfig: BotConfig = {
  enabled: true,
  userName: "Íthalo",
  customExamples: "Opa, e aí! Tudo certo?\nTô por aqui sim, fala aí!\nTranquilo, já te dou um retorno!",
  ignoreGroups: true,
  blacklist: []
};

if (existsSync(CONFIG_FILE)) {
  try {
    botConfig = { ...botConfig, ...JSON.parse(readFileSync(CONFIG_FILE, "utf-8")) };
  } catch (e) {}
}

function saveConfig() {
  writeFileSync(CONFIG_FILE, JSON.stringify(botConfig, null, 2), "utf-8");
}

let currentQR: string | null = null;
let currentQRDataUrl: string | null = null;
let connectionStatus: "WAITING_QR" | "CONNECTING" | "CONNECTED" | "DISCONNECTED" = "DISCONNECTED";
let connectedUser: { id: string; name?: string } | null = null;
let sock: WASocket | null = null;

const chatHistories = new Map<string, Array<{ role: "user" | "model"; text: string }>>();
const recentRepliedKeys = new Set<string>();

const stats = {
  receivedCount: 0,
  repliedCount: 0,
  groupsIgnored: 0,
  blockedIgnored: 0
};

interface ActivityLog {
  id: number;
  timestamp: string;
  contact: string;
  incoming: string;
  reply: string;
  duration: number;
}
const activityLogs: ActivityLog[] = [];

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
      console.log("[WhatsGemini Bot] Novo QR Code gerado! Pronto para leitura no celular.");
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
        user: { id: cleanPhone, name: connectedUser?.name || botConfig.userName }
      });
    }

    if (connection === "close") {
      const statusCode = (lastDisconnect?.error as any)?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
      console.log(`[WhatsGemini Bot] Conexão fechada (${statusCode}). Reconectando? ${shouldReconnect}`);
      connectionStatus = "DISCONNECTED";
      connectedUser = null;
      broadcastSSE("status", { status: connectionStatus });

      if (shouldReconnect) {
        setTimeout(startWhatsAppBot, 3000);
      } else {
        try { rmSync(AUTH_DIR, { recursive: true, force: true }); } catch (e) {}
        setTimeout(startWhatsAppBot, 1000);
      }
    }
  });

  sock.ev.on("messages.upsert", async ({ messages }) => {
    if (!botConfig.enabled) return;

    for (const msg of messages) {
      if (msg.key.fromMe) continue;

      const remoteJid = msg.key.remoteJid || "";

      // Ignora Status
      if (remoteJid === "status@broadcast" || remoteJid.includes("broadcast")) continue;

      // 1. REGRA: Ignorar Grupos categoricamente
      if (remoteJid.endsWith("@g.us")) {
        stats.groupsIgnored++;
        broadcastSSE("stats", stats);
        continue;
      }

      // 2. REGRA: Ignorar Blacklist
      const contactNumber = remoteJid.split("@")[0];
      const isBlacklisted = botConfig.blacklist.some(b => 
        b && (contactNumber.includes(b.trim()) || b.trim().includes(contactNumber))
      );
      if (isBlacklisted) {
        stats.blockedIgnored++;
        broadcastSSE("stats", stats);
        continue;
      }

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
        incomingText = `[Mensagem de voz / Áudio de ${m.audioMessage.seconds || 0}s]`;
      } else if (m.imageMessage) {
        incomingText = m.imageMessage.caption ? `[Foto: ${m.imageMessage.caption}]` : "[Foto/Imagem]";
      } else if (m.stickerMessage) {
        incomingText = "[Figurinha]";
      }

      if (!incomingText) continue;

      stats.receivedCount++;
      broadcastSSE("stats", stats);

      const contactName = msg.pushName || contactNumber;
      console.log(`[WhatsGemini Bot] 📩 Mensagem de ${contactName}: "${incomingText}"`);

      recentRepliedKeys.add(messageId);

      try {
        const t0 = Date.now();
        const replyText = await generateNaturalGeminiReply(contactName, remoteJid, incomingText);
        const duration = (Date.now() - t0) / 1000;

        if (replyText && sock) {
          // Delay humano de 1.2s antes de enviar
          await new Promise(r => setTimeout(r, 1200));

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

          console.log(`[WhatsGemini Bot] ✅ Resposta humana enviada para ${contactName}: "${replyText}"`);
        }
      } catch (err: any) {
        console.error(`[WhatsGemini Bot] ❌ Erro ao responder ${contactName}:`, err?.message || err);
      }
    }
  });
}

/**
 * Motor de IA Ultra-Natural (Zero cara de Robô)
 */
async function generateNaturalGeminiReply(contactName: string, remoteJid: string, incomingMessage: string): Promise<string> {
  if (!chatHistories.has(remoteJid)) {
    chatHistories.set(remoteJid, []);
  }
  const history = chatHistories.get(remoteJid)!;

  const systemPrompt = `Você é o próprio ${botConfig.userName} digitando no WhatsApp pessoal pelo celular.
REGRAS SUPREMAS PARA NÃO PARECER UMA IA:

1. PROIBIÇÕES CRÍTICAS (ISSO ENTREGA NA HORA QUE É UM ROBÔ):
- NUNCA use frases de telemarketing ou robô como: "Como posso te ajudar?", "Como posso ajudar você hoje?", "Em que posso ser útil?", "Estou à disposição", "Fico no aguardo". Ninguém fala assim com conhecidos no WhatsApp!
- NUNCA responda textos gigantes. Ninguém escreve redação no WhatsApp.
- NUNCA diga que é assistente ou IA. Você É o ${botConfig.userName}.

2. COMO O ${botConfig.userName} DIGITA NO WHATSAPP:
- Respostas super curtas, rápidas e descontraídas (1 linha só, como qualquer brasileiro digita no celular).
- Se alguém falar "oi", "e aí", "oi ${botConfig.userName.toLowerCase()}": responda apenas: "Opa, e aí! Tudo bem?", "Opa, tudo certo? Fala aí", "E aí, beleza?", ou "Oi! Tudo bem?".
- Use gírias e palavras normais do dia a dia: "tô", "pra", "beleza", "tranquilo", "já te respondo", "opa".
- Se for áudio recebido: "Opa, tô sem fone agora e não consigo ouvir seu áudio, me conta por texto rapidinho".
- Se for trabalho ou compromisso: "Tô na correria aqui agora, mas já te dou um retorno certinho!".
- Emojis no máximo 1 simples (ex: 👍, 😅, 🙌) ou nenhum.
${botConfig.customExamples ? `\nExemplos de como eu costumo responder:\n${botConfig.customExamples}` : ""}`;

  const contents: any[] = [];
  const recentHistory = history.slice(-6);

  recentHistory.forEach(item => {
    contents.push({ role: item.role, parts: [{ text: item.text }] });
  });

  contents.push({ role: "user", parts: [{ text: incomingMessage }] });

  // Tenta modelos com cota disponível (gemini-3.1-flash-lite-preview é o mais rápido e com cota folgada)
  const modelsToTry = ["gemini-3.1-flash-lite-preview", "gemini-3-flash-preview"];
  let reply = "";

  for (const model of modelsToTry) {
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
      const payload = {
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: contents,
        generationConfig: {
          temperature: 0.85,
          maxOutputTokens: 120,
          thinkingConfig: { thinkingBudget: 50 }
        }
      };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const data = await res.json();
        reply = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
        if (reply) break;
      }
    } catch (e) {}
  }

  // Limpeza final para garantir que não haja frases de robô
  reply = reply
    .replace(/Como posso (te|lhe) ajudar( hoje)?\??/gi, "")
    .replace(/Em que posso (ser útil|ajudar)\??/gi, "")
    .replace(/Estou (à|a) disposição\.?/gi, "")
    .trim();

  if (!reply) {
    reply = "Opa, tudo certo? Fala aí!";
  }

  history.push({ role: "user", text: incomingMessage });
  history.push({ role: "model", text: reply });
  if (history.length > 15) history.splice(0, history.length - 15);

  return reply;
}

startWhatsAppBot();

Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);

    if (url.pathname === "/api/events") {
      let controller: ReadableStreamDefaultController;
      const stream = new ReadableStream({
        start(c) {
          controller = c;
          const send = (data: string) => {
            try { controller.enqueue(new TextEncoder().encode(data)); } catch (e) { sseClients.delete(send); }
          };
          sseClients.add(send);

          send(`event: init\ndata: ${JSON.stringify({
            status: connectionStatus,
            qrDataUrl: currentQRDataUrl,
            user: connectedUser ? { id: (connectedUser.id || "").split(":")[0], name: connectedUser.name || botConfig.userName } : null,
            config: botConfig,
            stats: stats,
            logs: activityLogs
          })}\n\n`);
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

    if (url.pathname === "/api/toggle" && req.method === "POST") {
      botConfig.enabled = !botConfig.enabled;
      saveConfig();
      broadcastSSE("config", botConfig);
      return Response.json({ success: true, enabled: botConfig.enabled });
    }

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

    if (url.pathname === "/api/custom-examples" && req.method === "POST") {
      const body = await req.json();
      botConfig.customExamples = body.examples || "";
      saveConfig();
      broadcastSSE("config", botConfig);
      return Response.json({ success: true });
    }

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

    return new Response(renderDashboardHTML(), {
      headers: { "Content-Type": "text/html; charset=utf-8" }
    });
  }
});

console.log(`\n======================================================`);
console.log(`🌐 Servidor WhatsGemini Pro rodando em: http://localhost:${PORT}`);
console.log(`======================================================\n`);

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
    .bg-wa-dark { background-color: #111b21; }
    .bg-wa-card { background-color: #202c33; }
    .border-wa { border-color: rgba(134, 150, 160, 0.15); }
    .qr-frame { background: white; padding: 16px; border-radius: 20px; box-shadow: 0 0 40px rgba(37, 211, 102, 0.2); }
  </style>
</head>
<body class="min-h-screen flex flex-col">
  <header class="bg-wa-dark border-b border-wa px-6 py-4 flex items-center justify-between sticky top-0 z-50">
    <div class="flex items-center gap-3">
      <div class="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#128C7E] to-[#25D366] flex items-center justify-center text-xl shadow-lg shadow-[#25D366]/20">
        ✨
      </div>
      <div>
        <h1 class="font-extrabold text-lg tracking-tight text-white flex items-center gap-2">
          WhatsGemini <span class="text-xs bg-[#25D366]/20 text-[#25D366] px-2 py-0.5 rounded-full font-bold">HUMAN EDITION</span>
        </h1>
        <p class="text-xs text-[#8696a0]">Respostas Naturais em Primeira Pessoa (Sem Cara de Robô)</p>
      </div>
    </div>

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
    <div class="lg:col-span-5 space-y-6">
      <!-- Card Conexão QR -->
      <div class="bg-wa-dark border border-wa rounded-2xl p-6 shadow-xl">
        <h2 class="text-base font-bold text-white flex items-center gap-2 mb-2">
          📱 Conectar seu WhatsApp
        </h2>
        <p class="text-xs text-[#8696a0] mb-5">
          Conexão direta multi-device. Aponte a câmera do WhatsApp para o QR Code abaixo:
        </p>

        <div id="qr-container" class="flex flex-col items-center justify-center py-4">
          <div class="qr-frame mb-4" id="qr-wrapper">
            <div id="qr-loading" class="w-[280px] h-[280px] flex flex-col items-center justify-center text-slate-800 text-sm font-semibold">
              <div class="w-8 h-8 border-4 border-[#25D366] border-t-transparent rounded-full animate-spin mb-3"></div>
              Gerando QR Code...
            </div>
            <img id="qr-image" src="" alt="QR Code WhatsApp" class="w-[280px] h-[280px] rounded-lg hidden" />
          </div>

          <div class="bg-wa-card border border-wa rounded-xl p-3.5 w-full text-xs text-[#8696a0] space-y-1.5">
            <p class="text-white font-semibold mb-1">Como escanear:</p>
            <p>1. Abra o WhatsApp no celular > Menu (⋮) ou Configurações</p>
            <p>2. Toque em <strong>Aparelhos conectados</strong> > <strong>Conectar um aparelho</strong></p>
          </div>
        </div>

        <div id="connected-view" class="hidden flex flex-col items-center justify-center py-8 text-center space-y-4">
          <div class="w-20 h-20 rounded-full bg-[#25D366]/20 border-2 border-[#25D366] flex items-center justify-center text-3xl shadow-xl shadow-[#25D366]/30 animate-bounce">
            🟢
          </div>
          <div>
            <h3 class="text-lg font-bold text-white">WhatsApp Conectado!</h3>
            <p class="text-sm text-[#25D366] font-semibold" id="connected-number">+55 ...</p>
            <p class="text-xs text-[#8696a0] mt-1">Respondendo como Íthalo em tom ultra-natural.</p>
          </div>

          <button id="btn-disconnect" class="text-xs text-red-400 hover:text-red-300 underline font-semibold pt-2">
            Desconectar este aparelho / Trocar sessão
          </button>
        </div>
      </div>

      <!-- Card Como Eu Respondo (Exemplos Reais) -->
      <div class="bg-wa-dark border border-wa rounded-2xl p-6 shadow-xl">
        <h2 class="text-base font-bold text-white flex items-center gap-2 mb-2">
          ✍️ Como Você Costuma Responder
        </h2>
        <p class="text-xs text-[#8696a0] mb-3">
          Cole abaixo exemplos de respostas reais suas para a IA aprender seu estilo exato:
        </p>
        <textarea id="input-examples" rows="4" class="w-full bg-wa-card border border-wa rounded-xl p-3 text-xs text-white placeholder-[#8696a0] focus:outline-none focus:border-[#25D366] leading-relaxed" placeholder="Ex:&#10;Opa, e aí! Tudo certo?&#10;Tô por aqui sim, fala aí!&#10;Tranquilo, já já te respondo com calma!"></textarea>
        <div class="flex items-center justify-between mt-3">
          <span class="text-[11px] text-[#25D366]" id="examples-status"></span>
          <button id="btn-save-examples" class="bg-[#25D366] hover:bg-[#20ba59] text-[#0b141a] font-bold text-xs px-4 py-2 rounded-xl transition-all">
            Salvar Meu Estilo
          </button>
        </div>
      </div>

      <!-- Card Pessoas Bloqueadas -->
      <div class="bg-wa-dark border border-wa rounded-2xl p-6 shadow-xl">
        <h2 class="text-base font-bold text-white flex items-center gap-2 mb-2">
          🚫 Pessoas Bloqueadas (Blacklist)
        </h2>
        <p class="text-xs text-[#8696a0] mb-4">
          Digite o número ou nome de quem a IA NUNCA deve responder:
        </p>

        <div class="flex gap-2 mb-4">
          <input type="text" id="input-blacklist" placeholder="Número com DDD ou nome..." class="flex-1 bg-wa-card border border-wa rounded-xl px-3.5 py-2 text-xs text-white placeholder-[#8696a0] focus:outline-none focus:border-[#25D366]">
          <button id="btn-add-blacklist" class="bg-red-500 hover:bg-red-600 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all">
            + Bloquear
          </button>
        </div>

        <div id="blacklist-tags" class="flex flex-wrap gap-2"></div>

        <div class="mt-4 pt-4 border-t border-wa flex items-center justify-between text-xs text-[#8696a0]">
          <span>Grupos de WhatsApp:</span>
          <span class="text-[#25D366] font-bold">100% IGNORADOS</span>
        </div>
      </div>
    </div>

    <!-- COLUNA DIREITA: FEED AO VIVO -->
    <div class="lg:col-span-7 space-y-6">
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

      <div class="bg-wa-dark border border-wa rounded-2xl p-6 shadow-xl flex flex-col h-[560px]">
        <div class="flex items-center justify-between mb-4 pb-3 border-b border-wa">
          <div>
            <h2 class="text-base font-bold text-white flex items-center gap-2">
              ⚡ Atividade em Tempo Real
            </h2>
            <p class="text-xs text-[#8696a0]">Veja como o Íthalo está respondendo cada contato</p>
          </div>
          <span class="text-[11px] bg-[#25D366]/10 text-[#25D366] px-2.5 py-1 rounded-full font-bold flex items-center gap-1.5">
            <span class="w-1.5 h-1.5 rounded-full bg-[#25D366] animate-ping"></span> AO VIVO
          </span>
        </div>

        <div id="logs-container" class="flex-1 overflow-y-auto space-y-3 pr-2">
          <div class="text-center py-20 text-[#8696a0] text-xs" id="empty-logs-msg">
            Aguardando mensagens...<br>
            Assim que alguém mandar mensagem, a resposta ultra-humana aparecerá aqui!
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
    const inputExamples = document.getElementById("input-examples");
    const btnSaveExamples = document.getElementById("btn-save-examples");
    const examplesStatus = document.getElementById("examples-status");

    let currentBlacklist = [];

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

      if (config.customExamples && !inputExamples.value) {
        inputExamples.value = config.customExamples;
      }
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
          <span class="text-[#25D366] block text-[10px] uppercase font-bold mb-0.5">Resposta Natural do Íthalo</span>
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

    btnSaveExamples.addEventListener("click", () => {
      const examples = inputExamples.value.trim();
      fetch("/api/custom-examples", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ examples })
      }).then(() => {
        examplesStatus.innerText = "✅ Salvo com sucesso!";
        setTimeout(() => { examplesStatus.innerText = ""; }, 2500);
      });
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
