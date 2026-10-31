import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Download, Sparkles, CheckCircle2, Bot, ShieldCheck, Zap, MessageSquare, Terminal, Sliders, Target, UserCheck } from "lucide-react";

export const Route = createFileRoute("/")({
  component: DownloadPage,
  head: () => ({
    title: "WhatsGemini Pro | Controle Total • Auto-Resposta para WhatsApp com IA",
    meta: [
      {
        name: "description",
        content:
          "Extensão com Controle Total: Modo Foco (responda apenas quem você quiser), Modo Eu (responde em primeira pessoa) e velocidade instantânea no WhatsApp Web com Gemini Pro.",
      },
    ],
  }),
});

function DownloadPage() {
  const [simulatedMessages, setSimulatedMessages] = useState<Array<{ fromMe: boolean; text: string; time: string }>>([
    {
      fromMe: false,
      text: "Fala Íthalo! Lembra daquele orçamento que a gente combinou ontem?",
      time: "12:50",
    },
    {
      fromMe: true,
      text: "Opa, tudo certo! Lembro sim, dei uma olhada no projeto ontem e já estou finalizando o escopo pra te mandar certinho!",
      time: "12:50",
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
        "Tranquilo! Já verifiquei aqui no histórico e estou adiantando isso agora. Qualquer coisa te chamo já já!",
        "Show de bola! Tô na correria aqui agora, mas já vi sua mensagem e já te retorno com os detalhes certinho!",
        "Perfeito! Li as mensagens de antes e entendi exatamente o que precisa ser feito. Já te envio!",
      ];
      const randomAnswer = answers[Math.floor(Math.random() * answers.length)];
      setSimulatedMessages((prev) => [
        ...prev,
        { fromMe: true, text: randomAnswer, time: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) },
      ]);
      setIsTyping(false);
    }, 1200);
  };

  return (
    <div className="min-h-screen bg-[#0b141a] text-[#e9edef] font-sans selection:bg-[#25D366] selection:text-black">
      {/* Background Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[450px] bg-gradient-to-b from-[#25D366]/20 via-[#128C7E]/10 to-transparent blur-3xl pointer-events-none -z-10" />

      {/* Top Navbar */}
      <nav className="border-b border-white/10 px-6 py-4 backdrop-blur-md sticky top-0 z-50 bg-[#0b141a]/85">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#128C7E] to-[#25D366] flex items-center justify-center text-xl shadow-lg shadow-[#25D366]/20">
              ✨
            </div>
            <div>
              <span className="font-extrabold text-lg tracking-tight text-white">WhatsGemini <span className="text-[#25D366] text-xs px-2 py-0.5 rounded bg-[#25D366]/20 border border-[#25D366]/30">TOTAL CONTROL</span></span>
              <span className="block text-[11px] text-[#8696a0]">Modo Foco • Modo Eu • Resposta Ultra-Rápida</span>
            </div>
          </div>

          <a
            href="https://raw.githubusercontent.com/ithalo098/project-sunrise/main/public/WhatsGemini-Pro.zip"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 bg-[#25D366] hover:bg-[#20ba59] text-[#0b141a] font-bold text-sm px-5 py-2.5 rounded-full transition-all shadow-md shadow-[#25D366]/20 hover:scale-105"
          >
            <Download className="w-4 h-4" />
            Baixar .ZIP
          </a>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="max-w-4xl mx-auto px-6 pt-14 pb-10 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#25D366]/10 border border-[#25D366]/30 text-[#25D366] text-xs font-semibold mb-6">
          <Sparkles className="w-3.5 h-3.5" />
          Controle Total • Whitelist de Foco • Memória de 20 Mensagens
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold text-white tracking-tight leading-tight mb-6">
          Responda no WhatsApp Como se Fosse Você, com{" "}
          <span className="bg-gradient-to-r from-[#25D366] via-[#38ef7d] to-[#00DFD8] bg-clip-text text-transparent">
            Controle Total
          </span>
        </h1>

        <p className="text-lg sm:text-xl text-[#8696a0] max-w-2xl mx-auto mb-8 leading-relaxed">
          Você decide quem a IA pode responder e quem deve ignorar. Com o <strong>Modo Foco</strong>, resposta <strong>super rápida</strong> e <strong>memória profunda</strong> para nunca perder o fio da meada.
        </p>

        {/* Action Highlights Badges */}
        <div className="flex flex-wrap justify-center gap-2.5 mb-10 text-xs">
          <span className="px-3 py-1 rounded-full bg-[#111b21] border border-white/10 text-white flex items-center gap-1.5">
            <Target className="w-3.5 h-3.5 text-[#25D366]" /> Modo Foco (Whitelist)
          </span>
          <span className="px-3 py-1 rounded-full bg-[#111b21] border border-white/10 text-white flex items-center gap-1.5">
            <UserCheck className="w-3.5 h-3.5 text-[#25D366]" /> Modo Eu (Primeira Pessoa)
          </span>
          <span className="px-3 py-1 rounded-full bg-[#111b21] border border-white/10 text-white flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-[#25D366]" /> Resposta Super Rápida (1s)
          </span>
          <span className="px-3 py-1 rounded-full bg-[#111b21] border border-white/10 text-white flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-[#25D366]" /> Botões Direto no Chat
          </span>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-4 mb-6">
          <a
            href="https://raw.githubusercontent.com/ithalo098/project-sunrise/main/public/WhatsGemini-Pro.zip"
            target="_blank"
            rel="noopener noreferrer"
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
          ✅ Compatível com Google Chrome, Brave, Edge e Opera • 100% Gratuito
        </p>

        {/* WhatsApp Mockup with Header Action Buttons */}
        <div className="mt-12 max-w-xl mx-auto rounded-3xl bg-[#111b21] border border-white/10 shadow-2xl overflow-hidden text-left">
          <div className="bg-[#202c33] px-4 py-3 flex items-center justify-between border-b border-white/5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-[#00a884] flex items-center justify-center text-white font-bold text-sm">
                C
              </div>
              <div>
                <h4 className="text-white text-sm font-semibold">Cliente Importante</h4>
                <span className="text-[10px] text-[#25D366] font-medium">online agora</span>
              </div>
            </div>

            {/* Quick Header Buttons (New Feature) */}
            <div className="flex items-center gap-1.5">
              <span className="px-2.5 py-1 rounded-full bg-[#25D366] text-[#0b141a] font-bold text-[10px] shadow-sm">
                🎯 Foco: ATIVO
              </span>
              <span className="px-2 py-1 rounded-full bg-white/10 text-white/70 text-[10px]">
                🚫 Ignorar
              </span>
            </div>
          </div>

          {/* Chat Messages */}
          <div className="p-5 flex flex-col gap-3 min-h-[220px] max-h-[300px] overflow-y-auto bg-[#0b141a]/60">
            {simulatedMessages.map((msg, index) => (
              <div
                key={index}
                className={`max-w-[82%] p-3 rounded-2xl text-xs sm:text-sm ${
                  msg.fromMe
                    ? "self-end bg-[#005c4b] text-white rounded-br-xs"
                    : "self-start bg-[#202c33] text-[#e9edef] rounded-bl-xs"
                }`}
              >
                {msg.fromMe && (
                  <span className="inline-block text-[10px] font-bold text-[#25D366] bg-[#25D366]/20 px-1.5 py-0.5 rounded mr-1.5">
                    🤖 Modo Eu
                  </span>
                )}
                {msg.text}
                <div className="text-[10px] text-right text-white/50 mt-1">{msg.time}</div>
              </div>
            ))}

            {isTyping && (
              <div className="self-end bg-[#005c4b]/70 text-xs px-3 py-2 rounded-2xl text-[#25D366] flex items-center gap-2">
                <span className="animate-spin">✨</span> Respondendo na velocidade máxima...
              </div>
            )}
          </div>

          {/* Interactive Form */}
          <form onSubmit={handleSendMessage} className="bg-[#202c33] p-3 flex items-center gap-2 border-t border-white/5">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Digite uma mensagem e veja a IA responder como se fosse você..."
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

      {/* Total Control Features Grid */}
      <section className="max-w-5xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-white mb-3">Tudo Sob o Seu Controle</h2>
          <p className="text-sm text-[#8696a0]">Você dita as regras, a velocidade e quem recebe resposta.</p>
        </div>

        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6">
          <div className="bg-[#111b21] border border-white/10 p-6 rounded-2xl hover:border-[#25D366]/30 transition-all">
            <Target className="w-8 h-8 text-[#25D366] mb-4" />
            <h4 className="text-base font-bold text-white mb-2">🎯 Modo Foco (Whitelist)</h4>
            <p className="text-xs text-[#8696a0] leading-relaxed">
              Ative para responder <strong>APENAS</strong> as pessoas da sua lista de foco (clientes prioritários, sócios, contatos de trabalho).
            </p>
          </div>

          <div className="bg-[#111b21] border border-white/10 p-6 rounded-2xl hover:border-[#25D366]/30 transition-all">
            <UserCheck className="w-8 h-8 text-[#25D366] mb-4" />
            <h4 className="text-base font-bold text-white mb-2">👤 Modo Eu (Persona)</h4>
            <p className="text-xs text-[#8696a0] leading-relaxed">
              A IA fala em primeira pessoa ("eu vi", "vou te mandar"), usa suas gírias e seu tom de voz natural sem parecer robô.
            </p>
          </div>

          <div className="bg-[#111b21] border border-white/10 p-6 rounded-2xl hover:border-[#25D366]/30 transition-all">
            <Zap className="w-8 h-8 text-[#25D366] mb-4" />
            <h4 className="text-base font-bold text-white mb-2">⚡ Resposta Super Rápida</h4>
            <p className="text-xs text-[#8696a0] leading-relaxed">
              Alterne entre o Modo Instantâneo (1 a 2 segundos) ou Modo Humanizado. Seus contatos são atendidos em tempo recorde.
            </p>
          </div>

          <div className="bg-[#111b21] border border-white/10 p-6 rounded-2xl hover:border-[#25D366]/30 transition-all">
            <MessageSquare className="w-8 h-8 text-[#25D366] mb-4" />
            <h4 className="text-base font-bold text-white mb-2">🧠 Memória de 20 Mensagens</h4>
            <p className="text-xs text-[#8696a0] leading-relaxed">
              Lê até 20 mensagens anteriores da conversa para nunca se perder e entender todo o histórico antes de responder.
            </p>
          </div>

          <div className="bg-[#111b21] border border-white/10 p-6 rounded-2xl hover:border-[#25D366]/30 transition-all">
            <Sliders className="w-8 h-8 text-[#25D366] mb-4" />
            <h4 className="text-base font-bold text-white mb-2">🔘 Botões no Topo do Chat</h4>
            <p className="text-xs text-[#8696a0] leading-relaxed">
              Botões de Foco e Bloqueio injetados diretamente na barra do WhatsApp Web para controlar cada contato com 1 clique.
            </p>
          </div>

          <div className="bg-[#111b21] border border-white/10 p-6 rounded-2xl hover:border-[#25D366]/30 transition-all">
            <ShieldCheck className="w-8 h-8 text-[#25D366] mb-4" />
            <h4 className="text-base font-bold text-white mb-2">🚫 Blacklist & Grupos</h4>
            <p className="text-xs text-[#8696a0] leading-relaxed">
              Filtro rigoroso: grupos são ignorados automaticamente e você pode bloquear números e contatos para nunca responder.
            </p>
          </div>
        </div>
      </section>

      {/* Tutorial Section */}
      <section id="tutorial" className="max-w-5xl mx-auto px-6 py-14">
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
              Clique no botão de download para baixar o arquivo <strong>WhatsGemini-Pro.zip</strong> e extraia o conteúdo em uma pasta no seu computador.
            </p>
            <a 
              href="https://raw.githubusercontent.com/ithalo098/project-sunrise/main/public/WhatsGemini-Pro.zip" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-xs text-[#25D366] hover:underline flex items-center gap-1 font-semibold"
            >
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

      {/* Bottom CTA */}
      <section className="max-w-4xl mx-auto px-6 py-14">
        <div className="rounded-3xl bg-gradient-to-br from-[#16242c] to-[#111b21] border border-[#25D366]/30 p-10 text-center shadow-2xl">
          <h2 className="text-3xl font-extrabold text-white mb-3">Tenha total controle das suas conversas</h2>
          <p className="text-sm text-[#8696a0] max-w-xl mx-auto mb-8">
            Baixe a versão Total Control do WhatsGemini Pro com Modo Foco, Modo Eu e resposta super rápida.
          </p>

          <a
            href="https://raw.githubusercontent.com/ithalo098/project-sunrise/main/public/WhatsGemini-Pro.zip"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-3 bg-[#25D366] hover:bg-[#20ba59] text-[#0b141a] font-extrabold text-lg px-8 py-4 rounded-2xl shadow-xl shadow-[#25D366]/20 transition-all hover:scale-105"
          >
            <Download className="w-5 h-5" />
            BAIXAR WHATSGEMINI PRO (.ZIP)
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-8 text-center text-xs text-[#8696a0]">
        <p>WhatsGemini Pro • Controle Total & Open-Source sincronizado no GitHub.</p>
      </footer>
    </div>
  );
}
