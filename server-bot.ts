/**
 * WhatsGemini Pro 1000000% - Ultimate WhatsApp Bot & AI Voice / Sticker Studio
 * 
 * Funcionalidades Master:
 * - ÁUDIO 100% COMPATÍVEL COM IPHONE E ANDROID: Conversão automática para Ogg Opus (audio/ogg; codecs=opus)
 * - VOZES PERSONALIZADAS: Silvio Santos, Bob Esponja, Íthalo Real, Narrador de Cinema, Alvin/Esquilo, Robô
 * - VISUALIZADOR IPHONE WHATSAPP NATIVO: Interface idêntica ao WhatsApp Dark Mode do iOS (iPhone)
 * - Reconhecimento de Pessoas e Histórico Isolado (Namorada VIP Isa 🫣, Clientes IPTV, Amigos)
 * - Detecção Automática de Quem Não Sabe Ler -> Responde em Áudio PTT na hora
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
  defaultVoice: string;
  business: {
    product: string;
    price: string;
    testAvailable: boolean;
    pixKey: string;
    description: string;
  };
  customExamples: string;
  autoAudioReply: boolean;
  autoAudioIfCantRead: boolean;
  autoStickers: boolean;
  ignoreGroups: boolean;
  blacklist: string[];
}

let botConfig: BotConfig = {
  enabled: true,
  userName: "Íthalo",
  girlfriendName: "Heloisa Guimarães",
  girlfriendPrompt: "A Heloisa Guimarães (Isa 🫣) é minha namorada. Ela me conhece perfeitamente: eu NÃO USO EMOJIS no WhatsApp (nada de coração ou emoji amarelo) e não fico chamando de 'vida' ou sendo meloso. Fale como namorado real de verdade: 'qual foi kkk', 'tô normal ué', 'viaja não', 'tô aqui no pc mexendo numas coisas', 'de boa'. Curto e direto.",
  defaultVoice: "ithalo",
  business: {
    product: "IPTV Completo",
    price: "R$ 20 por mês",
    testAvailable: true,
    pixKey: "Envio na hora que confirmar",
    description: "Todos os canais liberados (futebol, filmes, séries), qualidade 4K/Full HD, sem travamentos. R$ 20 mensais."
  },
  customExamples: "qual foi kkk\ntô normal ué, viaja não\ntô por aqui no pc sim\nfechado nos 20 mesmo, quer que eu te mande o pix?\nah é, às vezes viajo kkkk",
  autoAudioReply: true,
  autoAudioIfCantRead: true,
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

export type ContactCategory = "girlfriend" | "client" | "friend" | "audio_only" | "blacklisted" | "unknown";

export interface ContactProfile {
  jid: string;
  phone: string;
  name: string;
  category: ContactCategory;
  prefersAudio: boolean;
  cantRead: boolean;
  preferredVoice?: string;
  customNotes?: string;
  lastSeen: number;
  lastMessage?: string;
  lastTime?: string;
  unreadCount?: number;
  history: Array<{ role: "user" | "model"; text: string; timestamp: number; type?: "text" | "audio" | "sticker" }>;
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
    prefersAudio: true,
    cantRead: false,
    preferredVoice: "ithalo",
    customNotes: "Namorada VIP do Íthalo (Heloisa / Isa 🫣). ZERO emojis, fala direta e descontraída de namorado real.",
    lastSeen: Date.now(),
    lastMessage: "mande um áudio",
    lastTime: "14:47",
    unreadCount: 0,
    history: [
      { role: "user", text: "mande um áudio", timestamp: Date.now() - 300000, type: "text" }
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
  audiosGenerated: 0,
  stickersSent: 0,
  groupsIgnored: 0,
  blockedIgnored: 0,
  cantReadDetected: 0
};

export interface ActivityLog {
  id: number;
  timestamp: string;
  contact: string;
  phone: string;
  category: ContactCategory;
  incoming: string;
  reply: string;
  type: "text" | "audio" | "sticker";
  mediaUrl?: string;
  voiceUsed?: string;
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
 * Detecção precisa de pessoas que não sabem ler ou pedem áudio
 */
function checkIlliteracyOrAudioRequest(text: string): { isIlliterate: boolean; wantsAudio: boolean } {
  const lower = text.toLowerCase();
  
  const isIlliterate = (
    lower.includes("não sei ler") ||
    lower.includes("nao sei ler") ||
    lower.includes("não sei escrever") ||
    lower.includes("nao sei escrever") ||
    lower.includes("não enxergo") ||
    lower.includes("nao enxergo") ||
    lower.includes("não consigo ler") ||
    lower.includes("nao consigo ler") ||
    lower.includes("lê pra mim") ||
    lower.includes("le pra mim") ||
    lower.includes("sou cego") ||
    lower.includes("nao sei ler direito") ||
    lower.includes("não sei ler direito") ||
    lower.includes("tenho dificuldade pra ler") ||
    lower.includes("tenho dificuldade para ler")
  );

  const wantsAudio = isIlliterate || (
    lower.includes("manda áudio") ||
    lower.includes("manda audio") ||
    lower.includes("mande um áudio") ||
    lower.includes("mande um audio") ||
    lower.includes("manda um áudio") ||
    lower.includes("manda um audio") ||
    lower.includes("fala por áudio") ||
    lower.includes("fala por audio") ||
    lower.includes("grava um áudio") ||
    lower.includes("grava audio") ||
    lower.includes("manda por voz") ||
    /(manda|envia|mande|grava)\s+(um\s+)?(audio|áudio|voz)/i.test(lower) ||
    /(áudio|audio)\s+falando/i.test(lower)
  );

  return { isIlliterate, wantsAudio };
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
          prefersAudio: isGF,
          cantRead: false,
          preferredVoice: isGF ? "bob_esponja" : botConfig.defaultVoice,
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

      console.log(`[WhatsGemini Bot] 📩 Mensagem de ${profile.name} [${profile.category}]: "${incomingText}"`);

      // Detecção de pedido de áudio / quem não sabe ler
      const audioCheck = checkIlliteracyOrAudioRequest(incomingText);
      if (audioCheck.isIlliterate && botConfig.autoAudioIfCantRead) {
        profile.cantRead = true;
        profile.prefersAudio = true;
        profile.category = "audio_only";
        stats.cantReadDetected++;
        console.log(`[WhatsGemini Bot] 🎙️ DETECTADO: ${profile.name} NÃO SABE LER! Modo Áudio PTT Ativado.`);
      } else if (audioCheck.wantsAudio && botConfig.autoAudioReply) {
        profile.prefersAudio = true;
      }

      saveContacts();
      broadcastSSE("contact_update", profile);

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

        // 2. DISPARO AUTOMÁTICO DE ÁUDIO OGG OPUS (SE PEDIU ÁUDIO OU NÃO SABE LER)
        const shouldSendAudio = (profile.cantRead || profile.prefersAudio || audioCheck.wantsAudio) && botConfig.autoAudioReply;

        if (shouldSendAudio) {
          const voiceId = profile.preferredVoice || botConfig.defaultVoice || "bob_esponja";
          console.log(`[WhatsGemini Bot] 🎙️ PEDIDO DE ÁUDIO DETECTADO! Sintetizando voz (${voiceId}) para ${profile.name}...`);

          let replyText = await generateSmartGeminiReply(profile, incomingText, true);
          if (!replyText) {
            replyText = profile.category === "girlfriend"
              ? "tô aqui no pc mexendo numas coisas, mandei esse áudio pra você ouvir!"
              : "Opa, tô mandando esse áudio aqui pra te responder!";
          }

          const opusBuffer = await generateFullSpeechOpus(replyText, voiceId);
          const duration = (Date.now() - t0) / 1000;

          if (opusBuffer && sock) {
            // ENVIADO COMO OGG OPUS NATIVO PARA WHATSAPP
            await sock.sendMessage(rawJid, {
              audio: opusBuffer,
              mimetype: "audio/ogg; codecs=opus",
              ptt: true
            });

            stats.repliedCount++;
            stats.audiosGenerated++;

            profile.history.push({ role: "user", text: incomingText, timestamp: Date.now(), type: "text" });
            profile.history.push({ role: "model", text: `🎙️ ${replyText}`, timestamp: Date.now(), type: "audio" });
            profile.lastMessage = "🎤 Mensagem de voz";
            profile.lastTime = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
            saveContacts();

            const logItem: ActivityLog = {
              id: Date.now(),
              timestamp: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
              contact: profile.name,
              phone: contactNumber,
              category: profile.category,
              incoming: incomingText,
              reply: `🎙️ [Áudio Ogg Opus (${voiceId})]: "${replyText}"`,
              type: "audio",
              voiceUsed: voiceId,
              duration: Number(duration.toFixed(2))
            };
            activityLogs.unshift(logItem);
            if (activityLogs.length > 60) activityLogs.pop();

            broadcastSSE("new_reply", logItem);
            broadcastSSE("stats", stats);
            broadcastSSE("contact_update", profile);
            console.log(`[WhatsGemini Bot] ✅ Áudio Ogg Opus PTT enviado com sucesso para ${profile.name}!`);
            continue; // PULA! Não envia mensagem de texto duplicada!
          }
        }

        // 3. Resposta em Texto Normal (apenas se NÃO foi pedido áudio)
        const replyText = await generateSmartGeminiReply(profile, incomingText, false);
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

        console.log(`[WhatsGemini Bot] ✅ Resposta enviada para ${profile.name}: "${replyText}"`);

      } catch (err: any) {
        console.error(`[WhatsGemini Bot] ❌ Erro ao responder ${profile.name}:`, err?.message || err);
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
  incomingMessage: string,
  willBeSpokenAsAudio: boolean
): Promise<string> {
  let relationshipContext = "";

  if (profile.category === "girlfriend") {
    relationshipContext = `\n❤️ CONVERSANDO COM HELOISA / ISA (SUA NAMORADA):
- Ela te conhece perfeitamente. O Íthalo na vida real NÃO MANDA EMOJIS! NUNCA use emojis nem corações (nada de ❤️, 😅, etc).
- NÃO seja meloso nem chame de "vida" ou "meu amor" em toda frase.
- Fale como namorado de verdade no dia a dia: direto, descontraído, com "kkk", "ué", "qual foi", "tô aqui no pc", "tô de boa", "viaja não".
- Se ela disser que você tá estranho ou pedir áudio: responda de forma direta e natural: "ué tô aqui ué kkk", "mandei esse áudio aqui pra vc", "viaja não kkk".`;
  } else if (profile.category === "client") {
    relationshipContext = `\n💼 NEGÓCIOS & IPTV (CLIENTE INTERESSADO):
- Você vende ${botConfig.business.product} por ${botConfig.business.price}.
- Detalhes: ${botConfig.business.description}.
- Se pedirem teste: diga que libera um teste grátis na hora.
- Se confirmarem a compra: diga que vai mandar a chave Pix na hora. Seja direto e firme no valor de R$ 20.`;
  } else if (profile.cantRead || willBeSpokenAsAudio) {
    relationshipContext = `\n🎙️ PESSOA QUE NÃO SABE LER OU PEDIU ÁUDIO:
- Esta mensagem será CONVERTIDA EM ÁUDIO DE VOZ no WhatsApp!
- Fale de forma simpática, calma, simples e acolhedora, como uma conversa falada informal.`;
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
    "gemini-flash-lite-latest",
    "gemini-3.5-flash-lite",
    "gemini-3.5-flash"
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

  // FALLBACK ILIMITADO 24/7 (Zero Cota / Zero 429) VIA POLLINATIONS AI
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

  // Fallback inteligente se a API falhar
  if (!reply) {
    if (profile.category === "girlfriend") {
      reply = "mandei esse áudio aqui pra você ouvir, tá de boa? kkk";
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

    // Lista de Vozes disponíveis (Silvio Santos, Bob Esponja, etc)
    if (url.pathname === "/api/voices") {
      return Response.json({ success: true, voices: AVAILABLE_VOICES });
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
            voices: AVAILABLE_VOICES,
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

    // Toggle Liga/Desliga
    if (url.pathname === "/api/toggle" && req.method === "POST") {
      botConfig.enabled = !botConfig.enabled;
      saveConfig();
      broadcastSSE("config", botConfig);
      return Response.json({ success: true, enabled: botConfig.enabled });
    }

    // Atualização de Configurações
    if (url.pathname === "/api/update-config" && req.method === "POST") {
      const body = await req.json();
      botConfig = { ...botConfig, ...body };
      saveConfig();
      broadcastSSE("config", botConfig);
      return Response.json({ success: true, config: botConfig });
    }

    // Gerar prévia de áudio (para ouvir no navegador)
    if (url.pathname === "/api/generate-audio" && req.method === "POST") {
      const body = await req.json();
      const { text, voice = "ithalo" } = body;
      if (!text) return Response.json({ success: false, error: "Texto vazio" });

      const opusBuffer = await generateFullSpeechOpus(text, voice);
      if (opusBuffer) {
        const base64Url = `data:audio/ogg; codecs=opus;base64,${opusBuffer.toString("base64")}`;
        return Response.json({ success: true, audioUrl: base64Url });
      }
      return Response.json({ success: false, error: "Falha na geração do áudio" });
    }

    // Enviar áudio 100% nativo no WhatsApp (OGG OPUS)
    if (url.pathname === "/api/send-audio-whatsapp" && req.method === "POST") {
      const body = await req.json();
      const { target, text, voice = "ithalo" } = body;
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
        return Response.json({ success: false, error: "Falha ao sintetizar voz" });
      }

      // ENVIADO COM FORMATAÇÃO NATIVA DE NOTA DE VOZ (COMPATÍVEL 100% COM IPHONE)
      await sock.sendMessage(cleanTarget, {
        audio: opusBuffer,
        mimetype: "audio/ogg; codecs=opus",
        ptt: true
      });

      stats.repliedCount++;
      stats.audiosGenerated++;
      broadcastSSE("stats", stats);

      if (contactsMemory[cleanTarget]) {
        contactsMemory[cleanTarget].history.push({
          role: "model",
          text: `🎙️ ${text}`,
          timestamp: Date.now(),
          type: "audio"
        });
        contactsMemory[cleanTarget].lastMessage = `🎤 Mensagem de voz`;
        contactsMemory[cleanTarget].lastTime = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
        saveContacts();
        broadcastSSE("contact_update", contactsMemory[cleanTarget]);
      }

      const logItem: ActivityLog = {
        id: Date.now(),
        timestamp: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
        contact: contactsMemory[cleanTarget]?.name || cleanTarget.split("@")[0],
        phone: cleanTarget.split("@")[0],
        category: contactsMemory[cleanTarget]?.category || "unknown",
        incoming: "[Disparo Manual de Voz PTT]",
        reply: `🎙️ [Áudio Ogg Opus Enviado (${voice})]: "${text}"`,
        type: "audio",
        voiceUsed: voice,
        duration: 0.8
      };
      activityLogs.unshift(logItem);
      broadcastSSE("new_reply", logItem);

      return Response.json({ success: true });
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
console.log(`🌐 Servidor WhatsGemini Pro 1000000% rodando em: http://localhost:${PORT}`);
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
  <title>WhatsGemini Pro 1000000% - iPhone Simulator & AI Voices</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=SF+Pro+Display:wght@400;500;600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Plus Jakarta Sans', sans-serif;
      background-color: #000000;
      color: #f2f2f7;
      min-height: 100vh;
    }
    .ios-dark-bg { background-color: #000000; }
    .ios-card { background-color: #1c1c1e; border: 1px solid rgba(255, 255, 255, 0.08); }
    .ios-chat-bg {
      background-color: #0b141a;
      background-image: radial-gradient(rgba(255,255,255,0.03) 1px, transparent 0);
      background-size: 24px 24px;
    }
    .ios-tab-btn.active {
      background: #25D366;
      color: #000000;
      font-weight: 800;
      box-shadow: 0 4px 20px rgba(37, 211, 102, 0.35);
    }
    /* iPhone Chat Bubble Tails */
    .bubble-out {
      background-color: #005c4b;
      color: #e9edef;
      border-radius: 16px 16px 4px 16px;
    }
    .bubble-in {
      background-color: #202c33;
      color: #e9edef;
      border-radius: 16px 16px 16px 4px;
    }
    /* Scrollbar */
    ::-webkit-scrollbar { width: 5px; height: 5px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 999px; }
    ::-webkit-scrollbar-thumb:hover { background: #25D366; }
  </style>
</head>
<body class="flex flex-col">

  <!-- Header -->
  <header class="bg-[#121212] border-b border-white/10 px-6 py-3.5 sticky top-0 z-50">
    <div class="max-w-7xl mx-auto flex items-center justify-between">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#25D366] to-[#128C7E] flex items-center justify-center text-xl shadow-lg shadow-[#25D366]/20">
          📱
        </div>
        <div>
          <h1 class="text-base font-extrabold text-white flex items-center gap-2">
            WhatsGemini Pro <span class="text-[10px] bg-[#25D366]/20 text-[#25D366] px-2 py-0.5 rounded-full font-bold">IPHONE EDITION</span>
          </h1>
          <p class="text-[11px] text-[#8e8e93]">Vozes Silvio Santos & Bob Esponja • Áudio Ogg Opus • Visualizador iPhone Nativo</p>
        </div>
      </div>

      <div class="flex items-center gap-3">
        <div id="conn-badge" class="flex items-center gap-2 bg-[#1c1c1e] px-3 py-1.5 rounded-full border border-white/10 text-xs font-semibold">
          <span class="w-2.5 h-2.5 rounded-full bg-yellow-400 animate-ping" id="conn-dot"></span>
          <span id="conn-text" class="text-yellow-400">Verificando...</span>
        </div>
        <button id="btn-toggle-bot" class="flex items-center gap-1.5 bg-[#25D366] hover:bg-[#20ba59] text-black font-extrabold text-xs px-4 py-2 rounded-full transition-all">
          <span id="bot-status-text">ROBÔ ATIVO</span>
        </button>
      </div>
    </div>
  </header>

  <!-- Navigation Tabs -->
  <nav class="bg-[#161618] border-b border-white/5 px-6 py-2 sticky top-[65px] z-40 backdrop-blur-md">
    <div class="max-w-7xl mx-auto flex items-center gap-2 overflow-x-auto py-1">
      <button class="ios-tab-btn active px-4 py-1.5 rounded-xl text-xs font-bold text-slate-300 flex items-center gap-1.5 shrink-0" data-tab="tab-iphone">
        <span>📱</span> Visualizador iPhone (Ao Vivo)
      </button>
      <button class="ios-tab-btn px-4 py-1.5 rounded-xl text-xs font-bold text-slate-300 flex items-center gap-1.5 shrink-0" data-tab="tab-voice-studio">
        <span>🎙️</span> Estúdio de Vozes (Silvio Santos, Bob Esponja)
      </button>
      <button class="ios-tab-btn px-4 py-1.5 rounded-xl text-xs font-bold text-slate-300 flex items-center gap-1.5 shrink-0" data-tab="tab-stickers">
        <span>🎭</span> Figurinhas WebP
      </button>
      <button class="ios-tab-btn px-4 py-1.5 rounded-xl text-xs font-bold text-slate-300 flex items-center gap-1.5 shrink-0" data-tab="tab-girlfriend">
        <span>❤️</span> Isa 🫣 (Namorada VIP)
      </button>
      <button class="ios-tab-btn px-4 py-1.5 rounded-xl text-xs font-bold text-slate-300 flex items-center gap-1.5 shrink-0" data-tab="tab-business">
        <span>💼</span> Negócios & IPTV (R$ 20)
      </button>
      <button class="ios-tab-btn px-4 py-1.5 rounded-xl text-xs font-bold text-slate-300 flex items-center gap-1.5 shrink-0" data-tab="tab-qr">
        <span>⚙️</span> Conexão WhatsApp
      </button>
    </div>
  </nav>

  <!-- Main Container -->
  <main class="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6">

    <!-- ==================== TAB 1: VISUALIZADOR IPHONE WHATSAPP ==================== -->
    <div id="tab-iphone" class="tab-pane">
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[760px]">
        
        <!-- iPhone Left: Conversations List (Exatamente como na foto enviada!) -->
        <div class="lg:col-span-5 bg-[#000000] border border-white/10 rounded-[36px] overflow-hidden flex flex-col shadow-2xl">
          
          <!-- iOS Header -->
          <div class="px-5 pt-4 pb-3 border-b border-white/5 space-y-3">
            <div class="flex items-center justify-between text-xs text-[#25D366]">
              <span class="cursor-pointer font-medium hover:underline">Editar</span>
              <div class="flex items-center gap-4 text-white">
                <span class="cursor-pointer text-base">@</span>
                <span class="cursor-pointer text-xl font-light">+</span>
              </div>
            </div>
            <h1 class="text-2xl font-black text-white tracking-tight">Conversas</h1>
            
            <!-- Search Bar -->
            <div class="bg-[#1c1c1e] rounded-xl px-3 py-1.5 flex items-center gap-2 text-xs text-[#8e8e93]">
              <span>🔍</span>
              <input type="text" id="iphone-search" placeholder="Pesquisar" class="bg-transparent border-none text-white focus:outline-none w-full text-xs">
            </div>

            <!-- Arquivadas row -->
            <div class="flex items-center justify-between text-xs py-1 cursor-pointer text-slate-300 hover:text-white">
              <div class="flex items-center gap-3">
                <span class="text-sm">🗄️</span>
                <span class="font-semibold">Arquivadas</span>
              </div>
              <span class="text-[#25D366] font-bold">@</span>
            </div>
          </div>

          <!-- iPhone Contacts List -->
          <div id="iphone-conversations-list" class="flex-1 overflow-y-auto divide-y divide-white/5">
            <!-- Renderizado via JS -->
          </div>

        </div>

        <!-- iPhone Right: Active Chat Conversation -->
        <div class="lg:col-span-7 bg-[#0b141a] border border-white/10 rounded-[36px] overflow-hidden flex flex-col shadow-2xl relative">
        <div class="lg:col-span-7 bg-[#0b141a] border border-white/10 rounded-[36px] overflow-hidden flex flex-col shadow-2xl relative">
          
          <!-- Chat Top Bar -->
          <div class="bg-[#1f2c34] px-5 py-3 border-b border-white/10 flex items-center justify-between z-10">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-full bg-gradient-to-tr from-[#128C7E] to-[#25D366] flex items-center justify-center text-white text-lg font-bold">
                <span id="active-chat-avatar">👤</span>
              </div>
              <div>
                <h3 id="active-chat-name" class="text-sm font-bold text-white flex items-center gap-1.5">
                  Isa 🫣 <span class="text-[10px] bg-rose-500/20 text-rose-400 px-2 py-0.2 rounded-full font-bold">Namorada VIP</span>
                </h3>
                <p id="active-chat-status" class="text-[11px] text-[#25D366] font-medium">online • WhatsApp Multi-Device</p>
              </div>
            </div>

            <!-- Call & Video Icons -->
            <div class="flex items-center gap-4 text-[#00a884] text-lg">
              <span class="cursor-pointer">📹</span>
              <span class="cursor-pointer">📞</span>
            </div>
          </div>

          <!-- Chat Messages Scroll Area -->
          <div id="iphone-chat-messages" class="flex-1 overflow-y-auto p-5 space-y-3 ios-chat-bg">
            <!-- Messages rendered via JS -->
          </div>

          <!-- Chat Bottom Bar with Voice Selector & Sender -->
          <div class="bg-[#1f2c34] p-3 border-t border-white/10 space-y-2 z-10">
            
            <div class="flex items-center justify-between text-xs">
              <div class="flex items-center gap-2">
                <span class="text-[#8e8e93]">Voz para o Áudio:</span>
                <select id="chat-voice-select" class="bg-black/50 border border-white/10 rounded-lg px-2.5 py-1 text-xs text-[#25D366] font-bold focus:outline-none">
                  <option value="bob_esponja">Bob Esponja (Verdadeiro LivePix)</option>
                  <option value="silvio_santos">Silvio Santos (Verdadeiro LivePix)</option>
                  <option value="ithalo">Íthalo Real (Voz Natural Jovem)</option>
                  <option value="narrador_livepix">Narrador Oficial LivePix</option>
                  <option value="mulher_livepix">Voz Feminina LivePix</option>
                  <option value="alvin">Alvin / Esquilo Engraçado</option>
                </select>
              </div>
              <span id="chat-send-status" class="text-[11px] text-slate-400 font-semibold"></span>
            </div>

            <!-- Input bar -->
            <div class="flex items-center gap-2">
              <button id="btn-open-stickers-modal" title="Enviar Figurinha" class="text-xl text-[#8e8e93] hover:text-white p-1.5">
                🎭
              </button>
              
              <input type="text" id="chat-text-input" placeholder="Mensagem..." class="flex-1 bg-[#2a3942] border-none rounded-full px-4 py-2.5 text-xs text-white placeholder-[#8e8e93] focus:outline-none">

              <button id="btn-chat-send-text" class="w-9 h-9 rounded-full bg-[#00a884] hover:bg-[#008f6f] flex items-center justify-center text-black font-extrabold text-sm transition-all active:scale-95">
                ➤
              </button>
              
              <button id="btn-chat-send-voice" title="Gravar e Enviar Áudio Ogg Opus" class="w-9 h-9 rounded-full bg-cyan-500 hover:bg-cyan-600 flex items-center justify-center text-black font-extrabold text-sm transition-all active:scale-95">
                🎙️
              </button>
            </div>

          </div>

        </div>

      </div>
    </div>

    <!-- ==================== TAB 2: ESTÚDIO DE VOZES ==================== -->
    <div id="tab-voice-studio" class="tab-pane hidden space-y-6">
      <div class="ios-card rounded-3xl p-8 max-w-4xl mx-auto space-y-6">
        
        <div class="flex items-center gap-4 border-b border-white/10 pb-6">
          <div class="w-12 h-12 rounded-2xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-2xl text-cyan-400">
            🎙️
          </div>
          <div>
            <h2 class="text-lg font-black text-white">Estúdio de Vozes 100% Funcional (Ogg Opus Nativo)</h2>
            <p class="text-xs text-[#8e8e93]">Vozes famosas tipo LivePix: Silvio Santos, Bob Esponja, Alvin e Íthalo Real — todas compatíveis com iPhone</p>
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
              <input type="text" id="studio-target-input" value="191813272993834" placeholder="Ex: 191813272993834 ou 5581..." class="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-400">
            </div>
            <div>
              <label class="text-xs font-bold text-white block mb-1">Frases Prontas Rápidas:</label>
              <select id="studio-presets-select" class="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-400">
                <option value="">Selecione uma frase pronta...</option>
                <option value="Oi amor, claro que eu te amo! Tô aqui na correria trabalhando mas logo logo tô com você!">Carinho Namorada (Isa)</option>
                <option value="Ma-ma-oe! Quem quer dinheiro? O IPTV completo tá vinte reais por mês, roda liso!">Silvio Santos Vendas IPTV</option>
                <option value="Eu tô pronto, eu tô pronto! Olá amigo, vim aqui mandar esse áudio pra você!">Bob Esponja Saudação</option>
                <option value="Olha o gol, olha o gol! Fechado nos vinte reais, quer a chave Pix na hora?">Narrador Épico</option>
                <option value="Oi oi oi! Passando aqui rapidinho pra te mandar esse áudio engraçado!">Alvin Esquilo</option>
              </select>
            </div>
          </div>

          <div>
            <label class="text-xs font-bold text-white block mb-1">Texto que a IA vai falar no áudio:</label>
            <textarea id="studio-text-input" rows="3" placeholder="Digite o que a voz selecionada deve falar..." class="w-full bg-black/40 border border-white/10 rounded-xl p-3.5 text-xs text-white focus:outline-none focus:border-cyan-400 resize-none"></textarea>
          </div>

          <!-- Web Player -->
          <div id="studio-player-box" class="hidden bg-black/60 p-4 rounded-2xl flex items-center justify-between gap-4 border border-cyan-500/30">
            <audio id="studio-preview-audio" controls class="w-full h-10"></audio>
          </div>

          <div class="flex items-center justify-between pt-2">
            <span id="studio-status" class="text-xs font-semibold text-[#8e8e93]"></span>
            <div class="flex items-center gap-3">
              <button id="btn-studio-preview" class="bg-white/10 hover:bg-white/15 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-all">
                🎧 Ouvir Prévia
              </button>
              <button id="btn-studio-send-whatsapp" class="bg-gradient-to-r from-cyan-400 to-[#25D366] text-black font-extrabold text-xs px-6 py-2.5 rounded-xl transition-all shadow-lg shadow-cyan-500/25 active:scale-95">
                🚀 Enviar Áudio Ogg Opus no WhatsApp
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>

    <!-- ==================== TAB 3: FIGURINHAS WEBP ==================== -->
    <div id="tab-stickers" class="tab-pane hidden space-y-6">
      <div class="ios-card rounded-3xl p-8 max-w-4xl mx-auto space-y-6">
        <div class="flex items-center justify-between border-b border-white/10 pb-6">
          <div class="flex items-center gap-4">
            <div class="w-12 h-12 rounded-2xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-2xl text-purple-400">
              🎭
            </div>
            <div>
              <h2 class="text-lg font-black text-white">Central de Figurinhas WhatsApp</h2>
              <p class="text-xs text-[#8e8e93]">Figurinhas WebP em 512x512 nativas para iPhone e Android</p>
            </div>
          </div>

          <div class="flex items-center gap-3 bg-black/40 px-4 py-2 rounded-xl border border-white/10">
            <span class="text-xs text-slate-300 font-semibold">Figurinha Automática:</span>
            <input type="checkbox" id="toggle-stickers" class="w-4 h-4 accent-[#25D366] rounded cursor-pointer">
          </div>
        </div>

        <div class="bg-black/40 p-4 rounded-2xl flex flex-col sm:flex-row items-center gap-4">
          <div class="flex-1 w-full">
            <label class="text-xs font-bold text-white block mb-1">Contato Destino:</label>
            <input type="text" id="sticker-target" value="191813272993834" placeholder="Digite o número (ex: 191813272993834)" class="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-purple-400">
          </div>
          <span class="text-xs text-[#8e8e93]">Clique na figurinha para disparar na hora!</span>
        </div>

        <div id="stickers-grid" class="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <!-- Renderizado via JS -->
        </div>
      </div>
    </div>

    <!-- ==================== TAB 4: NAMORADA VIP ==================== -->
    <div id="tab-girlfriend" class="tab-pane hidden space-y-6">
      <div class="ios-card rounded-3xl p-8 max-w-3xl mx-auto space-y-6">
        <div class="flex items-center gap-4 border-b border-white/10 pb-6">
          <div class="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-2xl text-rose-400">
            ❤️
          </div>
          <div>
            <h2 class="text-lg font-black text-white">Namorada VIP: Isa 🫣 (Heloisa)</h2>
            <p class="text-xs text-[#8e8e93]">Zero emojis, conversa descontraída de namorado real e respostas em áudio Ogg Opus</p>
          </div>
        </div>

        <div class="space-y-4">
          <div>
            <label class="text-xs font-bold text-white block mb-1.5">Identificação da Namorada:</label>
            <input type="text" id="gf-name" class="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white font-semibold">
          </div>

          <div>
            <label class="text-xs font-bold text-white block mb-1.5">Prompt de Personalidade do Íthalo:</label>
            <textarea id="gf-prompt" rows="4" class="w-full bg-black/40 border border-white/10 rounded-xl p-3.5 text-xs text-white resize-none"></textarea>
          </div>

          <div class="flex items-center justify-between pt-2">
            <span id="gf-status" class="text-xs font-semibold text-rose-400"></span>
            <button id="btn-save-gf" class="bg-rose-500 hover:bg-rose-600 text-white font-extrabold text-xs px-6 py-2.5 rounded-xl transition-all shadow-lg shadow-rose-500/25">
              Salvar VIP
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ==================== TAB 5: NEGÓCIOS & IPTV ==================== -->
    <div id="tab-business" class="tab-pane hidden space-y-6">
      <div class="ios-card rounded-3xl p-8 max-w-3xl mx-auto space-y-6">
        <div class="flex items-center gap-4 border-b border-white/10 pb-6">
          <div class="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-2xl text-emerald-400">
            💼
          </div>
          <div>
            <h2 class="text-lg font-black text-white">Negócios & IPTV (R$ 20/mês)</h2>
            <p class="text-xs text-[#8e8e93]">A IA fecha vendas e envia o Pix na hora</p>
          </div>
        </div>

        <div class="space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="text-xs font-bold text-white block mb-1">Produto:</label>
              <input type="text" id="biz-product" class="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white">
            </div>
            <div>
              <label class="text-xs font-bold text-white block mb-1">Preço:</label>
              <input type="text" id="biz-price" class="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white">
            </div>
          </div>
          <div>
            <label class="text-xs font-bold text-white block mb-1">Chave Pix:</label>
            <input type="text" id="biz-pix" class="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white">
          </div>
          <div>
            <label class="text-xs font-bold text-white block mb-1">Descrição / Canais:</label>
            <textarea id="biz-desc" rows="3" class="w-full bg-black/40 border border-white/10 rounded-xl p-3.5 text-xs text-white resize-none"></textarea>
          </div>
          <div class="flex items-center justify-between pt-2">
            <span id="biz-status" class="text-xs font-semibold text-[#25D366]"></span>
            <button id="btn-save-biz" class="bg-[#25D366] hover:bg-[#20ba59] text-black font-extrabold text-xs px-6 py-2.5 rounded-xl transition-all">
              Salvar Catálogo
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ==================== TAB 6: CONEXÃO WHATSAPP ==================== -->
    <div id="tab-qr" class="tab-pane hidden space-y-6">
      <div class="ios-card rounded-3xl p-8 max-w-xl mx-auto text-center space-y-6">
        <h2 class="text-lg font-black text-white">Status da Conexão WhatsApp</h2>
        <div id="qr-connected-box" class="bg-[#25D366]/10 border border-[#25D366]/30 p-6 rounded-2xl space-y-3">
          <div class="w-14 h-14 bg-[#25D366]/20 rounded-full flex items-center justify-center text-2xl mx-auto text-[#25D366]">✓</div>
          <h3 class="text-base font-extrabold text-white">WhatsApp Conectado com Sucesso!</h3>
          <p class="text-xs text-slate-300">Número conectado: <strong id="qr-phone" class="text-[#25D366]">Carregando...</strong></p>
          <button id="btn-disconnect" class="bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/40 text-xs font-bold px-4 py-2 rounded-xl transition-all">
            Desconectar Aparelho
          </button>
        </div>
        <div id="qr-waiting-box" class="hidden space-y-4">
          <p class="text-xs text-[#8e8e93]">Escaneie com a câmera do seu WhatsApp:</p>
          <img id="qr-img" src="" alt="QR" class="w-64 h-64 mx-auto p-4 bg-white rounded-2xl">
        </div>
      </div>
    </div>

  </main>

  <script>
    let currentContacts = [];
    let currentVoices = [];
    let selectedContactJid = "191813272993834@s.whatsapp.net";
    let selectedVoiceId = "ithalo";

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
    const chatVoiceSelect = document.getElementById("chat-voice-select");
    const chatSendStatus = document.getElementById("chat-send-status");
    const btnChatSendText = document.getElementById("btn-chat-send-text");
    const btnChatSendVoice = document.getElementById("btn-chat-send-voice");

    const voiceCatalogGrid = document.getElementById("voice-catalog-grid");
    const studioTargetInput = document.getElementById("studio-target-input");
    const studioTextInput = document.getElementById("studio-text-input");
    const studioPresetsSelect = document.getElementById("studio-presets-select");
    const studioPlayerBox = document.getElementById("studio-player-box");
    const studioPreviewAudio = document.getElementById("studio-preview-audio");
    const studioStatus = document.getElementById("studio-status");
    const btnStudioPreview = document.getElementById("btn-studio-preview");
    const btnStudioSendWhatsapp = document.getElementById("btn-studio-send-whatsapp");

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
      if (data.voices) {
        currentVoices = data.voices;
        renderVoiceCatalog();
      }
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
        connDot.className = "w-2.5 h-2.5 rounded-full bg-[#25D366]";
        connText.innerText = "WhatsApp Conectado";
        connText.className = "text-[#25D366]";
        qrConnectedBox.classList.remove("hidden");
        qrWaitingBox.classList.add("hidden");
        qrPhone.innerText = user ? (user.id || user.name) : "558183662905";
      } else if (status === "WAITING_QR" && qrUrl) {
        connDot.className = "w-2.5 h-2.5 rounded-full bg-yellow-400 animate-ping";
        connText.innerText = "Escaneie o QR";
        connText.className = "text-yellow-400";
        qrConnectedBox.classList.add("hidden");
        qrWaitingBox.classList.remove("hidden");
        qrImg.src = qrUrl;
      }
    }

    function updateConfig(cfg) {
      botStatusText.innerText = cfg.enabled ? "ROBÔ ATIVO" : "PAUSADO";
      gfName.value = cfg.girlfriendName || "";
      gfPrompt.value = cfg.girlfriendPrompt || "";
      bizProduct.value = cfg.business?.product || "";
      bizPrice.value = cfg.business?.price || "";
      bizPix.value = cfg.business?.pixKey || "";
      bizDesc.value = cfg.business?.description || "";
      toggleStickers.checked = Boolean(cfg.autoStickers);
    }

    // Renderiza a lista de conversas do iPhone exatamente como na imagem do usuário
    function renderiPhoneConversations() {
      iphoneConversationsList.innerHTML = "";

      const contactsToDisplay = [...currentContacts];

      // Se Isa 🫣 não estiver na frente, coloca no topo
      contactsToDisplay.sort((a, b) => {
        if (a.jid.includes("191813272993834")) return -1;
        if (b.jid.includes("191813272993834")) return 1;
        return (b.lastSeen || 0) - (a.lastSeen || 0);
      });

      // DEDUPLICAÇÃO RIGOROSA: Garante que Heloisa / Isa 🫣 e qualquer contato apareça APENAS UMA VEZ
      const seenPhones = new Set();
      const uniqueContacts = [];
      for (const c of contactsToDisplay) {
        const cleanP = (c.phone || c.jid || "").split("@")[0].split(":")[0];
        if (!seenPhones.has(cleanP)) {
          seenPhones.add(cleanP);
          uniqueContacts.push(c);
        }
      }

      uniqueContacts.forEach(c => {
        const item = document.createElement("div");
        const isSelected = c.jid === selectedContactJid;
        item.className = "px-4 py-3 flex items-center gap-3 cursor-pointer transition-colors " + (isSelected ? "bg-[#1c1c1e]" : "hover:bg-white/5");

        const isGF = c.category === "girlfriend" || c.jid.includes("191813272993834");
        const displayName = isGF ? "Isa 🫣" : (c.name || c.phone);
        const displayTime = c.lastTime || "14:47";
        const isVoiceSnippet = (c.lastMessage || "").includes("áudio") || (c.lastMessage || "").includes("voz");

        let snippetContent = c.lastMessage || "mande um áudio";
        if (isVoiceSnippet) {
          snippetContent = '<span class="text-[#00a884] flex items-center gap-1"><span>🎤</span> ' + (c.lastMessage || "mande um áudio") + '</span>';
        }

        item.innerHTML = \`
          <div class="relative shrink-0">
            <div class="w-12 h-12 rounded-full \${isGF ? 'bg-gradient-to-tr from-rose-500 to-pink-600' : 'bg-gradient-to-tr from-slate-600 to-slate-800'} flex items-center justify-center text-white text-lg font-bold">
              \${isGF ? '👩🏻' : '👤'}
            </div>
            \${isGF ? '<span class="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-[#25D366] border-2 border-black"></span>' : ''}
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center justify-between mb-0.5">
              <h4 class="text-sm font-semibold text-white truncate">\${displayName}</h4>
              <span class="text-[11px] \${isGF ? 'text-[#25D366] font-semibold' : 'text-[#8e8e93]'}">\${displayTime}</span>
            </div>
            <div class="flex items-center justify-between text-xs text-[#8e8e93]">
              <p class="truncate text-xs">\${snippetContent}</p>
              \${isGF ? '<span class="ml-2 w-4 h-4 bg-[#25D366] text-black text-[10px] font-black rounded-full flex items-center justify-center">1</span>' : ''}
            </div>
          </div>
        \`;

        item.addEventListener("click", () => {
          selectedContactJid = c.jid;
          renderiPhoneConversations();
          renderActiveChatThread();
        });

        iphoneConversationsList.appendChild(item);
      });
    }

    // Renderiza a conversa ativa dentro da tela do iPhone
    function renderActiveChatThread() {
      const contact = currentContacts.find(c => c.jid === selectedContactJid) || currentContacts[0];
      if (!contact) return;

      const isGF = contact.category === "girlfriend" || contact.jid.includes("191813272993834");
      activeChatName.innerHTML = (isGF ? "Isa 🫣" : (contact.name || contact.phone)) + (isGF ? ' <span class="text-[10px] bg-rose-500/20 text-rose-400 px-2 py-0.2 rounded-full font-bold">Namorada VIP</span>' : '');
      activeChatAvatar.innerText = isGF ? "👩🏻" : "👤";

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
            <div class="\${isFromMe ? 'bubble-out' : 'bubble-in'} p-3 max-w-[85%] text-xs shadow space-y-2">
              <div class="flex items-center gap-3">
                <button class="w-8 h-8 rounded-full bg-[#00a884] text-black font-black flex items-center justify-center text-xs">
                  ▶
                </button>
                <div class="flex-1 space-y-1">
                  <div class="h-1.5 bg-white/20 rounded-full w-36 overflow-hidden">
                    <div class="h-full bg-[#25D366] w-2/3"></div>
                  </div>
                  <div class="flex justify-between text-[10px] text-slate-300">
                    <span>0:05</span>
                    <span>14:48</span>
                  </div>
                </div>
              </div>
              <p class="text-[11px] text-slate-200 italic">\${msg.text}</p>
            </div>
          \`;
        } else if (msg.type === "sticker") {
          bubble.innerHTML = \`
            <div class="max-w-[140px] p-1">
              <div class="text-xs text-slate-300 font-bold">\${msg.text}</div>
            </div>
          \`;
        } else {
          bubble.innerHTML = \`
            <div class="\${isFromMe ? 'bubble-out' : 'bubble-in'} p-3 max-w-[80%] text-xs shadow space-y-1">
              <p>\${msg.text}</p>
              <div class="text-[10px] text-right flex items-center justify-end gap-1 \${isFromMe ? 'text-[#53bdeb]' : 'text-[#8e8e93]'}">
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

    // Renderiza o catálogo de vozes no Estúdio
    function renderVoiceCatalog() {
      voiceCatalogGrid.innerHTML = "";
      currentVoices.forEach(v => {
        const card = document.createElement("div");
        const isSelected = v.id === selectedVoiceId;
        card.className = "ios-card p-3.5 rounded-2xl cursor-pointer transition-all hover:border-cyan-400 " + (isSelected ? "border-cyan-400 bg-cyan-500/10" : "");

        card.innerHTML = \`
          <div class="flex items-center justify-between mb-1">
            <span class="text-xs font-black text-white">\${v.name}</span>
            <span class="text-[10px] text-cyan-400 font-mono font-bold">OGG OPUS</span>
          </div>
          <p class="text-[11px] text-[#8e8e93] line-clamp-2">\${v.description}</p>
        \`;

        card.addEventListener("click", () => {
          selectedVoiceId = v.id;
          chatVoiceSelect.value = v.id;
          renderVoiceCatalog();
        });

        voiceCatalogGrid.appendChild(card);
      });
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

    // Preset de Frases no Estúdio
    studioPresetsSelect.addEventListener("change", () => {
      if (studioPresetsSelect.value) {
        studioTextInput.value = studioPresetsSelect.value;
      }
    });

    // Ouvir Prévia do Áudio no Navegador
    btnStudioPreview.addEventListener("click", async () => {
      const text = studioTextInput.value.trim();
      if (!text) return alert("Digite o texto do áudio primeiro!");

      studioStatus.innerText = "⏳ Sintetizando voz " + selectedVoiceId + "...";
      studioStatus.className = "text-xs font-semibold text-cyan-400";

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
        studioStatus.innerText = "❌ Falha ao sintetizar áudio";
        studioStatus.className = "text-xs font-semibold text-red-400";
      }
    });

    // Enviar Áudio Ogg Opus no WhatsApp direto pelo Estúdio
    btnStudioSendWhatsapp.addEventListener("click", async () => {
      const target = studioTargetInput.value.trim();
      const text = studioTextInput.value.trim();
      if (!target || !text) return alert("Preencha o contato e o texto do áudio!");

      studioStatus.innerText = "🚀 Enviando áudio Ogg Opus para " + target + "...";
      studioStatus.className = "text-xs font-semibold text-yellow-400";

      const res = await fetch("/api/send-audio-whatsapp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target, text, voice: selectedVoiceId })
      });
      const data = await res.json();
      if (data.success) {
        studioStatus.innerText = "✅ Áudio Ogg Opus enviado com sucesso no WhatsApp!";
        studioStatus.className = "text-xs font-semibold text-[#25D366]";
      } else {
        studioStatus.innerText = "❌ Erro: " + (data.error || "Falha no envio");
        studioStatus.className = "text-xs font-semibold text-red-400";
      }
    });

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

    // Envio de Áudio pelo Chat do iPhone (usando a voz selecionada)
    btnChatSendVoice.addEventListener("click", async () => {
      let text = chatTextInput.value.trim();
      if (!text) {
        text = prompt("Digite o texto que a voz da IA deve falar no WhatsApp:");
        if (!text) return;
      }

      const voice = chatVoiceSelect.value;
      chatSendStatus.innerText = "🎙️ Enviando áudio (" + voice + ")...";

      const res = await fetch("/api/send-audio-whatsapp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target: selectedContactJid, text, voice })
      });
      const data = await res.json();
      if (data.success) {
        chatTextInput.value = "";
        chatSendStatus.innerText = "✅ Áudio Ogg Opus enviado no WhatsApp!";
        setTimeout(() => chatSendStatus.innerText = "", 2000);
      } else {
        chatSendStatus.innerText = "❌ Erro ao enviar";
      }
    });

    // Atalho Enter no input do chat
    chatTextInput.addEventListener("keydown", e => {
      if (e.key === "Enter") btnChatSendText.click();
    });

    btnToggleBot.addEventListener("click", () => fetch("/api/toggle", { method: "POST" }));
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
