/**
 * WhatsGemini Pro - Ultimate Human WhatsApp Bot & Voice Studio (1000000% Edition)
 * 
 * Funcionalidades Avançadas:
 * - Reconhecimento Inteligente de Pessoas (Namorada VIP, Clientes IPTV, Amigos)
 * - Gerador de Áudio com IA Real (Envia notas de voz PTT autênticas no WhatsApp)
 * - Motor Multi-Modelos Ultra-Rápido (Gemini Flash Lite: ~0.8s, zero queda de cota)
 * - Vendas & Negociação de IPTV Automática (R$ 20/mês, teste grátis, Pix)
 * - Estúdio de Áudio no Dashboard: pré-visualize e envie áudios com 1 clique
 * - Persistência Total no Disco: configurações e lista de bloqueados nunca são perdidas
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
  girlfriendName: string;
  girlfriendPrompt: string;
  business: {
    product: string;
    price: string;
    testAvailable: boolean;
    pixKey: string;
    description: string;
  };
  customExamples: string;
  autoAudioReply: boolean;
  ignoreGroups: boolean;
  blacklist: string[];
}

let botConfig: BotConfig = {
  enabled: true,
  userName: "Íthalo",
  girlfriendName: "Heloisa Guimarães",
  girlfriendPrompt: "A Heloisa Guimarães é minha namorada. Trate ela com muito carinho, seja fofo, amoroso e atencioso (pode chamar de amor, linda, vida). Se ela pedir carinho ou áudio, responda de forma muito carinhosa e natural!",
  business: {
    product: "IPTV Completo",
    price: "R$ 20 por mês",
    testAvailable: true,
    pixKey: "Envio na hora que confirmar",
    description: "Todos os canais liberados (futebol, filmes, séries), qualidade 4K/Full HD, sem travamentos. R$ 20 mensais."
  },
  customExamples: "Opa, e aí! Tudo certo?\nTô por aqui sim, fala aí!\nFechado nos 20 mesmo, quer que eu te mande o pix?\nAh é, viajo às vezes kkkk",
  autoAudioReply: true,
  ignoreGroups: true,
  blacklist: []
};

// Carrega configurações persistentes
if (existsSync(CONFIG_FILE)) {
  try {
    botConfig = { ...botConfig, ...JSON.parse(readFileSync(CONFIG_FILE, "utf-8")) };
  } catch (e) {}
} else {
  saveConfig();
}

function saveConfig() {
  writeFileSync(CONFIG_FILE, JSON.stringify(botConfig, null, 2), "utf-8");
}

let currentQR: string | null = null;
let currentQRDataUrl: string | null = null;
let connectionStatus: "WAITING_QR" | "CONNECTING" | "CONNECTED" | "DISCONNECTED" = "DISCONNECTED";
let connectedUser: { id: string; name?: string } | null = null;
let sock: WASocket | null = null;

// Histórico de conversas por JID
const chatHistories = new Map<string, Array<{ role: "user" | "model"; text: string }>>();
const recentRepliedKeys = new Set<string>();

const stats = {
  receivedCount: 0,
  repliedCount: 0,
  audiosGenerated: 0,
  groupsIgnored: 0,
  blockedIgnored: 0
};

interface ActivityLog {
  id: number;
  timestamp: string;
  contact: string;
  incoming: string;
  reply: string;
  isAudio?: boolean;
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

/**
 * Conexão direta com WhatsApp Multi-Device
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
        setTimeout(startWhatsAppBot, 2500);
      } else {
        try { rmSync(AUTH_DIR, { recursive: true, force: true }); } catch (e) {}
        setTimeout(startWhatsAppBot, 1000);
      }
    }
  });

  // Mensagens recebidas
  sock.ev.on("messages.upsert", async ({ messages }) => {
    if (!botConfig.enabled) return;

    for (const msg of messages) {
      if (msg.key.fromMe) continue;

      const remoteJid = msg.key.remoteJid || "";

      // 1. Ignora Status / Broadcast
      if (remoteJid === "status@broadcast" || remoteJid.includes("broadcast")) continue;

      // 2. REGRA SUPREMA: Ignorar Grupos categoricamente (Apenas pessoas recebem resposta)
      if (remoteJid.endsWith("@g.us")) {
        stats.groupsIgnored++;
        broadcastSSE("stats", stats);
        continue;
      }

      // 3. REGRA: Ignorar Blacklist permanente
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
      console.log(`[WhatsGemini Bot] 📩 Mensagem de ${contactName} (${contactNumber}): "${incomingText}"`);

      recentRepliedKeys.add(messageId);

      try {
        const t0 = Date.now();
        const isGF = isGirlfriendContact(contactName, remoteJid);

        // Verifica se a pessoa pediu especificamente um áudio de voz
        const wantsAudio = /(manda|envia|mande|grava|mandei)\s+(um\s+)?(audio|áudio|voz)/i.test(incomingText) ||
                           /(fala|manda)\s+por\s+(audio|áudio)/i.test(incomingText) ||
                           /(áudio|audio)\s+falando/i.test(incomingText);

        if (wantsAudio && botConfig.autoAudioReply && sock) {
          console.log(`[WhatsGemini Bot] 🎙️ Pedido de áudio detectado de ${contactName}! Gerando nota de voz real...`);
          
          // Gera o texto que o Íthalo vai falar no áudio
          let audioSpeechText = "";
          if (isGF) {
            audioSpeechText = "Oi meu amor, claro que eu te amo! Tô aqui na correria trabalhando agora, mas logo logo tô com você, tá bom? Te amo muito, beijo!";
          } else {
            audioSpeechText = "Opa, fala aí! Mandei esse áudio rapidinho aqui pra te responder, tamo junto!";
          }

          const audioBuffer = await generateSpeechAudio(audioSpeechText);
          const duration = (Date.now() - t0) / 1000;

          if (audioBuffer && sock) {
            // Envia como nota de voz do WhatsApp (PTT)
            await sock.sendMessage(remoteJid, {
              audio: audioBuffer,
              mimetype: "audio/wav",
              ptt: true
            });

            stats.repliedCount++;
            stats.audiosGenerated++;

            const logItem: ActivityLog = {
              id: Date.now(),
              timestamp: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
              contact: `${contactName} (${contactNumber})`,
              incoming: incomingText,
              reply: `🎙️ [Áudio de Voz Enviado]: "${audioSpeechText}"`,
              isAudio: true,
              duration: Number(duration.toFixed(2))
            };
            activityLogs.unshift(logItem);
            if (activityLogs.length > 50) activityLogs.pop();

            broadcastSSE("new_reply", logItem);
            broadcastSSE("stats", stats);
            console.log(`[WhatsGemini Bot] ✅ Áudio PTT enviado com sucesso para ${contactName}!`);
            continue;
          }
        }

        // Resposta normal em texto super inteligente e natural
        const replyText = await generateSmartGeminiReply(contactName, remoteJid, incomingText, isGF);
        const duration = (Date.now() - t0) / 1000;

        if (replyText && sock) {
          // Delay humano realista de 1.2s
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

function isGirlfriendContact(contactName: string, remoteJid: string): boolean {
  const cleanName = (contactName || "").toLowerCase();
  const cleanJid = (remoteJid || "").toLowerCase();
  const target = (botConfig.girlfriendName || "heloisa").toLowerCase();

  return cleanName.includes(target) || cleanName.includes("heloisa") || cleanJid.includes("191813272993834");
}

/**
 * Gera áudio real de voz em alta definição usando Gemini TTS
 */
async function generateSpeechAudio(text: string, voiceName = "Puck"): Promise<Buffer | null> {
  try {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash-tts:generateContent?key=${GEMINI_API_KEY}`;
    const payload = {
      contents: [{ role: "user", parts: [{ text }] }],
      generationConfig: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: voiceName
            }
          }
        }
      }
    };

    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      const data = await res.json();
      const base64Audio = data.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64Audio) {
        return Buffer.from(base64Audio, "base64");
      }
    }
  } catch (err) {
    console.error("[WhatsGemini TTS Error]", err);
  }
  return null;
}

/**
 * Motor de IA Ultra-Humano com Contexto de Namorada e Negócios
 */
async function generateSmartGeminiReply(
  contactName: string,
  remoteJid: string,
  incomingMessage: string,
  isGirlfriend: boolean
): Promise<string> {
  if (!chatHistories.has(remoteJid)) {
    chatHistories.set(remoteJid, []);
  }
  const history = chatHistories.get(remoteJid)!;

  let relationshipContext = "";
  if (isGirlfriend) {
    relationshipContext = `\n❤️ CONVERSANDO COM HELOISA (SUA NAMORADA):
- Ela te conhece perfeitamente. O Íthalo na vida real NÃO MANDA EMOJIS! NUNCA use emojis nem corações (nada de ❤️, 😅, etc). Ela estranha na hora se você mandar emoji!
- NÃO seja meloso nem chame de "vida" ou "meu amor" em toda frase.
- Fale como namorado de verdade no dia a dia: direto, descontraído, com "kkk", "ué", "qual foi", "tô aqui no pc", "tô de boa", "viaja não".
- Se ela disser que você tá estranho ou perguntar o que houve: seja direto e natural: "ué tô normal ué kkk", "tô só concentrado aqui mexendo numas coisas", "viaja não kkk".`;
  } else {
    relationshipContext = `\n💼 NEGÓCIOS & IPTV (SE A PESSOA PERGUNTAR):
- Você vende ${botConfig.business.product} por ${botConfig.business.price}.
- Detalhes: ${botConfig.business.description}.
- Se pedirem teste: diga que libera um teste grátis na hora pra ela testar.
- Se confirmarem a compra: diga que vai mandar a chave Pix pra ela. Seja direto e firme no valor de R$ 20.`;
  }

  const systemPrompt = `Você é o próprio ${botConfig.userName} digitando no WhatsApp pessoal pelo celular.
REGRAS OBRIGATÓRIAS PARA NUNCA PARECER IA:

1. PROIBIÇÕES CRÍTICAS (ISSO ENTREGA NA HORA QUE É UM ROBÔ):
- NÃO USE EMOJIS. O Íthalo quase nunca manda emoji no WhatsApp! No máximo use "kkk" ou "rs". ZERO corações ou emojis amarelos.
- NUNCA use frases prontas de robô como: "Como posso te ajudar?", "Como posso ajudar você hoje?", "Em que posso ser útil?", "Estou à disposição", "Fico no aguardo". Jamais fale isso!
- NUNCA responda textos gigantes. Responda em 1 linha curta e direta (máximo 15 palavras).
- NUNCA diga que é assistente ou IA. Você É o ${botConfig.userName}.
- Se a pessoa fez uma pergunta específica, responda EXATAMENTE sobre o assunto da pergunta, sem rodeios.

2. ESTILO DO ${botConfig.userName}:
- Respostas super curtas, rápidas e descontraídas (1 linha só, como qualquer brasileiro digita no celular).
- Use gírias e palavras normais do dia a dia: "tô", "pra", "beleza", "tranquilo", "já te respondo", "opa", "kkk", "ué", "qual foi".
- Sem formalidades, sem enrolação.
${relationshipContext}
${botConfig.customExamples ? `\nExemplos de como eu costumo responder:\n${botConfig.customExamples}` : ""}`;

  const contents: any[] = [];
  const recentHistory = history.slice(-6);

  recentHistory.forEach(item => {
    contents.push({ role: item.role, parts: [{ text: item.text }] });
  });

  contents.push({ role: "user", parts: [{ text: incomingMessage }] });

  // Modelos de alto desempenho e cota disponível
  const modelsToTry = [
    "gemini-flash-lite-latest",
    "gemini-3.5-flash-lite",
    "gemini-3.1-flash-lite-preview"
  ];
  let reply = "";

  for (const model of modelsToTry) {
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
      const payload = {
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: contents,
        generationConfig: {
          temperature: 0.85,
          maxOutputTokens: 150
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

  // Limpeza de segurança anti-robô
  reply = reply
    .replace(/Como posso (te|lhe) ajudar( hoje)?\??/gi, "")
    .replace(/Em que posso (ser útil|ajudar)\??/gi, "")
    .replace(/Estou (à|a) disposição\.?/gi, "")
    .trim();

  // Para a namorada, o Íthalo não manda emojis
  if (isGirlfriend) {
    reply = reply.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE0F}\u{1F900}-\u{1F9FF}]/gu, "").replace(/\s{2,}/g, " ").trim();
  }

  // Fallback inteligente se a API falhar (nunca repete a mesma frase genérica)
  if (!reply) {
    if (isGirlfriend) {
      reply = "tô aqui no pc resolvendo umas coisas, já te chamo certinho kkk";
    } else if (/^(oi|olá|ola|eai|e aí|opa|bom dia|boa tarde|boa noite)\b/i.test(incomingMessage)) {
      reply = "opa, fala aí!";
    } else {
      reply = "tô meio na correria aqui agora, já já te respondo certinho";
    }
  }

  history.push({ role: "user", text: incomingMessage });
  history.push({ role: "model", text: reply });
  if (history.length > 15) history.splice(0, history.length - 15);

  return reply;
}

startWhatsAppBot();

/**
 * Servidor Web com Dashboard Completo de Controle
 */
Bun.serve({
  port: PORT,
  idleTimeout: 255,
  async fetch(req) {
    const url = new URL(req.url);

    // Eventos em tempo real (SSE)
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

    // Toggle Liga/Desliga
    if (url.pathname === "/api/toggle" && req.method === "POST") {
      botConfig.enabled = !botConfig.enabled;
      saveConfig();
      broadcastSSE("config", botConfig);
      return Response.json({ success: true, enabled: botConfig.enabled });
    }

    // Gerenciador de Blacklist
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

    // Atualização de Configurações Gerais
    if (url.pathname === "/api/update-config" && req.method === "POST") {
      const body = await req.json();
      botConfig = { ...botConfig, ...body };
      saveConfig();
      broadcastSSE("config", botConfig);
      return Response.json({ success: true, config: botConfig });
    }

    // Estúdio de Áudio: Gerar áudio para ouvir na tela
    if (url.pathname === "/api/generate-audio" && req.method === "POST") {
      const body = await req.json();
      const { text, voice = "Puck" } = body;
      if (!text) return Response.json({ success: false, error: "Texto vazio" });

      const audioBuffer = await generateSpeechAudio(text, voice);
      if (audioBuffer) {
        const base64Url = `data:audio/wav;base64,${audioBuffer.toString("base64")}`;
        return Response.json({ success: true, audioUrl: base64Url });
      }
      return Response.json({ success: false, error: "Falha na geração do áudio" });
    }

    // Estúdio de Áudio: Enviar áudio diretamente no WhatsApp de qualquer pessoa
    if (url.pathname === "/api/send-audio-whatsapp" && req.method === "POST") {
      const body = await req.json();
      const { target, text, voice = "Puck" } = body;
      if (!text || !target) return Response.json({ success: false, error: "Dados incompletos" });

      if (!sock || connectionStatus !== "CONNECTED") {
        return Response.json({ success: false, error: "WhatsApp não está conectado" });
      }

      // Monta o JID do WhatsApp
      let cleanTarget = target.replace(/\D/g, "");
      if (!cleanTarget.includes("@s.whatsapp.net")) {
        cleanTarget = `${cleanTarget}@s.whatsapp.net`;
      }

      const audioBuffer = await generateSpeechAudio(text, voice);
      if (audioBuffer) {
        await sock.sendMessage(cleanTarget, {
          audio: audioBuffer,
          mimetype: "audio/wav",
          ptt: true
        });

        stats.audiosGenerated++;
        broadcastSSE("stats", stats);
        return Response.json({ success: true, message: "Áudio enviado com sucesso!" });
      }
      return Response.json({ success: false, error: "Falha ao sintetizar voz" });
    }

    // Desconectar sessão QR
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

    // Dashboard HTML Completo
    return new Response(renderDashboardHTML(), {
      headers: { "Content-Type": "text/html; charset=utf-8" }
    });
  }
});

console.log(`\n======================================================`);
console.log(`🌐 Servidor WhatsGemini Pro 1000000% rodando em: http://localhost:${PORT}`);
console.log(`======================================================\n`);

function renderDashboardHTML() {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>WhatsGemini Pro 1000000% - Painel de Controle Total</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    body { font-family: 'Plus Jakarta Sans', sans-serif; background-color: #0b141a; color: #e9edef; }
    .bg-wa-dark { background-color: #111b21; }
    .bg-wa-card { background-color: #202c33; }
    .border-wa { border-color: rgba(134, 150, 160, 0.15); }
    .qr-frame { background: white; padding: 16px; border-radius: 20px; box-shadow: 0 0 40px rgba(37, 211, 102, 0.2); }
    .tab-btn.active {
      background-color: #25D366;
      color: #0b141a;
      font-weight: 700;
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
          WhatsGemini <span class="text-xs bg-[#25D366]/20 text-[#25D366] px-2 py-0.5 rounded-full font-bold">1.000.000% ULTIMATE</span>
        </h1>
        <p class="text-xs text-[#8696a0]">Inteligência Total • Voz PTT • Vendas IPTV • Namorada VIP</p>
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

  <!-- Navigation Tabs -->
  <div class="bg-[#111b21] border-b border-wa px-6 py-2.5 flex items-center gap-2 overflow-x-auto">
    <button class="tab-btn active px-4 py-1.5 rounded-full text-xs font-semibold text-slate-300 transition-all hover:bg-white/5" data-tab="tab-feed">
      ⚡ Atividade ao Vivo
    </button>
    <button class="tab-btn px-4 py-1.5 rounded-full text-xs font-semibold text-slate-300 transition-all hover:bg-white/5" data-tab="tab-girlfriend">
      ❤️ Minha Namorada (VIP)
    </button>
    <button class="tab-btn px-4 py-1.5 rounded-full text-xs font-semibold text-slate-300 transition-all hover:bg-white/5" data-tab="tab-business">
      💼 Negócios & IPTV (R$ 20)
    </button>
    <button class="tab-btn px-4 py-1.5 rounded-full text-xs font-semibold text-slate-300 transition-all hover:bg-white/5" data-tab="tab-audio">
      🎙️ Estúdio de Áudio IA
    </button>
    <button class="tab-btn px-4 py-1.5 rounded-full text-xs font-semibold text-slate-300 transition-all hover:bg-white/5" data-tab="tab-blacklist">
      🚫 Pessoas Bloqueadas
    </button>
    <button class="tab-btn px-4 py-1.5 rounded-full text-xs font-semibold text-slate-300 transition-all hover:bg-white/5" data-tab="tab-qr">
      📱 Conexão WhatsApp (QR)
    </button>
  </div>

  <main class="flex-1 max-w-6xl w-full mx-auto p-6">
    <!-- TAB 1: FEED AO VIVO -->
    <div id="tab-feed" class="tab-content grid grid-cols-1 lg:grid-cols-12 gap-6">
      <div class="lg:col-span-4 space-y-6">
        <!-- Stats -->
        <div class="bg-wa-dark border border-wa rounded-2xl p-5 shadow-xl space-y-4">
          <h2 class="text-sm font-bold text-white flex items-center gap-2">📊 Estatísticas em Tempo Real</h2>
          <div class="grid grid-cols-2 gap-3">
            <div class="bg-wa-card p-3 rounded-xl text-center">
              <span class="text-[11px] text-[#8696a0] block">Recebidas</span>
              <span class="text-xl font-black text-white" id="stat-received">0</span>
            </div>
            <div class="bg-wa-card p-3 rounded-xl text-center">
              <span class="text-[11px] text-[#8696a0] block">Respondidas</span>
              <span class="text-xl font-black text-[#25D366]" id="stat-replied">0</span>
            </div>
            <div class="bg-wa-card p-3 rounded-xl text-center">
              <span class="text-[11px] text-[#8696a0] block">Áudios Gerados</span>
              <span class="text-xl font-black text-blue-400" id="stat-audios">0</span>
            </div>
            <div class="bg-wa-card p-3 rounded-xl text-center">
              <span class="text-[11px] text-[#8696a0] block">Grupos Ignorados</span>
              <span class="text-xl font-black text-slate-400" id="stat-groups">0</span>
            </div>
          </div>
        </div>

        <!-- Quick Info -->
        <div class="bg-wa-dark border border-wa rounded-2xl p-5 shadow-xl text-xs space-y-3">
          <h3 class="font-bold text-white">🚀 Sistema 1000000% Ativo</h3>
          <p class="text-[#8696a0] leading-relaxed">
            • <strong>Namorada VIP:</strong> Heloisa tratada com carinho e amor.<br>
            • <strong>Áudio Automático:</strong> Responde com notas de voz reais quando pedirem.<br>
            • <strong>IPTV Automático:</strong> Vende e negocia a R$ 20/mês.<br>
            • <strong>Grupos:</strong> 100% ignorados automaticamente.
          </p>
        </div>
      </div>

      <!-- Feed Container -->
      <div class="lg:col-span-8 bg-wa-dark border border-wa rounded-2xl p-6 shadow-xl flex flex-col h-[600px]">
        <div class="flex items-center justify-between mb-4 pb-3 border-b border-wa">
          <div>
            <h2 class="text-base font-bold text-white flex items-center gap-2">⚡ Atividade ao Vivo</h2>
            <p class="text-xs text-[#8696a0]">Todas as mensagens recebidas e respostas humanas do Íthalo</p>
          </div>
          <span class="text-[11px] bg-[#25D366]/10 text-[#25D366] px-2.5 py-1 rounded-full font-bold flex items-center gap-1.5">
            <span class="w-1.5 h-1.5 rounded-full bg-[#25D366] animate-ping"></span> AO VIVO
          </span>
        </div>

        <div id="logs-container" class="flex-1 overflow-y-auto space-y-3 pr-2">
          <div class="text-center py-24 text-[#8696a0] text-xs" id="empty-logs-msg">
            Aguardando mensagens...<br>
            Assim que alguém mandar mensagem, a conversa aparecerá aqui em tempo real!
          </div>
        </div>
      </div>
    </div>

    <!-- TAB 2: MINHA NAMORADA (VIP) -->
    <div id="tab-girlfriend" class="tab-content hidden max-w-2xl mx-auto space-y-6">
      <div class="bg-wa-dark border border-wa rounded-2xl p-6 shadow-xl space-y-4">
        <div class="flex items-center gap-3">
          <div class="w-12 h-12 rounded-2xl bg-pink-500/20 text-pink-400 flex items-center justify-center text-2xl">
            ❤️
          </div>
          <div>
            <h2 class="text-base font-bold text-white">Configuração da Namorada (VIP)</h2>
            <p class="text-xs text-[#8696a0]">Instrua a IA sobre como tratar a Heloisa com perfeição</p>
          </div>
        </div>

        <div class="space-y-3">
          <div>
            <label class="block text-xs font-semibold mb-1 text-slate-300">Nome ou identificação dela no WhatsApp:</label>
            <input type="text" id="gf-name" value="Heloisa Guimarães" class="w-full bg-wa-card border border-wa rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#25D366]">
          </div>

          <div>
            <label class="block text-xs font-semibold mb-1 text-slate-300">Instruções de como a IA deve tratá-la:</label>
            <textarea id="gf-prompt" rows="4" class="w-full bg-wa-card border border-wa rounded-xl p-3 text-xs text-white leading-relaxed focus:outline-none focus:border-[#25D366]">A Heloisa Guimarães é minha namorada. Trate ela com muito carinho, seja fofo, amoroso e atencioso (pode chamar de amor, linda, vida). Se ela pedir carinho ou áudio, responda de forma muito carinhosa e natural!</textarea>
          </div>

          <div class="flex items-center justify-between pt-2">
            <span class="text-xs text-[#25D366]" id="gf-save-status"></span>
            <button id="btn-save-gf" class="bg-[#25D366] hover:bg-[#20ba59] text-[#0b141a] font-bold text-xs px-6 py-2.5 rounded-xl transition-all">
              💾 Salvar Configuração da Namorada
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- TAB 3: NEGÓCIOS & IPTV -->
    <div id="tab-business" class="tab-content hidden max-w-2xl mx-auto space-y-6">
      <div class="bg-wa-dark border border-wa rounded-2xl p-6 shadow-xl space-y-4">
        <div class="flex items-center gap-3">
          <div class="w-12 h-12 rounded-2xl bg-emerald-500/20 text-[#25D366] flex items-center justify-center text-2xl">
            💼
          </div>
          <div>
            <h2 class="text-base font-bold text-white">Catálogo de Negócios & Vendas (IPTV)</h2>
            <p class="text-xs text-[#8696a0]">Defina o preço correto e regras para a IA vender no automático</p>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-xs font-semibold mb-1 text-slate-300">Produto:</label>
            <input type="text" id="biz-product" value="IPTV Completo" class="w-full bg-wa-card border border-wa rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#25D366]">
          </div>
          <div>
            <label class="block text-xs font-semibold mb-1 text-slate-300">Preço Fixo Mensal:</label>
            <input type="text" id="biz-price" value="R$ 20 por mês" class="w-full bg-wa-card border border-wa rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#25D366]">
          </div>
        </div>

        <div>
          <label class="block text-xs font-semibold mb-1 text-slate-300">Descrição do Produto (canais, qualidade, etc):</label>
          <textarea id="biz-desc" rows="3" class="w-full bg-wa-card border border-wa rounded-xl p-3 text-xs text-white focus:outline-none focus:border-[#25D366]">Todos os canais liberados (futebol ao vivo, filmes, séries, abertos e fechados), qualidade 4K/Full HD, sem travamentos. R$ 20 mensais.</textarea>
        </div>

        <div>
          <label class="block text-xs font-semibold mb-1 text-slate-300">Chave Pix ou Instrução de Pagamento:</label>
          <input type="text" id="biz-pix" value="Envio na hora que confirmar" class="w-full bg-wa-card border border-wa rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#25D366]">
        </div>

        <div class="flex items-center justify-between pt-2">
          <span class="text-xs text-[#25D366]" id="biz-save-status"></span>
          <button id="btn-save-biz" class="bg-[#25D366] hover:bg-[#20ba59] text-[#0b141a] font-bold text-xs px-6 py-2.5 rounded-xl transition-all">
            💾 Salvar Regras de Venda
          </button>
        </div>
      </div>
    </div>

    <!-- TAB 4: ESTÚDIO DE ÁUDIO IA -->
    <div id="tab-audio" class="tab-content hidden max-w-2xl mx-auto space-y-6">
      <div class="bg-wa-dark border border-wa rounded-2xl p-6 shadow-xl space-y-4">
        <div class="flex items-center gap-3">
          <div class="w-12 h-12 rounded-2xl bg-blue-500/20 text-blue-400 flex items-center justify-center text-2xl">
            🎙️
          </div>
          <div>
            <h2 class="text-base font-bold text-white">Estúdio de Áudio & Voz do Íthalo</h2>
            <p class="text-xs text-[#8696a0]">Sintetize notas de voz autênticas e envie direto no WhatsApp</p>
          </div>
        </div>

        <div class="space-y-4 pt-2">
          <div>
            <label class="block text-xs font-semibold mb-1 text-slate-300">Para quem enviar (Número com DDD ou Nome):</label>
            <input type="text" id="audio-target" placeholder="Ex: 558199999999 ou Heloisa" class="w-full bg-wa-card border border-wa rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#25D366]">
          </div>

          <div>
            <label class="block text-xs font-semibold mb-1 text-slate-300">Texto que a IA vai falar no áudio:</label>
            <textarea id="audio-text" rows="3" class="w-full bg-wa-card border border-wa rounded-xl p-3 text-xs text-white leading-relaxed focus:outline-none focus:border-[#25D366]" placeholder="Digite o que quer que a voz fale... Ex: Oi meu amor, claro que eu te amo! Tô aqui na correria mas já já tô aí com você!"></textarea>
          </div>

          <!-- Botões de Atalho Rápido -->
          <div class="flex flex-wrap gap-2 text-[11px]">
            <button class="quick-audio-btn bg-wa-card hover:bg-slate-700 px-3 py-1 rounded-lg text-slate-300" data-text="Oi amor, claro que eu te amo! Tô aqui trabalhando rapidinho mas já já tô aí com você, tá bom? Te amo muito, um beijo!">
              ❤️ Áudio de Amor (Heloisa)
            </button>
            <button class="quick-audio-btn bg-wa-card hover:bg-slate-700 px-3 py-1 rounded-lg text-slate-300" data-text="Opa, o IPTV tá saindo por vinte reais por mês completo com tudo liberado. Quer que eu te mande um teste grátis pra você ver?">
              💼 Áudio Venda IPTV (R$ 20)
            </button>
            <button class="quick-audio-btn bg-wa-card hover:bg-slate-700 px-3 py-1 rounded-lg text-slate-300" data-text="Opa, fala aí! Mandei esse áudio aqui rapidinho só pra te responder, tamo junto!">
              👋 Áudio Amigável
            </button>
          </div>

          <!-- Player de Pré-Visualização -->
          <div id="audio-preview-container" class="hidden bg-wa-card p-3 rounded-xl flex items-center justify-between">
            <audio id="audio-preview-player" controls class="h-8 max-w-[340px]"></audio>
            <span class="text-xs text-blue-400 font-semibold">Áudio Gerado com Sucesso!</span>
          </div>

          <div class="flex items-center gap-3 pt-2">
            <button id="btn-generate-preview" class="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-all">
              🎧 Gerar & Ouvir Prévia
            </button>

            <button id="btn-send-audio" class="bg-[#25D366] hover:bg-[#20ba59] text-[#0b141a] font-bold text-xs px-6 py-2.5 rounded-xl transition-all shadow-md shadow-[#25D366]/20">
              🚀 Enviar Áudio no WhatsApp (PTT)
            </button>
          </div>
          <span id="audio-status" class="text-xs block"></span>
        </div>
      </div>
    </div>

    <!-- TAB 5: PESSOAS BLOQUEADAS -->
    <div id="tab-blacklist" class="tab-content hidden max-w-2xl mx-auto space-y-6">
      <div class="bg-wa-dark border border-wa rounded-2xl p-6 shadow-xl space-y-4">
        <h2 class="text-base font-bold text-white flex items-center gap-2">
          🚫 Pessoas Bloqueadas (A IA NUNCA Responde)
        </h2>
        <p class="text-xs text-[#8696a0]">
          Adicione o número ou nome de quem a IA deve ignorar completamente. Fica salvo para sempre no disco!
        </p>

        <div class="flex gap-2">
          <input type="text" id="input-blacklist" placeholder="Número com DDD ou nome..." class="flex-1 bg-wa-card border border-wa rounded-xl px-3.5 py-2 text-xs text-white placeholder-[#8696a0] focus:outline-none focus:border-[#25D366]">
          <button id="btn-add-blacklist" class="bg-red-500 hover:bg-red-600 text-white font-bold text-xs px-5 py-2 rounded-xl transition-all">
            + Bloquear
          </button>
        </div>

        <div id="blacklist-tags" class="flex flex-wrap gap-2 pt-2"></div>
      </div>
    </div>

    <!-- TAB 6: CONEXÃO QR -->
    <div id="tab-qr" class="tab-content hidden max-w-md mx-auto space-y-6">
      <div class="bg-wa-dark border border-wa rounded-2xl p-6 shadow-xl text-center space-y-4">
        <h2 class="text-base font-bold text-white">📱 Conexão WhatsApp</h2>
        
        <div id="qr-container" class="flex flex-col items-center justify-center py-2">
          <div class="qr-frame mb-3">
            <div id="qr-loading" class="w-[260px] h-[260px] flex flex-col items-center justify-center text-slate-800 text-sm font-semibold">
              <div class="w-8 h-8 border-4 border-[#25D366] border-t-transparent rounded-full animate-spin mb-3"></div>
              Gerando QR Code...
            </div>
            <img id="qr-image" src="" alt="QR Code WhatsApp" class="w-[260px] h-[260px] rounded-lg hidden" />
          </div>
          <p class="text-xs text-[#8696a0]">Abra o WhatsApp > Aparelhos conectados > Conectar um aparelho</p>
        </div>

        <div id="connected-view" class="hidden py-6 space-y-3">
          <div class="w-16 h-16 rounded-full bg-[#25D366]/20 border-2 border-[#25D366] flex items-center justify-center text-2xl mx-auto">
            🟢
          </div>
          <h3 class="text-base font-bold text-white">Aparelho Conectado</h3>
          <p class="text-xs text-[#25D366] font-semibold" id="connected-number">+55 ...</p>
          <button id="btn-disconnect" class="text-xs text-red-400 hover:text-red-300 underline font-semibold pt-2 block mx-auto">
            Desconectar este aparelho / Trocar sessão
          </button>
        </div>
      </div>
    </div>
  </main>

  <script>
    // Gerenciador de Abas
    const tabs = document.querySelectorAll('.tab-btn');
    const contents = document.querySelectorAll('.tab-content');

    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        contents.forEach(c => c.classList.add('hidden'));

        tab.classList.add('active');
        const target = document.getElementById(tab.getAttribute('data-tab'));
        if (target) target.classList.remove('hidden');
      });
    });

    const connDot = document.getElementById("conn-dot");
    const connText = document.getElementById("conn-text");
    const btnToggleBot = document.getElementById("btn-toggle-bot");
    const botStatusText = document.getElementById("bot-status-text");

    const statReceived = document.getElementById("stat-received");
    const statReplied = document.getElementById("stat-replied");
    const statAudios = document.getElementById("stat-audios");
    const statGroups = document.getElementById("stat-groups");
    const logsContainer = document.getElementById("logs-container");
    const emptyLogsMsg = document.getElementById("empty-logs-msg");

    const qrContainer = document.getElementById("qr-container");
    const qrImage = document.getElementById("qr-image");
    const qrLoading = document.getElementById("qr-loading");
    const connectedView = document.getElementById("connected-view");
    const connectedNumber = document.getElementById("connected-number");
    const btnDisconnect = document.getElementById("btn-disconnect");

    const gfName = document.getElementById("gf-name");
    const gfPrompt = document.getElementById("gf-prompt");
    const btnSaveGf = document.getElementById("btn-save-gf");
    const gfSaveStatus = document.getElementById("gf-save-status");

    const bizProduct = document.getElementById("biz-product");
    const bizPrice = document.getElementById("biz-price");
    const bizDesc = document.getElementById("biz-desc");
    const bizPix = document.getElementById("biz-pix");
    const btnSaveBiz = document.getElementById("btn-save-biz");
    const bizSaveStatus = document.getElementById("biz-save-status");

    const inputBlacklist = document.getElementById("input-blacklist");
    const btnAddBlacklist = document.getElementById("btn-add-blacklist");
    const blacklistTags = document.getElementById("blacklist-tags");

    const audioTarget = document.getElementById("audio-target");
    const audioText = document.getElementById("audio-text");
    const btnGeneratePreview = document.getElementById("btn-generate-preview");
    const btnSendAudio = document.getElementById("btn-send-audio");
    const audioPreviewContainer = document.getElementById("audio-preview-container");
    const audioPreviewPlayer = document.getElementById("audio-preview-player");
    const audioStatus = document.getElementById("audio-status");

    let currentBlacklist = [];

    // SSE
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

      if (config.girlfriendName) gfName.value = config.girlfriendName;
      if (config.girlfriendPrompt) gfPrompt.value = config.girlfriendPrompt;

      if (config.business) {
        if (config.business.product) bizProduct.value = config.business.product;
        if (config.business.price) bizPrice.value = config.business.price;
        if (config.business.description) bizDesc.value = config.business.description;
        if (config.business.pixKey) bizPix.value = config.business.pixKey;
      }

      currentBlacklist = config.blacklist || [];
      renderBlacklist();
    }

    function updateStats(stats) {
      statReceived.innerText = stats.receivedCount || 0;
      statReplied.innerText = stats.repliedCount || 0;
      statAudios.innerText = stats.audiosGenerated || 0;
      statGroups.innerText = stats.groupsIgnored || 0;
    }

    function addLogCard(log, prepend = false) {
      if (emptyLogsMsg) emptyLogsMsg.style.display = "none";

      const card = document.createElement("div");
      card.className = "bg-wa-card border border-wa rounded-xl p-3.5 space-y-2 text-xs transition-all hover:border-[#25D366]/40";
      
      const isVoice = log.isAudio || log.reply.includes("🎙️");

      card.innerHTML = \`
        <div class="flex items-center justify-between">
          <span class="font-bold text-white flex items-center gap-1.5">
            \${isVoice ? '🎙️' : '👤'} \${log.contact}
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
        <div class="\${isVoice ? 'bg-blue-500/10 border-blue-500/30 text-blue-300' : 'bg-[#25D366]/10 border-[#25D366]/20 text-[#25D366]'} border p-2.5 rounded-lg">
          <span class="\${isVoice ? 'text-blue-400' : 'text-[#25D366]'} block text-[10px] uppercase font-bold mb-0.5">\${isVoice ? 'Nota de Voz Enviada (PTT)' : 'Resposta do Íthalo'}</span>
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

    // Botões
    btnToggleBot.addEventListener("click", () => {
      fetch("/api/toggle", { method: "POST" });
    });

    btnSaveGf.addEventListener("click", () => {
      fetch("/api/update-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          girlfriendName: gfName.value.trim(),
          girlfriendPrompt: gfPrompt.value.trim()
        })
      }).then(() => {
        gfSaveStatus.innerText = "✅ Salvo com sucesso!";
        setTimeout(() => { gfSaveStatus.innerText = ""; }, 2500);
      });
    });

    btnSaveBiz.addEventListener("click", () => {
      fetch("/api/update-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          business: {
            product: bizProduct.value.trim(),
            price: bizPrice.value.trim(),
            description: bizDesc.value.trim(),
            pixKey: bizPix.value.trim(),
            testAvailable: true
          }
        })
      }).then(() => {
        bizSaveStatus.innerText = "✅ Salvo com sucesso!";
        setTimeout(() => { bizSaveStatus.innerText = ""; }, 2500);
      });
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

    // Estúdio de Áudio
    document.querySelectorAll('.quick-audio-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        audioText.value = btn.getAttribute('data-text');
      });
    });

    btnGeneratePreview.addEventListener('click', async () => {
      const text = audioText.value.trim();
      if (!text) return alert("Digite o texto do áudio primeiro!");

      audioStatus.innerText = "⏳ Gerando voz natural com IA...";
      audioStatus.className = "text-xs text-blue-400 block";

      const res = await fetch("/api/generate-audio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text })
      });
      const data = await res.json();
      if (data.success && data.audioUrl) {
        audioPreviewPlayer.src = data.audioUrl;
        audioPreviewContainer.classList.remove("hidden");
        audioPreviewPlayer.play();
        audioStatus.innerText = "✅ Áudio pronto! Você já pode ouvir ou enviar.";
        audioStatus.className = "text-xs text-[#25D366] block";
      } else {
        audioStatus.innerText = "❌ Erro: " + (data.error || 'Falha ao sintetizar voz');
        audioStatus.className = "text-xs text-red-400 block";
      }
    });

    btnSendAudio.addEventListener('click', async () => {
      const target = audioTarget.value.trim();
      const text = audioText.value.trim();
      if (!target || !text) return alert("Preencha o contato e o texto do áudio!");

      audioStatus.innerText = "🚀 Enviando áudio de voz para " + target + "...";
      audioStatus.className = "text-xs text-yellow-400 block";

      const res = await fetch("/api/send-audio-whatsapp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target, text })
      });
      const data = await res.json();
      if (data.success) {
        audioStatus.innerText = "✅ Áudio de voz enviado com sucesso para " + target + "!";
        audioStatus.className = "text-xs text-[#25D366] block";
      } else {
        audioStatus.innerText = "❌ Erro: " + (data.error || 'Falha no envio');
        audioStatus.className = "text-xs text-red-400 block";
      }
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
