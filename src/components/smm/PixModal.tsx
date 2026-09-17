import { useState, useEffect } from "react";
import {
  X,
  QrCode,
  Copy,
  Check,
  Zap,
  ShieldCheck,
  Sparkles,
  Flame,
  CheckCircle2,
  CreditCard,
  Coins,
  Clock,
  ArrowRight,
  History,
  Wallet,
  Lock,
  RefreshCw,
} from "lucide-react";

export interface DepositHistoryItem {
  id: string;
  method: "PIX" | "Cartão" | "Crypto";
  amountPaid: number;
  bonusReceived: number;
  totalCredited: number;
  status: "Aprovado" | "Processando";
  timestamp: Date;
}

interface PixModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRechargeSuccess: (amount: number) => void;
  suggestedAmount?: number | undefined;
}

const DEPOSIT_HISTORY_KEY = "brsmm-deposit-history";

export function PixModal({
  isOpen,
  onClose,
  onRechargeSuccess,
  suggestedAmount,
}: PixModalProps) {
  const [activePaymentMethod, setActivePaymentMethod] = useState<"pix" | "card" | "crypto">("pix");
  const [activeSubView, setActiveSubView] = useState<"checkout" | "history">("checkout");
  const [selectedAmount, setSelectedAmount] = useState<number>(
    suggestedAmount && suggestedAmount > 20 ? suggestedAmount : 100
  );
  const [customAmount, setCustomAmount] = useState<string>("");
  const [step, setStep] = useState<"select" | "pay" | "success">("select");
  const [copied, setCopied] = useState(false);
  const [copiedCrypto, setCopiedCrypto] = useState(false);
  const [countdown, setCountdown] = useState(900); // 15:00 minutes
  const [isProcessing, setIsProcessing] = useState(false);
  const [depositHistory, setDepositHistory] = useState<DepositHistoryItem[]>([]);

  // Credit card form state
  const [cardNumber, setCardNumber] = useState("4532 •••• •••• 8829");
  const [cardHolder, setCardHolder] = useState("SEU NOME NO CARTAO");
  const [cardExpiry, setCardExpiry] = useState("12/28");
  const [cardCvv, setCardCvv] = useState("892");

  // Load deposit history from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(DEPOSIT_HISTORY_KEY);
      if (saved) {
        setDepositHistory(JSON.parse(saved));
      }
    } catch (e) {
      console.error("Erro ao carregar histórico:", e);
    }
  }, []);

  // Timer countdown when on payment screen
  useEffect(() => {
    let timer: any;
    if (step === "pay" && countdown > 0) {
      timer = setInterval(() => setCountdown((prev) => prev - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [step, countdown]);

  if (!isOpen) return null;

  const currentAmount = customAmount ? Math.max(5, Number(customAmount)) : selectedAmount;

  // Progressive RGB Tier Bonus
  const getBonusRate = (amount: number) => {
    if (amount >= 500) return 0.20; // +20%
    if (amount >= 250) return 0.15; // +15%
    if (amount >= 100) return 0.10; // +10%
    if (amount >= 50) return 0.05;  // +5%
    return 0;
  };

  const bonusRate = getBonusRate(currentAmount);
  const bonus = currentAmount * bonusRate;
  const totalCredited = currentAmount + bonus;

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const mockPixCode = `00020126580014br.gov.bcb.pix0136brsmm-pagamentos-rgb-pix-0215BRSMM-REC520400005303986540${currentAmount.toFixed(
    2
  )}5802BR5915BRSMM RECARGA6009SAO PAULO62070503***6304`;

  const usdtAddress = "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t";

  const handleCopyPix = () => {
    navigator.clipboard.writeText(mockPixCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyCrypto = () => {
    navigator.clipboard.writeText(usdtAddress);
    setCopiedCrypto(true);
    setTimeout(() => setCopiedCrypto(false), 2000);
  };

  const handleSimulatePayment = () => {
    setIsProcessing(true);

    setTimeout(() => {
      setIsProcessing(false);
      setStep("success");

      const newTx: DepositHistoryItem = {
        id: `TX-${Math.floor(100000 + Math.random() * 900000)}`,
        method: activePaymentMethod === "pix" ? "PIX" : activePaymentMethod === "card" ? "Cartão" : "Crypto",
        amountPaid: currentAmount,
        bonusReceived: bonus,
        totalCredited: totalCredited,
        status: "Aprovado",
        timestamp: new Date(),
      };

      const updatedHistory = [newTx, ...depositHistory];
      setDepositHistory(updatedHistory);
      try {
        localStorage.setItem(DEPOSIT_HISTORY_KEY, JSON.stringify(updatedHistory));
      } catch (e) {}

      setTimeout(() => {
        onRechargeSuccess(totalCredited);
        setStep("select");
        onClose();
      }, 1600);
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-xl animate-in fade-in duration-200">
      {/* Outer RGB Glow Wrapper */}
      <div className="w-full max-w-2xl rounded-[28px] p-[1.5px] rgb-gradient shadow-[0_0_50px_rgba(0,242,254,0.25)] relative">
        <div className="w-full h-full bg-[#090503] rounded-[26px] p-6 sm:p-8 text-white relative flex flex-col max-h-[92vh] overflow-hidden">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute right-5 top-5 p-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors z-20"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Header */}
          <div className="flex items-center justify-between pb-5 border-b border-white/10 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-zinc-900 border border-white/10 flex items-center justify-center relative group">
                <span className="absolute inset-0 rounded-2xl rgb-gradient opacity-50 blur-[6px]" />
                <Zap className="w-5 h-5 text-amber-300 relative z-10" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-black text-white tracking-tight">
                    Central de Recarga <span className="rgb-text">CYBER</span>
                  </h3>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Aprovação Instantânea
                  </span>
                </div>
                <p className="text-xs text-zinc-400">
                  Adicione saldo sem taxas com bônus RGB progressivo
                </p>
              </div>
            </div>

            {/* History Toggle */}
            <button
              onClick={() => setActiveSubView(activeSubView === "checkout" ? "history" : "checkout")}
              className="mr-10 px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-xs font-semibold text-zinc-300 hover:text-white transition-colors flex items-center gap-1.5"
            >
              <History className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Extrato</span>
            </button>
          </div>

          {/* Body Content */}
          <div className="overflow-y-auto space-y-6 pt-5 pr-1 flex-1">
            {activeSubView === "history" ? (
              /* Transaction History View */
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-300">
                    Extrato de Recargas Recentes
                  </h4>
                  <button
                    onClick={() => setActiveSubView("checkout")}
                    className="text-xs text-amber-400 hover:underline font-semibold"
                  >
                    ← Voltar para Nova Recarga
                  </button>
                </div>

                {depositHistory.length > 0 ? (
                  <div className="space-y-3">
                    {depositHistory.map((item) => (
                      <div
                        key={item.id}
                        className="p-4 rounded-2xl bg-zinc-950 border border-white/5 flex items-center justify-between"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-amber-400">
                              {item.id}
                            </span>
                            <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-white/5 text-zinc-300">
                              {item.method}
                            </span>
                          </div>
                          <p className="text-[11px] text-zinc-500">
                            {new Date(item.timestamp).toLocaleString("pt-BR")}
                          </p>
                        </div>

                        <div className="text-right">
                          <span className="text-sm font-black text-emerald-400 block">
                            +R$ {item.totalCredited.toFixed(2).replace(".", ",")}
                          </span>
                          {item.bonusReceived > 0 && (
                            <span className="text-[10px] text-zinc-400">
                              (R$ {item.amountPaid.toFixed(2)} + R$ {item.bonusReceived.toFixed(2)} bônus)
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-12 text-center text-zinc-500 text-xs">
                    Nenhuma recarga registrada ainda. Faça seu primeiro depósito para ganhar bônus!
                  </div>
                )}
              </div>
            ) : (
              /* Main Checkout Flow */
              <>
                {step === "select" && (
                  <div className="space-y-6">
                    {/* Payment Method Selector */}
                    <div>
                      <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2.5">
                        1. Método de Pagamento
                      </label>
                      <div className="grid grid-cols-3 gap-2.5">
                        <button
                          type="button"
                          onClick={() => setActivePaymentMethod("pix")}
                          className={`p-3 rounded-2xl border text-center transition-all flex flex-col items-center gap-1.5 ${
                            activePaymentMethod === "pix"
                              ? "bg-zinc-900 border-amber-500/60 shadow-lg shadow-amber-500/10 text-white scale-[1.02]"
                              : "bg-zinc-950 border-white/5 text-zinc-400 hover:border-white/20"
                          }`}
                        >
                          <Zap className="w-5 h-5 text-amber-400" />
                          <span className="text-xs font-bold">PIX Instantâneo</span>
                          <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-wider">
                            +Rápido
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setActivePaymentMethod("card")}
                          className={`p-3 rounded-2xl border text-center transition-all flex flex-col items-center gap-1.5 ${
                            activePaymentMethod === "card"
                              ? "bg-zinc-900 border-sky-500/60 shadow-lg shadow-sky-500/10 text-white scale-[1.02]"
                              : "bg-zinc-950 border-white/5 text-zinc-400 hover:border-white/20"
                          }`}
                        >
                          <CreditCard className="w-5 h-5 text-sky-400" />
                          <span className="text-xs font-bold">Cartão de Crédito</span>
                          <span className="text-[9px] text-zinc-400">Até 12x</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setActivePaymentMethod("crypto")}
                          className={`p-3 rounded-2xl border text-center transition-all flex flex-col items-center gap-1.5 ${
                            activePaymentMethod === "crypto"
                              ? "bg-zinc-900 border-emerald-500/60 shadow-lg shadow-emerald-500/10 text-white scale-[1.02]"
                              : "bg-zinc-950 border-white/5 text-zinc-400 hover:border-white/20"
                          }`}
                        >
                          <Coins className="w-5 h-5 text-emerald-400" />
                          <span className="text-xs font-bold">Cripto (USDT)</span>
                          <span className="text-[9px] text-zinc-400">TRC-20</span>
                        </button>
                      </div>
                    </div>

                    {/* Futuristic RGB Tiers Grid */}
                    <div>
                      <div className="flex items-center justify-between mb-2.5">
                        <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                          2. Escolha o Valor da Recarga
                        </label>
                        <span className="text-[11px] text-amber-400 font-semibold flex items-center gap-1">
                          <Sparkles className="w-3.5 h-3.5" /> Bônus Automático
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                        {[
                          { val: 20, bonusText: "Básico" },
                          { val: 50, bonusText: "+5% RGB" },
                          { val: 100, bonusText: "+10% VIP" },
                          { val: 250, bonusText: "+15% PRO" },
                          { val: 500, bonusText: "+20% ELITE" },
                        ].map((tier) => (
                          <button
                            key={tier.val}
                            type="button"
                            onClick={() => {
                              setSelectedAmount(tier.val);
                              setCustomAmount("");
                            }}
                            className={`p-3 rounded-2xl border text-center transition-all relative overflow-hidden ${
                              selectedAmount === tier.val && !customAmount
                                ? "bg-zinc-900 border-amber-500 text-white shadow-lg shadow-amber-500/20 scale-[1.03]"
                                : "bg-zinc-950 border-white/5 text-zinc-400 hover:border-white/20"
                            }`}
                          >
                            <span className="text-base font-black text-white block">
                              R$ {tier.val}
                            </span>
                            <span className="text-[10px] font-bold text-amber-300 block mt-0.5">
                              {tier.bonusText}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Custom Amount Field */}
                    <div>
                      <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                        Ou Digite um Valor Customizado (R$)
                      </label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 font-bold text-sm">
                          R$
                        </span>
                        <input
                          type="number"
                          min={5}
                          placeholder="Ex: 75,00"
                          value={customAmount}
                          onChange={(e) => setCustomAmount(e.target.value)}
                          className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-zinc-950 border border-white/10 text-white font-bold text-base focus:outline-none focus:border-amber-500 transition-colors"
                        />
                      </div>
                    </div>

                    {/* Live Calculation Glass Box */}
                    <div className="p-5 rounded-2xl bg-zinc-950/80 border border-white/10 space-y-3">
                      <div className="flex items-center justify-between text-xs text-zinc-400">
                        <span>Valor do Depósito:</span>
                        <span className="font-bold text-white">
                          R$ {currentAmount.toFixed(2).replace(".", ",")}
                        </span>
                      </div>

                      {bonus > 0 ? (
                        <div className="flex items-center justify-between text-xs text-emerald-400 font-semibold">
                          <span className="flex items-center gap-1.5">
                            <Flame className="w-4 h-4 text-orange-400 animate-pulse" />
                            Bônus Cyber (+{(bonusRate * 100).toFixed(0)}%):
                          </span>
                          <span className="font-black">
                            +R$ {bonus.toFixed(2).replace(".", ",")} GRÁTIS
                          </span>
                        </div>
                      ) : (
                        <div className="text-[11px] text-zinc-500 flex items-center justify-between">
                          <span>Dica: Depósitos a partir de R$ 50 ganham bônus RGB extra!</span>
                        </div>
                      )}

                      <div className="pt-3 border-t border-white/5 flex items-center justify-between">
                        <div>
                          <span className="text-xs font-semibold text-zinc-400 block">
                            Total Creditado na Conta:
                          </span>
                          <span className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400">
                            R$ {totalCredited.toFixed(2).replace(".", ",")}
                          </span>
                        </div>
                        <span className="text-[11px] font-mono text-zinc-400 px-2.5 py-1 rounded-lg bg-white/5">
                          Saldo 100% vitalício
                        </span>
                      </div>
                    </div>

                    {/* Proceed Button */}
                    <button
                      onClick={() => setStep("pay")}
                      disabled={currentAmount < 5}
                      className="w-full py-4 rounded-2xl rgb-button font-black text-sm shadow-2xl flex items-center justify-center gap-2 group hover:scale-[1.01] active:scale-[0.99]"
                    >
                      <Zap className="w-5 h-5 text-amber-300 group-hover:rotate-12 transition-transform" />
                      <span>Continuar para Pagamento (R$ {currentAmount.toFixed(2).replace(".", ",")})</span>
                      <ArrowRight className="w-4 h-4 text-white" />
                    </button>
                  </div>
                )}

                {step === "pay" && (
                  <div className="space-y-6 text-center">
                    {/* Top Bar with Timer */}
                    <div className="flex items-center justify-between pb-3 border-b border-white/10 text-xs">
                      <button
                        onClick={() => setStep("select")}
                        className="text-zinc-400 hover:text-white flex items-center gap-1 font-semibold"
                      >
                        ← Alterar Valor
                      </button>
                      <span className="font-mono font-bold text-amber-400 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20">
                        <Clock className="w-3.5 h-3.5" /> Expira em: {formatTime(countdown)}
                      </span>
                    </div>

                    {/* PIX SCREEN */}
                    {activePaymentMethod === "pix" && (
                      <div className="space-y-5">
                        <h4 className="text-lg font-extrabold text-white">
                          Pague R$ {currentAmount.toFixed(2).replace(".", ",")} via PIX
                        </h4>

                        {/* QR Code in Cyber Glass Frame */}
                        <div className="relative inline-block p-4 rounded-3xl bg-white shadow-[0_0_40px_rgba(255,255,255,0.15)]">
                          <img
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
                              mockPixCode
                            )}`}
                            alt="QR Code PIX"
                            className="w-44 h-44 object-contain"
                          />
                        </div>

                        {/* PIX Copia e Cola */}
                        <div className="space-y-2 text-left">
                          <label className="text-xs font-semibold text-zinc-300 block">
                            Chave PIX Copia e Cola
                          </label>
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              readOnly
                              value={mockPixCode}
                              className="flex-1 px-3.5 py-3 rounded-xl bg-zinc-950 border border-white/10 text-zinc-300 text-xs font-mono truncate"
                            />
                            <button
                              onClick={handleCopyPix}
                              className="px-4 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs shrink-0 flex items-center gap-1.5 transition-colors border border-white/10"
                            >
                              {copied ? (
                                <>
                                  <Check className="w-4 h-4 text-emerald-400" /> Copiado!
                                </>
                              ) : (
                                <>
                                  <Copy className="w-4 h-4" /> Copiar
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* CREDIT CARD SCREEN */}
                    {activePaymentMethod === "card" && (
                      <div className="space-y-5 text-left">
                        {/* 3D Holographic Cyber Card Visual */}
                        <div className="p-6 rounded-3xl bg-gradient-to-tr from-zinc-950 via-zinc-900 to-black border border-white/15 relative overflow-hidden shadow-2xl space-y-4">
                          <div className="absolute inset-0 rgb-gradient opacity-10 blur-xl pointer-events-none" />
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-xs text-amber-400 font-bold">CYBER CARD</span>
                            <CreditCard className="w-6 h-6 text-zinc-400" />
                          </div>
                          <div className="font-mono text-xl tracking-widest text-white font-bold py-2">
                            {cardNumber}
                          </div>
                          <div className="flex items-center justify-between text-xs text-zinc-400">
                            <div>
                              <span className="text-[9px] uppercase block">Titular</span>
                              <span className="font-bold text-white uppercase">{cardHolder}</span>
                            </div>
                            <div>
                              <span className="text-[9px] uppercase block">Validade</span>
                              <span className="font-bold text-white">{cardExpiry}</span>
                            </div>
                          </div>
                        </div>

                        {/* Card Inputs */}
                        <div className="space-y-3 text-xs">
                          <div>
                            <label className="text-zinc-400 font-medium block mb-1">Número do Cartão</label>
                            <input
                              type="text"
                              value={cardNumber}
                              onChange={(e) => setCardNumber(e.target.value)}
                              className="w-full px-3 py-2.5 rounded-xl bg-zinc-950 border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-sky-500"
                            />
                          </div>

                          <div>
                            <label className="text-zinc-400 font-medium block mb-1">Nome no Cartão</label>
                            <input
                              type="text"
                              value={cardHolder}
                              onChange={(e) => setCardHolder(e.target.value.toUpperCase())}
                              className="w-full px-3 py-2.5 rounded-xl bg-zinc-950 border border-white/10 text-white text-xs focus:outline-none focus:border-sky-500"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-zinc-400 font-medium block mb-1">Validade (MM/AA)</label>
                              <input
                                type="text"
                                value={cardExpiry}
                                onChange={(e) => setCardExpiry(e.target.value)}
                                className="w-full px-3 py-2.5 rounded-xl bg-zinc-950 border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-sky-500"
                              />
                            </div>
                            <div>
                              <label className="text-zinc-400 font-medium block mb-1">CVV</label>
                              <input
                                type="text"
                                value={cardCvv}
                                onChange={(e) => setCardCvv(e.target.value)}
                                className="w-full px-3 py-2.5 rounded-xl bg-zinc-950 border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-sky-500"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* CRYPTO SCREEN */}
                    {activePaymentMethod === "crypto" && (
                      <div className="space-y-5 text-left">
                        <div className="p-4 rounded-2xl bg-zinc-950 border border-white/10 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-white">USDT (Tether - TRC-20)</span>
                            <span className="text-xs font-mono font-bold text-emerald-400">
                              ~${(currentAmount / 5.5).toFixed(2)} USDT
                            </span>
                          </div>
                          <div className="p-3 rounded-xl bg-black border border-white/5 font-mono text-[11px] text-zinc-300 break-all flex items-center justify-between gap-2">
                            <span>{usdtAddress}</span>
                            <button
                              onClick={handleCopyCrypto}
                              className="p-1.5 rounded-lg bg-zinc-800 text-white shrink-0 hover:bg-zinc-700"
                            >
                              {copiedCrypto ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Instant Confirmation Button */}
                    <button
                      onClick={handleSimulatePayment}
                      disabled={isProcessing}
                      className="w-full py-4 rounded-2xl rgb-button font-black text-sm shadow-xl flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99] transition-all"
                    >
                      {isProcessing ? (
                        <>
                          <RefreshCw className="w-5 h-5 animate-spin" />
                          <span>Validando Pagamento Bancário...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                          <span>Confirmar Pagamento Realizado</span>
                        </>
                      )}
                    </button>
                  </div>
                )}

                {step === "success" && (
                  <div className="py-10 text-center space-y-4 animate-in zoom-in-95 duration-200">
                    <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto">
                      <CheckCircle2 className="w-10 h-10" />
                    </div>
                    <h3 className="text-2xl font-black text-white">
                      Depósito Aprovado com Sucesso!
                    </h3>
                    <p className="text-sm text-zinc-300">
                      O valor total de <strong className="text-emerald-400 font-extrabold">R$ {totalCredited.toFixed(2).replace(".", ",")}</strong> foi creditado instantaneamente no seu saldo.
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
