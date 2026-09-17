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
      {/* Aurora Ambient Background Glow */}
      <div className="absolute inset-0 pointer-events-none -z-10">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[700px] h-[450px] bg-gradient-to-tr from-orange-600/25 via-amber-500/20 to-rose-600/15 blur-[120px] rounded-full" />
        <div className="absolute top-48 -left-20 w-80 h-80 bg-orange-600/15 blur-[90px] rounded-full" />
        <div className="absolute top-72 -right-20 w-80 h-80 bg-cyan-600/10 blur-[90px] rounded-full" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_40%,#000_70%,transparent_100%)]" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto">
          {/* Top Pill Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/30 text-xs font-semibold text-orange-300 mb-6 shadow-sm shadow-orange-500/10">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
            </span>
            <span className="text-amber-200">Painel SMM Oficial</span>
            <span className="text-zinc-500">•</span>
            <span className="text-zinc-300">Instagram, TikTok, YouTube & Redes</span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white leading-[1.12]">
            Suba nas Redes Sociais com o{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-500 to-rose-400 drop-shadow-sm">
              Painel SMM do Brasil
            </span>
          </h1>

          {/* Subtitle */}
          <p className="mt-5 text-base sm:text-lg text-zinc-300 leading-relaxed max-w-2xl mx-auto">
            Seguidores, curtidas, visualizações e inscritos reais com entrega instantânea via <strong>PIX automatizado</strong>, reposição garantida e a melhor API do mercado.
          </p>

          {/* Supported Platforms Pill Row */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2 max-w-2xl mx-auto">
            {[
              { name: "Instagram", icon: Instagram, color: "text-[#E1306C] border-[#E1306C]/30 bg-[#E1306C]/10 hover:bg-[#E1306C]/20" },
              { name: "TikTok", icon: Music2, color: "text-[#00F2FE] border-[#00F2FE]/30 bg-[#00F2FE]/10 hover:bg-[#00F2FE]/20" },
              { name: "YouTube", icon: Youtube, color: "text-[#FF0000] border-[#FF0000]/30 bg-[#FF0000]/10 hover:bg-[#FF0000]/20" },
              { name: "Kwai", icon: Flame, color: "text-[#FF7700] border-[#FF7700]/30 bg-[#FF7700]/10 hover:bg-[#FF7700]/20" },
              { name: "X (Twitter)", icon: Twitter, color: "text-[#1DA1F2] border-[#1DA1F2]/30 bg-[#1DA1F2]/10 hover:bg-[#1DA1F2]/20" },
              { name: "Telegram & Zap", icon: Send, color: "text-[#2AABEE] border-[#2AABEE]/30 bg-[#2AABEE]/10 hover:bg-[#2AABEE]/20" },
              { name: "Spotify", icon: Headphones, color: "text-[#1DB954] border-[#1DB954]/30 bg-[#1DB954]/10 hover:bg-[#1DB954]/20" },
              { name: "Facebook", icon: Facebook, color: "text-[#1877F2] border-[#1877F2]/30 bg-[#1877F2]/10 hover:bg-[#1877F2]/20" },
              { name: "Twitch", icon: Twitch, color: "text-[#9146FF] border-[#9146FF]/30 bg-[#9146FF]/10 hover:bg-[#9146FF]/20" },
              { name: "Kick", icon: Tv, color: "text-[#53FC18] border-[#53FC18]/30 bg-[#53FC18]/10 hover:bg-[#53FC18]/20" },
            ].map((p, i) => {
              const Icon = p.icon;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => onScrollTo("order-form")}
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border transition-all duration-200 cursor-pointer shadow-sm ${p.color}`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{p.name}</span>
                </button>
              );
            })}
          </div>

          {/* Call to Actions */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
            <button
              onClick={() => onScrollTo("order-form")}
              className="w-full sm:w-auto px-7 py-3.5 rounded-2xl rgb-button font-black text-sm shadow-2xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 group"
            >
              <Zap className="w-4 h-4 text-amber-300 group-hover:scale-110 transition-transform" />
              <span>Fazer Pedido Agora</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </button>

            <button
              onClick={onOpenPixModal}
              className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-zinc-900/80 hover:bg-zinc-800/90 border border-emerald-500/30 hover:border-emerald-500 text-emerald-300 font-bold text-sm transition-all flex items-center justify-center gap-2 group"
            >
              <Sparkles className="w-4 h-4 text-emerald-400 group-hover:rotate-12 transition-transform" />
              <span>Recarregar Saldo (Bônus RGB)</span>
            </button>

            <button
              onClick={() => onScrollTo("services-table")}
              className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-zinc-900/80 hover:bg-zinc-800/90 border border-white/10 hover:border-white/20 text-zinc-200 font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2"
            >
              <TrendingUp className="w-4 h-4 text-amber-400" />
              <span>Ver Tabela de Preços</span>
            </button>
          </div>

          {/* Trust Guarantees Row */}
          <div className="mt-10 pt-8 border-t border-white/10 grid grid-cols-2 md:grid-cols-4 gap-4 text-left">
            <div className="flex items-center gap-3 p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
              <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-white">100% Sem Senha</p>
                <p className="text-[11px] text-zinc-400">Totalmente seguro</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
              <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-white">Início em Minutos</p>
                <p className="text-[11px] text-zinc-400">Entrega rápida</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
              <div className="w-9 h-9 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 shrink-0">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-white">PIX Imediato</p>
                <p className="text-[11px] text-zinc-400">Saldo cai na hora</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
              <div className="w-9 h-9 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 shrink-0">
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
    </section>
  );
}
