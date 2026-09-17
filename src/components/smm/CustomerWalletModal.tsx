import { useState } from "react";
import {
  X,
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  Zap,
  Clock,
  ShieldCheck,
  FileText,
  Copy,
  Check,
  TrendingUp,
  Receipt,
  Download,
} from "lucide-react";
import { DepositHistoryItem } from "./PixModal";
import { OrderItem } from "./OrderTracker";

interface CustomerWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  balance: number;
  onOpenPixModal: () => void;
  depositHistory: DepositHistoryItem[];
  orders: OrderItem[];
}

export function CustomerWalletModal({
  isOpen,
  onClose,
  balance,
  onOpenPixModal,
  depositHistory,
  orders,
}: CustomerWalletModalProps) {
  const [filter, setFilter] = useState<"all" | "deposits" | "orders">("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  if (!isOpen) return null;

  // Calculate totals
  const totalDeposited = depositHistory.reduce(
    (acc, curr) => acc + (curr.totalCredited || 0),
    0
  );
  const totalSpent = orders.reduce((acc, curr) => acc + (curr.totalPrice || 0), 0);

  // Combine deposits and orders into unified ledger
  const unifiedLedger = [
    ...depositHistory.map((d) => ({
      id: d.id,
      type: "deposit" as const,
      description: `Recarga via ${d.method} (${d.bonusReceived > 0 ? `+R$ ${d.bonusReceived.toFixed(2)} bônus` : "Sem bônus"})`,
      amount: d.totalCredited,
      date: new Date(d.timestamp),
      status: d.status,
      receiptDetails: `Comprovante de Depósito: ${d.id} | Método: ${d.method} | Valor: R$ ${d.totalCredited.toFixed(2)}`,
    })),
    ...orders.map((o) => ({
      id: o.id,
      type: "order" as const,
      description: `${o.serviceName} (${o.quantity.toLocaleString("pt-BR")} un)`,
      amount: -o.totalPrice,
      date: new Date(o.createdAt),
      status: o.status,
      receiptDetails: `Comprovante de Pedido: ${o.id} | Serviço: ${o.serviceName} | Quantidade: ${o.quantity} | Total: R$ ${o.totalPrice.toFixed(2)}`,
    })),
  ].sort((a, b) => b.date.getTime() - a.date.getTime());

  const filteredLedger = unifiedLedger.filter((item) => {
    if (filter === "deposits") return item.type === "deposit";
    if (filter === "orders") return item.type === "order";
    return true;
  });

  const handleCopyReceipt = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/90 backdrop-blur-xl animate-in fade-in duration-200">
      <div className="w-full max-w-3xl necromancer-card p-6 sm:p-8 relative shadow-2xl shadow-black/95 text-white space-y-6 max-h-[90vh] flex flex-col overflow-hidden">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-5 top-5 p-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors z-10"
          aria-label="Fechar"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3.5 pb-4 border-b border-white/10 shrink-0">
          <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-emerald-500/30 flex items-center justify-center shadow-lg shadow-emerald-500/10">
            <Wallet className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
              Carteira & Extrato Financeiro
            </h3>
            <p className="text-xs text-zinc-400">
              Controle seguro de saldo, recargas PIX e pedidos realizados
            </p>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 shrink-0">
          {/* Current Balance */}
          <div className="p-4 rounded-2xl bg-zinc-950/90 border border-emerald-500/30 relative overflow-hidden">
            <div className="flex items-center justify-between text-xs text-zinc-400 mb-1">
              <span>Saldo Disponível</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            </div>
            <div className="text-2xl font-black text-emerald-400">
              R$ {balance.toFixed(2).replace(".", ",")}
            </div>
            <p className="text-[10px] text-zinc-500 mt-1">Livre para novos pedidos</p>
          </div>

          {/* Total Deposited */}
          <div className="p-4 rounded-2xl bg-zinc-950/90 border border-white/10">
            <div className="flex items-center justify-between text-xs text-zinc-400 mb-1">
              <span>Total Recarregado</span>
              <ArrowDownLeft className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-black text-white">
              R$ {totalDeposited.toFixed(2).replace(".", ",")}
            </div>
            <p className="text-[10px] text-zinc-500 mt-1">100% via PIX / Seguro</p>
          </div>

          {/* Total Spent */}
          <div className="p-4 rounded-2xl bg-zinc-950/90 border border-white/10">
            <div className="flex items-center justify-between text-xs text-zinc-400 mb-1">
              <span>Total em Pedidos</span>
              <ArrowUpRight className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-black text-white">
              R$ {totalSpent.toFixed(2).replace(".", ",")}
            </div>
            <p className="text-[10px] text-zinc-500 mt-1">{orders.length} serviços entregues</p>
          </div>
        </div>

        {/* Quick Deposit Banner */}
        <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-transparent border border-amber-500/25 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <Zap className="w-5 h-5 text-amber-400 shrink-0" />
            <div className="text-xs">
              <span className="font-bold text-white block">Precisa de mais seguidores ou curtidas?</span>
              <span className="text-zinc-400">Depósitos via PIX caem em segundos com até +20% de bônus</span>
            </div>
          </div>
          <button
            onClick={() => {
              onClose();
              onOpenPixModal();
            }}
            className="px-4 py-2 rounded-xl rgb-button text-xs font-bold text-white shrink-0 hover:scale-105 transition-transform"
          >
            Adicionar Saldo
          </button>
        </div>

        {/* Tabs and Filter */}
        <div className="flex items-center justify-between border-b border-white/10 pb-2 shrink-0">
          <div className="flex items-center gap-2">
            {[
              { id: "all", label: "Todas as Transações" },
              { id: "deposits", label: "Recargas (+)" },
              { id: "orders", label: "Pedidos (-)" },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setFilter(t.id as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                  filter === t.id
                    ? "bg-zinc-800 text-white border border-white/15"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <span className="text-[11px] text-zinc-500 font-mono">
            {filteredLedger.length} registro(s)
          </span>
        </div>

        {/* Ledger List */}
        <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
          {filteredLedger.length > 0 ? (
            filteredLedger.map((item) => {
              const isDep = item.type === "deposit";
              return (
                <div
                  key={item.id}
                  className="p-3.5 rounded-2xl bg-zinc-950/80 border border-white/5 hover:border-white/15 flex items-center justify-between gap-3 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        isDep
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                      }`}
                    >
                      {isDep ? (
                        <ArrowDownLeft className="w-5 h-5" />
                      ) : (
                        <ArrowUpRight className="w-5 h-5" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-white">
                          {item.id}
                        </span>
                        <span
                          className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded ${
                            isDep
                              ? "bg-emerald-500/20 text-emerald-300"
                              : "bg-sky-500/20 text-sky-300"
                          }`}
                        >
                          {item.status}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-300 font-medium truncate max-w-[280px] sm:max-w-md">
                        {item.description}
                      </p>
                      <span className="text-[10px] text-zinc-500">
                        {item.date.toLocaleDateString("pt-BR")} às{" "}
                        {item.date.toLocaleTimeString("pt-BR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <span
                        className={`text-sm font-black block ${
                          isDep ? "text-emerald-400" : "text-zinc-300"
                        }`}
                      >
                        {isDep ? "+" : ""}R${" "}
                        {Math.abs(item.amount).toFixed(2).replace(".", ",")}
                      </span>
                    </div>

                    <button
                      onClick={() => handleCopyReceipt(item.receiptDetails, item.id)}
                      title="Copiar Comprovante"
                      className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-white/5 transition-colors"
                    >
                      {copiedId === item.id ? (
                        <Check className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="py-12 text-center text-zinc-500 text-xs space-y-2">
              <Receipt className="w-8 h-8 mx-auto text-zinc-600" />
              <p>Nenhuma transação encontrada neste filtro.</p>
            </div>
          )}
        </div>

        {/* Security Disclosures */}
        <div className="pt-3 border-t border-white/10 flex items-center justify-between text-[11px] text-zinc-500 shrink-0">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" /> Saldo Protegido & Sem Validade
          </span>
          <span>Transações Criptografadas 256-Bit</span>
        </div>
      </div>
    </div>
  );
}
