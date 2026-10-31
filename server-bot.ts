/**
 * ITHALO IA - Ultimate WhatsApp Bot & Intelligent Assistant
 * 
 * Funcionalidades Master:
 * - RESPOSTA 100% HUMANA & NATURAL EM TEXTO VIA GOOGLE GEMINI
 * - VISUALIZADOR IPHONE WHATSAPP NATIVO: Interface idêntica ao WhatsApp Dark Mode do iOS (iPhone)
 * - Reconhecimento de Pessoas e Histórico Isolado (Namorada VIP Isa 🫣, Clientes IPTV, Amigos)
 * - Controle Manual de IA Ativa/Desativada por Contato (Pai, Mãe, etc.)
 * - Central de Figurinhas WebP com Resposta Automática
 */

import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  type WASocket
} from "@whiskeysockets/baileys";
import QRCode from "qrcode";
import pino from "pino";
import { existsSync, rmSync, mkdirSync, readFileSync, writeFileSync, readdirSync } from "fs";
import { join } from "path";

const PORT = 3333;
const AUTH_DIR = join(process.cwd(), "auth_info_baileys");
const CONFIG_FILE = join(process.cwd(), "bot_config.json");
const CONTACTS_FILE = join(process.cwd(), "contacts_memory.json");
const STICKERS_DIR = join(process.cwd(), "stickers");

if (!existsSync(STICKERS_DIR)) {
  mkdirSync(STICKERS_DIR, { recursive: true });
}

// Chave da API do Google Gemini
const GEMINI_API_KEY = Buffer.from(
  "QVEuQWI4Uk42SjRibkdjSVY0X3FQWmdYTVNWNWcyUjNsMlFndWxPYkRyaDlqWlJvbzQ0LWc=",
  "base64"
).toString("utf-8");

export interface BotConfig {
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
  autoStickers: boolean;
  ignoreGroups: boolean;
  blacklist: string[];
}

let botConfig: BotConfig = {
  enabled: true,
  userName: "Íthalo",
  girlfriendName: "Heloisa Guimarães",
  girlfriendPrompt: "A Heloisa Guimarães (Isa 🫣) é minha namorada. Ela me conhece perfeitamente: eu NÃO USO EMOJIS no WhatsApp (nada de coração ou emoji amarelo) e não fico chamando de 'vida' ou sendo meloso. Fale como namorado real de verdade: 'qual foi kkk', 'tô normal ué', 'viaja não', 'tô aqui no pc mexendo numas coisas', 'de boa'. Curto e direto.",
  business: {
    product: "IPTV Completo",
    price: "R$ 20 por mês",
    testAvailable: true,
    pixKey: "Envio na hora que confirmar",
    description: "Todos os canais liberados (futebol, filmes, séries), qualidade 4K/Full HD, sem travamentos. R$ 20 mensais."
  },
  customExamples: "qual foi kkk\ntô normal ué, viaja não\ntô por aqui no pc sim\nfechado nos 20 mesmo, quer que eu te mande o pix?\nah é, às vezes viajo kkkk",
  autoStickers: true,
  ignoreGroups: true,
  blacklist: []
};

// Carrega configurações
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

export type ContactCategory = "girlfriend" | "client" | "friend" | "blacklisted" | "unknown";

export interface ContactProfile {
  jid: string;
  phone: string;
  name: string;
  category: ContactCategory;
  customNotes?: string;
  lastSeen: number;
  lastMessage?: string;
  lastTime?: string;
  unreadCount?: number;
  history: Array<{ role: "user" | "model"; text: string; timestamp: number; type?: "text" | "sticker" }>;
  aiEnabled?: boolean; // Controle manual Liga/Desliga IA por contato (Pai, Mãe, amigos, etc.)
}

let contactsMemory: Record<string, ContactProfile> = {};

if (existsSync(CONTACTS_FILE)) {
  try {
    contactsMemory = JSON.parse(readFileSync(CONTACTS_FILE, "utf-8"));
  } catch (e) {}
}

// Inicializa a Namorada (Isa 🫣 / Heloisa)
const GF_JID = "191813272993834@s.whatsapp.net";
if (!contactsMemory[GF_JID]) {
  contactsMemory[GF_JID] = {
    jid: GF_JID,
    phone: "191813272993834",
    name: "Isa 🫣",
    category: "girlfriend",
    customNotes: "Namorada VIP do Íthalo (Heloisa / Isa 🫣). ZERO emojis, fala direta e descontraída de namorado real.",
    lastSeen: Date.now(),
    lastMessage: "oi amor, tudo certo?",
    lastTime: "14:47",
    unreadCount: 0,
    history: [
      { role: "user", text: "oi amor, tudo certo?", timestamp: Date.now() - 300000, type: "text" }
    ]
  };
  saveContacts();
} else {
  // Garante que o nome seja Isa 🫣 para bater com a tela do iPhone
  contactsMemory[GF_JID].name = "Isa 🫣";
}

function saveContacts() {
  try {
    writeFileSync(CONTACTS_FILE, JSON.stringify(contactsMemory, null, 2), "utf-8");
  } catch (e) {}
}

let currentQR: string | null = null;
let currentQRDataUrl: string | null = null;
let connectionStatus: "WAITING_QR" | "CONNECTING" | "CONNECTED" | "DISCONNECTED" = "DISCONNECTED";
let connectedUser: { id: string; name?: string } | null = null;
let sock: WASocket | null = null;

const recentRepliedKeys = new Set<string>();

const stats = {
  receivedCount: 0,
  repliedCount: 0,
  stickersSent: 0,
  groupsIgnored: 0,
  blockedIgnored: 0
};

export interface ActivityLog {
  id: number;
  timestamp: string;
  contact: string;
  phone: string;
  category: ContactCategory;
  incoming: string;
  reply: string;
  type: "text" | "sticker";
  mediaUrl?: string;
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
 * Conexão direta com WhatsApp Multi-Device (Baileys)
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
      console.log("[ITHALO IA] Novo QR Code gerado! Aguardando escaneamento no celular...");
      broadcastSSE("qr", { qrDataUrl: currentQRDataUrl });
      broadcastSSE("status", { status: connectionStatus });
    }

    if (connection === "open") {
      connectionStatus = "CONNECTED";
      currentQR = null;
      currentQRDataUrl = null;
      connectedUser = sock?.user || null;
      const cleanPhone = (connectedUser?.id || "").split(":")[0] || "Desconhecido";
      console.log(`[ITHALO IA] ✅ CONECTADO COM SUCESSO! Usuário: ${cleanPhone}`);
      broadcastSSE("status", {
        status: connectionStatus,
        user: { id: cleanPhone, name: connectedUser?.name || botConfig.userName }
      });
    }

    if (connection === "close") {
      const statusCode = (lastDisconnect?.error as any)?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
      console.log(`[ITHALO IA] Conexão fechada (${statusCode}). Reconectando? ${shouldReconnect}`);
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

      const rawJid = msg.key.remoteJid || "";

      // Ignora Status / Broadcasts
      if (rawJid === "status@broadcast" || rawJid.includes("broadcast")) continue;

      // Ignora Grupos categoricamente
      if (rawJid.endsWith("@g.us")) {
        stats.groupsIgnored++;
        broadcastSSE("stats", stats);
        continue;
      }

      const contactNumber = rawJid.split("@")[0].split(":")[0];
      const remoteJid = `${contactNumber}@s.whatsapp.net`;

      // Ignora Blacklist permanente
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
      recentRepliedKeys.add(messageId);

      let incomingText = "";
      let incomingIsSticker = false;
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
        incomingText = "[Figurinha Recebida]";
        incomingIsSticker = true;
      }

      if (!incomingText) continue;

      stats.receivedCount++;
      broadcastSSE("stats", stats);

      const contactName = msg.pushName || contactNumber;

      // Recupera ou cria perfil de contato isolado (Canônico por número de telefone)
      if (!contactsMemory[remoteJid]) {
        const isGF = isGirlfriendContact(contactName, remoteJid);
        contactsMemory[remoteJid] = {
          jid: remoteJid,
          phone: contactNumber,
          name: isGF ? "Isa 🫣" : contactName,
          category: isGF ? "girlfriend" : "unknown",
          lastSeen: Date.now(),
          messageCount: 0,
          history: []
        };
      }

      const profile = contactsMemory[remoteJid];
      if (isGirlfriendContact(contactName, remoteJid)) {
        profile.name = "Isa 🫣";
        profile.category = "girlfriend";
      } else if (!profile.name) {
        profile.name = contactName;
      }

      profile.lastSeen = Date.now();
      profile.lastMessage = incomingText;
      profile.lastTime = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
      profile.messageCount = (profile.messageCount || 0) + 1;

      console.log(`[ITHALO IA] 📩 Mensagem de ${profile.name} [${profile.category}]: "${incomingText}"`);

      saveContacts();
      broadcastSSE("contact_update", profile);

      // CONTROLE MANUAL DE IA POR CONTATO (Pai, Mãe, etc.)
      if (profile.aiEnabled === false) {
        console.log(`[ITHALO IA] ⏸️ IA DESATIVADA manualmente para ${profile.name} (${cleanPhone}). Auto-resposta ignorada.`);
        continue;
      }

      const t0 = Date.now();

      try {
        // 1. Resposta com Figurinha
        if (incomingIsSticker && botConfig.autoStickers && sock) {
          const stickerChoices = ["deboa.webp", "rindo.webp", "tmj.webp", "top.webp"];
          const chosen = stickerChoices[Math.floor(Math.random() * stickerChoices.length)];
          const filePath = join(STICKERS_DIR, chosen);

          if (existsSync(filePath)) {
            await new Promise(r => setTimeout(r, 900));
            await sock.sendMessage(rawJid, { sticker: readFileSync(filePath) });
            stats.stickersSent++;
            stats.repliedCount++;

            profile.history.push({ role: "user", text: incomingText, timestamp: Date.now(), type: "sticker" });
            profile.history.push({ role: "model", text: `[Figurinha]: ${chosen}`, timestamp: Date.now(), type: "sticker" });
            saveContacts();

            const logItem: ActivityLog = {
              id: Date.now(),
              timestamp: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
              contact: profile.name,
              phone: contactNumber,
              category: profile.category,
              incoming: incomingText,
              reply: `🎭 [Figurinha Enviada]: ${chosen}`,
              type: "sticker",
              duration: Number(((Date.now() - t0) / 1000).toFixed(2))
            };
            activityLogs.unshift(logItem);
            broadcastSSE("new_reply", logItem);
            broadcastSSE("stats", stats);
            continue;
          }
        }

        // 2. Resposta em Texto Normal com IA Gemini
        const replyText = await generateSmartGeminiReply(profile, incomingText);
        if (!replyText || !sock) continue;

        await new Promise(r => setTimeout(r, 1100));

        await sock.sendMessage(rawJid, { text: replyText });
        stats.repliedCount++;
        const duration = (Date.now() - t0) / 1000;

        profile.history.push({ role: "user", text: incomingText, timestamp: Date.now(), type: "text" });
        profile.history.push({ role: "model", text: replyText, timestamp: Date.now(), type: "text" });
        profile.lastMessage = replyText;
        profile.lastTime = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
        saveContacts();

        const logItem: ActivityLog = {
          id: Date.now(),
          timestamp: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
          contact: profile.name,
          phone: contactNumber,
          category: profile.category,
          incoming: incomingText,
          reply: replyText,
          type: "text",
          duration: Number(duration.toFixed(2))
        };
        activityLogs.unshift(logItem);
        if (activityLogs.length > 60) activityLogs.pop();

        broadcastSSE("new_reply", logItem);
        broadcastSSE("stats", stats);
        broadcastSSE("contact_update", profile);

        console.log(`[ITHALO IA] ✅ Resposta enviada para ${profile.name}: "${replyText}"`);

      } catch (err: any) {
        console.error(`[ITHALO IA] ❌ Erro ao responder ${profile.name}:`, err?.message || err);
      }
    }
  });
}

function isGirlfriendContact(contactName: string, remoteJid: string): boolean {
  const cleanName = (contactName || "").toLowerCase();
  const cleanJid = (remoteJid || "").toLowerCase();
  const target = (botConfig.girlfriendName || "heloisa").toLowerCase();

  return (
    cleanName.includes(target) ||
    cleanName.includes("heloisa") ||
    cleanName.includes("isa") ||
    cleanJid.includes("191813272993834")
  );
}



/**
 * Motor de IA Ultra-Humano com Contexto Isolado por Perfil
 */
async function generateSmartGeminiReply(
  profile: ContactProfile,
  incomingMessage: string
): Promise<string> {
  let relationshipContext = "";

  if (profile.category === "girlfriend") {
    relationshipContext = `\n❤️ CONVERSANDO COM HELOISA / ISA (SUA NAMORADA):
- Ela te conhece perfeitamente. O Íthalo na vida real NÃO MANDA EMOJIS! NUNCA use emojis nem corações (nada de ❤️, 😅, etc).
- NÃO seja meloso nem chame de "vida" ou "meu amor" em toda frase.
- Fale como namorado de verdade no dia a dia: direto, descontraído, com "kkk", "ué", "qual foi", "tô aqui no pc", "tô de boa", "viaja não".
- Se ela disser que você tá estranho ou perguntar o que tá fazendo: responda de forma direta e natural: "ué tô aqui ué kkk", "viaja não kkk".`;
  } else if (profile.category === "client") {
    relationshipContext = `\n💼 NEGÓCIOS & IPTV (CLIENTE INTERESSADO):
- Você vende ${botConfig.business.product} por ${botConfig.business.price}.
- Detalhes: ${botConfig.business.description}.
- Se pedirem teste: diga que libera um teste grátis na hora.
- Se confirmarem a compra: diga que vai mandar a chave Pix na hora. Seja direto e firme no valor de R$ 20.`;
  } else {
    relationshipContext = `\n🤝 CONVERSA PESSOAL / AMIGO:
- Conversa informal e direta no WhatsApp.
- NÃO fale de IPTV nem de vendas a menos que ele pergunte especificamente.
- Use "opa", "fala aí", "de boa", "tranquilo", "kkk".`;
  }

  const systemPrompt = `Você é o próprio ${botConfig.userName} digitando no WhatsApp pessoal pelo celular.
REGRAS OBRIGATÓRIAS PARA NUNCA PARECER IA:

1. PROIBIÇÕES CRÍTICAS (ISSO ENTREGA NA HORA QUE É UM ROBÔ):
- NÃO USE EMOJIS ${profile.category === "girlfriend" ? "(PROIBIDO PARA A HELOISA / ISA!)" : "(no máximo 1 ou nenhum)"}.
- NUNCA use frases prontas de robô como: "Como posso te ajudar?", "Como posso ajudar você hoje?", "Em que posso ser útil?", "Estou à disposição", "Fico no aguardo". Jamais fale isso!
- NUNCA responda redação gigante. Responda em 1 linha curta e direta (máximo 15-20 palavras).
- NUNCA diga que é assistente ou IA. Você É o ${botConfig.userName}.

2. ESTILO DO ${botConfig.userName}:
- Respostas super curtas, rápidas e descontraídas (1 linha só, como qualquer brasileiro digita no celular).
- Use gírias e palavras normais do dia a dia: "tô", "pra", "beleza", "tranquilo", "já te respondo", "opa", "kkk", "ué", "qual foi".
${relationshipContext}
${botConfig.customExamples ? `\nExemplos de como eu costumo responder:\n${botConfig.customExamples}` : ""}`;

  const contents: any[] = [];
  const recentHistory = profile.history.slice(-8);

  recentHistory.forEach(item => {
    contents.push({ role: item.role, parts: [{ text: item.text }] });
  });

  contents.push({ role: "user", parts: [{ text: incomingMessage }] });

  const modelsToTry = [
    "gemini-3.5-flash-lite",
    "gemini-3.1-flash-lite",
    "gemini-flash-lite-latest"
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
          maxOutputTokens: 120
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

  // FALLBACK SE A API ESTIVER FORA OU BATER COTA
  if (!reply) {
    try {
      const messagesForPoll = [
        { role: "system", content: systemPrompt },
        ...recentHistory.map(item => ({
          role: item.role === "model" ? "assistant" : "user",
          content: item.text
        })),
        { role: "user", content: incomingMessage }
      ];

      const pollRes = await fetch("https://text.pollinations.ai/openai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: messagesForPoll,
          model: "openai",
          temperature: 0.85
        })
      });

      if (pollRes.ok) {
        const pollData = await pollRes.json();
        reply = pollData.choices?.[0]?.message?.content?.trim() || "";
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
  if (profile.category === "girlfriend") {
    reply = reply.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE0F}\u{1F900}-\u{1F9FF}]/gu, "").replace(/\s{2,}/g, " ").trim();
  }

  // Fallback inteligente hiper-natural se a API falhar
  if (!reply) {
    if (profile.category === "girlfriend") {
      const gfFallbacks = [
        "tô aqui no pc ué kkk, o que houve?",
        "tô de boa aqui amor, fala aí",
        "mandei áudio aqui pra vc ouvir kkk",
        "ué viaja não kkk tô aqui",
        "qual foi kkk fala"
      ];
      reply = gfFallbacks[Math.floor(Math.random() * gfFallbacks.length)];
    } else if (profile.category === "client") {
      reply = "Opa! Temos sim, lista completa com canais, filmes e séries por R$ 20. Quer um teste grátis?";
    } else if (profile.cantRead || willBeSpokenAsAudio) {
      reply = "Opa, tudo bem? Tô mandando esse áudio aqui pra te avisar que já tô vendo isso pra você!";
    } else {
      reply = "tô meio na correria aqui agora, já já te respondo certinho!";
    }
  }

  return reply;
}

startWhatsAppBot();

/**
 * Servidor Web com iPhone WhatsApp Dark Simulator e Vozes Estilo Livepix
 */
Bun.serve({
  port: PORT,
  idleTimeout: 255,
  async fetch(req) {
    const url = new URL(req.url);

    // Servir figurinhas estáticas
    if (url.pathname.startsWith("/stickers/")) {
      const filename = url.pathname.replace("/stickers/", "");
      const filePath = join(STICKERS_DIR, filename);
      if (existsSync(filePath)) {
        return new Response(readFileSync(filePath), {
          headers: { "Content-Type": "image/webp", "Cache-Control": "public, max-age=86400" }
        });
      }
      return new Response("Not found", { status: 404 });
    }

    // Arquivo de Estilos do Universo / Estrelas Animadas (Uiverse.io red-duck-82)
    if (url.pathname === "/starfield.css") {
      const p = join(process.cwd(), "public", "starfield.css");
      if (existsSync(p)) {
        return new Response(readFileSync(p), {
          headers: { "Content-Type": "text/css; charset=utf-8", "Cache-Control": "public, max-age=86400" }
        });
      }
    }

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
            contacts: Object.values(contactsMemory),
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

    // Listar todos os contatos com seus históricos
    if (url.pathname === "/api/contacts" && req.method === "GET") {
      return Response.json({ success: true, contacts: Object.values(contactsMemory) });
    }

    // Atualizar perfil de um contato
    if (url.pathname === "/api/contacts/update" && req.method === "POST") {
      const body = await req.json();
      const { jid, category, prefersAudio, cantRead, preferredVoice, customNotes } = body;
      if (!jid || !contactsMemory[jid]) {
        return Response.json({ success: false, error: "Contato não encontrado" });
      }
      const p = contactsMemory[jid];
      if (category !== undefined) p.category = category;
      if (prefersAudio !== undefined) p.prefersAudio = Boolean(prefersAudio);
      if (cantRead !== undefined) p.cantRead = Boolean(cantRead);
      if (preferredVoice !== undefined) p.preferredVoice = String(preferredVoice);
      if (customNotes !== undefined) p.customNotes = String(customNotes);

      saveContacts();
      broadcastSSE("contact_update", p);
      return Response.json({ success: true, contact: p });
    }

    // Listar figurinhas disponíveis
    if (url.pathname === "/api/stickers" && req.method === "GET") {
      const files = readdirSync(STICKERS_DIR).filter(f => f.endsWith(".webp"));
      const stickers = files.map(filename => ({
        filename,
        url: `/stickers/${filename}`,
        name: filename.replace(".webp", "").toUpperCase()
      }));
      return Response.json({ success: true, stickers });
    }

    // Enviar figurinha no WhatsApp
    if (url.pathname === "/api/send-sticker" && req.method === "POST") {
      const body = await req.json();
      const { target, stickerFilename } = body;
      if (!target || !stickerFilename) {
        return Response.json({ success: false, error: "Contato e figurinha são obrigatórios" });
      }

      if (!sock || connectionStatus !== "CONNECTED") {
        return Response.json({ success: false, error: "WhatsApp não está conectado" });
      }

      let cleanTarget = target.trim();
      if (!cleanTarget.includes("@")) {
        cleanTarget = cleanTarget.replace(/\D/g, "") + "@s.whatsapp.net";
      }

      const filePath = join(STICKERS_DIR, stickerFilename);
      if (!existsSync(filePath)) {
        return Response.json({ success: false, error: "Arquivo de figurinha não encontrado" });
      }

      await sock.sendMessage(cleanTarget, { sticker: readFileSync(filePath) });
      stats.stickersSent++;
      broadcastSSE("stats", stats);

      if (contactsMemory[cleanTarget]) {
        contactsMemory[cleanTarget].history.push({
          role: "model",
          text: `[Figurinha]: ${stickerFilename}`,
          timestamp: Date.now(),
          type: "sticker"
        });
        saveContacts();
        broadcastSSE("contact_update", contactsMemory[cleanTarget]);
      }

      return Response.json({ success: true });
    }

    // Enviar mensagem de texto no WhatsApp
    if (url.pathname === "/api/send-text-whatsapp" && req.method === "POST") {
      const body = await req.json();
      const { target, text } = body;
      if (!target || !text) return Response.json({ success: false, error: "Dados incompletos" });

      if (!sock || connectionStatus !== "CONNECTED") {
        return Response.json({ success: false, error: "WhatsApp não está conectado" });
      }

      let cleanTarget = target.trim();
      if (!cleanTarget.includes("@")) {
        cleanTarget = cleanTarget.replace(/\D/g, "") + "@s.whatsapp.net";
      }

      await sock.sendMessage(cleanTarget, { text: text.trim() });
      stats.repliedCount++;
      broadcastSSE("stats", stats);

      if (contactsMemory[cleanTarget]) {
        contactsMemory[cleanTarget].history.push({
          role: "model",
          text: text.trim(),
          timestamp: Date.now(),
          type: "text"
        });
        contactsMemory[cleanTarget].lastMessage = text.trim();
        contactsMemory[cleanTarget].lastTime = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
        saveContacts();
        broadcastSSE("contact_update", contactsMemory[cleanTarget]);
      }

      return Response.json({ success: true });
    }

    // Toggle Liga/Desliga Geral
    if (url.pathname === "/api/toggle" && req.method === "POST") {
      botConfig.enabled = !botConfig.enabled;
      saveConfig();
      broadcastSSE("config", botConfig);
      return Response.json({ success: true, enabled: botConfig.enabled });
    }

    // Toggle Liga/Desliga IA Por Contato Específico (Pai, Mãe, etc.)
    if (url.pathname === "/api/toggle-contact-ai" && req.method === "POST") {
      const body = await req.json();
      const targetJid = body.jid;
      if (!targetJid) return Response.json({ success: false, error: "JID obrigatório" }, { status: 400 });

      if (!contactsMemory[targetJid]) {
        contactsMemory[targetJid] = {
          jid: targetJid,
          phone: targetJid.split("@")[0].split(":")[0],
          name: body.name || targetJid.split("@")[0],
          category: "personal" as any,
          prefersAudio: false,
          cantRead: false,
          lastSeen: Date.now(),
          history: [],
          aiEnabled: true
        };
      }

      const current = contactsMemory[targetJid].aiEnabled !== false;
      contactsMemory[targetJid].aiEnabled = !current;
      saveContacts();
      broadcastSSE("contact_update", contactsMemory[targetJid]);
      console.log(`[ITHALO IA] 🔄 IA para ${contactsMemory[targetJid].name} (${targetJid}): ${contactsMemory[targetJid].aiEnabled ? "LIGADA (Ativa)" : "DESLIGADA (Manual)"}`);
      return Response.json({
        success: true,
        jid: targetJid,
        name: contactsMemory[targetJid].name,
        aiEnabled: contactsMemory[targetJid].aiEnabled
      });
    }

    // Atualização de Configurações
    if (url.pathname === "/api/update-config" && req.method === "POST") {
      const body = await req.json();
      botConfig = { ...botConfig, ...body };
      saveConfig();
      broadcastSSE("config", botConfig);
      return Response.json({ success: true, config: botConfig });
    }

    // Status do Robô
    if (url.pathname === "/api/status") {
      return Response.json({
        status: connectionStatus,
        user: connectedUser,
        stats,
        config: botConfig
      });
    }

    // Desconectar Sessão
    if (url.pathname === "/api/disconnect" && req.method === "POST") {
      try {
        if (sock) await sock.logout();
        rmSync(AUTH_DIR, { recursive: true, force: true });
      } catch (e) {}
      connectionStatus = "DISCONNECTED";
      currentQR = null;
      currentQRDataUrl = null;
      connectedUser = null;
      broadcastSSE("status", { status: connectionStatus });
      setTimeout(startWhatsAppBot, 1000);
      return Response.json({ success: true });
    }

    // Rota Principal: Dashboard com iPhone Simulator & Cyber Glass
    if (url.pathname === "/" || url.pathname === "/index.html") {
      return new Response(renderFuturisticDashboardHTML(), {
        headers: { "Content-Type": "text/html; charset=utf-8" }
      });
    }

    return new Response("Not Found", { status: 404 });
  }
});

console.log(`\n======================================================`);
console.log(`🌐 Servidor ITHALO IA rodando em: http://localhost:${PORT}`);
console.log(`======================================================\n`);

/**
 * Renderiza o Dashboard com Visualizador iPhone WhatsApp Dark Mode
 */
function renderFuturisticDashboardHTML(): string {
  return `<!DOCTYPE html>
<html lang="pt-BR" class="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ITHALO IA</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=SF+Pro+Display:wght@400;500;600;700;800;900&family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/starfield.css">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Plus Jakarta Sans', sans-serif;
      background-color: #000000;
      color: #ffffff;
      min-height: 100vh;
      overflow-x: hidden;
    }
    /* Estilo Preto & Branco Glassmorphism de Luxo */
    .bw-glass {
      background: rgba(10, 10, 12, 0.75);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border: 1px solid rgba(255, 255, 255, 0.12);
    }
    .bw-glass:hover {
      border-color: rgba(255, 255, 255, 0.25);
    }
    .bw-card {
      background: rgba(12, 12, 16, 0.82);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 28px;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.6);
    }
    .bw-card:hover {
      border-color: rgba(255, 255, 255, 0.22);
    }
    .ios-tab-btn {
      transition: all 0.22s cubic-bezier(0.4, 0, 0.2, 1);
      border: 1px solid transparent;
    }
    .ios-tab-btn:hover {
      background: rgba(255, 255, 255, 0.08);
      color: #ffffff;
    }
    .ios-tab-btn.active {
      background: #ffffff !important;
      color: #000000 !important;
      font-weight: 800;
      border-color: #ffffff;
      box-shadow: 0 0 25px rgba(255, 255, 255, 0.35);
    }
    /* Botões em Preto e Branco de Alta Performance */
    .btn-mono-primary {
      background: #ffffff;
      color: #000000;
      font-weight: 800;
      transition: all 0.2s ease;
      box-shadow: 0 0 20px rgba(255, 255, 255, 0.2);
    }
    .btn-mono-primary:hover {
      background: #e4e4e7;
      transform: translateY(-1px);
      box-shadow: 0 0 30px rgba(255, 255, 255, 0.4);
    }
    .btn-mono-ghost {
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(255, 255, 255, 0.16);
      color: #ffffff;
      transition: all 0.2s ease;
    }
    .btn-mono-ghost:hover {
      background: rgba(255, 255, 255, 0.14);
      border-color: rgba(255, 255, 255, 0.4);
    }
    /* iPhone Chat Bubble Tails */
    .bubble-out {
      background-color: #ffffff;
      color: #000000;
      border-radius: 18px 18px 4px 18px;
      font-weight: 500;
      box-shadow: 0 4px 14px rgba(255, 255, 255, 0.08);
    }
    .bubble-in {
      background-color: #161619;
      color: #f4f4f5;
      border: 1px solid rgba(255, 255, 255, 0.14);
      border-radius: 18px 18px 18px 4px;
    }
    .ios-chat-bg {
      background-color: #070709;
      background-image: radial-gradient(rgba(255,255,255,0.05) 1px, transparent 0);
      background-size: 20px 20px;
    }
    /* Scrollbar */
    ::-webkit-scrollbar { width: 5px; height: 5px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 999px; }
    ::-webkit-scrollbar-thumb:hover { background: #ffffff; }
  </style>
</head>
<body class="flex flex-col relative min-h-screen">

  <!-- FUNDO DE ESTRELAS ANIMADAS DO UNIVERSO (Uiverse.io red-duck-82) -->
  <div class="space-stars-bg">
    <div id="stars"></div>
    <div id="stars2"></div>
    <div id="stars3"></div>
  </div>

  <!-- SVG Filter para os botões SelfMadeSystem (evil-seahorse-60) -->
  <svg style="position: absolute; width: 0; height: 0; pointer-events: none;">
    <filter width="3000%" x="-1000%" height="3000%" y="-1000%" id="unopaq">
      <feColorMatrix
        values="1 0 0 0 0 
              0 1 0 0 0 
              0 0 1 0 0 
              0 0 0 3 0"
      ></feColorMatrix>
    </filter>
  </svg>

  <!-- Header Preto e Branco de Luxo com Hungry-Mule Shimmer -->
  <header class="bg-black/75 backdrop-blur-2xl border-b border-white/10 px-6 py-4 sticky top-0 z-50">
    <div class="max-w-7xl mx-auto flex items-center justify-between">
      <div class="flex items-center gap-3.5">
        <div class="w-10 h-10 rounded-2xl bg-white text-black font-black flex items-center justify-center text-xl shadow-[0_0_25px_rgba(255,255,255,0.3)]">
          ✨
        </div>
        <div>
          <h1 class="text-xl font-black text-white tracking-wider flex items-center">
            <span class="text-shine">ITHALO IA</span>
          </h1>
        </div>
      </div>

      <div class="flex items-center gap-3">
        <div id="conn-badge" class="flex items-center gap-2 bg-neutral-900/80 px-3.5 py-1.5 rounded-full border border-white/15 text-xs font-semibold text-white">
          <span class="w-2.5 h-2.5 rounded-full bg-white animate-ping shadow-[0_0_10px_#ffffff]" id="conn-dot"></span>
          <span id="conn-text" class="text-white text-shine font-bold">WhatsApp Conectado</span>
        </div>
        <button id="btn-toggle-bot" class="flex items-center gap-1.5 btn-mono-primary text-xs px-4 py-2 rounded-full transition-all">
          <span id="bot-status-text" class="text-shine font-black">ROBÔ ATIVO</span>
        </button>
      </div>
    </div>
  </header>

  <!-- Navigation Tabs Minimalistas (Uiverse.io SelfMadeSystem/evil-seahorse-60) -->
  <nav class="bg-black/60 backdrop-blur-xl border-b border-white/10 px-6 py-3 sticky top-[73px] z-40">
    <div class="max-w-7xl mx-auto flex items-center gap-3 overflow-x-auto py-1">
      <button class="ios-tab-btn seahorse-btn active shrink-0" data-tab="tab-iphone">
        <div class="a l"></div>
        <div class="a r"></div>
        <div class="a t"></div>
        <div class="a b"></div>
        <div class="text">
          <span>📱</span> <span class="text-shine">Visualizador iPhone (Ao Vivo)</span>
        </div>
      </button>

      <button class="ios-tab-btn seahorse-btn shrink-0" data-tab="tab-stickers">
        <div class="a l"></div>
        <div class="a r"></div>
        <div class="a t"></div>
        <div class="a b"></div>
        <div class="text">
          <span>🎭</span> <span class="text-shine">Figurinhas WebP</span>
        </div>
      </button>

      <button class="ios-tab-btn seahorse-btn shrink-0" data-tab="tab-girlfriend">
        <div class="a l"></div>
        <div class="a r"></div>
        <div class="a t"></div>
        <div class="a b"></div>
        <div class="text">
          <span>❤️</span> <span class="text-shine">Isa 🫣 (Namorada VIP)</span>
        </div>
      </button>

      <button class="ios-tab-btn seahorse-btn shrink-0" data-tab="tab-business">
        <div class="a l"></div>
        <div class="a r"></div>
        <div class="a t"></div>
        <div class="a b"></div>
        <div class="text">
          <span>💼</span> <span class="text-shine">Negócios & IPTV (R$ 20)</span>
        </div>
      </button>

      <button class="ios-tab-btn seahorse-btn shrink-0" data-tab="tab-qr">
        <div class="a l"></div>
        <div class="a r"></div>
        <div class="a t"></div>
        <div class="a b"></div>
        <div class="text">
          <span>⚙️</span> <span class="text-shine">Conexão WhatsApp</span>
        </div>
      </button>
    </div>
  </nav>

  <!-- Main Container -->
  <main class="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 z-10 relative">

    <!-- ==================== MASTER LUMINOUS CONTROLLER (Uiverse NK2552003/chatty-eel-90) ==================== -->
    <div class="mb-6 flex justify-center">
      <div class="luminous-card-container">
        <div id="master-luminous-card" class="luminous-card active">
          <div class="luminous-content">
            <div class="luminous-header-row">
              <div class="luminous-icon-wrap">
                <div id="luminous-icon" class="luminous-icon">
                  ⚡
                </div>
                <div class="luminous-details">
                  <h3 class="text-shine">Inteligência Artificial (Gemini Pro)</h3>
                  <p id="luminous-desc" class="text-shine">Status: LIGADO • Respostas automáticas no WhatsApp com vozes LivePix e Ogg Opus</p>
                </div>
              </div>
              <div id="luminous-status-pill" class="luminous-status-pill active text-shine">
                ● ATIVO
              </div>
            </div>
            <button id="btn-lumen-toggle" class="lumen-btn active">
              <span id="lumen-btn-icon">⚡</span>
              <span id="lumen-btn-text" class="text-shine">DESATIVAR INTELIGÊNCIA ARTIFICIAL</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ==================== TAB 1: VISUALIZADOR IPHONE WHATSAPP ==================== -->
    <div id="tab-iphone" class="tab-pane">
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[780px]">
        
        <!-- iPhone Left: Conversations List -->
        <div class="lg:col-span-5 bg-black/85 backdrop-blur-2xl border border-white/15 rounded-[36px] overflow-hidden flex flex-col shadow-[0_0_50px_rgba(255,255,255,0.04)] relative">
          
          <!-- iOS Header -->
          <div class="px-5 pt-4 pb-3 border-b border-white/10 space-y-3">
            <div class="flex items-center justify-between text-xs text-white">
              <span class="cursor-pointer font-bold hover:underline text-shine">Editar</span>
              <div class="flex items-center gap-4 text-white">
                <span class="cursor-pointer text-base font-bold text-shine">@</span>
                <span class="cursor-pointer text-xl font-light text-shine">+</span>
              </div>
            </div>
            <h1 class="text-2xl font-black text-white tracking-tight text-shine">Conversas</h1>
            
            <!-- Search Bar -->
            <div class="bg-neutral-900/90 border border-white/10 rounded-xl px-3 py-1.5 flex items-center gap-2 text-xs text-neutral-400">
              <span class="text-shine">🔍</span>
              <input type="text" id="iphone-search" placeholder="Pesquisar" class="bg-transparent border-none text-white focus:outline-none w-full text-xs placeholder-neutral-500 text-shine">
            </div>

            <!-- Arquivadas row exatamente como no WhatsApp do iPhone real -->
            <div class="flex items-center justify-between text-xs py-1 cursor-pointer text-neutral-300 hover:text-white">
              <div class="flex items-center gap-3">
                <span class="text-sm text-shine">🗄️</span>
                <span class="font-semibold text-shine">Arquivadas</span>
              </div>
              <span class="text-[#25D366] font-bold text-shine text-sm">@</span>
            </div>
          </div>

          <!-- iPhone Contacts List -->
          <div id="iphone-conversations-list" class="flex-1 overflow-y-auto divide-y divide-white/5">
            <!-- Renderizado via JS -->
          </div>

          <!-- iOS Bottom Tab Bar (WhatsApp iPhone Nativo Real) -->
          <div class="bg-black/95 border-t border-white/10 px-4 py-2.5 flex items-center justify-between text-[10px] text-neutral-400 select-none relative shrink-0">
            <div class="flex flex-col items-center gap-0.5 cursor-pointer hover:text-white transition-colors">
              <span class="text-sm">⭕</span>
              <span class="text-shine">Atualizações</span>
            </div>
            <div class="flex flex-col items-center gap-0.5 cursor-pointer hover:text-white transition-colors">
              <span class="text-sm">📞</span>
              <span class="text-shine">Ligações</span>
            </div>
            <div class="flex flex-col items-center gap-0.5 cursor-pointer hover:text-white transition-colors">
              <span class="text-sm">🏪</span>
              <span class="text-shine">Ferramentas</span>
            </div>
            <div class="flex flex-col items-center gap-0.5 cursor-pointer text-white font-bold relative">
              <div class="relative">
                <span class="text-sm">💬</span>
                <span class="absolute -top-1.5 -right-2.5 bg-[#25D366] text-black text-[9px] font-black px-1.5 py-0.2 rounded-full text-shine">1</span>
              </div>
              <span class="text-white text-shine font-bold">Conversas</span>
            </div>
            <div class="flex flex-col items-center gap-0.5 cursor-pointer hover:text-white transition-colors">
              <span class="text-sm">⚙️</span>
              <span class="text-shine">Configurações</span>
            </div>

            <!-- Meta AI Swirl Ring Flutuante (Como no iPhone do usuário) -->
            <div class="absolute -top-12 right-4 w-9 h-9 rounded-full bg-gradient-to-tr from-purple-500 via-indigo-400 to-cyan-400 p-[2px] shadow-[0_0_15px_rgba(168,85,247,0.5)] cursor-pointer hover:scale-110 transition-transform">
              <div class="w-full h-full bg-black rounded-full flex items-center justify-center text-[11px]">
                🌀
              </div>
            </div>
          </div>

        </div>

        <!-- iPhone Right: Active Chat Conversation -->
        <div class="lg:col-span-7 bg-black/90 backdrop-blur-2xl border border-white/15 rounded-[36px] overflow-hidden flex flex-col shadow-[0_0_50px_rgba(255,255,255,0.04)] relative">
          
          <!-- Chat Top Bar -->
          <div class="bg-neutral-950/90 border-b border-white/10 px-5 py-3 flex items-center justify-between z-10 backdrop-blur-md">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center text-lg font-bold shadow-[0_0_15px_rgba(255,255,255,0.2)]">
                <span id="active-chat-avatar">👤</span>
              </div>
              <div>
                <div class="flex items-center gap-2">
                  <h3 id="active-chat-name" class="text-sm font-bold text-white flex items-center gap-1.5">
                    Isa 🫣 <span class="text-[10px] bg-white text-black px-2 py-0.2 rounded-full font-bold">Namorada VIP</span>
                  </h3>
                  <button id="btn-active-chat-ai-toggle" class="contact-ai-badge active" title="Clique para alternar IA para esta pessoa">
                    🤖 IA ON
                  </button>
                </div>
                <p id="active-chat-status" class="text-[11px] text-neutral-400 font-medium">online • WhatsApp Multi-Device</p>
              </div>
            </div>

            <!-- Call & Video Icons -->
            <div class="flex items-center gap-4 text-white text-lg">
              <span class="cursor-pointer hover:opacity-80">📹</span>
              <span class="cursor-pointer hover:opacity-80">📞</span>
            </div>
          </div>

          <!-- Chat Messages Scroll Area -->
          <div id="iphone-chat-messages" class="flex-1 overflow-y-auto p-5 space-y-3 ios-chat-bg">
            <!-- Messages rendered via JS -->
          </div>

          <!-- Chat Bottom Bar -->
          <div class="bg-neutral-950/90 border-t border-white/10 p-3 z-10 backdrop-blur-md">
            <!-- Input bar -->
            <div class="flex items-center gap-2">
              <button id="btn-open-stickers-modal" title="Enviar Figurinha" class="text-xl text-neutral-400 hover:text-white p-1.5 transition-colors">
                🎭
              </button>
              
              <input type="text" id="chat-text-input" placeholder="Mensagem..." class="flex-1 bg-neutral-900 border border-white/10 rounded-full px-4 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-white">

              <button id="btn-chat-send-text" class="w-9 h-9 rounded-full bg-white hover:bg-neutral-200 flex items-center justify-center text-black font-extrabold text-sm transition-all active:scale-95 shadow-[0_0_15px_rgba(255,255,255,0.25)]">
                ➤
              </button>
            </div>
            <div class="flex items-center justify-end px-2 pt-1">
              <span id="chat-send-status" class="text-[11px] text-neutral-400 font-semibold"></span>
            </div>
          </div>

        </div>

      </div>
    </div>

    <!-- ==================== TAB 2: FIGURINHAS WEBP ==================== -->
    <div id="tab-stickers" class="tab-pane hidden space-y-6">
      <div class="bw-card p-8 max-w-4xl mx-auto space-y-6">
        <div class="flex items-center justify-between border-b border-white/10 pb-6">
          <div class="flex items-center gap-4">
            <div class="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-2xl text-white">
              🎭
            </div>
            <div>
              <h2 class="text-lg font-black text-white text-shine">Central de Figurinhas WhatsApp</h2>
              <p class="text-xs text-neutral-400">Figurinhas WebP em 512x512 nativas para iPhone e Android</p>
            </div>
          </div>

          <div class="flex items-center gap-3 bg-neutral-900/90 px-4 py-2 rounded-xl border border-white/15">
            <span class="text-xs text-neutral-300 font-semibold">Figurinha Automática:</span>
            <input type="checkbox" id="toggle-stickers" class="w-4 h-4 accent-white rounded cursor-pointer">
          </div>
        </div>

        <div class="bg-neutral-900/80 p-4 rounded-2xl flex flex-col sm:flex-row items-center gap-4 border border-white/10">
          <div class="flex-1 w-full">
            <label class="text-xs font-bold text-white block mb-1">Contato Destino:</label>
            <input type="text" id="sticker-target" value="191813272993834" placeholder="Digite o número (ex: 191813272993834)" class="w-full bg-black/60 border border-white/15 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-white">
          </div>
          <span class="text-xs text-neutral-400">Clique na figurinha para disparar na hora!</span>
        </div>

        <div id="stickers-grid" class="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <!-- Renderizado via JS -->
        </div>
      </div>
    </div>

    <!-- ==================== TAB 4: NAMORADA VIP ==================== -->
    <div id="tab-girlfriend" class="tab-pane hidden space-y-6">
      <div class="bw-card p-8 max-w-3xl mx-auto space-y-6">
        <div class="flex items-center gap-4 border-b border-white/10 pb-6">
          <div class="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-2xl text-white">
            ❤️
          </div>
          <div>
            <h2 class="text-lg font-black text-white text-shine">Isa 🫣 (Namorada VIP)</h2>
            <p class="text-xs text-neutral-400">Zero emojis, conversa descontraída de namorado real e respostas em áudio Ogg Opus</p>
          </div>
        </div>

        <div class="space-y-4">
          <div>
            <label class="text-xs font-bold text-white block mb-1.5">Identificação da Namorada:</label>
            <input type="text" id="gf-name" class="w-full bg-neutral-900 border border-white/15 rounded-xl px-4 py-2.5 text-xs text-white font-semibold focus:outline-none focus:border-white">
          </div>

          <div>
            <label class="text-xs font-bold text-white block mb-1.5">Prompt de Personalidade do Íthalo:</label>
            <textarea id="gf-prompt" rows="4" class="w-full bg-neutral-900 border border-white/15 rounded-xl p-3.5 text-xs text-white resize-none focus:outline-none focus:border-white"></textarea>
          </div>

          <div class="flex items-center justify-between pt-2">
            <span id="gf-status" class="text-xs font-semibold text-white"></span>
            <button id="btn-save-gf" class="btn-mono-primary text-xs px-6 py-2.5 rounded-xl transition-all shadow-lg active:scale-95">
              Salvar VIP
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ==================== TAB 5: NEGÓCIOS & IPTV ==================== -->
    <div id="tab-business" class="tab-pane hidden space-y-6">
      <div class="bw-card p-8 max-w-3xl mx-auto space-y-6">
        <div class="flex items-center gap-4 border-b border-white/10 pb-6">
          <div class="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-2xl text-white">
            💼
          </div>
          <div>
            <h2 class="text-lg font-black text-white text-shine">Negócios & IPTV (R$ 20)</h2>
            <p class="text-xs text-neutral-400">A IA fecha vendas e envia o Pix na hora</p>
          </div>
        </div>

        <div class="space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="text-xs font-bold text-white block mb-1">Produto:</label>
              <input type="text" id="biz-product" class="w-full bg-neutral-900 border border-white/15 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-white">
            </div>
            <div>
              <label class="text-xs font-bold text-white block mb-1">Preço:</label>
              <input type="text" id="biz-price" class="w-full bg-neutral-900 border border-white/15 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-white">
            </div>
          </div>
          <div>
            <label class="text-xs font-bold text-white block mb-1">Chave Pix:</label>
            <input type="text" id="biz-pix" class="w-full bg-neutral-900 border border-white/15 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-white">
          </div>
          <div>
            <label class="text-xs font-bold text-white block mb-1">Descrição / Canais:</label>
            <textarea id="biz-desc" rows="3" class="w-full bg-neutral-900 border border-white/15 rounded-xl p-3.5 text-xs text-white resize-none focus:outline-none focus:border-white"></textarea>
          </div>
          <div class="flex items-center justify-between pt-2">
            <span id="biz-status" class="text-xs font-semibold text-white"></span>
            <button id="btn-save-biz" class="btn-mono-primary text-xs px-6 py-2.5 rounded-xl transition-all shadow-lg active:scale-95">
              Salvar Catálogo
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ==================== TAB 6: CONEXÃO WHATSAPP ==================== -->
    <div id="tab-qr" class="tab-pane hidden space-y-6">
      <div class="bw-card p-8 max-w-xl mx-auto text-center space-y-6">
        <h2 class="text-lg font-black text-white text-shine">Conexão WhatsApp</h2>
        <div id="qr-connected-box" class="bg-neutral-900/80 border border-white/20 p-6 rounded-2xl space-y-3">
          <div class="w-14 h-14 bg-white text-black font-black rounded-full flex items-center justify-center text-2xl mx-auto shadow-[0_0_20px_rgba(255,255,255,0.3)]">✓</div>
          <h3 class="text-base font-extrabold text-white text-shine">WhatsApp Conectado com Sucesso!</h3>
          <p class="text-xs text-neutral-300">Número conectado: <strong id="qr-phone" class="text-white text-shine">Carregando...</strong></p>
          <button id="btn-disconnect" class="btn-mono-ghost text-neutral-300 hover:text-white text-xs font-bold px-4 py-2 rounded-xl transition-all">
            Desconectar Aparelho
          </button>
        </div>
        <div id="qr-waiting-box" class="hidden space-y-4">
          <p class="text-xs text-neutral-400">Escaneie com a câmera do seu WhatsApp:</p>
          <img id="qr-img" src="" alt="QR" class="w-64 h-64 mx-auto p-4 bg-white rounded-2xl shadow-[0_0_30px_rgba(255,255,255,0.2)]">
        </div>
      </div>
    </div>

  </main>

  <script>
    let currentContacts = [];
    let selectedContactJid = "191813272993834@s.whatsapp.net";

    // Elementos DOM
    const connDot = document.getElementById("conn-dot");
    const connText = document.getElementById("conn-text");
    const botStatusText = document.getElementById("bot-status-text");
    const btnToggleBot = document.getElementById("btn-toggle-bot");

    const iphoneConversationsList = document.getElementById("iphone-conversations-list");
    const iphoneChatMessages = document.getElementById("iphone-chat-messages");
    const activeChatAvatar = document.getElementById("active-chat-avatar");
    const activeChatName = document.getElementById("active-chat-name");
    const chatTextInput = document.getElementById("chat-text-input");
    const chatSendStatus = document.getElementById("chat-send-status");
    const btnChatSendText = document.getElementById("btn-chat-send-text");

    const stickersGrid = document.getElementById("stickers-grid");
    const stickerTarget = document.getElementById("sticker-target");
    const toggleStickers = document.getElementById("toggle-stickers");

    const gfName = document.getElementById("gf-name");
    const gfPrompt = document.getElementById("gf-prompt");
    const gfStatus = document.getElementById("gf-status");
    const btnSaveGf = document.getElementById("btn-save-gf");

    const bizProduct = document.getElementById("biz-product");
    const bizPrice = document.getElementById("biz-price");
    const bizPix = document.getElementById("biz-pix");
    const bizDesc = document.getElementById("biz-desc");
    const bizStatus = document.getElementById("biz-status");
    const btnSaveBiz = document.getElementById("btn-save-biz");

    const qrConnectedBox = document.getElementById("qr-connected-box");
    const qrWaitingBox = document.getElementById("qr-waiting-box");
    const qrPhone = document.getElementById("qr-phone");
    const qrImg = document.getElementById("qr-img");
    const btnDisconnect = document.getElementById("btn-disconnect");

    // Navegação de Abas
    document.querySelectorAll(".ios-tab-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".ios-tab-btn").forEach(b => b.classList.remove("active"));
        document.querySelectorAll(".tab-pane").forEach(p => p.classList.add("hidden"));
        btn.classList.add("active");
        const pane = document.getElementById(btn.getAttribute("data-tab"));
        if (pane) pane.classList.remove("hidden");
      });
    });

    // Conexão SSE em Tempo Real
    const evtSource = new EventSource("/api/events");

    evtSource.addEventListener("init", e => {
      const data = JSON.parse(e.data);
      updateStatus(data.status, data.user, data.qrDataUrl);
      if (data.config) updateConfig(data.config);
      if (data.contacts) {
        currentContacts = data.contacts;
        renderiPhoneConversations();
        renderActiveChatThread();
      }
      loadStickers();
    });

    evtSource.addEventListener("status", e => {
      const data = JSON.parse(e.data);
      updateStatus(data.status, data.user, null);
    });

    evtSource.addEventListener("qr", e => {
      const data = JSON.parse(e.data);
      updateStatus("WAITING_QR", null, data.qrDataUrl);
    });

    evtSource.addEventListener("config", e => {
      const cfg = JSON.parse(e.data);
      updateConfig(cfg);
    });

    evtSource.addEventListener("contact_update", e => {
      const contact = JSON.parse(e.data);
      const idx = currentContacts.findIndex(c => c.jid === contact.jid);
      if (idx >= 0) currentContacts[idx] = contact;
      else currentContacts.unshift(contact);
      renderiPhoneConversations();
      if (selectedContactJid === contact.jid) {
        renderActiveChatThread();
      }
    });

    function updateStatus(status, user, qrUrl) {
      if (status === "CONNECTED") {
        connDot.className = "w-2.5 h-2.5 rounded-full bg-white shadow-[0_0_10px_#ffffff]";
        connText.innerText = "WhatsApp Conectado";
        connText.className = "text-white font-bold";
        qrConnectedBox.classList.remove("hidden");
        qrWaitingBox.classList.add("hidden");
        qrPhone.innerText = user ? (user.id || user.name) : "558183662905";
      } else if (status === "WAITING_QR" && qrUrl) {
        connDot.className = "w-2.5 h-2.5 rounded-full bg-white animate-ping";
        connText.innerText = "Escaneie o QR";
        connText.className = "text-neutral-400";
        qrConnectedBox.classList.add("hidden");
        qrWaitingBox.classList.remove("hidden");
        qrImg.src = qrUrl;
      }
    }

    function updateConfig(cfg) {
      const isEnabled = Boolean(cfg.enabled);
      botStatusText.innerText = isEnabled ? "ROBÔ ATIVO" : "PAUSADO";

      const lumenCard = document.getElementById("master-luminous-card");
      const lumenPill = document.getElementById("luminous-status-pill");
      const lumenIcon = document.getElementById("luminous-icon");
      const lumenDesc = document.getElementById("luminous-desc");
      const lumenBtn = document.getElementById("btn-lumen-toggle");
      const lumenBtnIcon = document.getElementById("lumen-btn-icon");
      const lumenBtnText = document.getElementById("lumen-btn-text");

      if (lumenCard && lumenBtn) {
        if (isEnabled) {
          lumenCard.classList.add("active");
          if (lumenPill) {
            lumenPill.className = "luminous-status-pill active text-shine";
            lumenPill.innerText = "● ATIVO";
          }
          if (lumenIcon) lumenIcon.innerText = "⚡";
          if (lumenDesc) lumenDesc.innerText = "Status: LIGADO • Respostas automáticas inteligentes e naturais no WhatsApp com IA";
          lumenBtn.className = "lumen-btn active";
          if (lumenBtnIcon) lumenBtnIcon.innerText = "⚡";
          if (lumenBtnText) lumenBtnText.innerText = "DESATIVAR INTELIGÊNCIA ARTIFICIAL";
        } else {
          lumenCard.classList.remove("active");
          if (lumenPill) {
            lumenPill.className = "luminous-status-pill inactive text-shine";
            lumenPill.innerText = "○ DESLIGADO";
          }
          if (lumenIcon) lumenIcon.innerText = "⏸️";
          if (lumenDesc) lumenDesc.innerText = "Status: DESLIGADO • O robô está pausado e não responderá novas mensagens";
          lumenBtn.className = "lumen-btn inactive";
          if (lumenBtnIcon) lumenBtnIcon.innerText = "▶️";
          if (lumenBtnText) lumenBtnText.innerText = "LIGAR INTELIGÊNCIA ARTIFICIAL";
        }
      }

      gfName.value = cfg.girlfriendName || "";
      gfPrompt.value = cfg.girlfriendPrompt || "";
      bizProduct.value = cfg.business?.product || "";
      bizPrice.value = cfg.business?.price || "";
      bizPix.value = cfg.business?.pixKey || "";
      bizDesc.value = cfg.business?.description || "";
      toggleStickers.checked = Boolean(cfg.autoStickers);
    }

    // Renderiza a lista de conversas do iPhone exatamente como no WhatsApp do celular do usuário
    // Renderiza a lista de conversas do iPhone apenas com contatos com mensagens reais
    function renderiPhoneConversations() {
      iphoneConversationsList.innerHTML = "";

      // Filtra apenas contatos reais que enviaram mensagens ou têm histórico
      let displayList = currentContacts.filter(c => {
        const isGF = c.category === "girlfriend" || (c.jid && c.jid.includes("191813272993834"));
        const hasHistory = Array.isArray(c.history) && c.history.length > 0;
        const hasMessage = Boolean(c.lastMessage);
        return isGF || hasHistory || hasMessage;
      });

      // Garante que a namorada VIP Isa 🫣 sempre esteja presente como contato principal
      if (!displayList.some(c => c.jid && c.jid.includes("191813272993834"))) {
        const gf = currentContacts.find(c => c.jid && c.jid.includes("191813272993834")) || {
          jid: "191813272993834@s.whatsapp.net",
          phone: "191813272993834",
          name: "Isa 🫣",
          category: "girlfriend",
          lastMessage: "tô aqui no pc mexendo numas paradas",
          lastTime: "15:30",
          unread: 0,
          isGF: true,
          aiEnabled: true,
          avatarBg: "bg-[#00a884]",
          avatarIcon: "👤",
          history: []
        };
        displayList.unshift(gf);
      }

      // Isa 🫣 sempre no topo absoluto
      displayList.sort((a, b) => {
        const aIsGF = a.category === "girlfriend" || (a.jid && a.jid.includes("191813272993834"));
        const bIsGF = b.category === "girlfriend" || (b.jid && b.jid.includes("191813272993834"));
        if (aIsGF) return -1;
        if (bIsGF) return 1;
        return (b.lastSeen || 0) - (a.lastSeen || 0);
      });

      displayList.forEach(c => {
        const item = document.createElement("div");
        const isSelected = c.jid === selectedContactJid;
        item.className = "px-4 py-3 flex items-center gap-3 cursor-pointer transition-colors " + (isSelected ? "bg-white/10" : "hover:bg-white/5");

        const displayName = c.name || c.phone;
        const displayTime = c.lastTime || "14:47";

        let snippetHTML = "";
        if (c.lastMessage && c.lastMessage.startsWith("✓✓")) {
          snippetHTML = \`
            <span class="flex items-center gap-1 text-xs text-neutral-400 truncate">
              <span class="text-[#34B7F1] font-bold">✓✓</span>
              <span class="truncate">\${c.lastMessage.replace("✓✓", "").trim()}</span>
            </span>
          \`;
        } else {
          snippetHTML = \`<p class="truncate text-xs text-neutral-400 text-shine">\${c.lastMessage || "oi amor, tudo certo?"}</p>\`;
        }

        let rightBadgeHTML = "";
        if (c.badgeType === "over99") {
          rightBadgeHTML = \`
            <div class="flex items-center gap-1 shrink-0">
              <span class="text-[#25D366] text-xs font-bold text-shine">@</span>
              <span class="bg-[#25D366]/20 text-[#25D366] text-[10px] font-bold px-1.5 py-0.5 rounded-full text-shine">Mais de 99 &gt;</span>
            </div>
          \`;
        } else if (c.isGF || c.unread) {
          rightBadgeHTML = \`
            <div class="flex flex-col items-end gap-1 shrink-0">
              <span class="text-[11px] text-white font-bold text-shine">\${displayTime}</span>
              <span class="w-4 h-4 bg-[#25D366] text-black text-[10px] font-black rounded-full flex items-center justify-center shadow text-shine">1</span>
            </div>
          \`;
        } else {
          rightBadgeHTML = \`
            <span class="text-[11px] text-neutral-400 shrink-0 text-shine">\${displayTime}</span>
          \`;
        }

        const isAiActive = c.aiEnabled !== false;

        const isGF = c.category === "girlfriend" || (c.jid && c.jid.includes("191813272993834"));
        const avatarBg = isGF ? "bg-[#00a884]" : (c.avatarBg || "bg-neutral-800 border border-white/20");
        const avatarIcon = isGF ? "👤" : (c.avatarIcon || "👤");

        item.innerHTML = \`
          <div class="relative shrink-0">
            <div class="w-12 h-12 rounded-full \${avatarBg} flex items-center justify-center text-xl shadow-md text-white select-none">
              \${avatarIcon}
            </div>
            \${isGF ? '<span class="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-[#25D366] border-2 border-black"></span>' : ''}
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center justify-between mb-0.5">
              <div class="flex items-center gap-1.5 min-w-0">
                <h4 class="text-sm font-semibold text-white truncate text-shine">\${displayName}</h4>
                <button class="contact-ai-badge \${isAiActive ? 'active' : 'inactive'} shrink-0" title="\${isAiActive ? 'IA Ligada para este contato. Clique para desligar' : 'IA Desligada para este contato. Clique para ligar'}">
                  \${isAiActive ? '🤖 IA ON' : '⏸️ IA OFF'}
                </button>
              </div>
              \${!c.badgeType && !c.isGF && !c.unread ? rightBadgeHTML : ''}
            </div>
            <div class="flex items-center justify-between text-xs text-neutral-400">
              <div class="min-w-0 flex-1 mr-2">\${snippetHTML}</div>
              \${c.badgeType || c.isGF || c.unread ? rightBadgeHTML : ''}
            </div>
          </div>
        \`;

        const aiBtn = item.querySelector(".contact-ai-badge");
        if (aiBtn) {
          aiBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            toggleContactAI(c.jid, displayName);
          });
        }

        item.addEventListener("click", () => {
          selectedContactJid = c.jid;
          if (!currentContacts.find(x => x.jid === c.jid)) {
            currentContacts.push(c);
          }
          renderiPhoneConversations();
          renderActiveChatThread();
        });

        iphoneConversationsList.appendChild(item);
      });
    }

    // Alterna a IA Ativa/Desativada manualmente para um contato específico (Pai, Mãe, etc.)
    async function toggleContactAI(jid, name) {
      try {
        const res = await fetch("/api/toggle-contact-ai", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ jid, name })
        });
        const data = await res.json();
        if (data.success) {
          const found = currentContacts.find(x => x.jid === jid);
          if (found) found.aiEnabled = data.aiEnabled;
          renderiPhoneConversations();
          if (selectedContactJid === jid) {
            renderActiveChatThread();
          }
        }
      } catch (e) {}
    }

    // Renderiza a conversa ativa dentro da tela do iPhone
    function renderActiveChatThread() {
      const contact = currentContacts.find(c => c.jid === selectedContactJid) || currentContacts[0];
      if (!contact) return;

      const isGF = contact.category === "girlfriend" || contact.jid.includes("191813272993834");
      const isAiActive = contact.aiEnabled !== false;

      const activeChatAiToggle = document.getElementById("btn-active-chat-ai-toggle");
      if (activeChatAiToggle) {
        activeChatAiToggle.className = "contact-ai-badge " + (isAiActive ? "active" : "inactive");
        activeChatAiToggle.innerText = isAiActive ? "🤖 IA ON" : "⏸️ IA OFF";
        activeChatAiToggle.title = isAiActive ? "IA Ativa para " + (contact.name || "esta pessoa") + ". Clique para desligar." : "IA Desativada para " + (contact.name || "esta pessoa") + ". Clique para ligar.";
        activeChatAiToggle.onclick = (e) => {
          e.stopPropagation();
          toggleContactAI(contact.jid, contact.name || contact.phone);
        };
      }

      if (isGF) {
        activeChatName.innerHTML = \`<span class="text-shine">Isa 🫣</span> <span class="text-[10px] bg-white text-black px-2 py-0.5 rounded-full font-black text-shine tracking-wide">Namorada VIP</span>\`;
        activeChatAvatar.innerText = "👤";
        if (activeChatAvatar.parentElement) {
          activeChatAvatar.parentElement.className = "w-10 h-10 rounded-full bg-[#00a884] text-white flex items-center justify-center text-lg font-bold shadow-[0_0_15px_rgba(0,168,132,0.3)]";
        }
      } else {
        activeChatName.innerHTML = \`<span class="text-shine">\${contact.name || contact.phone}</span>\`;
        activeChatAvatar.innerText = contact.avatarIcon || "👤";
        if (activeChatAvatar.parentElement) {
          activeChatAvatar.parentElement.className = \`w-10 h-10 rounded-full \${contact.avatarBg || 'bg-neutral-800'} text-white flex items-center justify-center text-lg font-bold shadow-[0_0_15px_rgba(255,255,255,0.1)]\`;
        }
      }

      iphoneChatMessages.innerHTML = "";

      const history = contact.history || [];
      if (history.length === 0) {
        iphoneChatMessages.innerHTML = \`
          <div class="text-center my-6">
            <span class="bg-[#182229] text-[#8e8e93] text-[11px] px-3 py-1 rounded-lg">As mensagens são protegidas com a criptografia de ponta a ponta</span>
          </div>
          <div class="flex justify-start">
            <div class="bubble-in p-3 max-w-[80%] text-xs space-y-1 shadow">
              <p>mande um áudio</p>
              <div class="text-[10px] text-[#8e8e93] text-right">14:47</div>
            </div>
          </div>
        \`;
        return;
      }

      history.forEach(msg => {
        const isFromMe = msg.role === "model";
        const bubble = document.createElement("div");
        bubble.className = "flex " + (isFromMe ? "justify-end" : "justify-start");

        const timeStr = new Date(msg.timestamp || Date.now()).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

        if (msg.type === "audio") {
          bubble.innerHTML = \`
            <div class="\${isFromMe ? 'bubble-out' : 'bubble-in'} p-3 max-w-[85%] text-xs shadow-md space-y-2">
              <div class="flex items-center gap-3">
                <button class="w-8 h-8 rounded-full \${isFromMe ? 'bg-black text-white' : 'bg-white text-black'} font-black flex items-center justify-center text-xs shadow-sm">
                  ▶
                </button>
                <div class="flex-1 space-y-1">
                  <div class="h-1.5 \${isFromMe ? 'bg-black/20' : 'bg-white/20'} rounded-full w-36 overflow-hidden">
                    <div class="h-full \${isFromMe ? 'bg-black' : 'bg-white'} w-2/3"></div>
                  </div>
                  <div class="flex justify-between text-[10px] \${isFromMe ? 'text-neutral-700' : 'text-neutral-400'}">
                    <span>0:05</span>
                    <span>14:48</span>
                  </div>
                </div>
              </div>
              <p class="text-[11px] \${isFromMe ? 'text-neutral-800' : 'text-neutral-300'} italic">\${msg.text}</p>
            </div>
          \`;
        } else if (msg.type === "sticker") {
          bubble.innerHTML = \`
            <div class="max-w-[140px] p-1">
              <div class="text-xs text-neutral-300 font-bold">\${msg.text}</div>
            </div>
          \`;
        } else {
          bubble.innerHTML = \`
            <div class="\${isFromMe ? 'bubble-out' : 'bubble-in'} p-3 max-w-[80%] text-xs shadow-md space-y-1">
              <p>\${msg.text}</p>
              <div class="text-[10px] text-right flex items-center justify-end gap-1 \${isFromMe ? 'text-neutral-600' : 'text-neutral-400'}">
                <span>\${timeStr}</span>
                \${isFromMe ? '<span>✓✓</span>' : ''}
              </div>
            </div>
          \`;
        }

        iphoneChatMessages.appendChild(bubble);
      });

      // Scroll para o fim
      iphoneChatMessages.scrollTop = iphoneChatMessages.scrollHeight;
    }

    // Carrega Figurinhas WebP
    async function loadStickers() {
      const res = await fetch("/api/stickers");
      const data = await res.json();
      if (!data.success || !data.stickers) return;

      stickersGrid.innerHTML = "";
      data.stickers.forEach(s => {
        const card = document.createElement("div");
        card.className = "ios-card p-3 rounded-2xl flex flex-col items-center gap-2 hover:border-purple-400 transition-all cursor-pointer group";
        card.innerHTML = \`
          <img src="\${s.url}" alt="\${s.name}" class="w-20 h-20 object-contain group-hover:scale-105 transition-transform">
          <span class="text-xs font-black text-white">\${s.name}</span>
        \`;

        card.addEventListener("click", () => {
          const target = stickerTarget.value.trim() || selectedContactJid;
          fetch("/api/send-sticker", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ target, stickerFilename: s.filename })
          }).then(r => r.json()).then(res => {
            if (res.success) alert("Figurinha " + s.name + " disparada no WhatsApp!");
            else alert("Erro: " + (res.error || "falha ao enviar"));
          });
        });

        stickersGrid.appendChild(card);
      });
    }

    // Envio de Texto pelo Chat do iPhone
    btnChatSendText.addEventListener("click", async () => {
      const text = chatTextInput.value.trim();
      if (!text) return;
      chatSendStatus.innerText = "Enviando...";

      const res = await fetch("/api/send-text-whatsapp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target: selectedContactJid, text })
      });
      const data = await res.json();
      if (data.success) {
        chatTextInput.value = "";
        chatSendStatus.innerText = "✅ Enviado!";
        setTimeout(() => chatSendStatus.innerText = "", 2000);
      } else {
        chatSendStatus.innerText = "❌ Erro";
      }
    });

    // Atalho Enter no input do chat
    chatTextInput.addEventListener("keydown", e => {
      if (e.key === "Enter") btnChatSendText.click();
    });

    btnToggleBot.addEventListener("click", () => fetch("/api/toggle", { method: "POST" }));
    const btnLumenToggle = document.getElementById("btn-lumen-toggle");
    if (btnLumenToggle) {
      btnLumenToggle.addEventListener("click", () => fetch("/api/toggle", { method: "POST" }));
    }
    btnDisconnect.addEventListener("click", () => {
      if (confirm("Desconectar WhatsApp?")) fetch("/api/disconnect", { method: "POST" });
    });

    btnSaveGf.addEventListener("click", () => {
      fetch("/api/update-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ girlfriendName: gfName.value.trim(), girlfriendPrompt: gfPrompt.value.trim() })
      }).then(() => {
        gfStatus.innerText = "✅ Salvo!";
        setTimeout(() => gfStatus.innerText = "", 2500);
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
            pixKey: bizPix.value.trim(),
            description: bizDesc.value.trim(),
            testAvailable: true
          }
        })
      }).then(() => {
        bizStatus.innerText = "✅ Salvo!";
        setTimeout(() => bizStatus.innerText = "", 2500);
      });
    });
  </script>
</body>
</html>`;
}
