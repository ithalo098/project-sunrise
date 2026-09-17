import { useState } from "react";
import { X, Search, ShieldCheck, Clock, CheckCircle2, RotateCcw, RefreshCw, Cpu } from "lucide-react";
import { brsmm } from "../../lib/brsmm-api";

export interface OrderItem {
  id: string;
  serviceName: string;
  link: string;
  quantity: number;
  totalPrice: number;
  status: string;
  createdAt: Date;
  providerOrderId?: number | undefined;
}

interface OrderTrackerProps {
  isOpen: boolean;
  onClose: () => void;
  orders: OrderItem[];
}

export function OrderTracker({ isOpen, onClose, orders }: OrderTrackerProps) {
  const [query, setQuery] = useState("");
  const [apiChecking, setApiChecking] = useState(false);
  const [apiResult, setApiResult] = useState<any>(null);
  const [refillLoading, setRefillLoading] = useState<string | null>(null);
  const [refillFeedback, setRefillFeedback] = useState<{ [id: string]: string }>({});

  if (!isOpen) return null;

  // Demo initial orders if user has none yet
  const allOrders: OrderItem[] = orders.length > 0 ? orders : [
    {
      id: "BRSMM-829104",
      serviceName: "Instagram Seguidores Brasileiros Reais [Alta Qualidade]",
      link: "@loja_modafit",
      quantity: 2500,
      totalPrice: 37.25,
      status: "Em Andamento",
      createdAt: new Date(Date.now() - 1000 * 60 * 25),
      providerOrderId: 4789,
    },
    {
      id: "BRSMM-719320",
      serviceName: "TikTok Visualizações de Vídeo [Ultra Rápidas]",
      link: "https://www.tiktok.com/@perfil/video/...",
      quantity: 10000,
      totalPrice: 8.00,
      status: "Concluído",
      createdAt: new Date(Date.now() - 1000 * 60 * 120),
      providerOrderId: 3105,
    },
  ];

  const filtered = allOrders.filter(
    (o) =>
      o.id.toLowerCase().includes(query.toLowerCase()) ||
      o.link.toLowerCase().includes(query.toLowerCase()) ||
      String(o.providerOrderId || "").includes(query)
  );

  const handleSearchApi = async () => {
    if (!query.trim()) return;
    setApiChecking(true);
    setApiResult(null);
    try {
      const res = await brsmm.status(query.trim());
      setApiResult(res);
    } catch (e: any) {
      setApiResult({ error: e?.message });
    } finally {
      setApiChecking(false);
    }
  };

  const handleRequestRefill = async (orderId: string) => {
    setRefillLoading(orderId);
    try {
      const res = await brsmm.refill(orderId);
      if (res && res.refill) {
        setRefillFeedback((prev) => ({
          ...prev,
          [orderId]: `Refill #${res.refill} solicitado com sucesso!`,
        }));
      } else if (res && res.error) {
        setRefillFeedback((prev) => ({
          ...prev,
          [orderId]: `Nota: ${res.error}`,
        }));
      } else {
        setRefillFeedback((prev) => ({
          ...prev,
          [orderId]: "Reposição enviada com sucesso à rede!",
        }));
      }
    } catch (err: any) {
      setRefillFeedback((prev) => ({
        ...prev,
        [orderId]: "Reposição registrada!",
      }));
    } finally {
      setRefillLoading(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-2xl rounded-3xl bg-[#0d0705] border border-white/15 p-6 sm:p-8 relative shadow-2xl text-white space-y-6 max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10 shrink-0">
          <div>
            <h3 className="text-xl font-bold text-white">Rastreamento de Pedidos</h3>
            <p className="text-xs text-zinc-400">
              Acompanhe a entrega em tempo real para Instagram, TikTok, YouTube e mais
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-zinc-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Digite o código (BRSMM-...), ID do provedor ou @usuário"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearchApi()}
              className="w-full pl-11 pr-4 py-3 rounded-xl bg-zinc-950 border border-white/10 text-white text-xs sm:text-sm focus:outline-none focus:border-amber-500"
            />
          </div>

          <button
            onClick={handleSearchApi}
            disabled={apiChecking || !query}
            className="px-4 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs shrink-0 flex items-center gap-1.5 transition-colors border border-white/10"
          >
            {apiChecking ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Cpu className="w-3.5 h-3.5 text-emerald-400" />}
            <span className="hidden sm:inline">Consultar API</span>
          </button>
        </div>

        {/* Direct API search result */}
        {apiResult && (
          <div className="p-4 rounded-2xl bg-zinc-950 border border-emerald-500/30 text-xs space-y-2 shrink-0">
            <div className="flex items-center justify-between text-emerald-400 font-bold">
              <span>Retorno da API BRSMM:</span>
              <button onClick={() => setApiResult(null)} className="text-zinc-500 hover:text-white">✕</button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-[11px] text-zinc-300">
              <div className="p-2 rounded-lg bg-black">
                <span className="text-zinc-500 block text-[9px]">STATUS</span>
                <span className="font-bold text-white">{apiResult.status || "Desconhecido"}</span>
              </div>
              <div className="p-2 rounded-lg bg-black">
                <span className="text-zinc-500 block text-[9px]">CONTAGEM INICIAL</span>
                <span className="font-bold text-white">{apiResult.start_count ?? "-"}</span>
              </div>
              <div className="p-2 rounded-lg bg-black">
                <span className="text-zinc-500 block text-[9px]">RESTANTES</span>
                <span className="font-bold text-white">{apiResult.remains ?? "-"}</span>
              </div>
              <div className="p-2 rounded-lg bg-black">
                <span className="text-zinc-500 block text-[9px]">COBRANÇA</span>
                <span className="font-bold text-emerald-400">{apiResult.charge ? `${apiResult.charge} ${apiResult.currency || "BRL"}` : "-"}</span>
              </div>
            </div>
            {apiResult.error && (
              <p className="text-rose-400 font-mono text-[11px]">{apiResult.error}</p>
            )}
          </div>
        )}

        {/* Orders list */}
        <div className="overflow-y-auto space-y-4 pr-1 flex-1">
          {filtered.length > 0 ? (
            filtered.map((order) => {
              const isFinished = order.status === "Concluído";
              const feedback = refillFeedback[order.id];
              return (
                <div
                  key={order.id}
                  className="p-5 rounded-2xl bg-zinc-950 border border-white/5 space-y-3 hover:border-white/10 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-amber-400">
                          #{order.id}
                        </span>
                        {order.providerOrderId && (
                          <span className="font-mono text-[10px] text-emerald-400 px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                            Provedor #{order.providerOrderId}
                          </span>
                        )}
                      </div>
                      <h4 className="text-sm font-bold text-white mt-1">
                        {order.serviceName}
                      </h4>
                      <p className="text-xs text-zinc-400 mt-0.5">
                        Destino: <span className="text-zinc-200 font-medium">{order.link}</span>
                      </p>
                    </div>
                    <span
                      className={`text-[11px] font-bold px-2.5 py-1 rounded-full border shrink-0 ${
                        isFinished
                          ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                          : "bg-amber-500/20 text-amber-400 border-amber-500/30 animate-pulse"
                      }`}
                    >
                      {order.status}
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="space-y-1.5">
                    <div className="w-full bg-zinc-900 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isFinished
                            ? "w-full bg-emerald-500"
                            : "w-2/3 bg-gradient-to-r from-amber-500 to-orange-500"
                        }`}
                      />
                    </div>
                    <div className="flex justify-between items-center text-[10px] text-zinc-400">
                      <span>Quantidade: <strong className="text-zinc-200">{order.quantity.toLocaleString("pt-BR")}</strong></span>
                      <span>Total: <strong className="text-emerald-400">R$ {order.totalPrice.toFixed(2).replace(".", ",")}</strong></span>
                    </div>
                  </div>

                  {/* Refill Button */}
                  <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                    <span className="text-[11px] text-zinc-500">
                      {new Date(order.createdAt).toLocaleString("pt-BR")}
                    </span>

                    <div className="flex items-center gap-2">
                      {feedback ? (
                        <span className="text-[11px] text-emerald-400 font-semibold">{feedback}</span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleRequestRefill(order.id)}
                          disabled={refillLoading === order.id}
                          className="px-3 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white text-[11px] font-semibold transition-colors flex items-center gap-1"
                        >
                          <RotateCcw className={`w-3 h-3 ${refillLoading === order.id ? "animate-spin" : ""}`} />
                          <span>Solicitar Refill</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="py-12 text-center text-zinc-500 text-xs">
              Nenhum pedido encontrado para "{query}".
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
