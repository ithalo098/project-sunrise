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
import { generateFullSpeechOpus, AVAILABLE_VOICES, type VoiceOption } from "./scripts/audio-converter";

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
  girlfriendPrompt: "A Heloisa Guimarães (Isa 🫣) é minha namorada. Trate ela sempre com muito carinho, respeito, doçura e educação de namorado parceiro e atencioso, sem grosseria nem frieza.",
  business: {
    product: "IPTV Completo",
    price: "R$ 20 por mês",
    testAvailable: true,
    pixKey: "Envio na hora que confirmar",
    description: "Todos os canais liberados (futebol, filmes, séries), qualidade 4K/Full HD, sem travamentos. R$ 20 mensais."
  },
  customExamples: "Opa, tudo bem? Tô por aqui sim, de boa!\nTô aqui no PC mexendo numas coisas, precisando de algo só falar!\nTranquilo meu amigo, qualquer dúvida tamo junto!\nFechado, se quiser te mando a chave Pix agora mesmo.\nValeu pelo carinho, abraço!",
  autoStickers: false,
  ignoreGroups: true,
  blacklist: []
};

// Carrega configurações
if (existsSync(CONFIG_FILE)) {
  try {
    botConfig = { ...botConfig, ...JSON.parse(readFileSync(CONFIG_FILE, "utf-8")) };
  } catch (e) { }
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
  } catch (e) { }
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
  } catch (e) { }
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
        try { rmSync(AUTH_DIR, { recursive: true, force: true }); } catch (e) { }
        setTimeout(startWhatsAppBot, 1000);
      }
    }
  });

  // Mensagens recebidas
  sock.ev.on("messages.upsert", async ({ messages }) => {
    for (const msg of messages) {
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

      // Extrai texto da mensagem
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

      // ========================================================
      // COMANDO REMOTO DO USUÁRIO PELO WHATSAPP: "BOT OFF" / "BOT ON"
      // Se você digitar "BOT OFF" ou "BOT ON" na conversa pelo celular,
      // o bot liga ou desliga para aquela pessoa específica instantaneamente.
      // ========================================================
      const cleanCmd = incomingText.toUpperCase().replace(/[.!#\/\s]+/g, " ").trim();
      const isBotOff = cleanCmd === "BOT OFF" || cleanCmd === "DESLIGAR IA" || cleanCmd === "PAUSAR IA";
      const isBotOn = cleanCmd === "BOT ON" || cleanCmd === "LIGAR IA" || cleanCmd === "ATIVAR IA";
      const isBotOffGlobal = cleanCmd === "BOT OFF GERAL" || cleanCmd === "BOT OFF ALL";
      const isBotOnGlobal = cleanCmd === "BOT ON GERAL" || cleanCmd === "BOT ON ALL";

      if (msg.key.fromMe && (isBotOffGlobal || isBotOnGlobal)) {
        botConfig.enabled = isBotOnGlobal;
        saveConfig();
        broadcastSSE("config", botConfig);
        console.log(`[ITHALO IA] 🌐 Comando global "${cleanCmd}" detectado! Robô geral agora: ${botConfig.enabled ? 'LIGADO' : 'PAUSADO'}`);
        try {
          if (sock && msg.key) {
            await sock.sendMessage(rawJid, { react: { text: isBotOnGlobal ? "🚀" : "🛑", key: msg.key } });
          }
        } catch (e) { }
        continue;
      }

      if (msg.key.fromMe && (isBotOff || isBotOn)) {
        if (!contactsMemory[remoteJid]) {
          const isGF = isGirlfriendContact("", remoteJid);
          contactsMemory[remoteJid] = {
            jid: remoteJid,
            phone: contactNumber,
            name: isGF ? "Isa 🫣" : contactNumber,
            category: isGF ? "girlfriend" : "unknown",
            lastSeen: Date.now(),
            messageCount: 0,
            history: []
          };
        }
        const profile = contactsMemory[remoteJid];
        profile.aiEnabled = isBotOn;
        saveContacts();
        broadcastSSE("contact_update", profile);

        console.log(`[ITHALO IA] 🎯 Comando remoto "${cleanCmd}" detectado no WhatsApp para ${profile.name || contactNumber}! IA agora: ${isBotOn ? 'LIGADA' : 'DESLIGADA'}`);

        // Reage à mensagem no WhatsApp para dar confirmação visual imediata no celular
        try {
          if (sock && msg.key) {
            await sock.sendMessage(rawJid, {
              react: {
                text: isBotOn ? "🤖" : "⏸️",
                key: msg.key
              }
            });
          }
        } catch (e) { }
        continue;
      }

      // Se a mensagem foi enviada pelo próprio usuário no celular (e não é comando), registra no histórico
      if (msg.key.fromMe) {
        if (contactsMemory[remoteJid]) {
          const profile = contactsMemory[remoteJid];
          profile.lastMessage = incomingText;
          profile.lastTime = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
          profile.history.push({
            role: "model",
            text: incomingText,
            timestamp: Date.now(),
            type: incomingIsSticker ? "sticker" : "text"
          });
          if (profile.history.length > 40) profile.history.shift();
          saveContacts();
          broadcastSSE("contact_update", profile);
        }
        continue;
      }

      // Se o robô geral estiver pausado, ignora respostas
      if (!botConfig.enabled) continue;

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
        console.log(`[ITHALO IA] ⏸️ IA DESATIVADA manualmente para ${profile.name} (${contactNumber}). Auto-resposta ignorada.`);
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
- Ela é sua namorada e merece todo o seu carinho, paciência e atenção.
- NUNCA use palavras rudes, termos ofensivos, xingamentos ou respostas ignorantes (PROIBIDO: 'fdp', 'doida', 'viaja não', 'burra', 'qual foi').
- Seja um namorado amoroso, gentil, educado, bem-humorado e parceiro: "oi amor, tudo bem?", "tô por aqui sim amor", "tô no PC mexendo numas coisas, e você como tá?".
- Mantenha respostas naturais de namorado de verdade, sem exagerar em emojis em toda frase, mas sempre com afeto, carinho e respeito.`;
  } else if (profile.category === "client") {
    relationshipContext = `\n💼 NEGÓCIOS & IPTV (CLIENTE INTERESSADO):
- Você vende ${botConfig.business.product} por ${botConfig.business.price}.
- Detalhes: ${botConfig.business.description}.
- Seja extremamente educado, prestativo, cordial e atencioso! Cumprimente com entusiasmo: "Opa, tudo bem? Tudo certinho por aí?".
- Se pedirem teste: ofereça um teste grátis com prazer e agilidade.
- Se confirmarem a compra: passe as informações com educação e cordialidade.`;
  } else {
    relationshipContext = `\n🤝 CONVERSA PESSOAL / AMIGO / FAMÍLIA:
- Seja sempre muito educado, acolhedor, simpático e de boa energia com todas as pessoas!
- NUNCA seja ignorante, seco, grosseiro ou impaciente.
- Cumprimente com respeito e simpatia: "Opa, tudo bem? Como você tá?", "Tranquilo, pode falar!", "Tô por aqui, precisando de algo só avisar!".
- NÃO fale de IPTV nem de vendas a menos que a pessoa pergunte especificamente.`;
  }

  const systemPrompt = `Você é o próprio ${botConfig.userName} digitando no WhatsApp pessoal pelo celular.

REGRAS DE CONVIVÊNCIA, EDUCAÇÃO E RESPEITO (MANDATÓRIO):
1. EDUCAÇÃO E GENTILEZA ACIMA DE TUDO:
- Seja sempre educado, respeitoso, acolhedor e simpático com todo mundo.
- É TOTALMENTE PROIBIDO ser rude, ignorante, debochado, frio ou xingar (NUNCA fale palavrões como 'fdp', nem chame ninguém de 'doida', 'burra', nem mande 'viaja não').
- Mostre consideração e carinho pelas pessoas: responda com paciência e boa vontade.

2. REGRAS PARA NÃO PARECER ROBÔ:
- Responda como uma pessoa real no WhatsApp: mensagens naturais, de 1 a 2 linhas (evite textão formal de telemarketing).
- NUNCA use frases prontas de robô como: "Como posso te ajudar?", "Como posso ajudar você hoje?", "Em que posso ser útil?", "Estou à disposição".
- NUNCA diga que é uma inteligência artificial ou bot. Você É o próprio ${botConfig.userName}.
${relationshipContext}
${botConfig.customExamples ? `\nExemplos de como você costuma responder educadamente:\n${botConfig.customExamples}` : ""}`;

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
    } catch (e) { }
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
    } catch (e) { }
  }

  // Limpeza de segurança anti-robô, remoção de HTML e filtro de civilidade
  reply = reply
    .replace(/<\/?[^>]+(>|$)/g, "") // remove qualquer tag HTML vazada
    .replace(/\b(fdp|f\.d\.p|filho da puta|arrombado|doida|doido|otário|burro|burra|vagabundo)\b/gi, "")
    .replace(/Como posso (te|lhe) ajudar( hoje)?\??/gi, "")
    .replace(/Em que posso (ser útil|ajudar)\??/gi, "")
    .replace(/Estou (à|a) disposição\.?/gi, "")
    .trim();

  // Para a namorada, o Íthalo não manda excesso de emojis
  if (profile.category === "girlfriend") {
    reply = reply.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE0F}\u{1F900}-\u{1F9FF}]/gu, "").replace(/\s{2,}/g, " ").trim();
  }

  // Fallback inteligente hiper-natural e educado se a API falhar
  if (!reply) {
    if (profile.category === "girlfriend") {
      const gfFallbacks = [
        "tô aqui no PC amor, fala comigo!",
        "tô de boa aqui amor, e você como tá?",
        "oi amor, tudo certinho por aí?",
        "tô aqui no computador trabalhando amor, precisando de algo só falar!"
      ];
      reply = gfFallbacks[Math.floor(Math.random() * gfFallbacks.length)];
    } else if (profile.category === "client") {
      reply = "Opa! Temos sim, lista completa com canais, filmes e séries por R$ 20. Quer um teste grátis?";
    } else if (profile.cantRead || willBeSpokenAsAudio) {
      reply = "Opa, tudo bem? Tô mandando esse áudio aqui pra te avisar que já tô vendo isso pra você!";
    } else {
      reply = "Opa, tudo bem? Tô meio na correria no PC agora, mas já já te respondo certinho!";
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

      if (!contactsMemory[cleanTarget]) {
        const contactNumber = cleanTarget.split("@")[0].split(":")[0];
        const isGF = isGirlfriendContact("", cleanTarget);
        contactsMemory[cleanTarget] = {
          jid: cleanTarget,
          phone: contactNumber,
          name: isGF ? "Isa 🫣" : contactNumber,
          category: isGF ? "girlfriend" : "unknown",
          lastSeen: Date.now(),
          messageCount: 0,
          history: []
        };
      }

      contactsMemory[cleanTarget].history.push({
        role: "model",
        text: text.trim(),
        timestamp: Date.now(),
        type: "text"
      });
      if (contactsMemory[cleanTarget].history.length > 50) contactsMemory[cleanTarget].history.shift();
      contactsMemory[cleanTarget].lastMessage = text.trim();
      contactsMemory[cleanTarget].lastTime = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
      saveContacts();
      broadcastSSE("contact_update", contactsMemory[cleanTarget]);

      return Response.json({ success: true });
    }

    // Listar vozes disponíveis no Estúdio
    if (url.pathname === "/api/voices" && req.method === "GET") {
      return Response.json({ success: true, voices: AVAILABLE_VOICES });
    }

    // Gerar prévia de áudio (para ouvir no navegador)
    if (url.pathname === "/api/generate-audio" && req.method === "POST") {
      try {
        const body = await req.json();
        const { text, voice = "bob_esponja" } = body;
        if (!text) return Response.json({ success: false, error: "Texto vazio" });

        const opusBuffer = await generateFullSpeechOpus(text, voice);
        if (opusBuffer) {
          const base64Url = `data:audio/ogg;codecs=opus;base64,${opusBuffer.toString("base64")}`;
          return Response.json({ success: true, audioUrl: base64Url });
        }
        return Response.json({ success: false, error: "Falha na geração do áudio" });
      } catch (err: any) {
        return Response.json({ success: false, error: err?.message || "Erro interno" });
      }
    }

    // Enviar áudio 100% nativo no WhatsApp (OGG OPUS)
    if (url.pathname === "/api/send-audio-whatsapp" && req.method === "POST") {
      try {
        const body = await req.json();
        const { target, text, voice = "bob_esponja" } = body;
        if (!text || !target) return Response.json({ success: false, error: "Dados incompletos" });

        if (!sock || connectionStatus !== "CONNECTED") {
          return Response.json({ success: false, error: "WhatsApp não está conectado" });
        }

        let cleanTarget = target.trim();
        if (!cleanTarget.includes("@")) {
          cleanTarget = cleanTarget.replace(/\D/g, "") + "@s.whatsapp.net";
        }

        const opusBuffer = await generateFullSpeechOpus(text, voice);
        if (!opusBuffer) {
          return Response.json({ success: false, error: "Falha na conversão de áudio" });
        }

        await sock.sendMessage(cleanTarget, {
          audio: opusBuffer,
          mimetype: "audio/ogg; codecs=opus",
          ptt: true
        });

        if (contactsMemory[cleanTarget]) {
          contactsMemory[cleanTarget].lastMessage = `🎤 Áudio (${voice})`;
          contactsMemory[cleanTarget].lastTime = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
          contactsMemory[cleanTarget].history.push({
            role: "model",
            text: `🎤 Áudio [${voice}]: ${text}`,
            timestamp: Date.now()
          });
          saveContacts();
          broadcastSSE("contact_update", contactsMemory[cleanTarget]);
        }

        return Response.json({ success: true });
      } catch (err: any) {
        return Response.json({ success: false, error: err?.message || "Erro ao enviar áudio" });
      }
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
      } catch (e) { }
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
    /* SEGMENTED TASKBAR DOCK (Uiverse.io Yaya12085/rude-mouse-79) */
    .taskbar-container {
      position: sticky;
      top: 76px;
      z-index: 45;
      width: 100%;
      display: flex;
      justify-content: center;
      padding: 10px 1rem;
      margin-bottom: 1.5rem;
      pointer-events: none;
    }
    .radio-inputs {
      pointer-events: auto;
      position: relative;
      display: flex;
      align-items: center;
      gap: 6px;
      border-radius: 9999px;
      background: rgba(0, 0, 0, 0.3);
      background: linear-gradient(180deg, rgba(255, 255, 255, 0.08) 0%, rgba(0, 0, 0, 0.3) 100%);
      box-sizing: border-box;
      box-shadow: 
        0 20px 40px rgba(0, 0, 0, 0.8),
        0 0 20px rgba(255, 255, 255, 0.06),
        inset 0 1px 1.5px rgba(255, 255, 255, 0.25),
        inset 0 -1px 2px rgba(0, 0, 0, 0.6);
      border: 1px solid rgba(255, 255, 255, 0.18);
      padding: 6px 8px;
      max-width: 96vw;
      overflow-x: auto;
      scrollbar-width: none;
      backdrop-filter: blur(24px);
      -webkit-backdrop-filter: blur(24px);
    }
    .radio-inputs::-webkit-scrollbar {
      display: none;
    }
    .radio-inputs .radio {
      flex: 0 0 auto;
      text-align: center;
      position: relative;
      margin: 0;
      cursor: pointer;
    }
    .radio-inputs .radio input {
      display: none;
    }
    .radio-inputs .radio .name {
      display: flex;
      cursor: pointer;
      align-items: center;
      justify-content: center;
      gap: 6px;
      border-radius: 9999px;
      border: 1px solid rgba(255, 255, 255, 0.1);
      padding: 6px 12px;
      color: rgba(255, 255, 255, 0.85);
      font-size: 0.76rem;
      font-weight: 700;
      background: rgba(255, 255, 255, 0.05);
      white-space: nowrap;
      user-select: none;
      transition: all 0.22s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .radio-inputs .radio:hover .name {
      color: #ffffff;
      background-color: rgba(255, 255, 255, 0.16);
      border-color: rgba(255, 255, 255, 0.35);
      transform: translateY(-1px);
    }
    .radio-inputs .radio input:checked + .name {
      background-color: #ffffff !important;
      color: #000000 !important;
      font-weight: 900 !important;
      border-color: #ffffff !important;
      box-shadow: 
        0 0 25px rgba(255, 255, 255, 0.65),
        0 4px 14px rgba(0, 0, 0, 0.5) !important;
      transform: translateY(-1px);
    }
    .radio-inputs .radio .icon {
      font-size: 0.95rem;
      line-height: 1;
    }
    .radio-inputs .radio .tab-badge {
      font-size: 8px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.03em;
      padding: 1.5px 5.5px;
      border-radius: 9999px;
      background-color: rgba(255, 255, 255, 0.12);
      color: #ffffff;
      border: 1px solid rgba(255, 255, 255, 0.2);
      transition: all 0.2s ease;
    }
    .radio-inputs .radio input:checked + .name .tab-badge {
      background-color: #000000 !important;
      color: #ffffff !important;
      border-color: rgba(0, 0, 0, 0.25) !important;
    }
    .radio-inputs .radio .badge-live {
      background-color: rgba(37, 211, 102, 0.2);
      color: #25D366;
      border-color: rgba(37, 211, 102, 0.45);
    }
    .radio-inputs .radio input:checked + .name .badge-live {
      background-color: #000000 !important;
      color: #25D366 !important;
    }
    .radio-inputs .radio .badge-vip {
      background-color: rgba(255, 255, 255, 0.15);
      color: #ffffff;
      border-color: rgba(255, 255, 255, 0.3);
    }
    .radio-inputs .radio input:checked + .name .badge-vip {
      background-color: #000000 !important;
      color: #ffffff !important;
    }
    .radio-inputs .radio .badge-price {
      background-color: rgba(255, 255, 255, 0.12);
      color: #ffffff;
      border-color: rgba(255, 255, 255, 0.25);
    }
    .radio-inputs .radio input:checked + .name .badge-price {
      background-color: #000000 !important;
      color: #ffffff !important;
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

    /* ========================================================
       LOGO & BRAND TEXT ANIMADO (ITHALO IA)
       ======================================================== */
    .brand-logo-wrap {
      position: relative;
      width: 44px;
      height: 44px;
      flex-shrink: 0;
      cursor: pointer;
    }
    .brand-logo-glow {
      position: absolute;
      inset: -3px;
      border-radius: 16px;
      background: linear-gradient(135deg, rgba(56, 189, 248, 0.6), rgba(168, 85, 247, 0.6), rgba(255, 255, 255, 0.8));
      opacity: 0.65;
      filter: blur(8px);
      animation: logo-glow-flow 4s ease-in-out infinite alternate;
      z-index: 0;
    }
    .brand-logo-frame {
      position: relative;
      z-index: 1;
      width: 100%;
      height: 100%;
      border-radius: 14px;
      background: #090a0f;
      background: linear-gradient(145deg, #131722, #07080c);
      border: 1.5px solid rgba(255, 255, 255, 0.3);
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 
        0 8px 20px rgba(0, 0, 0, 0.8),
        inset 0 1px 2px rgba(255, 255, 255, 0.5),
        inset 0 -1px 2px rgba(0, 0, 0, 0.8);
      overflow: hidden;
      transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), border-color 0.3s ease;
    }
    .brand-logo-wrap:hover .brand-logo-frame {
      transform: scale(1.06) rotate(3deg);
      border-color: rgba(255, 255, 255, 0.65);
    }
    .brand-logo-svg {
      width: 36px;
      height: 36px;
    }
    .logo-orbit-ring {
      transform-box: view-box;
      transform-origin: 22px 22px;
      animation: logo-spin-clockwise 10s linear infinite;
    }
    .logo-core-pulse {
      transform-box: view-box;
      transform-origin: 22px 22px;
      animation: logo-pulse-scale 2.5s ease-in-out infinite alternate;
    }
    .logo-node-left {
      animation: logo-node-blink 2s ease-in-out infinite;
    }
    .logo-node-right {
      animation: logo-node-blink 2s ease-in-out infinite 1s;
    }
    @keyframes logo-glow-flow {
      0% {
        transform: rotate(0deg) scale(0.95);
        opacity: 0.45;
      }
      50% {
        opacity: 0.85;
      }
      100% {
        transform: rotate(180deg) scale(1.05);
        opacity: 0.65;
      }
    }
    @keyframes logo-spin-clockwise {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    @keyframes logo-pulse-scale {
      0% {
        transform: scale(0.85);
        opacity: 0.4;
      }
      100% {
        transform: scale(1.15);
        opacity: 0.95;
      }
    }
    @keyframes logo-node-blink {
      0%, 100% { opacity: 0.3; }
      50% { opacity: 1; }
    }

    /* Animated Brand Text */
    .brand-title-animated {
      display: inline-flex;
      align-items: center;
      position: relative;
      margin: 0;
      line-height: 1.1;
    }
    .brand-title-text {
      font-size: 1.4rem;
      font-weight: 900;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      background: linear-gradient(
        90deg,
        #ffffff 0%,
        #ffffff 20%,
        #38bdf8 40%,
        #ffffff 50%,
        #c084fc 65%,
        #ffffff 80%,
        #ffffff 100%
      );
      background-size: 300% 100%;
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      animation: brand-shimmer 4s ease-in-out infinite;
      filter: drop-shadow(0 0 16px rgba(255, 255, 255, 0.45)) drop-shadow(0 0 30px rgba(56, 189, 248, 0.35));
      user-select: none;
    }
    @keyframes brand-shimmer {
      0% { background-position: 100% 0; }
      50% { background-position: 0% 0; }
      100% { background-position: -100% 0; }
    }
    .brand-badge-pro {
      font-size: 9px;
      font-weight: 900;
      letter-spacing: 0.08em;
      padding: 2px 7px;
      border-radius: 9999px;
      background: linear-gradient(135deg, rgba(255,255,255,0.18), rgba(255,255,255,0.05));
      color: #ffffff;
      border: 1px solid rgba(255, 255, 255, 0.35);
      box-shadow: 0 0 12px rgba(255, 255, 255, 0.25), inset 0 1px 1px rgba(255, 255, 255, 0.6);
      text-transform: uppercase;
      display: inline-flex;
      align-items: center;
      line-height: 1;
      animation: badge-pulse 2.5s ease-in-out infinite alternate;
    }
    @keyframes badge-pulse {
      0% {
        border-color: rgba(255, 255, 255, 0.3);
        box-shadow: 0 0 10px rgba(255, 255, 255, 0.2);
      }
      100% {
        border-color: rgba(56, 189, 248, 0.7);
        box-shadow: 0 0 16px rgba(56, 189, 248, 0.5);
      }
    }
    .brand-subtitle {
      font-size: 8.5px;
      font-weight: 700;
      letter-spacing: 0.18em;
      color: rgba(255, 255, 255, 0.45);
      text-transform: uppercase;
      margin-top: 2px;
      user-select: none;
    }

    /* ========================================================
       SWITCH BY MuhammadHasann (Uiverse.io nasty-moth-15)
       ======================================================== */
    .toggle-cont {
      --primary: #54a8fc;
      --light: #d9d9d9;
      --dark: #121212;
      --gray: #414344;
      --second: #1a1a1a;

      position: relative;
      z-index: 10;
      width: fit-content;
      height: 32px;
      border-radius: 9999px;
      user-select: none;
      display: inline-block;
    }

    .toggle-cont .toggle-input {
      display: none;
    }

    .toggle-cont .toggle-label {
      --gap: 3px;
      --width: 30px;

      cursor: pointer;
      position: relative;
      display: inline-block;
      padding: 0.2rem;
      width: calc((var(--width) + var(--gap)) * 2);
      height: 100%;
      background-color: var(--dark);
      border: 1px solid #777777;
      border-bottom: 0;
      border-radius: 9999px;
      box-sizing: content-box;
      transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .toggle-cont .toggle-label::before {
      content: "";
      position: absolute;
      z-index: -10;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: calc(100% + 0.75rem);
      height: calc(100% + 0.75rem);
      background-color: var(--gray);
      border: 1px solid #777777;
      border-bottom: 0;
      border-radius: 9999px;
      transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .toggle-cont .toggle-label::after {
      content: "";
      position: absolute;
      z-index: -10;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 100%;
      height: 100%;
      background-image: radial-gradient(
        circle at 50% -100%,
        rgb(58, 155, 252) 0%,
        rgba(12, 12, 12, 1) 80%
      );
      border-radius: 9999px;
    }

    .toggle-cont .toggle-label .cont-icon {
      position: relative;
      display: flex;
      justify-content: center;
      align-items: center;
      width: var(--width);
      height: 30px;
      background-image: radial-gradient(
        circle at 50% 0%,
        #666666 0%,
        var(--gray) 100%
      );
      border: 1px solid #aaaaaa;
      border-bottom: 0;
      border-radius: 9999px;
      box-shadow: inset 0 -0.15rem 0.15rem var(--primary),
        inset 0 0 0.5rem 0.75rem var(--second);
      transition: transform 0.35s cubic-bezier(0.4, 0, 0.2, 1), background-image 0.35s ease;
      overflow: clip;
    }

    .cont-icon .sparkle {
      position: absolute;
      top: 50%;
      left: 50%;
      display: block;
      width: calc(var(--width) * 1px);
      aspect-ratio: 1;
      background-color: var(--light);
      border-radius: 50%;
      transform-origin: 50% 50%;
      rotate: calc(1deg * var(--deg));
      transform: translate(-50%, -50%);
      animation: sparkle calc(100s / var(--duration)) linear
        calc(0s / var(--duration)) infinite;
    }

    @keyframes sparkle {
      to {
        width: calc(var(--width) * 0.5px);
        transform: translate(2000%, -50%);
      }
    }

    .cont-icon .icon {
      width: 0.85rem;
      fill: var(--light);
      transition: fill 0.3s ease;
    }

    .toggle-cont:has(.toggle-input:checked) {
      --checked: true;
    }

    /* Estado CHECKED (ativo) via seletores diretos & @container */
    .toggle-cont .toggle-input:checked + .toggle-label,
    .toggle-cont:has(.toggle-input:checked) .toggle-label {
      background-color: #41434400;
      border: 1px solid #3d6970;
      border-bottom: 0;
    }

    .toggle-cont .toggle-input:checked + .toggle-label::before,
    .toggle-cont:has(.toggle-input:checked) .toggle-label::before {
      box-shadow: 0 1rem 2.5rem -1.2rem #0080ff, 0 0 25px rgba(84, 168, 252, 0.5);
      background-color: #1a2c3a;
    }

    .toggle-cont .toggle-input:checked + .toggle-label .cont-icon,
    .toggle-cont:has(.toggle-input:checked) .toggle-label .cont-icon {
      overflow: visible;
      background-image: radial-gradient(
        circle at 50% 0%,
        #045ab1 0%,
        var(--primary) 100%
      );
      border: 1px solid var(--primary);
      border-bottom: 0;
      transform: translateX(calc((var(--gap) * 2) + 100%)) rotate(-225deg);
      box-shadow: 0 0 20px rgba(84, 168, 252, 0.8), inset 0 0 8px #ffffff;
    }

    .toggle-cont .toggle-input:checked + .toggle-label .cont-icon .icon,
    .toggle-cont:has(.toggle-input:checked) .toggle-label .cont-icon .icon {
      fill: #ffffff;
    }

    .toggle-cont .toggle-input:checked + .toggle-label .cont-icon .sparkle,
    .toggle-cont:has(.toggle-input:checked) .toggle-label .cont-icon .sparkle {
      z-index: -10;
      width: calc(var(--width) * 1.5px);
      background-color: #acacac;
      animation: sparkle calc(100s / var(--duration)) linear
        calc(10s / var(--duration)) infinite;
    }

    /* SWITCH BY TimTrayler (Uiverse.io quiet-swan-35) - Switch individual de IA por contato */
    .quiet-swan-switch,
    .contact-ai-switch {
      --secondary-container: #1e382b;
      --primary: #25D366;
      font-size: 10px;
      position: relative;
      display: inline-block;
      width: 3.7em;
      height: 1.8em;
      flex-shrink: 0;
      vertical-align: middle;
      cursor: pointer;
      margin-left: 6px;
      user-select: none;
    }
    .quiet-swan-switch input,
    .contact-ai-switch input {
      opacity: 0;
      width: 0;
      height: 0;
      position: absolute;
      margin: 0;
      pointer-events: none;
    }
    .quiet-swan-slider,
    .contact-ai-slider {
      position: absolute;
      cursor: pointer;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: #313033;
      transition: background-color .25s ease, border-color .25s ease, box-shadow .25s ease;
      border-radius: 30px;
      border: 1px solid rgba(255, 255, 255, 0.16);
      box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.5);
    }
    .quiet-swan-slider:before,
    .contact-ai-slider:before {
      position: absolute;
      content: "";
      height: 1.4em;
      width: 1.4em;
      border-radius: 50%;
      left: 0.2em;
      bottom: 0.2em;
      background-color: #aeaaae;
      transition: transform .3s cubic-bezier(0.4, 0, 0.2, 1), background-color .3s ease, box-shadow .3s ease;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
    }
    .quiet-swan-switch input:checked + .quiet-swan-slider::before,
    .contact-ai-switch input:checked + .contact-ai-slider::before {
      background-color: var(--primary);
      box-shadow: 0 0 8px rgba(37, 211, 102, 0.8);
    }
    .quiet-swan-switch input:checked + .quiet-swan-slider,
    .contact-ai-switch input:checked + .contact-ai-slider {
      background-color: var(--secondary-container);
      border-color: rgba(37, 211, 102, 0.5);
      box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.3), 0 0 6px rgba(37, 211, 102, 0.2);
    }
    .quiet-swan-switch input:focus + .quiet-swan-slider,
    .contact-ai-switch input:focus + .contact-ai-slider {
      box-shadow: 0 0 1px var(--secondary-container);
    }
    .quiet-swan-switch input:checked + .quiet-swan-slider:before,
    .contact-ai-switch input:checked + .contact-ai-slider:before {
      transform: translateX(1.9em);
    }

    /* INPUT BY LightAndy1 (Uiverse.io tidy-pig-67) - Barra de Pesquisa de Conversas */
    .tidy-pig-group {
      display: flex;
      line-height: 28px;
      align-items: center;
      position: relative;
      width: 100%;
    }
    .tidy-pig-input {
      font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif;
      width: 100%;
      height: 40px;
      padding-left: 2.5rem;
      padding-right: 1rem;
      box-shadow: 0 0 0 1.5px rgba(255, 255, 255, 0.12), 0 0 25px -17px #000;
      border: 0;
      border-radius: 12px;
      background-color: #16171d;
      outline: none;
      color: #ffffff;
      font-size: 0.82rem;
      font-weight: 500;
      transition: all 0.25s cubic-bezier(0.19, 1, 0.22, 1);
      cursor: text;
      z-index: 0;
    }
    .tidy-pig-input::placeholder {
      color: #8e8e93;
    }
    .tidy-pig-input:hover {
      box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.25), 0px 0px 25px -15px #000;
      background-color: #1a1b22;
    }
    .tidy-pig-input:active {
      transform: scale(0.98);
    }
    .tidy-pig-input:focus {
      box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.45), 0 0 15px rgba(255, 255, 255, 0.12);
      background-color: #1c1d25;
    }
    .tidy-pig-search-icon {
      position: absolute;
      left: 0.85rem;
      fill: #8e8e93;
      width: 1rem;
      height: 1rem;
      pointer-events: none;
      z-index: 1;
      transition: fill 0.2s ease;
    }
    .tidy-pig-group:hover .tidy-pig-search-icon,
    .tidy-pig-group:focus-within .tidy-pig-search-icon {
      fill: #ffffff;
    }
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
        <!-- Logo Futurista com Halo e SVG Emblemático -->
        <div class="brand-logo-wrap relative flex items-center justify-center group" title="ITHALO IA - Núcleo de Inteligência">
          <div class="brand-logo-glow"></div>
          <div class="brand-logo-frame">
            <svg class="brand-logo-svg" viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="logo-grad-primary" x1="0" y1="0" x2="44" y2="44" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stop-color="#ffffff"/>
                  <stop offset="50%" stop-color="#93c5fd"/>
                  <stop offset="100%" stop-color="#a855f7"/>
                </linearGradient>
                <linearGradient id="logo-grad-accent" x1="44" y1="0" x2="0" y2="44" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stop-color="#38bdf8"/>
                  <stop offset="100%" stop-color="#ffffff"/>
                </linearGradient>
                <radialGradient id="core-glow" cx="22" cy="22" r="14" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stop-color="#60a5fa" stop-opacity="0.8"/>
                  <stop offset="100%" stop-color="#3b82f6" stop-opacity="0"/>
                </radialGradient>
              </defs>
              
              <!-- Core Aura Glow -->
              <circle cx="22" cy="22" r="14" fill="url(#core-glow)" class="logo-core-pulse"/>

              <!-- Orbiting Tech Ring with Dashes -->
              <circle cx="22" cy="22" r="19" stroke="url(#logo-grad-accent)" stroke-width="1.5" stroke-dasharray="7 5" stroke-linecap="round" class="logo-orbit-ring"/>

              <!-- Inner Hexagonal Frame -->
              <polygon points="22,6 35,13.5 35,28.5 22,36 9,28.5 9,13.5" stroke="rgba(255,255,255,0.3)" stroke-width="1" fill="rgba(10,10,15,0.7)"/>

              <!-- Cyber Monogram 'I' + AI Nexus Nodes -->
              <!-- Top Diamond Spark -->
              <path d="M22 10L25.5 14L22 18L18.5 14Z" fill="url(#logo-grad-primary)"/>
              <circle cx="22" cy="14" r="1.5" fill="#ffffff"/>

              <!-- Monolith Stem -->
              <path d="M20 19H24V30H20Z" fill="url(#logo-grad-primary)"/>

              <!-- Futuristic Pedestal Base -->
              <path d="M16 31H28L26 33.5H18L16 31Z" fill="url(#logo-grad-accent)"/>

              <!-- Dual AI Energy Nodes -->
              <circle cx="15" cy="21" r="2" fill="#38bdf8" class="logo-node-left"/>
              <line x1="16.5" y1="21" x2="20" y2="23" stroke="#38bdf8" stroke-width="1" stroke-dasharray="2 1"/>

              <circle cx="29" cy="21" r="2" fill="#c084fc" class="logo-node-right"/>
              <line x1="27.5" y1="21" x2="24" y2="23" stroke="#c084fc" stroke-width="1" stroke-dasharray="2 1"/>
            </svg>
          </div>
        </div>

        <!-- Tipografia Animada ITHALO IA -->
        <div class="flex flex-col justify-center">
          <div class="flex items-center gap-2">
            <h1 class="brand-title-animated">
              <span class="brand-title-text">ITHALO IA</span>
            </h1>
            <span class="brand-badge-pro">PRO</span>
          </div>
          <span class="brand-subtitle">SISTEMA INTELIGENTE INTEGRADO</span>
        </div>
      </div>

      <div class="flex items-center gap-3.5">
        <div id="conn-badge" class="flex items-center gap-2 bg-neutral-900/80 px-3.5 py-1.5 rounded-full border border-white/15 text-xs font-semibold text-white">
          <span class="w-2.5 h-2.5 rounded-full bg-white animate-ping shadow-[0_0_10px_#ffffff]" id="conn-dot"></span>
          <span id="conn-text" class="text-white text-shine font-bold">WhatsApp Conectado</span>
        </div>

        <!-- Switch by MuhammadHasann (Uiverse.io nasty-moth-15) do lado de WhatsApp Conectado -->
        <div class="flex items-center gap-2.5">
          <div class="toggle-cont">
            <input class="toggle-input" id="ia-toggle-switch" name="ia-toggle" type="checkbox" ${botConfig.enabled ? "checked" : ""} />
            <label class="toggle-label" for="ia-toggle-switch" title="Clique para Ligar / Desligar a IA">
              <div class="cont-icon">
                <span style="--width: 2; --deg: 25; --duration: 11" class="sparkle"></span>
                <span style="--width: 1; --deg: 100; --duration: 18" class="sparkle"></span>
                <span style="--width: 1; --deg: 280; --duration: 5" class="sparkle"></span>
                <span style="--width: 2; --deg: 200; --duration: 3" class="sparkle"></span>
                <span style="--width: 2; --deg: 30; --duration: 20" class="sparkle"></span>
                <span style="--width: 2; --deg: 300; --duration: 9" class="sparkle"></span>
                <span style="--width: 1; --deg: 250; --duration: 4" class="sparkle"></span>
                <span style="--width: 2; --deg: 210; --duration: 8" class="sparkle"></span>
                <span style="--width: 2; --deg: 100; --duration: 9" class="sparkle"></span>
                <span style="--width: 1; --deg: 15; --duration: 13" class="sparkle"></span>
                <span style="--width: 1; --deg: 75; --duration: 18" class="sparkle"></span>
                <span style="--width: 2; --deg: 65; --duration: 6" class="sparkle"></span>
                <span style="--width: 2; --deg: 50; --duration: 7" class="sparkle"></span>
                <span style="--width: 1; --deg: 320; --duration: 5" class="sparkle"></span>
                <span style="--width: 1; --deg: 220; --duration: 5" class="sparkle"></span>
                <span style="--width: 1; --deg: 215; --duration: 2" class="sparkle"></span>
                <span style="--width: 2; --deg: 135; --duration: 9" class="sparkle"></span>
                <span style="--width: 2; --deg: 45; --duration: 4" class="sparkle"></span>
                <span style="--width: 1; --deg: 78; --duration: 16" class="sparkle"></span>
                <span style="--width: 1; --deg: 89; --duration: 19" class="sparkle"></span>
                <span style="--width: 2; --deg: 65; --duration: 14" class="sparkle"></span>
                <span style="--width: 2; --deg: 97; --duration: 1" class="sparkle"></span>
                <span style="--width: 1; --deg: 174; --duration: 10" class="sparkle"></span>
                <span style="--width: 1; --deg: 236; --duration: 5" class="sparkle"></span>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 30 30" class="icon">
                  <path d="M0.96233 28.61C1.36043 29.0081 1.96007 29.1255 2.47555 28.8971L10.4256 25.3552C13.2236 24.11 16.4254 24.1425 19.2107 25.4401L27.4152 29.2747C27.476 29.3044 27.5418 29.3023 27.6047 29.32C27.6563 29.3348 27.7079 29.3497 27.761 29.3574C27.843 29.3687 27.9194 29.3758 28 29.3688C28.1273 29.3617 28.2531 29.3405 28.3726 29.2945C28.4447 29.262 28.5162 29.2287 28.5749 29.1842C28.6399 29.1446 28.6993 29.0994 28.7509 29.0477L28.9008 28.8582C28.9468 28.7995 28.9793 28.7274 29.0112 28.656C29.0599 28.5322 29.0811 28.4036 29.0882 28.2734C29.0939 28.1957 29.0868 28.1207 29.0769 28.0415C29.0705 27.9955 29.0585 27.9524 29.0472 27.9072C29.0295 27.8343 29.0302 27.7601 28.9984 27.6901L25.1638 19.4855C23.8592 16.7073 23.8273 13.5048 25.0726 10.7068L28.6145 2.75679C28.8429 2.24131 28.7318 1.63531 28.3337 1.2372C27.9165 0.820011 27.271 0.721743 26.7491 0.9961L19.8357 4.59596C16.8418 6.15442 13.2879 6.18696 10.2615 4.70062L1.80308 0.520214C1.7055 0.474959 1.60722 0.441742 1.50964 0.421943C1.44459 0.409215 1.37882 0.395769 1.3074 0.402133C1.14406 0.395769 0.981436 0.428275 0.818095 0.499692C0.77284 0.519491 0.719805 0.545671 0.67455 0.578198C0.596061 0.617088 0.524653 0.675786 0.4596 0.74084C0.394546 0.805894 0.335843 0.877306 0.296245 0.956502C0.263718 1.00176 0.237561 1.05477 0.217762 1.10003C0.152708 1.24286 0.126545 1.40058 0.120181 1.54978C0.120181 1.61483 0.126527 1.6735 0.132891 1.73219C0.15269 1.85664 0.178881 1.97332 0.237571 2.08434L4.41798 10.5427C5.91139 13.5621 5.8725 17.1238 4.3204 20.1099L0.720514 27.0233C0.440499 27.5536 0.545137 28.1928 0.96233 28.61Z"></path>
                </svg>
              </div>
            </label>
          </div>
        </div>
      </div>
    </div>
  </header>

  <!-- SEGMENTED TASKBAR DOCK (Uiverse.io Yaya12085/rude-mouse-79) -->
  <div class="taskbar-container">
    <div class="radio-inputs">
      <label class="radio">
        <input type="radio" name="taskbar-tab" value="tab-iphone" checked>
        <span class="name">
          <span class="icon">📱</span>
          <span>iPhone</span>
          <span class="tab-badge badge-live">Live</span>
        </span>
      </label>

      <label class="radio">
        <input type="radio" name="taskbar-tab" value="tab-voice-studio">
        <span class="name">
          <span class="icon">🎙️</span>
          <span>Vozes</span>
        </span>
      </label>

      <label class="radio">
        <input type="radio" name="taskbar-tab" value="tab-girlfriend">
        <span class="name">
          <span class="icon">❤️</span>
          <span>Isa 🫣</span>
          <span class="tab-badge badge-vip">VIP</span>
        </span>
      </label>

      <label class="radio">
        <input type="radio" name="taskbar-tab" value="tab-business">
        <span class="name">
          <span class="icon">💼</span>
          <span>Negócios</span>
        </span>
      </label>

      <label class="radio">
        <input type="radio" name="taskbar-tab" value="tab-qr">
        <span class="name">
          <span class="icon">⚙️</span>
          <span>Conexão</span>
          <span class="tab-badge badge-live" id="tab-conn-badge">Online</span>
        </span>
      </label>
    </div>
  </div>

  <!-- Main Container -->
  <main class="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 z-10 relative">

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
            
            <!-- Search Bar (Uiverse.io LightAndy1/tidy-pig-67) -->
            <div class="w-full py-1">
              <div class="tidy-pig-group">
                <svg viewBox="0 0 24 24" aria-hidden="true" class="tidy-pig-search-icon">
                  <g>
                    <path
                      d="M21.53 20.47l-3.66-3.66C19.195 15.24 20 13.214 20 11c0-4.97-4.03-9-9-9s-9 4.03-9 9 4.03 9 9 9c2.215 0 4.24-.804 5.808-2.13l3.66 3.66c.147.146.34.22.53.22s.385-.073.53-.22c.295-.293.295-.767.002-1.06zM3.5 11c0-4.135 3.365-7.5 7.5-7.5s7.5 3.365 7.5 7.5-3.365 7.5-7.5 7.5-7.5-3.365-7.5-7.5z"
                    ></path>
                  </g>
                </svg>
                <input
                  type="search"
                  id="iphone-search"
                  placeholder="Pesquisar..."
                  class="tidy-pig-input"
                  autocomplete="off"
                  name="searchbar"
                />
              </div>
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

          <!-- Barra divisória de Seção de Contatos -->
          <div class="px-4 py-1.5 bg-white/[0.04] border-t border-b border-white/15 text-[10px] uppercase font-bold tracking-widest text-neutral-400 flex items-center justify-between">
            <span class="text-shine">Contatos & Conversas</span>
            <span class="text-white/40 font-mono text-[9px]">WhatsApp</span>
          </div>

          <!-- iPhone Contacts List com barras divisórias elegantes -->
          <div id="iphone-conversations-list" class="flex-1 overflow-y-auto divide-y divide-white/15 border-b border-white/15">
            <!-- Renderizado via JS -->
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
                  <!-- Barra vertical divisória elegante para separar o nome da pessoa do botão/switch no header -->
                  <span class="w-[1.5px] h-4 bg-white/25 shrink-0 mx-0.5 rounded-full" title="Separador"></span>
                  <!-- Switch Individual TimTrayler (quiet-swan-35) no Header do Chat -->
                  <label class="quiet-swan-switch contact-ai-switch" id="active-chat-ai-wrap" title="IA Ativa para esta pessoa. Clique para alternar.">
                    <input type="checkbox" id="btn-active-chat-ai-toggle" class="contact-ai-checkbox" checked />
                    <span class="quiet-swan-slider contact-ai-slider"></span>
                  </label>
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
              <input type="text" id="chat-text-input" placeholder="Digite uma mensagem para enviar no WhatsApp..." class="flex-1 bg-neutral-900 border border-white/10 rounded-full px-4 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-white">

              <button id="btn-chat-send-text" title="Enviar mensagem manual no WhatsApp (Enter)" class="w-9 h-9 rounded-full bg-white hover:bg-neutral-200 flex items-center justify-center text-black font-extrabold text-sm transition-all active:scale-95 shadow-[0_0_15px_rgba(255,255,255,0.25)]">
                ➤
              </button>

              <button id="btn-chat-send-voice" title="Enviar áudio com voz de personagem no WhatsApp" class="w-9 h-9 rounded-full bg-neutral-800 hover:bg-neutral-700 border border-white/20 flex items-center justify-center text-white font-extrabold text-sm transition-all active:scale-95 shadow-lg">
                🎙️
              </button>
            </div>
            <div class="flex items-center justify-between px-2 pt-1.5">
              <span class="text-[10px] text-neutral-500 font-medium">Pressione Enter ou clique em ➤ para enviar ao vivo</span>
              <span id="chat-send-status" class="text-[11px] text-neutral-400 font-semibold"></span>
            </div>
          </div>

        </div>

      </div>
    </div>

    <!-- ==================== TAB 2: ESTÚDIO DE VOZES (Silvio Santos, Bob Esponja) ==================== -->
    <div id="tab-voice-studio" class="tab-pane hidden space-y-6">
      <div class="bw-card p-8 max-w-4xl mx-auto space-y-6">
        
        <div class="flex items-center gap-4 border-b border-white/10 pb-6">
          <div class="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-2xl text-white shadow-[0_0_15px_rgba(255,255,255,0.15)]">
            🎙️
          </div>
          <div>
            <h2 class="text-lg font-black text-white text-shine">Estúdio de Vozes (Silvio Santos, Bob Esponja)</h2>
            <p class="text-xs text-neutral-400">Vozes famosas estilo LivePix/TikTok: Silvio Santos, Bob Esponja, Íthalo Real, Alvin e Narrador — Áudio Ogg Opus 100% nativo para iPhone</p>
          </div>
        </div>

        <!-- Voice Cards Catalog -->
        <div>
          <label class="text-xs font-bold text-white block mb-2.5">Escolha o Personagem / Estilo de Voz:</label>
          <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3" id="voice-catalog-grid">
            <!-- Renderizado via JS -->
          </div>
        </div>

        <!-- Custom Audio Input -->
        <div class="space-y-4 pt-4 border-t border-white/10">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="text-xs font-bold text-white block mb-1">Destinatário (WhatsApp):</label>
              <input type="text" id="studio-target-input" value="191813272993834" placeholder="Ex: 191813272993834 ou 5581..." class="w-full bg-neutral-900 border border-white/15 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-white">
            </div>
            <div>
              <label class="text-xs font-bold text-white block mb-1">Frases Prontas Rápidas:</label>
              <select id="studio-presets-select" class="w-full bg-neutral-900 border border-white/15 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-white">
                <option value="">Selecione uma frase pronta...</option>
                <option value="Oi amor, claro que eu te amo! Tô aqui na correria trabalhando mas logo logo tô com você!">Carinho Namorada (Isa 🫣)</option>
                <option value="Ma-ma-oe! Quem quer dinheiro? O IPTV completo tá vinte reais por mês, roda liso!">Silvio Santos Vendas IPTV</option>
                <option value="Eu tô pronto, eu tô pronto! Olá amigo, vim aqui mandar esse áudio pra você!">Bob Esponja Saudação</option>
                <option value="Olha o gol, olha o gol! Fechado nos vinte reais, quer a chave Pix na hora?">Narrador Épico</option>
                <option value="Oi oi oi! Passando aqui rapidinho pra te mandar esse áudio engraçado!">Alvin Esquilo</option>
              </select>
            </div>
          </div>

          <div>
            <label class="text-xs font-bold text-white block mb-1">Texto que a IA vai falar no áudio:</label>
            <textarea id="studio-text-input" rows="3" placeholder="Digite o que a voz selecionada deve falar..." class="w-full bg-neutral-900 border border-white/15 rounded-xl p-3.5 text-xs text-white focus:outline-none focus:border-white resize-none"></textarea>
          </div>

          <!-- Preview Player Box -->
          <div id="studio-player-box" class="hidden bg-neutral-900/80 border border-white/15 rounded-2xl p-4 flex items-center gap-4">
            <span class="text-lg">🔊</span>
            <audio id="studio-preview-audio" controls class="w-full"></audio>
          </div>

          <div class="flex items-center justify-between pt-2">
            <span id="studio-status" class="text-xs font-semibold text-neutral-400"></span>
            <div class="flex items-center gap-3">
              <button id="btn-studio-preview" class="btn-mono-ghost text-xs px-5 py-2.5 rounded-xl font-bold transition-all">
                🎧 Ouvir Prévia
              </button>
              <button id="btn-studio-send-whatsapp" class="btn-mono-primary text-xs px-6 py-2.5 rounded-xl font-black transition-all shadow-[0_0_20px_rgba(255,255,255,0.25)] active:scale-95">
                🚀 Enviar Áudio no WhatsApp
              </button>
            </div>
          </div>
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

    // Navegação de Abas Segmentada (Uiverse Yaya12085/rude-mouse-79)
    function switchTab(tabId) {
      document.querySelectorAll(".tab-pane").forEach(p => p.classList.add("hidden"));
      const pane = document.getElementById(tabId);
      if (pane) pane.classList.remove("hidden");

      const radio = document.querySelector('input[name="taskbar-tab"][value="' + tabId + '"]');
      if (radio && !radio.checked) radio.checked = true;
    }

    document.querySelectorAll('input[name="taskbar-tab"]').forEach(r => {
      r.addEventListener("change", (e) => {
        switchTab(e.target.value);
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
      const tabConnBadge = document.getElementById("tab-conn-badge");
      if (status === "CONNECTED") {
        connDot.className = "w-2.5 h-2.5 rounded-full bg-white shadow-[0_0_10px_#ffffff]";
        connText.innerText = "WhatsApp Conectado";
        connText.className = "text-white font-bold";
        qrConnectedBox.classList.remove("hidden");
        qrWaitingBox.classList.add("hidden");
        qrPhone.innerText = user ? (user.id || user.name) : "558183662905";
        if (tabConnBadge) {
          tabConnBadge.innerText = "Online";
          tabConnBadge.className = "tab-badge badge-live";
        }
      } else if (status === "WAITING_QR" && qrUrl) {
        connDot.className = "w-2.5 h-2.5 rounded-full bg-white animate-ping";
        connText.innerText = "Escaneie o QR";
        connText.className = "text-neutral-400";
        qrConnectedBox.classList.add("hidden");
        qrWaitingBox.classList.remove("hidden");
        qrImg.src = qrUrl;
        if (tabConnBadge) {
          tabConnBadge.innerText = "QR Code";
          tabConnBadge.className = "tab-badge badge-price";
        }
      }
    }

    function updateConfig(cfg) {
      const isEnabled = Boolean(cfg.enabled);
      if (botStatusText) {
        botStatusText.innerText = isEnabled ? "ROBÔ ATIVO" : "ROBÔ PAUSADO";
        botStatusText.className = isEnabled 
          ? "text-xs font-black text-cyan-300 text-shine tracking-wider hidden sm:inline select-none" 
          : "text-xs font-black text-neutral-500 text-shine tracking-wider hidden sm:inline select-none";
      }

      const iaSwitch = document.getElementById("ia-toggle-switch");
      if (iaSwitch) {
        iaSwitch.checked = isEnabled;
      }

      gfName.value = cfg.girlfriendName || "";
      gfPrompt.value = cfg.girlfriendPrompt || "";
      bizProduct.value = cfg.business?.product || "";
      bizPrice.value = cfg.business?.price || "";
      bizPix.value = cfg.business?.pixKey || "";
      bizDesc.value = cfg.business?.description || "";
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

      // Filtro da Barra de Pesquisa (Uiverse tame-sloth-39)
      const searchEl = document.getElementById("iphone-search");
      const query = searchEl ? searchEl.value.trim().toLowerCase() : "";
      if (query) {
        displayList = displayList.filter(c => {
          const name = (c.name || "").toLowerCase();
          const phone = (c.phone || "").toLowerCase();
          const lastMsg = (c.lastMessage || "").toLowerCase();
          return name.includes(query) || phone.includes(query) || lastMsg.includes(query);
        });
      }

      displayList.forEach(c => {
        const item = document.createElement("div");
        const isSelected = c.jid === selectedContactJid;
        item.className = "px-4 py-3.5 flex items-center gap-3.5 cursor-pointer transition-all border-b border-white/15 relative " + (isSelected ? "bg-white/10 border-l-2 border-l-white" : "hover:bg-white/5");

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
              <div class="flex items-center gap-2 min-w-0">
                <h4 class="text-sm font-semibold text-white truncate text-shine">\${displayName}</h4>
                <!-- Barra vertical divisória elegante para separar o nome da pessoa do botão/switch de IA -->
                <span class="w-[1.5px] h-3.5 bg-white/25 shrink-0 mx-0.5 rounded-full" title="Separador"></span>
                <!-- Switch individual TimTrayler (quiet-swan-35) ao lado do nome -->
                <label class="quiet-swan-switch contact-ai-switch" title="\${isAiActive ? 'IA Ativa para este contato. Clique para desligar' : 'IA Desativada para este contato. Clique para ligar'}">
                  <input type="checkbox" class="contact-ai-checkbox" data-jid="\${c.jid}" \${isAiActive ? 'checked' : ''} />
                  <span class="quiet-swan-slider contact-ai-slider"></span>
                </label>
              </div>
              \${!c.badgeType && !c.isGF && !c.unread ? rightBadgeHTML : ''}
            </div>
            <div class="flex items-center justify-between text-xs text-neutral-400">
              <div class="min-w-0 flex-1 mr-2">\${snippetHTML}</div>
              \${c.badgeType || c.isGF || c.unread ? rightBadgeHTML : ''}
            </div>
          </div>
        \`;

        const switchWrap = item.querySelector(".contact-ai-switch");
        const switchInput = item.querySelector(".contact-ai-checkbox");
        if (switchWrap) {
          switchWrap.addEventListener("click", (e) => {
            e.stopPropagation();
          });
        }
        if (switchInput) {
          switchInput.addEventListener("change", (e) => {
            e.stopPropagation();
            toggleContactAI(c.jid, displayName);
          });
        }

        item.addEventListener("click", () => {
          selectedContactJid = c.jid;
          if (studioTargetInput) {
            studioTargetInput.value = c.jid.split("@")[0].split(":")[0];
          }
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
      const activeChatAiWrap = document.getElementById("active-chat-ai-wrap");
      if (activeChatAiToggle) {
        activeChatAiToggle.checked = isAiActive;
        if (activeChatAiWrap) {
          activeChatAiWrap.title = isAiActive ? "IA Ativa para " + (contact.name || "esta pessoa") + ". Clique para desligar." : "IA Desativada para " + (contact.name || "esta pessoa") + ". Clique para ligar.";
          activeChatAiWrap.onclick = (e) => e.stopPropagation();
        }
        activeChatAiToggle.onchange = (e) => {
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
              <p>oi amor, tudo certo?</p>
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

        if (msg.type === "sticker") {
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

    // Envio Manual de Mensagem pelo Chat Aberto do iPhone
    btnChatSendText.addEventListener("click", async () => {
      const text = chatTextInput.value.trim();
      if (!text) return;

      const targetJid = selectedContactJid || (currentContacts[0] && currentContacts[0].jid);
      if (!targetJid) {
        chatSendStatus.innerText = "❌ Selecione um contato";
        setTimeout(() => chatSendStatus.innerText = "", 2500);
        return;
      }

      chatSendStatus.innerText = "Enviando no WhatsApp...";
      btnChatSendText.disabled = true;

      // Atualização Otimista Imediata no Chat Aberto
      let contact = currentContacts.find(c => c.jid === targetJid);
      if (contact) {
        if (!contact.history) contact.history = [];
        contact.history.push({
          role: "model",
          text: text,
          timestamp: Date.now(),
          type: "text"
        });
        contact.lastMessage = text;
        contact.lastTime = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
        renderActiveChatThread();
        renderiPhoneConversations();
      }

      chatTextInput.value = "";
      chatTextInput.focus();

      try {
        const res = await fetch("/api/send-text-whatsapp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ target: targetJid, text })
        });
        const data = await res.json();
        if (data.success) {
          chatSendStatus.innerText = "✅ Mensagem enviada!";
          setTimeout(() => chatSendStatus.innerText = "", 2500);
        } else {
          chatSendStatus.innerText = "❌ Erro: " + (data.error || "Falha no envio");
          setTimeout(() => chatSendStatus.innerText = "", 3500);
        }
      } catch (e) {
        chatSendStatus.innerText = "❌ Falha de conexão";
        setTimeout(() => chatSendStatus.innerText = "", 3000);
      } finally {
        btnChatSendText.disabled = false;
      }
    });

    // Atalho Enter no input do chat
    chatTextInput.addEventListener("keydown", e => {
      if (e.key === "Enter") btnChatSendText.click();
    });

    // ========================================================
    // ESTÚDIO DE VOZES NATIVAS (OGG OPUS PTT) & ENVIO DE ÁUDIO
    // ========================================================
    let selectedVoiceId = "silvio_santos";
    let voicesList = [];

    const btnChatSendVoice = document.getElementById("btn-chat-send-voice");
    const voiceCatalogGrid = document.getElementById("voice-catalog-grid");
    const studioTargetInput = document.getElementById("studio-target-input");
    const studioPresetsSelect = document.getElementById("studio-presets-select");
    const studioTextInput = document.getElementById("studio-text-input");
    const studioPlayerBox = document.getElementById("studio-player-box");
    const studioPreviewAudio = document.getElementById("studio-preview-audio");
    const studioStatus = document.getElementById("studio-status");
    const btnStudioPreview = document.getElementById("btn-studio-preview");
    const btnStudioSendWhatsapp = document.getElementById("btn-studio-send-whatsapp");

    // Envio de Áudio pelo Chat do iPhone (usando a voz selecionada no Estúdio)
    if (btnChatSendVoice) {
      btnChatSendVoice.addEventListener("click", async () => {
        let text = chatTextInput.value.trim();
        if (!text) {
          text = prompt("🎙️ Digite o texto que você quer enviar em ÁUDIO no WhatsApp (Voz: " + selectedVoiceId + "):");
          if (!text) return;
        }

        const voice = selectedVoiceId || "silvio_santos";
        chatSendStatus.innerText = "🎙️ Sintetizando áudio (" + voice + ")...";

        try {
          const res = await fetch("/api/send-audio-whatsapp", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ target: selectedContactJid, text, voice })
          });
          const data = await res.json();
          if (data.success) {
            chatTextInput.value = "";
            chatSendStatus.innerText = "✅ Áudio Ogg Opus enviado no WhatsApp!";
            setTimeout(() => chatSendStatus.innerText = "", 2500);
          } else {
            chatSendStatus.innerText = "❌ Erro ao enviar: " + (data.error || "Falha");
          }
        } catch (e) {
          chatSendStatus.innerText = "❌ Erro ao conectar ao servidor";
        }
      });
    }

    // Carrega Catálogo de Vozes
    async function loadVoices() {
      if (!voiceCatalogGrid) return;
      try {
        const res = await fetch("/api/voices");
        const data = await res.json();
        if (data.success && Array.isArray(data.voices)) {
          voicesList = data.voices;
          renderVoiceCatalog();
        }
      } catch (e) {}
    }

    function renderVoiceCatalog() {
      if (!voiceCatalogGrid) return;
      voiceCatalogGrid.innerHTML = "";

      voicesList.forEach(v => {
        const isSelected = v.id === selectedVoiceId;
        const card = document.createElement("div");
        card.className = "bg-neutral-900/90 border p-3.5 rounded-2xl cursor-pointer transition-all select-none hover:border-white " + 
          (isSelected ? "border-[#25D366] bg-[#25D366]/10 shadow-[0_0_15px_rgba(37,211,102,0.25)]" : "border-white/10 hover:bg-white/5");

        card.innerHTML = \`
          <div class="flex items-center justify-between mb-1">
            <span class="text-xs font-black \${isSelected ? 'text-[#25D366]' : 'text-white'}">\${v.name}</span>
            <span class="text-[10px] \${isSelected ? 'text-[#25D366] border-[#25D366]/40' : 'text-neutral-400 border-white/20'} font-mono font-bold bg-white/5 border px-1.5 py-0.5 rounded">OGG OPUS</span>
          </div>
          <p class="text-[11px] text-neutral-400 line-clamp-2">\${v.description}</p>
        \`;

        card.addEventListener("click", () => {
          selectedVoiceId = v.id;
          renderVoiceCatalog();
          if (btnChatSendVoice) {
            btnChatSendVoice.title = "Enviar áudio com a voz: " + v.name;
          }
        });

        voiceCatalogGrid.appendChild(card);
      });
    }

    if (studioPresetsSelect) {
      studioPresetsSelect.addEventListener("change", () => {
        if (studioPresetsSelect.value && studioTextInput) {
          studioTextInput.value = studioPresetsSelect.value;
        }
      });
    }

    if (btnStudioPreview) {
      btnStudioPreview.addEventListener("click", async () => {
        const text = studioTextInput.value.trim();
        if (!text) return alert("Digite o texto do áudio primeiro!");

        studioStatus.innerText = "⏳ Sintetizando áudio com voz " + selectedVoiceId + "...";
        studioStatus.className = "text-xs font-semibold text-yellow-400";

        try {
          const res = await fetch("/api/generate-audio", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text, voice: selectedVoiceId })
          });
          const data = await res.json();
          if (data.success && data.audioUrl) {
            studioPreviewAudio.src = data.audioUrl;
            studioPlayerBox.classList.remove("hidden");
            studioPreviewAudio.play();
            studioStatus.innerText = "✅ Áudio pronto! Reproduzindo prévia.";
            studioStatus.className = "text-xs font-semibold text-[#25D366]";
          } else {
            studioStatus.innerText = "❌ Falha ao sintetizar: " + (data.error || "Erro");
            studioStatus.className = "text-xs font-semibold text-red-400";
          }
        } catch (e) {
          studioStatus.innerText = "❌ Erro ao sintetizar áudio";
          studioStatus.className = "text-xs font-semibold text-red-400";
        }
      });
    }

    if (btnStudioSendWhatsapp) {
      btnStudioSendWhatsapp.addEventListener("click", async () => {
        const target = (studioTargetInput && studioTargetInput.value.trim()) || selectedContactJid;
        const text = studioTextInput.value.trim();
        if (!target || !text) return alert("Preencha o contato de destino e o texto do áudio!");

        studioStatus.innerText = "🚀 Enviando áudio nativo Ogg Opus para " + target + "...";
        studioStatus.className = "text-xs font-semibold text-cyan-400";

        try {
          const res = await fetch("/api/send-audio-whatsapp", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ target, text, voice: selectedVoiceId })
          });
          const data = await res.json();
          if (data.success) {
            studioStatus.innerText = "✅ Áudio Ogg Opus enviado no WhatsApp com sucesso!";
            studioStatus.className = "text-xs font-semibold text-[#25D366]";
          } else {
            studioStatus.innerText = "❌ Erro ao enviar: " + (data.error || "Falha");
            studioStatus.className = "text-xs font-semibold text-red-400";
          }
        } catch (e) {
          studioStatus.innerText = "❌ Erro de conexão com o WhatsApp";
          studioStatus.className = "text-xs font-semibold text-red-400";
        }
      });
    }

    loadVoices();

    // Filtro instantâneo na Pesquisa de Conversas (Praashoo7/tame-sloth-39)
    const iphoneSearchInput = document.getElementById("iphone-search");
    if (iphoneSearchInput) {
      iphoneSearchInput.addEventListener("input", () => {
        renderiPhoneConversations();
      });
    }

    if (btnToggleBot) {
      btnToggleBot.addEventListener("click", async () => {
        try {
          const res = await fetch("/api/toggle", { method: "POST" });
          const data = await res.json();
          if (data && data.success) updateConfig(data.config);
        } catch (e) {
          console.error("Erro ao alternar IA:", e);
        }
      });
    }

    const iaToggleSwitch = document.getElementById("ia-toggle-switch");
    if (iaToggleSwitch) {
      iaToggleSwitch.addEventListener("change", async () => {
        try {
          const res = await fetch("/api/toggle", { method: "POST" });
          const data = await res.json();
          if (data && data.success) updateConfig(data.config);
        } catch (e) {
          console.error("Erro ao alternar IA via switch:", e);
        }
      });
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
