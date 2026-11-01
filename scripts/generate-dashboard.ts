import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

const rootDir = process.cwd();
const contactsFile = join(rootDir, "contacts_memory.json");
const configFile = join(rootDir, "bot_config.json");
const publicDashboardFile = join(rootDir, "public", "dashboard.html");

// Fetch the base HTML from http://localhost:3333 or read template
async function generate() {
  let baseHtml = "";
  try {
    const res = await fetch("http://localhost:3333/");
    if (res.ok) {
      baseHtml = await res.text();
    }
  } catch (e) {
    console.error("Could not fetch from localhost:3333:", e);
  }

  if (!baseHtml) {
    console.error("Base HTML is empty!");
    process.exit(1);
  }

  // Read contacts and config
  const contactsData = JSON.parse(readFileSync(contactsFile, "utf-8"));
  const contactsList = Object.values(contactsData);
  const botConfig = JSON.parse(readFileSync(configFile, "utf-8"));

  const initialDataScript = `
  <script id="embedded-data">
    window.__INITIAL_DATA__ = {
      contacts: ${JSON.stringify(contactsList)},
      config: ${JSON.stringify(botConfig)},
      status: "CONNECTED",
      user: { id: "558183662905", name: "${botConfig.userName || "Íthalo"}" }
    };
  </script>
`;

  // Inject initial data before closing </head>
  let modifiedHtml = baseHtml.replace("</head>", `${initialDataScript}\n</head>`);

  // Ensure currentContacts starts with initial contacts
  modifiedHtml = modifiedHtml.replace(
    "let currentContacts = [];",
    `let currentContacts = (window.__INITIAL_DATA__ && window.__INITIAL_DATA__.contacts) ? window.__INITIAL_DATA__.contacts : [];`
  );

  // Auto-render on DOMContentLoaded or immediately if initial data exists
  const autoInitCode = `
    // Inicialização Imediata com dados embutidos para compatibilidade com Lovable e Cloud
    if (currentContacts && currentContacts.length > 0) {
      setTimeout(() => {
        try {
          renderiPhoneConversations();
          renderActiveChatThread();
          updateStatus("CONNECTED", { id: "558183662905", name: "Íthalo" }, null);
          if (window.__INITIAL_DATA__ && window.__INITIAL_DATA__.config) {
            updateConfig(window.__INITIAL_DATA__.config);
          }
        } catch(e) { console.warn("Auto-init warning:", e); }
      }, 50);
    }
`;

  modifiedHtml = modifiedHtml.replace(
    `const evtSource = new EventSource("/api/events");`,
    `${autoInitCode}
    // Conexão SSE Adaptativa (Detecta Localhost 3333 ou Nuvem Lovable)
    let evtSource = null;
    try {
      const sseHost = window.location.port === "3333" ? "" : "http://localhost:3333";
      evtSource = new EventSource(sseHost + "/api/events");
    } catch(e) { console.log("SSE local não conectado:", e); }
`
  );

  // Wrap evtSource event listeners so they don't throw if evtSource is null
  modifiedHtml = modifiedHtml.replaceAll("evtSource.addEventListener", "if (evtSource) evtSource.addEventListener");

  // In sendMessage fallback (for Lovable / offline demo)
  const fallbackChatSend = `
    async function sendTextMessage(target, text) {
      const apiHost = window.location.port === "3333" ? "" : "http://localhost:3333";
      try {
        const res = await fetch(apiHost + "/api/chat-send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ target, text })
        });
        const data = await res.json();
        return data;
      } catch (err) {
        // Fallback Interativo para Lovable / Ambiente Sem Servidor
        const contact = currentContacts.find(c => c.jid === target || c.phone === target);
        if (contact) {
          const nowStr = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
          contact.history.push({
            role: "model",
            text: text,
            timestamp: Date.now(),
            type: "text"
          });
          contact.lastMessage = text;
          contact.lastTime = nowStr;
          renderiPhoneConversations();
          renderActiveChatThread();

          // Simulação de resposta interativa automática após 1.5s
          setTimeout(() => {
            const replies = [
              "Opa, tudo bem? Tô por aqui sim, de boa!",
              "Show de bola! Valeu pela mensagem!",
              "Tranquilo meu amigo, qualquer dúvida só me chamar!",
              "Perfeito! Já anotei aqui certinho."
            ];
            const randomReply = replies[Math.floor(Math.random() * replies.length)];
            contact.history.push({
              role: "user",
              text: randomReply,
              timestamp: Date.now(),
              type: "text"
            });
            contact.lastMessage = randomReply;
            contact.lastTime = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
            renderiPhoneConversations();
            renderActiveChatThread();
          }, 1500);

          return { success: true, simulated: true };
        }
        return { success: false, error: "Contato não encontrado" };
      }
    }
`;

  // Find where chat send is handled and enhance with fallback
  modifiedHtml = modifiedHtml.replace(
    `const res = await fetch("/api/chat-send"`,
    `const apiHost = window.location.port === "3333" ? "" : "http://localhost:3333";
    let res;
    try {
      res = await fetch(apiHost + "/api/chat-send"`
  );

  // Add top bar download button if not present
  if (!modifiedHtml.includes("WhatsGemini-Pro.zip")) {
    const downloadBadge = `
      <a href="/WhatsGemini-Pro.zip" download class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#25D366] hover:bg-[#20ba59] text-black transition shadow-lg shadow-[#25D366]/20">
        <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
        <span>Baixar Extensão .ZIP</span>
      </a>
`;
    modifiedHtml = modifiedHtml.replace(
      `<div class="flex items-center gap-3">`,
      `<div class="flex items-center gap-3">\n${downloadBadge}`
    );
  }

  writeFileSync(publicDashboardFile, modifiedHtml, "utf-8");
  console.log("Successfully generated public/dashboard.html! Bytes:", modifiedHtml.length);
}

generate();
