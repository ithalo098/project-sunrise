/**
 * WhatsGemini Pro - Options Page Controller
 */

const DEFAULT_SYSTEM_PROMPT = `Você é um assistente pessoal inteligente respondendo mensagens no WhatsApp em meu nome.
Diretrizes:
- Seja sempre educado, amigável, direto ao ponto e natural (use português do Brasil).
- Use linguagem informal e emojis com moderação (como uma pessoa real conversando).
- Mantenha as respostas relativamente curtas e adequadas para o WhatsApp (1 a 3 frases na maioria das vezes).
- Se perguntarem sobre compromissos específicos, preços não definidos ou assuntos urgentes que você não sabe, responda de forma prestativa dizendo que eu vi a mensagem e já vou responder pessoalmente assim que puder.
- Nunca diga que você é um robô de spam. Apenas converse com naturalidade.`;

document.addEventListener("DOMContentLoaded", async () => {
  const promptEl = document.getElementById("system-prompt");
  const minDelayEl = document.getElementById("min-delay");
  const maxDelayEl = document.getElementById("max-delay");
  const blacklistEl = document.getElementById("blacklist-input");
  const btnResetPrompt = document.getElementById("btn-reset-prompt");
  const btnSaveAll = document.getElementById("btn-save-all");
  const saveStatus = document.getElementById("save-status");

  // Simulação
  const testInput = document.getElementById("test-input");
  const btnRunSimulation = document.getElementById("btn-run-simulation");
  const simulationOutput = document.getElementById("simulation-output");
  const simulationText = document.getElementById("simulation-text");
  const simulationStatus = document.getElementById("simulation-status");

  // Carrega configurações
  const config = await chrome.storage.local.get([
    "systemPrompt",
    "minDelaySeconds",
    "maxDelaySeconds",
    "blacklist",
    "apiKey",
    "model"
  ]);

  promptEl.value = config.systemPrompt || DEFAULT_SYSTEM_PROMPT;
  minDelayEl.value = config.minDelaySeconds || 3;
  maxDelayEl.value = config.maxDelaySeconds || 7;

  if (config.blacklist && Array.isArray(config.blacklist)) {
    blacklistEl.value = config.blacklist.join("\n");
  }

  // Restaurar Padrão
  btnResetPrompt.addEventListener("click", () => {
    if (confirm("Deseja restaurar o prompt padrão da IA?")) {
      promptEl.value = DEFAULT_SYSTEM_PROMPT;
    }
  });

  // Salvar Geral
  btnSaveAll.addEventListener("click", async () => {
    const minDelay = parseInt(minDelayEl.value, 10) || 3;
    const maxDelay = parseInt(maxDelayEl.value, 10) || 7;
    const blacklist = blacklistEl.value
      .split("\n")
      .map(item => item.trim())
      .filter(item => item.length > 0);

    await chrome.storage.local.set({
      systemPrompt: promptEl.value.trim(),
      minDelaySeconds: Math.min(minDelay, maxDelay),
      maxDelaySeconds: Math.max(minDelay, maxDelay),
      blacklist: blacklist
    });

    saveStatus.innerText = "✅ Todas as configurações foram salvas!";
    setTimeout(() => {
      saveStatus.innerText = "";
    }, 4000);
  });

  // Simular Resposta
  btnRunSimulation.addEventListener("click", async () => {
    const userMsg = testInput.value.trim();
    if (!userMsg) {
      alert("Digite uma mensagem de teste no campo ao lado.");
      return;
    }

    const currentKey = config.apiKey;
    if (!currentKey) {
      alert("Configure sua chave de API na extensão antes de realizar o teste.");
      return;
    }

    simulationOutput.classList.remove("hidden");
    simulationStatus.innerText = "Pensando...";
    simulationText.innerText = "Gerando resposta com o Google Gemini Pro...";
    btnRunSimulation.disabled = true;

    // Salva temporariamente o prompt em uso para a simulação
    const activePrompt = promptEl.value.trim() || DEFAULT_SYSTEM_PROMPT;
    await chrome.storage.local.set({ systemPrompt: activePrompt });

    chrome.runtime.sendMessage(
      {
        action: "GENERATE_REPLY",
        data: {
          contactName: "Contato de Teste",
          lastMessage: userMsg,
          messageHistory: [{ fromMe: false, text: userMsg }]
        }
      },
      (res) => {
        btnRunSimulation.disabled = false;
        if (res && res.success) {
          simulationStatus.innerText = "Sucesso!";
          simulationText.innerText = res.reply;
        } else {
          simulationStatus.innerText = "Erro";
          simulationText.innerText = res?.error || "Falha ao gerar resposta.";
        }
      }
    );
  });
});

