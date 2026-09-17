import { useState } from "react";
import {
  Wallet,
  PlusCircle,
  TrendingUp,
  Search,
  Shield,
  HelpCircle,
  Menu,
  X,
  Sparkles,
  Flame,
  ArrowRight,
} from "lucide-react";

interface NavbarProps {
  balance: number;
  onOpenPixModal: () => void;
  onOpenTracker: () => void;
  onOpenApiStatus: () => void;
  onScrollTo: (id: string) => void;
}

export function Navbar({
  balance,
  onOpenPixModal,
  onOpenTracker,
  onOpenApiStatus,
  onScrollTo,
}: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-[#070402]/85 backdrop-blur-xl transition-all duration-300">
      {/* Top Notification Banner */}
      <div className="bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-rose-500/20 px-4 py-1.5 border-b border-orange-500/20 text-center text-xs font-medium text-amber-200 flex items-center justify-center gap-2">
        <span className="inline-flex items-center gap-1 rounded-full bg-orange-500/30 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-orange-300">
          <Flame className="w-3 h-3 text-orange-400 fill-orange-400" /> Promoção PIX
        </span>
        <span>Ganhe <strong>+10% de saldo extra</strong> em recargas via PIX a partir de R$ 50 hoje!</span>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Brand Logo */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => onScrollTo("hero")}
              className="flex items-center gap-3 text-left group"
            >
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-orange-600 via-amber-500 to-yellow-400 p-[2px] shadow-lg shadow-orange-500/20 group-hover:shadow-orange-500/40 transition-all duration-300">
                <div className="w-full h-full bg-[#0d0705] rounded-[14px] flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-amber-400 group-hover:scale-110 transition-transform duration-300" />
                </div>
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-xl tracking-tight text-white font-sans">
                    BR<span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-400 to-rose-400">SMM</span>
                  </span>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    Brasil
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400 font-medium tracking-wide">
                  #1 Painel de Redes Sociais
                </p>
              </div>
            </button>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-7 text-sm font-medium text-zinc-300">
            <button
              onClick={() => onScrollTo("order-form")}
              className="hover:text-amber-400 transition-colors flex items-center gap-1.5"
            >
              <PlusCircle className="w-4 h-4 text-amber-400" />
              Novo Pedido
            </button>
            <button
              onClick={() => onScrollTo("services-table")}
              className="hover:text-amber-400 transition-colors flex items-center gap-1.5"
            >
              <Search className="w-4 h-4 text-zinc-400" />
              Serviços & Preços
            </button>
            <button
              onClick={() => onScrollTo("profit-calc")}
              className="hover:text-amber-400 transition-colors flex items-center gap-1.5"
            >
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              Calculadora de Revenda
            </button>
            <button
              onClick={onOpenApiStatus}
              className="hover:text-amber-400 transition-colors flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-emerald-300 font-bold text-xs">API BRSMM</span>
            </button>
            <button
              onClick={onOpenTracker}
              className="hover:text-amber-400 transition-colors flex items-center gap-1.5"
            >
              <Shield className="w-4 h-4 text-sky-400" />
              Rastrear Pedido
            </button>
            <button
              onClick={() => onScrollTo("faq")}
              className="hover:text-amber-400 transition-colors flex items-center gap-1.5"
            >
              <HelpCircle className="w-4 h-4 text-zinc-400" />
              Dúvidas (FAQ)
            </button>
          </nav>

          {/* Action Buttons: Balance & Recharge */}
          <div className="hidden sm:flex items-center gap-3">
            {/* Balance Badge */}
            <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-zinc-900/90 border border-white/10 text-xs">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <Wallet className="w-3.5 h-3.5" />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] text-zinc-400 font-medium uppercase leading-tight">
                  Seu Saldo
                </span>
                <span className="text-sm font-bold text-emerald-400 leading-tight">
                  R$ {balance.toFixed(2).replace(".", ",")}
                </span>
              </div>
            </div>

            {/* Recharge PIX Button */}
            <button
              onClick={onOpenPixModal}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white font-semibold text-xs shadow-lg shadow-orange-600/25 hover:shadow-orange-600/40 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200"
            >
              <PlusCircle className="w-4 h-4" />
              Recarregar via PIX
            </button>
          </div>

          {/* Mobile Hamburger Button */}
          <div className="flex items-center gap-2 sm:hidden">
            <button
              onClick={onOpenPixModal}
              className="px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold text-xs flex items-center gap-1"
            >
              <Wallet className="w-3.5 h-3.5" />
              R$ {balance.toFixed(2).replace(".", ",")}
            </button>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl bg-zinc-900 border border-white/10 text-zinc-300 hover:text-white"
              aria-label="Abrir menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-white/10 bg-[#0b0604] px-4 pt-3 pb-6 space-y-3 animate-in slide-in-from-top-4 duration-200">
          <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-900/90 border border-white/10 mb-3">
            <div>
              <p className="text-xs text-zinc-400">Saldo Atual</p>
              <p className="text-base font-bold text-emerald-400">
                R$ {balance.toFixed(2).replace(".", ",")}
              </p>
            </div>
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenPixModal();
              }}
              className="px-3 py-1.5 rounded-lg bg-orange-600 text-white text-xs font-semibold flex items-center gap-1.5"
            >
              <PlusCircle className="w-3.5 h-3.5" /> Recarregar PIX
            </button>
          </div>

          <div className="flex flex-col space-y-2 text-sm font-medium text-zinc-300">
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onScrollTo("order-form");
              }}
              className="text-left px-3 py-2 rounded-lg hover:bg-white/5 flex items-center justify-between"
            >
              <span className="flex items-center gap-2">
                <PlusCircle className="w-4 h-4 text-amber-400" /> Fazer Novo Pedido
              </span>
              <ArrowRight className="w-4 h-4 text-zinc-500" />
            </button>
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onScrollTo("services-table");
              }}
              className="text-left px-3 py-2 rounded-lg hover:bg-white/5 flex items-center justify-between"
            >
              <span className="flex items-center gap-2">
                <Search className="w-4 h-4 text-zinc-400" /> Tabela de Preços
              </span>
              <ArrowRight className="w-4 h-4 text-zinc-500" />
            </button>
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onScrollTo("profit-calc");
              }}
              className="text-left px-3 py-2 rounded-lg hover:bg-white/5 flex items-center justify-between"
            >
              <span className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-400" /> Simulador de Revenda
              </span>
              <ArrowRight className="w-4 h-4 text-zinc-500" />
            </button>
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenApiStatus();
              }}
              className="text-left px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between"
            >
              <span className="flex items-center gap-2 text-emerald-300 font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> API BRSMM Conectada
              </span>
              <ArrowRight className="w-4 h-4 text-emerald-400" />
            </button>
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenTracker();
              }}
              className="text-left px-3 py-2 rounded-lg hover:bg-white/5 flex items-center justify-between"
            >
              <span className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-sky-400" /> Rastrear Pedido
              </span>
              <ArrowRight className="w-4 h-4 text-zinc-500" />
            </button>
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onScrollTo("faq");
              }}
              className="text-left px-3 py-2 rounded-lg hover:bg-white/5 flex items-center justify-between"
            >
              <span className="flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-zinc-400" /> Perguntas Frequentes
              </span>
              <ArrowRight className="w-4 h-4 text-zinc-500" />
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
