import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Download, Sparkles, CheckCircle2, Bot, ShieldCheck, Zap, MessageSquare, Terminal, HelpCircle } from "lucide-react";

export const Route = createFileRoute("/")({
  component: DownloadPage,
  head: () => ({
    title: "WhatsGemini Pro | Baixar Extensão de Auto-Resposta com IA",
    meta: [
      {
        name: "description",
        content:
          "Baixe a extensão WhatsGemini Pro para WhatsApp Web. Respostas automáticas inteligentes com o poder do Google Gemini Pro.",
      },
    ],
  }),
});

function DownloadPage() {
  const [simulatedMessages, setSimulatedMessages] = useState<Array<{ fromMe: boolean; text: string; time: string }>>([
    {
      fromMe: false,
      text: "Olá! Como funciona o serviço e vocês atendem agora?",
      time: "12:40",
    },
    {
      fromMe: true,
      text: "Olá! Tudo bem? 😊 Sim, atendemos 24 horas por dia! Como posso ajudar você hoje?",
      time: "12:40",
    },
  ]);
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isTyping) return;

    const userMsg = inputText.trim();
    const now = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

    setSimulatedMessages((prev) => [...prev, { fromMe: false, text: userMsg, time: now }]);
    setInputText("");
    setIsTyping(true);

    setTimeout(() => {
      const answers = [
        "Com certeza! O WhatsGemini Pro responde com base no contexto completo da nossa conversa. Posso te passar mais detalhes?",
        "Perfeito! Já anotei o seu pedido e estamos à disposição para tirar qualquer dúvida na hora! 👍",
        "Entendido! Como sou conectado ao Google Gemini Pro, posso esclarecer dúvidas frequentes e agilizar seu atendimento.",
      ];
      const randomAnswer = answers[Math.floor(Math.random() * answers.length)];
      setSimulatedMessages((prev) => [
        ...prev,
        { fromMe: true, text: randomAnswer, time: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) },
      ]);
      setIsTyping(false);
    }, 1800);
  };

  return (
    <div className="min-h-screen bg-[#0b141a] text-[#e9edef] font-sans selection:bg-[#25D366] selection:text-black">
      {/* Background Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-gradient-to-b from-[#25D366]/15 via-[#128C7E]/10 to-transparent blur-3xl pointer-events-none -z-10" />

      {/* Top Navbar */}
      <nav className="border-b border-white/10 px-6 py-4 backdrop-blur-md sticky top-0 z-50 bg-[#0b141a]/80">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#128C7E] to-[#25D366] flex items-center justify-center text-xl shadow-lg shadow-[#25D366]/20">
              ✨
            </div>
            <div>
              <span className="font-extrabold text-lg tracking-tight text-white">WhatsGemini <span className="text-[#25D366]">PRO</span></span>
              <span className="block text-[11px] text-[#8696a0]">Auto-Resposta com IA</span>
            </div>
          </div>

          <a
            href="/WhatsGemini-Pro.zip"
            download
            className="flex items-center gap-2 bg-[#25D366] hover:bg-[#20ba59] text-[#0b141a] font-bold text-sm px-5 py-2.5 rounded-full transition-all shadow-md shadow-[#25D366]/20 hover:scale-105"
          >
            <Download className="w-4 h-4" />
            Baixar .ZIP
          </a>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="max-w-4xl mx-auto px-6 pt-16 pb-12 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#25D366]/10 border border-[#25D366]/30 text-[#25D366] text-xs font-semibold mb-6">
          <Sparkles className="w-3.5 h-3.5" />
          Extensão Manifest V3 • Conectada ao Google Gemini Pro
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold text-white tracking-tight leading-tight mb-6">
          Automatize seu WhatsApp Web com o Poder do{" "}
          <span className="bg-gradient-to-r from-[#25D366] via-[#38ef7d] to-[#00DFD8] bg-clip-text text-transparent">
            Google Gemini Pro
          </span>
        </h1>

        <p className="text-lg sm:text-xl text-[#8696a0] max-w-2xl mx-auto mb-10 leading-relaxed">
          A extensão inteligente que monitora seu WhatsApp Web, lê mensagens recebidas, entende o contexto completo e responde seus contatos 24 horas por dia com respostas naturais.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-4 mb-6">
          <a
            href="/WhatsGemini-Pro.zip"
            download
            className="flex items-center gap-3 bg-gradient-to-r from-[#25D366] to-[#128C7E] hover:from-[#20ba59] hover:to-[#0f7569] text-[#0b141a] font-extrabold text-lg px-8 py-4 rounded-2xl shadow-xl shadow-[#25D366]/30 transition-all hover:-translate-y-0.5"
          >
            <Download className="w-6 h-6" />
            BAIXAR EXTENSÃO (.ZIP)
          </a>

          <a
            href="#tutorial"
            className="flex items-center gap-2 bg-[#111b21] hover:bg-[#182229] border border-white/10 text-white font-semibold text-base px-6 py-4 rounded-2xl transition-all"
          >
            📖 Como Instalar (3 Passos)
          </a>
        </div>

        <p className="text-xs text-[#8696a0]">
          ✅ Compatível com Google Chrome, Brave, Edge e Opera • 100% Gratuito & Open-Source
        </p>

        {/* Interactive WhatsApp Demo Mockup */}
        <div className="mt-14 max-w-xl mx-auto rounded-3xl bg-[#111b21] border border-white/10 shadow-2xl overflow-hidden text-left">
          <div className="bg-[#202c33] px-5 py-3.5 flex items-center justify-between border-b border-white/5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#00a884] flex items-center justify-center text-white font-bold text-sm">
                C
              </div>
              <div>
                <h4 className="text-white text-sm font-semibold">Cliente (Exemplo)</h4>
                <span className="text-[11px] text-[#25D366] font-medium">online agora</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#25D366]/15 border border-[#25D366]/30 text-[#25D366] text-xs font-semibold">
              <Bot className="w-3.5 h-3.5" />
              IA Ativa
            </div>
          </div>

          {/* Chat Messages */}
          <div className="p-5 flex flex-col gap-3 min-h-[220px] max-h-[300px] overflow-y-auto bg-[#0b141a]/60">
            {simulatedMessages.map((msg, index) => (
              <div
                key={index}
                className={`max-w-[80%] p-3 rounded-2xl text-xs sm:text-sm ${
                  msg.fromMe
                    ? "self-end bg-[#005c4b] text-white rounded-br-xs"
                    : "self-start bg-[#202c33] text-[#e9edef] rounded-bl-xs"
                }`}
              >
                {msg.fromMe && (
                  <span className="inline-block text-[10px] font-bold text-[#25D366] bg-[#25D366]/20 px-1.5 py-0.5 rounded mr-1.5">
                    🤖 Gemini Pro
                  </span>
                )}
                {msg.text}
                <div className="text-[10px] text-right text-white/50 mt-1">{msg.time}</div>
              </div>
            ))}

            {isTyping && (
              <div className="self-end bg-[#005c4b]/70 text-xs px-3 py-2 rounded-2xl text-[#25D366] flex items-center gap-2">
                <span className="animate-spin">✨</span> Gemini Pro digitando resposta...
              </div>
            )}
          </div>

          {/* Interactive Input Form */}
          <form onSubmit={handleSendMessage} className="bg-[#202c33] p-3 flex items-center gap-2 border-t border-white/5">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Digite uma mensagem para testar a resposta da IA..."
              className="flex-1 bg-[#111b21] border border-white/10 rounded-xl px-4 py-2 text-xs text-white placeholder-white/40 focus:outline-none focus:border-[#25D366]"
            />
            <button
              type="submit"
              disabled={isTyping}
              className="bg-[#25D366] hover:bg-[#20ba59] disabled:opacity-50 text-[#0b141a] font-bold text-xs px-4 py-2 rounded-xl transition-all"
            >
              Enviar
            </button>
          </form>
        </div>
      </header>

      {/* Installation Steps Section */}
      <section id="tutorial" className="max-w-5xl mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-white mb-3">Como Instalar em Menos de 1 Minuto</h2>
          <p className="text-sm text-[#8696a0]">Processo simples e direto em qualquer navegador baseado em Chromium.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <div className="bg-[#111b21] border border-white/10 hover:border-[#25D366]/40 p-6 rounded-2xl transition-all hover:-translate-y-1">
            <div className="w-10 h-10 rounded-xl bg-[#25D366]/15 border border-[#25D366]/30 text-[#25D366] font-bold text-lg flex items-center justify-center mb-4">
              1
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Baixe e Extraia o .ZIP</h3>
            <p className="text-xs text-[#8696a0] leading-relaxed mb-4">
              Clique no botão de download para baixar o arquivo <strong>WhatsGemini-Pro.zip</strong> e extraia o conteúdo em uma pasta de sua escolha.
            </p>
            <a href="/WhatsGemini-Pro.zip" download className="text-xs text-[#25D366] hover:underline flex items-center gap-1 font-semibold">
              <Download className="w-3.5 h-3.5" /> Baixar WhatsGemini-Pro.zip
            </a>
          </div>

          <div className="bg-[#111b21] border border-white/10 hover:border-[#25D366]/40 p-6 rounded-2xl transition-all hover:-translate-y-1">
            <div className="w-10 h-10 rounded-xl bg-[#25D366]/15 border border-[#25D366]/30 text-[#25D366] font-bold text-lg flex items-center justify-center mb-4">
              2
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Abra as Extensões</h3>
            <p className="text-xs text-[#8696a0] leading-relaxed mb-4">
              No Chrome ou Brave, acesse o gerenciador de extensões e ative a chavinha <strong>Modo do desenvolvedor</strong> no canto superior direito.
            </p>
            <div className="bg-[#0b141a] px-3 py-1.5 rounded-lg text-xs font-mono text-[#25D366] inline-block">
              chrome://extensions
            </div>
          </div>

          <div className="bg-[#111b21] border border-white/10 hover:border-[#25D366]/40 p-6 rounded-2xl transition-all hover:-translate-y-1">
            <div className="w-10 h-10 rounded-xl bg-[#25D366]/15 border border-[#25D366]/30 text-[#25D366] font-bold text-lg flex items-center justify-center mb-4">
              3
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Carregar sem Compactação</h3>
            <p className="text-xs text-[#8696a0] leading-relaxed mb-4">
              Clique em <strong>Carregar sem compactação</strong> no canto superior esquerdo e selecione a pasta extraída. A extensão será ativada na hora!
            </p>
            <span className="text-xs font-semibold text-[#25D366] flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Pronto para usar!
            </span>
          </div>
        </div>
      </section>

      {/* Feature Highlights */}
      <section className="max-w-5xl mx-auto px-6 py-12">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-white mb-3">Recursos Poderosos & Seguros</h2>
          <p className="text-sm text-[#8696a0]">Construído especificamente para funcionar de forma confiável no WhatsApp Web.</p>
        </div>

        <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-5">
          <div className="bg-[#111b21] border border-white/10 p-5 rounded-2xl">
            <Zap className="w-7 h-7 text-[#25D366] mb-3" />
            <h4 className="text-base font-bold text-white mb-1.5">Gemini 3 Flash & Pro</h4>
            <p className="text-xs text-[#8696a0]">Modelos ultra-rápidos com capacidade avançada de raciocínio e linguagem natural em português.</p>
          </div>

          <div className="bg-[#111b21] border border-white/10 p-5 rounded-2xl">
            <ShieldCheck className="w-7 h-7 text-[#25D366] mb-3" />
            <h4 className="text-base font-bold text-white mb-1.5">Anti-Bloqueio Real</h4>
            <p className="text-xs text-[#8696a0]">Simula pausas de digitação humana (3 a 7 segundos) antes de enviar cada resposta para evitar spam.</p>
          </div>

          <div className="bg-[#111b21] border border-white/10 p-5 rounded-2xl">
            <MessageSquare className="w-7 h-7 text-[#25D366] mb-3" />
            <h4 className="text-base font-bold text-white mb-1.5">Filtro de Grupos</h4>
            <p className="text-xs text-[#8696a0]">Opção inteligente para ignorar grupos automaticamente e responder somente mensagens privadas.</p>
          </div>

          <div className="bg-[#111b21] border border-white/10 p-5 rounded-2xl">
            <Terminal className="w-7 h-7 text-[#25D366] mb-3" />
            <h4 className="text-base font-bold text-white mb-1.5">100% Local & Seguro</h4>
            <p className="text-xs text-[#8696a0]">Sua chave de API e conversas ficam salvas exclusivamente no armazenamento local do seu navegador.</p>
          </div>
        </div>
      </section>

      {/* Bottom Download Card */}
      <section className="max-w-4xl mx-auto px-6 py-16">
        <div className="rounded-3xl bg-gradient-to-br from-[#16242c] to-[#111b21] border border-[#25D366]/30 p-10 text-center shadow-2xl">
          <h2 className="text-3xl font-extrabold text-white mb-3">Pronto para colocar o Gemini para responder por você?</h2>
          <p className="text-sm text-[#8696a0] max-w-xl mx-auto mb-8">
            Baixe a extensão agora mesmo, coloque sua chave de API e tenha um assistente 24 horas no seu WhatsApp Web.
          </p>

          <a
            href="/WhatsGemini-Pro.zip"
            download
            className="inline-flex items-center gap-3 bg-[#25D366] hover:bg-[#20ba59] text-[#0b141a] font-extrabold text-lg px-8 py-4 rounded-2xl shadow-xl shadow-[#25D366]/20 transition-all hover:scale-105"
          >
            <Download className="w-5 h-5" />
            BAIXAR WHATSGEMINI PRO (.ZIP)
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-8 text-center text-xs text-[#8696a0]">
        <p>WhatsGemini Pro • Código livre e aberto sincronizado no GitHub.</p>
      </footer>
    </div>
  );
}
