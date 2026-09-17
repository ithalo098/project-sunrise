import { useState, useMemo } from "react";
import { TrendingUp, DollarSign, Sparkles, ShoppingCart, Percent } from "lucide-react";

export function ProfitCalculator() {
  const [costPrice, setCostPrice] = useState<number>(14.90); // default cost for 1k followers
  const [resellPrice, setResellPrice] = useState<number>(45.00); // default resale price
  const [salesPerDay, setSalesPerDay] = useState<number>(4);

  const profitPerSale = useMemo(() => {
    return Math.max(0, resellPrice - costPrice);
  }, [resellPrice, costPrice]);

  const dailyProfit = useMemo(() => {
    return profitPerSale * salesPerDay;
  }, [profitPerSale, salesPerDay]);

  const monthlyProfit = useMemo(() => {
    return dailyProfit * 30;
  }, [dailyProfit]);

  const profitMargin = useMemo(() => {
    if (costPrice <= 0) return 0;
    return ((resellPrice - costPrice) / costPrice) * 100;
  }, [resellPrice, costPrice]);

  return (
    <section id="profit-calc" className="py-16 md:py-24 relative overflow-hidden">
      {/* Background radial glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-emerald-500/10 blur-[130px] rounded-full pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs font-semibold text-emerald-400 mb-3">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Oportunidade de Renda Extra & Agências</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            Simulador de Lucro para Revenda
          </h2>
          <p className="mt-3 text-sm sm:text-base text-zinc-400">
            Veja quanto você pode faturar todos os meses revendendo seguidores e curtidas com preço de fornecedor.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center max-w-5xl mx-auto">
          {/* Controls Column */}
          <div className="lg:col-span-7 rounded-3xl bg-zinc-900/80 backdrop-blur-xl border border-white/10 p-6 sm:p-8 space-y-6 shadow-2xl shadow-black/60">
            {/* Service Selection */}
            <div>
              <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
                1. Serviço que você vai revender
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {[
                  { name: "Seguidores Instagram (1k)", cost: 14.90, defSell: 45.00 },
                  { name: "Curtidas Instagram (1k)", cost: 4.90, defSell: 19.90 },
                  { name: "Visualizações Reels (10k)", cost: 12.00, defSell: 39.90 },
                  { name: "Seguidores TikTok (1k)", cost: 18.90, defSell: 50.00 },
                ].map((item, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      setCostPrice(item.cost);
                      setResellPrice(item.defSell);
                    }}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      costPrice === item.cost
                        ? "bg-amber-500/10 border-amber-500/50 text-white"
                        : "bg-zinc-950 border-white/5 text-zinc-400 hover:border-white/20"
                    }`}
                  >
                    <p className="text-xs font-bold text-white">{item.name}</p>
                    <p className="text-[11px] text-zinc-400 mt-0.5">
                      Custo BRSMM: <span className="text-amber-400 font-semibold">R$ {item.cost.toFixed(2).replace(".", ",")}</span>
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* Slider Resale Price */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                  2. Por quanto você vai vender ao seu cliente?
                </label>
                <span className="text-base font-black text-emerald-400">
                  R$ {resellPrice.toFixed(2).replace(".", ",")}
                </span>
              </div>
              <input
                type="range"
                min={costPrice + 5}
                max={150}
                step={1}
                value={resellPrice}
                onChange={(e) => setResellPrice(Number(e.target.value))}
                className="w-full accent-emerald-500 cursor-pointer"
              />
              <div className="flex justify-between text-[11px] text-zinc-500 mt-1">
                <span>R$ {(costPrice + 5).toFixed(0)}</span>
                <span>R$ 150,00</span>
              </div>
            </div>

            {/* Slider Sales per Day */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                  3. Quantos pacotes você planeja vender por dia?
                </label>
                <span className="text-base font-black text-amber-400">
                  {salesPerDay} vendas/dia
                </span>
              </div>
              <input
                type="range"
                min={1}
                max={30}
                step={1}
                value={salesPerDay}
                onChange={(e) => setSalesPerDay(Number(e.target.value))}
                className="w-full accent-amber-500 cursor-pointer"
              />
              <div className="flex justify-between text-[11px] text-zinc-500 mt-1">
                <span>1 venda</span>
                <span>30 vendas por dia</span>
              </div>
            </div>
          </div>

          {/* Result Card Column */}
          <div className="lg:col-span-5 rounded-3xl bg-gradient-to-br from-emerald-950/40 via-zinc-900/90 to-black border border-emerald-500/30 p-6 sm:p-8 space-y-6 shadow-2xl shadow-emerald-500/10 text-center">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto">
              <Sparkles className="w-7 h-7" />
            </div>

            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-300">
                Seu Lucro Líquido Estimado
              </span>
              <div className="mt-2 text-4xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400">
                R$ {monthlyProfit.toFixed(2).replace(".", ",")}
              </div>
              <span className="text-xs font-medium text-zinc-400">
                por mês (em 30 dias)
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-4 border-t border-white/10 text-left text-xs">
              <div className="p-3 rounded-xl bg-black/40 border border-white/5">
                <span className="text-zinc-500 block">Lucro por Venda:</span>
                <span className="font-bold text-white text-sm">
                  R$ {profitPerSale.toFixed(2).replace(".", ",")}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-black/40 border border-white/5">
                <span className="text-zinc-500 block">Lucro Diário:</span>
                <span className="font-bold text-white text-sm">
                  R$ {dailyProfit.toFixed(2).replace(".", ",")}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-black/40 border border-white/5 col-span-2 flex items-center justify-between">
                <span className="text-zinc-400">Margem de Lucro (%):</span>
                <span className="font-bold text-emerald-400 text-sm">
                  +{profitMargin.toFixed(0)}% de ROI
                </span>
              </div>
            </div>

            <p className="text-[11px] text-zinc-400">
              💡 Você pode divulgar no WhatsApp, Instagram ou criar sua própria loja.
              Você cobra do cliente pelo PIX e nós cuidamos da entrega técnica!
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
