import {
  Sparkles,
  Zap,
  ShieldCheck,
  Clock,
  ArrowRight,
  TrendingUp,
  Award,
  Instagram,
  Youtube,
  Music2,
  Flame,
  Twitter,
  Send,
  Headphones,
  Facebook,
  Twitch,
  Tv,
} from "lucide-react";

interface HeroSectionProps {
  onScrollTo: (id: string) => void;
  onOpenPixModal: () => void;
}

export function HeroSection({ onScrollTo, onOpenPixModal }: HeroSectionProps) {
  return (
    <section id="hero" className="relative overflow-hidden pt-12 pb-20 md:pt-16 md:pb-28">
      {/* Necromancer Ethereal Dark Aura Background */}
      <div className="absolute inset-0 pointer-events-none -z-10">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[850px] h-[500px] bg-gradient-to-tr from-purple-900/20 via-cyan-900/15 to-emerald-950/20 blur-[140px] rounded-full necromancer-aura" />
        <div className="absolute top-48 -left-20 w-80 h-80 bg-violet-950/25 blur-[110px] rounded-full" />
        <div className="absolute top-72 -right-20 w-80 h-80 bg-cyan-950/20 blur-[110px] rounded-full" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_40%,#000_70%,transparent_100%)]" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto">
          {/* Top Pill Badge with Micro RGB Glow */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full necromancer-pill text-xs font-semibold text-zinc-200 mb-6 shadow-lg shadow-black/40">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
            </span>
            <span className="text-zinc-100 font-bold">Painel Oficial BRSMM</span>
            <span className="text-zinc-600">•</span>
            <span className="text-zinc-400">Instagram, TikTok, YouTube & Redes</span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white leading-[1.12]">
            Suba nas Redes Sociais com o{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-400 to-rose-400 drop-shadow-sm">
              Painel SMM do Brasil
            </span>
          </h1>

          {/* Subtitle */}
          <p className="mt-5 text-base sm:text-lg text-zinc-300 leading-relaxed max-w-2xl mx-auto">
            Seguidores, curtidas, visualizações e inscritos reais com entrega instantânea via <strong className="text-white">PIX automatizado</strong>, reposição garantida e a melhor API do mercado.
          </p>

          {/* Supported Platforms Pill Row */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2 max-w-2xl mx-auto">
            {[
              { name: "Instagram", icon: Instagram, color: "text-[#E1306C]" },
              { name: "TikTok", icon: Music2, color: "text-[#00F2FE]" },
              { name: "YouTube", icon: Youtube, color: "text-[#FF0000]" },
              { name: "Kwai", icon: Flame, color: "text-[#FF7700]" },
              { name: "X (Twitter)", icon: Twitter, color: "text-[#1DA1F2]" },
              { name: "Telegram & Zap", icon: Send, color: "text-[#2AABEE]" },
              { name: "Spotify", icon: Headphones, color: "text-[#1DB954]" },
              { name: "Facebook", icon: Facebook, color: "text-[#1877F2]" },
              { name: "Twitch", icon: Twitch, color: "text-[#9146FF]" },
              { name: "Kick", icon: Tv, color: "text-[#53FC18]" },
            ].map((p, i) => {
              const Icon = p.icon;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => onScrollTo("order-form")}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full necromancer-pill text-xs font-bold transition-all duration-200 cursor-pointer shadow-sm hover:scale-105 active:scale-95"
                >
                  <Icon className={`w-3.5 h-3.5 ${p.color}`} />
                  <span className="text-zinc-200">{p.name}</span>
                </button>
              );
            })}
          </div>

          {/* Call to Actions */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
            <button
              onClick={() => onScrollTo("order-form")}
              className="w-full sm:w-auto px-7 py-3.5 rounded-2xl rgb-button font-black text-sm shadow-2xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 group cursor-pointer"
            >
              <Zap className="w-4 h-4 text-cyan-300 group-hover:scale-110 transition-transform" />
              <span>Fazer Pedido Agora</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </button>

            <button
              onClick={onOpenPixModal}
              className="w-full sm:w-auto px-6 py-3.5 rounded-2xl necromancer-pill text-emerald-300 font-bold text-sm transition-all flex items-center justify-center gap-2 group cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
            >
              <Sparkles className="w-4 h-4 text-emerald-400 group-hover:rotate-12 transition-transform" />
              <span>Recarregar Saldo (Bônus PIX)</span>
            </button>

            <button
              onClick={() => onScrollTo("services-table")}
              className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-zinc-950/80 hover:bg-zinc-900 border border-white/10 hover:border-white/20 text-zinc-300 font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer"
            >
              <TrendingUp className="w-4 h-4 text-purple-400" />
              <span>Tabela de Preços</span>
            </button>
          </div>

          {/* Trust Guarantees Row with Minimalist RGB Cards */}
          <div className="mt-10 pt-8 border-t border-white/10 grid grid-cols-2 md:grid-cols-4 gap-3.5 text-left">
            <div className="necromancer-card p-3 sm:p-3.5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-white">100% Sem Senha</p>
                  <p className="text-[11px] text-zinc-400">Totalmente seguro</p>
                </div>
              </div>
            </div>

            <div className="necromancer-card p-3 sm:p-3.5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 shrink-0">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-white">Início em Minutos</p>
                  <p className="text-[11px] text-zinc-400">Entrega rápida</p>
                </div>
              </div>
            </div>

            <div className="necromancer-card p-3 sm:p-3.5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-white">PIX Imediato</p>
                  <p className="text-[11px] text-zinc-400">Saldo cai na hora</p>
                </div>
              </div>
            </div>

            <div className="necromancer-card p-3 sm:p-3.5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 shrink-0">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-white">Garantia 30 Dias</p>
                  <p className="text-[11px] text-zinc-400">Reposição grátis</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
