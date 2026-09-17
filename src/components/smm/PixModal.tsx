import { useState } from "react";
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
} from "lucide-react";

interface PixModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRechargeSuccess: (amount: number) => void;
  suggestedAmount?: number | undefined;
}

export function PixModal({
  isOpen,
  onClose,
  onRechargeSuccess,
  suggestedAmount,
}: PixModalProps) {
  const [selectedAmount, setSelectedAmount] = useState<number>(
    suggestedAmount && suggestedAmount > 20 ? suggestedAmount : 50
  );
  const [customAmount, setCustomAmount] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [step, setStep] = useState<"choose" | "payment" | "success">("choose");

  if (!isOpen) return null;

  const currentAmount = customAmount ? Number(customAmount) : selectedAmount;
  const bonus = currentAmount >= 50 ? currentAmount * 0.10 : 0;
  const totalCredited = currentAmount + bonus;

  const mockPixCode = `00020126580014br.gov.bcb.pix0136brsmm-pagamentos-pix-instantaneo-0215BRSMM-RECARGA520400005303986540${currentAmount.toFixed(2)}5802BR5915BRSMM PAGAMENTOS6009SAO PAULO62070503***6304`;

  const handleCopy = () => {
    navigator.clipboard.writeText(mockPixCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleSimulatePayment = () => {
    setStep("success");
    setTimeout(() => {
      onRechargeSuccess(totalCredited);
      onClose();
      setStep("choose");
    }, 1600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-3xl bg-[#0d0705] border border-amber-500/30 p-6 sm:p-8 relative shadow-2xl shadow-amber-500/10 text-white space-y-6">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-5 top-5 p-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
          aria-label="Fechar"
        >
          <X className="w-5 h-5" />
        </button>

        {step === "choose" && (
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center text-white shadow-lg shadow-orange-500/25">
                <Zap className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Recarga Instantânea via PIX</h3>
                <p className="text-xs text-zinc-400">Saldo creditado automaticamente em segundos</p>
              </div>
            </div>

            {/* Presets Grid */}
            <div>
              <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2.5">
                Escolha o Valor do Depósito
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {[20, 50, 100, 250].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => {
                      setSelectedAmount(val);
                      setCustomAmount("");
                    }}
                    className={`p-3 rounded-2xl border text-center transition-all ${
                      selectedAmount === val && !customAmount
                        ? "bg-amber-500/15 border-amber-500 text-white shadow-md shadow-amber-500/10 scale-[1.02]"
                        : "bg-zinc-950 border-white/5 text-zinc-400 hover:border-white/20"
                    }`}
                  >
                    <span className="text-lg font-black text-white block">
                      R$ {val}
                    </span>
                    {val >= 50 && (
                      <span className="text-[10px] font-bold text-emerald-400 block mt-0.5">
                        +10% Bônus
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Amount */}
            <div>
              <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
                Ou Digite Outro Valor (R$)
              </label>
              <input
                type="number"
                min={5}
                placeholder="Ex: 35,00"
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                className="w-full px-4 py-3.5 rounded-xl bg-zinc-950 border border-white/10 text-white font-bold text-sm focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* Bonus Banner */}
            {bonus > 0 && (
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/15 via-orange-500/15 to-emerald-500/15 border border-amber-500/20 text-xs flex items-center justify-between">
                <span className="text-amber-300 font-medium flex items-center gap-1.5">
                  <Flame className="w-4 h-4 text-orange-400" /> Bônus de Recarga (+10%):
                </span>
                <span className="font-extrabold text-emerald-400 text-sm">
                  +R$ {bonus.toFixed(2).replace(".", ",")} Grátis
                </span>
              </div>
            )}

            {/* Total to be credited */}
            <div className="p-4 rounded-2xl bg-zinc-950 border border-white/10 flex items-center justify-between">
              <div>
                <span className="text-xs text-zinc-400 block">Total a ser creditado:</span>
                <span className="text-2xl font-black text-emerald-400">
                  R$ {totalCredited.toFixed(2).replace(".", ",")}
                </span>
              </div>
              <div className="text-right text-xs text-zinc-400">
                <span>Valor a pagar:</span>
                <span className="block font-bold text-white text-base">
                  R$ {currentAmount.toFixed(2).replace(".", ",")}
                </span>
              </div>
            </div>

            <button
              onClick={() => setStep("payment")}
              disabled={currentAmount < 5}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-600 to-rose-600 hover:from-amber-400 hover:to-orange-500 text-white font-black text-sm shadow-xl shadow-orange-600/30 transition-all flex items-center justify-center gap-2"
            >
              <QrCode className="w-5 h-5" />
              <span>Gerar QR Code PIX</span>
            </button>
          </div>
        )}

        {step === "payment" && (
          <div className="space-y-5 text-center">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setStep("choose")}
                className="text-xs text-zinc-400 hover:text-white"
              >
                ← Alterar Valor
              </button>
              <span className="text-xs font-bold text-amber-400">
                Aguardando Pagamento...
              </span>
            </div>

            <h3 className="text-xl font-extrabold text-white">
              Pague R$ {currentAmount.toFixed(2).replace(".", ",")} com o PIX
            </h3>

            {/* Simulated QR Code Visual */}
            <div className="w-48 h-48 mx-auto bg-white p-3 rounded-2xl shadow-xl flex items-center justify-center">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
                  mockPixCode
                )}`}
                alt="QR Code PIX"
                className="w-full h-full object-contain"
              />
            </div>

            {/* Pix Copia e Cola */}
            <div className="space-y-2 text-left">
              <label className="text-xs font-semibold text-zinc-300 block">
                Chave PIX Copia e Cola
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={mockPixCode}
                  className="w-full px-3 py-2.5 rounded-xl bg-zinc-950 border border-white/10 text-zinc-400 text-xs font-mono truncate"
                />
                <button
                  onClick={handleCopy}
                  className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs shrink-0 flex items-center gap-1.5 transition-colors"
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

            {/* Simulated Action */}
            <button
              onClick={handleSimulatePayment}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-sm shadow-xl shadow-emerald-600/30 transition-all flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-5 h-5" />
              <span>Confirmar Pagamento Realizado</span>
            </button>
          </div>
        )}

        {step === "success" && (
          <div className="py-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto animate-bounce">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h3 className="text-2xl font-black text-white">
              PIX Confirmado com Sucesso!
            </h3>
            <p className="text-sm text-zinc-300">
              O valor de <strong className="text-emerald-400">R$ {totalCredited.toFixed(2).replace(".", ",")}</strong> foi creditado no seu saldo.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
