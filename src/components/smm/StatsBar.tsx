import { Users, ShoppingBag, Layers, Headphones } from "lucide-react";

export function StatsBar() {
  const stats = [
    {
      icon: Users,
      value: "64.800+",
      label: "Clientes Ativos no Brasil",
      color: "from-amber-400 to-orange-500",
    },
    {
      icon: ShoppingBag,
      value: "2.480.000+",
      label: "Pedidos Entregues com Sucesso",
      color: "from-orange-400 to-rose-500",
    },
    {
      icon: Layers,
      value: "4.850+",
      label: "Serviços no Catálogo",
      color: "from-sky-400 to-blue-500",
    },
    {
      icon: Headphones,
      value: "24/7",
      label: "Suporte e Atendimento WhatsApp",
      color: "from-emerald-400 to-teal-500",
    },
  ];

  return (
    <section className="relative z-10 -mt-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="rounded-3xl bg-zinc-900/80 backdrop-blur-xl border border-white/10 p-6 md:p-8 shadow-2xl shadow-black/60">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8 divide-y sm:divide-y-0 sm:divide-x divide-white/5">
          {stats.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                className={`flex flex-col items-center sm:items-start text-center sm:text-left ${
                  idx !== 0 ? "pt-4 sm:pt-0 sm:pl-8" : ""
                }`}
              >
                <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-zinc-300 mb-3">
                  <Icon className="w-5 h-5 text-amber-400" />
                </div>
                <span
                  className={`text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r ${item.color}`}
                >
                  {item.value}
                </span>
                <span className="mt-1 text-xs sm:text-sm font-medium text-zinc-400">
                  {item.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
