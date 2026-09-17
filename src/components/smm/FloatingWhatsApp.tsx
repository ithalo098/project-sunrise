import { useState } from "react";
import { MessageCircle, X, Send, ShieldCheck, Clock, ArrowRight, ExternalLink } from "lucide-react";

interface FloatingWhatsAppProps {
  phoneNumber?: string; // Standard Brazilian phone format, e.g. 5511999999999
}

export function FloatingWhatsApp({ phoneNumber = "5511999999999" }: FloatingWhatsAppProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [customMsg, setCustomMsg] = useState("");

  const quickQuestions = [
    {
      title: "💳 Dúvida sobre Recarga PIX",
      text: "Olá! Gostaria de tirar uma dúvida sobre como recarregar meu saldo via PIX no BRSMM.",
    },
    {
      title: "📦 Acompanhar / Rastrear Pedido",
      text: "Olá! Preciso de ajuda para verificar o andamento do meu pedido no BRSMM.",
    },
    {
      title: "🛡️ É seguro? Precisa de senha?",
      text: "Olá! Gostaria de saber mais sobre a segurança e garantia dos serviços de seguidores.",
    },
    {
      title: "🚀 Atendimento Geral com Especialista",
      text: "Olá! Gostaria de conversar com um atendente do suporte BRSMM.",
    },
  ];

  const handleOpenWhatsApp = (text: string) => {
    const encoded = encodeURIComponent(text);
    const url = `https://wa.me/${phoneNumber}?text=${encoded}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleSendCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customMsg.trim()) return;
    handleOpenWhatsApp(customMsg.trim());
    setCustomMsg("");
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {/* Floating Chat Modal */}
      {isOpen && (
        <div className="mb-4 w-[92vw] sm:w-96 necromancer-card p-[1.5px] shadow-2xl shadow-black/95 overflow-hidden text-white animate-in slide-in-from-bottom-5 duration-200">
          <div className="w-full h-full bg-[#06060a] rounded-[22px] overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-11 h-11 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm border border-white/30 font-bold text-white text-base">
                  BS
                </div>
                <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-[#0e0806]" />
              </div>
              <div>
                <h4 className="font-extrabold text-sm text-white flex items-center gap-1.5">
                  Suporte Oficial BRSMM
                  <ShieldCheck className="w-4 h-4 text-emerald-300" />
                </h4>
                <p className="text-[11px] text-emerald-100 flex items-center gap-1">
                  <span className="inline-block w-2 h-2 rounded-full bg-emerald-300 animate-ping" />
                  Online agora • Resposta rápida
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 rounded-xl bg-black/20 hover:bg-black/40 text-white transition-colors"
              aria-label="Fechar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
            {/* Agent Welcome Bubble */}
            <div className="p-3.5 rounded-2xl bg-zinc-900/90 border border-white/5 space-y-1.5 text-xs text-zinc-300">
              <p className="font-semibold text-white">
                👋 Olá! Seja muito bem-vindo ao BRSMM.
              </p>
              <p className="text-zinc-400 leading-relaxed">
                Nosso atendimento humano está disponível para te ajudar com recargas PIX, confirmação de pedidos e suporte técnico 24 horas por dia.
              </p>
              <div className="pt-2 flex items-center gap-3 text-[10px] text-emerald-400 font-medium">
                <span className="flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> 100% Sem Senha
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Início Rápido
                </span>
              </div>
            </div>

            {/* Quick action buttons */}
            <div className="space-y-1.5">
              <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-500 px-1">
                Selecione uma dúvida comum:
              </span>
              {quickQuestions.map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => handleOpenWhatsApp(q.text)}
                  className="w-full text-left p-2.5 rounded-xl bg-zinc-950 hover:bg-zinc-900 border border-white/5 hover:border-emerald-500/40 text-xs font-semibold text-zinc-200 transition-all flex items-center justify-between group"
                >
                  <span className="truncate pr-2">{q.title}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-zinc-500 group-hover:text-emerald-400 group-hover:translate-x-0.5 transition-all shrink-0" />
                </button>
              ))}
            </div>

            {/* Custom input */}
            <form onSubmit={handleSendCustom} className="pt-2 border-t border-white/5 space-y-2">
              <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-500 px-1">
                Ou digite sua mensagem:
              </span>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Escreva sua dúvida aqui..."
                  value={customMsg}
                  onChange={(e) => setCustomMsg(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-xl bg-zinc-950 border border-white/10 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 transition-colors"
                />
                <button
                  type="submit"
                  disabled={!customMsg.trim()}
                  className="p-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white transition-all shadow-md"
                  aria-label="Enviar"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </form>
          </div>

          {/* Footer note */}
          <div className="p-3 bg-zinc-950 text-center border-t border-white/5 text-[10px] text-zinc-500 flex items-center justify-center gap-1">
            <span>Atendimento seguro via WhatsApp Oficial</span>
            <ExternalLink className="w-3 h-3" />
          </div>
        </div>
      </div>
    )}

      {/* Floating Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="group relative flex items-center gap-2.5 px-4 py-3 rounded-full bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 text-white font-bold text-xs shadow-[0_4px_25px_rgba(16,185,129,0.4)] hover:shadow-[0_4px_35px_rgba(16,185,129,0.6)] hover:scale-105 active:scale-95 transition-all duration-300"
        aria-label="Suporte WhatsApp"
      >
        <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-400 border-2 border-[#070402]"></span>
        </span>

        <MessageCircle className="w-5 h-5 fill-white group-hover:rotate-12 transition-transform" />
        <span className="hidden sm:inline font-extrabold tracking-wide">
          {isOpen ? "Fechar Suporte" : "Suporte WhatsApp 24/7"}
        </span>
      </button>
    </div>
  );
}
