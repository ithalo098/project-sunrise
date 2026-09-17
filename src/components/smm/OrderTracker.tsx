import { useState } from "react";
import { X, Search, ShieldCheck, Clock, CheckCircle2, ArrowRight } from "lucide-react";

export interface OrderItem {
  id: string;
  serviceName: string;
  link: string;
  quantity: number;
  totalPrice: number;
  status: string;
  createdAt: Date;
}

interface OrderTrackerProps {
  isOpen: boolean;
  onClose: () => void;
  orders: OrderItem[];
}

export function OrderTracker({ isOpen, onClose, orders }: OrderTrackerProps) {
  const [query, setQuery] = useState("");

  if (!isOpen) return null;

  // Demo initial orders if user has none yet
  const allOrders: OrderItem[] = orders.length > 0 ? orders : [
    {
      id: "BRSMM-829104",
      serviceName: "Seguidores Brasileiros Reais [Alta Qualidade]",
      link: "@loja_modafit",
      quantity: 2500,
      totalPrice: 37.25,
      status: "Em Andamento",
      createdAt: new Date(Date.now() - 1000 * 60 * 25),
    },
    {
      id: "BRSMM-719320",
      serviceName: "Visualizações de Reels [Alta Retenção]",
      link: "https://instagram.com/reel/C89x...",
      quantity: 10000,
      totalPrice: 12.00,
      status: "Concluído",
      createdAt: new Date(Date.now() - 1000 * 60 * 120),
    },
  ];

  const filtered = allOrders.filter(
    (o) =>
      o.id.toLowerCase().includes(query.toLowerCase()) ||
      o.link.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-2xl rounded-3xl bg-[#0d0705] border border-white/15 p-6 sm:p-8 relative shadow-2xl text-white space-y-6 max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10 shrink-0">
          <div>
            <h3 className="text-xl font-bold text-white">Rastreamento de Pedidos</h3>
            <p className="text-xs text-zinc-400">
              Acompanhe o status e entrega em tempo real
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="relative shrink-0">
          <Search className="w-4 h-4 text-zinc-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Digite o código do pedido (ex: BRSMM-...) ou @usuário"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-3 rounded-xl bg-zinc-950 border border-white/10 text-white text-xs sm:text-sm focus:outline-none focus:border-amber-500"
          />
        </div>

        {/* Orders list */}
        <div className="overflow-y-auto space-y-4 pr-1">
          {filtered.map((order) => {
            const isFinished = order.status === "Concluído";
            return (
              <div
                key={order.id}
                className="p-5 rounded-2xl bg-zinc-950 border border-white/5 space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="font-mono text-xs font-bold text-amber-400">
                      #{order.id}
                    </span>
                    <h4 className="text-sm font-bold text-white mt-0.5">
                      {order.serviceName}
                    </h4>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Destino: <span className="text-zinc-200 font-medium">{order.link}</span>
                    </p>
                  </div>
                  <span
                    className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${
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
                      className={`h-full rounded-full ${
                        isFinished
                          ? "w-full bg-emerald-500"
                          : "w-2/3 bg-gradient-to-r from-amber-500 to-orange-500"
                      }`}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-zinc-500">
                    <span>Quantidade: {order.quantity.toLocaleString("pt-BR")}</span>
                    <span>Total: R$ {order.totalPrice.toFixed(2).replace(".", ",")}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
