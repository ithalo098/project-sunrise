import { useState } from "react";
import { OrderItem } from "./OrderTracker";
import {
  Package,
  ExternalLink,
  Copy,
  Check,
  Clock,
  ShieldCheck,
  CheckCircle2,
  RefreshCw,
  MessageCircle,
  PlusCircle,
} from "lucide-react";

interface RecentOrdersSectionProps {
  orders: OrderItem[];
  onOpenTracker: () => void;
  onOpenWhatsAppSupport?: ((msg: string) => void) | undefined;
  onScrollToOrderForm: () => void;
}

export function RecentOrdersSection({
  orders,
  onOpenTracker,
  onOpenWhatsAppSupport,
  onScrollToOrderForm,
}: RecentOrdersSectionProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <section id="recent-orders" className="py-12 relative scroll-mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="necromancer-card p-6 sm:p-8 shadow-2xl relative">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0 shadow-lg shadow-cyan-500/10">
                <Package className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                    Meus Pedidos Realizados
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-bold font-mono">
                    {orders.length} {orders.length === 1 ? "pedido" : "pedidos"}
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-zinc-400 mt-0.5">
                  Histórico e fila de entrega dos seus envios em tempo real.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={onOpenTracker}
                className="px-4 py-2.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/40 text-cyan-300 font-bold text-xs flex items-center gap-2 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Rastrear na API & Refill</span>
              </button>
            </div>
          </div>

          {/* Orders Content */}
          {orders.length === 0 ? (
            <div className="py-12 text-center max-w-md mx-auto space-y-4">
              <div className="w-14 h-14 rounded-full bg-zinc-900 border border-white/10 flex items-center justify-center mx-auto text-zinc-500">
                <Package className="w-7 h-7" />
              </div>
              <div>
                <h4 className="text-base font-bold text-white">
                  Nenhum pedido encontrado neste navegador
                </h4>
                <p className="text-xs text-zinc-400 mt-1">
                  Assim que você confirmar um pedido no formulário acima, ele aparecerá aqui instantaneamente com status de envio em tempo real.
                </p>
              </div>
              <button
                type="button"
                onClick={onScrollToOrderForm}
                className="px-4 py-2.5 rounded-xl rgb-button text-white font-bold text-xs inline-flex items-center gap-2"
              >
                <PlusCircle className="w-4 h-4 text-cyan-400" />
                <span>Fazer um Pedido de Teste</span>
              </button>
            </div>
          ) : (
            <div className="mt-6 space-y-3">
              {orders.map((order) => {
                const isCopied = copiedId === order.id;
                const formattedReceipt = `
🧾 COMPROVANTE OFICIAL DE PEDIDO - BRSMM
------------------------------------------------
Protocolo: ${order.id}
${order.providerOrderId ? `ID Provedor: #${order.providerOrderId}\n` : ""}Serviço: ${order.serviceName}
Destino: ${order.link}
Quantidade: ${order.quantity.toLocaleString("pt-BR")} unidades
Valor Total: R$ ${order.totalPrice.toFixed(2).replace(".", ",")}
Data: ${new Date(order.createdAt).toLocaleString("pt-BR")}
Status: ${order.status}
------------------------------------------------
Suporte 24h WhatsApp BRSMM Oficial
`.trim();

                return (
                  <div
                    key={order.id}
                    className="p-4 sm:p-5 rounded-2xl bg-[#04050a] border border-white/10 hover:border-cyan-500/30 transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                  >
                    {/* Left Info */}
                    <div className="flex-1 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono font-bold text-amber-400 text-xs px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center gap-1.5">
                          {order.id}
                        </span>
                        {order.providerOrderId && (
                          <span className="font-mono text-cyan-300 text-xs px-2 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
                            Provedor #{order.providerOrderId}
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-semibold">
                          <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
                          {order.status || "Processando"}
                        </span>
                        <span className="text-[11px] text-zinc-500 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-zinc-500" />
                          {new Date(order.createdAt).toLocaleTimeString("pt-BR", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>

                      <div>
                        <h5 className="text-sm font-bold text-white leading-snug">
                          {order.serviceName}
                        </h5>
                        <p className="text-xs text-cyan-400 mt-0.5 truncate max-w-xl flex items-center gap-1 font-mono">
                          <span>Destino:</span>
                          <span className="underline">{order.link}</span>
                        </p>
                      </div>
                    </div>

                    {/* Middle: Quantity & Price */}
                    <div className="flex items-center gap-6 sm:gap-8 border-t lg:border-t-0 lg:border-l border-white/5 pt-3 lg:pt-0 lg:pl-6 shrink-0">
                      <div>
                        <span className="text-[10px] text-zinc-500 block uppercase font-medium">
                          Quantidade
                        </span>
                        <span className="text-sm font-bold text-zinc-200">
                          {order.quantity.toLocaleString("pt-BR")} un.
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-zinc-500 block uppercase font-medium">
                          Valor Pago
                        </span>
                        <span className="text-sm font-black text-emerald-400">
                          R$ {order.totalPrice.toFixed(2).replace(".", ",")}
                        </span>
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-2 border-t lg:border-t-0 border-white/5 pt-3 lg:pt-0 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleCopy(order.id, formattedReceipt)}
                        title="Copiar comprovante"
                        className="px-3 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-zinc-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
                      >
                        {isCopied ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Copiado!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5 text-zinc-400" />
                            <span>Comprovante</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={onOpenTracker}
                        className="px-3.5 py-2 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 font-bold text-xs flex items-center gap-1.5 transition-colors"
                      >
                        <span>Rastrear</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          const msg = `Olá! Gostaria de suporte sobre meu pedido ${order.id} (${order.serviceName}) no BRSMM.`;
                          if (onOpenWhatsAppSupport) {
                            onOpenWhatsAppSupport(msg);
                          } else {
                            window.open(
                              `https://wa.me/5511999999999?text=${encodeURIComponent(msg)}`,
                              "_blank"
                            );
                          }
                        }}
                        title="Dúvida via WhatsApp"
                        className="p-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 transition-colors"
                      >
                        <MessageCircle className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
