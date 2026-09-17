import { Sparkles, ShieldCheck, Heart, MessageCircle } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-white/10 bg-[#050302] pt-16 pb-12 text-zinc-400 text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 pb-12 border-b border-white/5">
          {/* Col 1: Brand info */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-orange-600 via-amber-500 to-yellow-400 p-[1.5px]">
                <div className="w-full h-full bg-[#0d0705] rounded-[10px] flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                </div>
              </div>
              <span className="font-extrabold text-lg text-white font-sans">
                BR<span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-400">SMM</span>
              </span>
            </div>

            <p className="text-zinc-400 text-xs leading-relaxed max-w-sm">
              O maior e mais barato painel de revenda SMM do Brasil.
              Seguidores, curtidas, visualizações e engajamento para alavancar seu perfil e negócio em tempo recorde.
            </p>

            <div className="flex items-center gap-2 text-[11px] text-zinc-500">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Conexão Criptografada SSL 256-bits • 100% Seguro</span>
            </div>
          </div>

          {/* Col 2: Serviços Populares */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">
              Serviços Populares
            </h4>
            <ul className="space-y-2 text-zinc-400">
              <li><a href="#order-form" className="hover:text-amber-400 transition-colors">Seguidores Instagram</a></li>
              <li><a href="#order-form" className="hover:text-amber-400 transition-colors">Visualizações Reels</a></li>
              <li><a href="#order-form" className="hover:text-amber-400 transition-colors">Seguidores TikTok</a></li>
              <li><a href="#order-form" className="hover:text-amber-400 transition-colors">Inscritos YouTube</a></li>
              <li><a href="#order-form" className="hover:text-amber-400 transition-colors">Membros Telegram</a></li>
            </ul>
          </div>

          {/* Col 3: Plataformas */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">
              Redes Atendidas
            </h4>
            <ul className="space-y-2 text-zinc-400">
              <li><a href="#order-form" className="hover:text-amber-400 transition-colors">Instagram</a></li>
              <li><a href="#order-form" className="hover:text-amber-400 transition-colors">TikTok</a></li>
              <li><a href="#order-form" className="hover:text-amber-400 transition-colors">YouTube</a></li>
              <li><a href="#order-form" className="hover:text-amber-400 transition-colors">Kwai</a></li>
              <li><a href="#order-form" className="hover:text-amber-400 transition-colors">Spotify</a></li>
            </ul>
          </div>

          {/* Col 4: Métodos de Pagamento */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">
              Pagamentos Aceitos
            </h4>
            <div className="space-y-2 text-zinc-400">
              <div className="flex items-center gap-2">
                <span className="px-2 py-1 rounded bg-zinc-900 border border-white/5 text-[10px] font-bold text-emerald-400">
                  PIX Automático
                </span>
                <span className="text-[11px] text-zinc-400">Aprovação imediata</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-1 rounded bg-zinc-900 border border-white/5 text-[10px] font-bold text-sky-400">
                  Cartão de Crédito
                </span>
                <span className="text-[11px] text-zinc-400">Até 12x</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-1 rounded bg-zinc-900 border border-white/5 text-[10px] font-bold text-amber-400">
                  Criptomoedas
                </span>
                <span className="text-[11px] text-zinc-400">USDT / BTC</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom copyright */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-zinc-500 text-[11px]">
          <p>© {new Date().getFullYear()} BRSMM — Todos os direitos reservados. Painel SMM do Brasil.</p>
          <div className="flex items-center gap-4">
            <span className="hover:text-zinc-400 transition-colors">Termos de Uso</span>
            <span>•</span>
            <span className="hover:text-zinc-400 transition-colors">Política de Privacidade</span>
            <span>•</span>
            <span className="hover:text-zinc-400 transition-colors">Documentação API</span>
          </div>
        </div>
      </div>

      {/* Floating WhatsApp Support Button */}
      <a
        href="https://wa.me/5511999999999?text=Ol%C3%A1%2C%20gostaria%20de%20tirar%20uma%20d%C3%BAvida%20sobre%20o%20painel%20BRSMM"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2.5 px-4 py-3 rounded-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold text-xs shadow-2xl shadow-emerald-500/40 hover:scale-105 active:scale-95 transition-all duration-200"
      >
        <MessageCircle className="w-5 h-5" />
        <span className="hidden sm:inline">Suporte WhatsApp 24/7</span>
      </a>
    </footer>
  );
}
