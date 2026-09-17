import { useState } from "react";
import { Sparkles, ShieldCheck, Heart, MessageCircle, Lock, RotateCcw, FileText, X } from "lucide-react";

export function Footer() {
  const [activeModal, setActiveModal] = useState<"terms" | "privacy" | "refund" | null>(null);

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
              O maior e mais estruturado painel de revenda e compra de serviços sociais do Brasil.
              Seguidores, curtidas, visualizações e engajamento com entrega automatizada via PIX e servidores de alta performance.
            </p>

            <div className="space-y-1.5 pt-1">
              <div className="flex items-center gap-2 text-[11px] text-zinc-400">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Conexão Criptografada SSL 256-Bit • 100% Seguro</span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-zinc-400">
                <Lock className="w-4 h-4 text-sky-400 shrink-0" />
                <span>Privacidade Absoluta: Nunca solicitamos sua senha</span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-zinc-400">
                <RotateCcw className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Garantia de Saldo: Estorno em caso de link inválido</span>
              </div>
            </div>
          </div>

          {/* Col 2: Serviços Populares */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">
              Serviços Populares
            </h4>
            <ul className="space-y-2 text-zinc-400">
              <li><a href="#order-form" className="hover:text-amber-400 transition-colors">Seguidores Brasileiros</a></li>
              <li><a href="#order-form" className="hover:text-amber-400 transition-colors">Visualizações Reels</a></li>
              <li><a href="#order-form" className="hover:text-amber-400 transition-colors">Seguidores TikTok</a></li>
              <li><a href="#order-form" className="hover:text-amber-400 transition-colors">Inscritos YouTube</a></li>
              <li><a href="#order-form" className="hover:text-amber-400 transition-colors">Ouvintes Spotify</a></li>
            </ul>
          </div>

          {/* Col 3: Plataformas */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">
              Redes Atendidas
            </h4>
            <ul className="space-y-2 text-zinc-400">
              <li><a href="#order-form" className="hover:text-amber-400 transition-colors">Instagram & Reels</a></li>
              <li><a href="#order-form" className="hover:text-amber-400 transition-colors">TikTok & Lives</a></li>
              <li><a href="#order-form" className="hover:text-amber-400 transition-colors">YouTube & Shorts</a></li>
              <li><a href="#order-form" className="hover:text-amber-400 transition-colors">Kwai & Twitter/X</a></li>
              <li><a href="#order-form" className="hover:text-amber-400 transition-colors">Twitch & Kick</a></li>
            </ul>
          </div>

          {/* Col 4: Métodos de Pagamento & Segurança */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">
              Pagamentos & Segurança
            </h4>
            <div className="space-y-2 text-zinc-400">
              <div className="flex items-center gap-2">
                <span className="px-2 py-1 rounded bg-zinc-900 border border-emerald-500/30 text-[10px] font-bold text-emerald-400">
                  PIX Automático
                </span>
                <span className="text-[11px] text-zinc-400">Cai em 5 segundos</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-1 rounded bg-zinc-900 border border-sky-500/30 text-[10px] font-bold text-sky-400">
                  Cartão de Crédito
                </span>
                <span className="text-[11px] text-zinc-400">Até 12x seguro</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-1 rounded bg-zinc-900 border border-amber-500/30 text-[10px] font-bold text-amber-400">
                  Cripto (USDT)
                </span>
                <span className="text-[11px] text-zinc-400">Rede TRC-20</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom copyright and legal modals */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-zinc-500 text-[11px]">
          <p>© {new Date().getFullYear()} BRSMM Brasil — Todos os direitos reservados. Plataforma de Serviços de Mídia Social.</p>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setActiveModal("terms")}
              className="hover:text-zinc-300 transition-colors underline-offset-4 hover:underline"
            >
              Termos de Uso
            </button>
            <span>•</span>
            <button
              onClick={() => setActiveModal("refund")}
              className="hover:text-zinc-300 transition-colors underline-offset-4 hover:underline"
            >
              Garantia & Reembolso
            </button>
            <span>•</span>
            <button
              onClick={() => setActiveModal("privacy")}
              className="hover:text-zinc-300 transition-colors underline-offset-4 hover:underline"
            >
              Privacidade LGPD
            </button>
          </div>
        </div>
      </div>

      {/* Terms of Service Modal */}
      {activeModal === "terms" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl animate-in fade-in duration-200">
          <div className="w-full max-w-2xl rounded-[28px] bg-[#0c0705] border border-white/15 p-6 sm:p-8 relative shadow-2xl text-white space-y-4 max-h-[85vh] overflow-y-auto">
            <button
              onClick={() => setActiveModal(null)}
              className="absolute right-5 top-5 p-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-xl font-black text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-amber-400" /> Termos de Uso do Serviço BRSMM
            </h3>
            <div className="space-y-3 text-xs text-zinc-300 leading-relaxed">
              <p>
                <strong>1. Aceitação dos Termos:</strong> Ao utilizar o painel BRSMM, recarregar saldo ou contratar qualquer serviço de mídia social, você concorda plenamente com as condições aqui estabelecidas.
              </p>
              <p>
                <strong>2. Segurança e Sem Senha:</strong> O BRSMM NUNCA solicita senhas de perfis ou contas sociais. Você é responsável apenas por fornecer o link ou nome de usuário (@) correto e público.
              </p>
              <p>
                <strong>3. Perfis Públicos:</strong> Durante a execução dos pedidos, a conta de destino deve permanecer em modo PÚBLICO. Pedidos enviados para perfis privados que não puderem ser entregues não são reembolsáveis até que o perfil seja tornado público.
              </p>
              <p>
                <strong>4. Responsabilidade:</strong> O usuário é o único responsável pela observância das diretrizes das plataformas sociais utilizadas.
              </p>
            </div>
            <button
              onClick={() => setActiveModal(null)}
              className="w-full py-3 rounded-xl rgb-button font-bold text-xs"
            >
              Entendido e Fechar
            </button>
          </div>
        </div>
      )}

      {/* Refund Policy Modal */}
      {activeModal === "refund" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl animate-in fade-in duration-200">
          <div className="w-full max-w-2xl rounded-[28px] bg-[#0c0705] border border-white/15 p-6 sm:p-8 relative shadow-2xl text-white space-y-4 max-h-[85vh] overflow-y-auto">
            <button
              onClick={() => setActiveModal(null)}
              className="absolute right-5 top-5 p-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-xl font-black text-white flex items-center gap-2">
              <RotateCcw className="w-5 h-5 text-emerald-400" /> Política de Garantia e Reembolso
            </h3>
            <div className="space-y-3 text-xs text-zinc-300 leading-relaxed">
              <p>
                <strong>1. Saldo Vitalício:</strong> O saldo recarregado via PIX, Cartão ou Criptomoeda não expira e fica disponível permanentemente na sua carteira para utilização em qualquer serviço.
              </p>
              <p>
                <strong>2. Estorno por Inconsistência de Link:</strong> Caso um pedido não possa ser concluído devido a indisponibilidade temporária do provedor ou erro de processamento, o valor integral do pedido é automaticamente estornado para o saldo da sua carteira.
              </p>
              <p>
                <strong>3. Garantia de Reposição (Refill):</strong> Para serviços marcados com "Refill Ativo" (30 ou 365 dias), caso ocorra queda natural do número de seguidores/curtidas, o cliente pode solicitar a reposição gratuita diretamente no painel de rastreamento de pedidos ou via suporte WhatsApp.
              </p>
            </div>
            <button
              onClick={() => setActiveModal(null)}
              className="w-full py-3 rounded-xl rgb-button font-bold text-xs"
            >
              Entendido e Fechar
            </button>
          </div>
        </div>
      )}

      {/* Privacy LGPD Modal */}
      {activeModal === "privacy" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl animate-in fade-in duration-200">
          <div className="w-full max-w-2xl rounded-[28px] bg-[#0c0705] border border-white/15 p-6 sm:p-8 relative shadow-2xl text-white space-y-4 max-h-[85vh] overflow-y-auto">
            <button
              onClick={() => setActiveModal(null)}
              className="absolute right-5 top-5 p-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-xl font-black text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-sky-400" /> Política de Privacidade & LGPD
            </h3>
            <div className="space-y-3 text-xs text-zinc-300 leading-relaxed">
              <p>
                <strong>1. Confidencialidade Absoluta:</strong> Todos os links, nomes de usuário e transações financeiras são mantidos sob rigoroso sigilo. Jamais compartilhamos seus dados com terceiros.
              </p>
              <p>
                <strong>2. Criptografia de Dados:</strong> Todas as comunicações entre seu navegador e nossos servidores são protegidas por criptografia SSL 256-Bit de nível bancário.
              </p>
              <p>
                <strong>3. Conformidade LGPD:</strong> Tratamos dados estritamente para viabilizar a entrega dos serviços e emissão dos comprovantes solicitados pelo cliente.
              </p>
            </div>
            <button
              onClick={() => setActiveModal(null)}
              className="w-full py-3 rounded-xl rgb-button font-bold text-xs"
            >
              Entendido e Fechar
            </button>
          </div>
        </div>
      )}
    </footer>
  );
}
