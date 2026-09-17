import { useState, useMemo } from "react";
import { SMMService, SMM_SERVICES, PLATFORMS } from "../../data/smm-services";
import {
  Search,
  Zap,
  ShieldCheck,
  ArrowRight,
  Filter,
  Instagram,
  Youtube,
  Music2,
  Flame,
  Twitter,
  Send,
  Headphones,
  Facebook,
  Twitch,
  Globe2,
} from "lucide-react";

interface ServicesTableProps {
  onSelectService: (serviceId: number) => void;
}

export function ServicesTable({ onSelectService }: ServicesTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPlatform, setSelectedPlatform] = useState<string>("all");

  const filteredServices = useMemo(() => {
    return SMM_SERVICES.filter((service) => {
      const matchesSearch =
        service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        service.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(service.id).includes(searchTerm);

      const matchesPlatform =
        selectedPlatform === "all" || service.platform === selectedPlatform;

      return matchesSearch && matchesPlatform;
    });
  }, [searchTerm, selectedPlatform]);

  const getFilterIcon = (id: string) => {
    switch (id) {
      case "instagram":
        return <Instagram className="w-3.5 h-3.5 text-[#E1306C]" />;
      case "tiktok":
        return <Music2 className="w-3.5 h-3.5 text-[#00F2FE]" />;
      case "youtube":
        return <Youtube className="w-3.5 h-3.5 text-[#FF0000]" />;
      case "kwai":
        return <Flame className="w-3.5 h-3.5 text-[#FF7700]" />;
      case "twitter":
        return <Twitter className="w-3.5 h-3.5 text-[#1DA1F2]" />;
      case "telegram":
        return <Send className="w-3.5 h-3.5 text-[#2AABEE]" />;
      case "spotify":
        return <Headphones className="w-3.5 h-3.5 text-[#1DB954]" />;
      case "facebook":
        return <Facebook className="w-3.5 h-3.5 text-[#1877F2]" />;
      case "twitch":
        return <Twitch className="w-3.5 h-3.5 text-[#9146FF]" />;
      default:
        return <Globe2 className="w-3.5 h-3.5 text-amber-400" />;
    }
  };

  return (
    <section id="services-table" className="py-16 md:py-24 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-xs font-semibold text-amber-300 mb-3">
            <Filter className="w-3.5 h-3.5" />
            <span>Tabela de Preços Atualizada</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            Catálogo Completo de Serviços
          </h2>
          <p className="mt-3 text-sm sm:text-base text-zinc-400">
            Instagram, TikTok, YouTube, Kwai, Twitter/X, Telegram, WhatsApp, Spotify e Facebook.
          </p>
        </div>

        {/* Search & Filter Bar */}
        <div className="flex flex-col sm:flex-row items-center gap-4 mb-8">
          {/* Search Input */}
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-zinc-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar serviço, ex: Reels, Brasileiros..."
              className="w-full pl-11 pr-4 py-3 rounded-xl bg-zinc-900/80 border border-white/10 text-white text-xs sm:text-sm placeholder-zinc-500 focus:outline-none focus:border-amber-500 transition-colors"
            />
          </div>

          {/* Platform Pills */}
          <div className="flex items-center gap-2 overflow-x-auto w-full pb-2 sm:pb-0 scrollbar-none">
            <button
              onClick={() => setSelectedPlatform("all")}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border cursor-pointer ${
                selectedPlatform === "all"
                  ? "bg-amber-500 text-black border-amber-500 shadow-lg shadow-amber-500/20"
                  : "bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 border-white/10"
              }`}
            >
              <Globe2 className="w-3.5 h-3.5" />
              <span>Todos ({SMM_SERVICES.length})</span>
            </button>
            {PLATFORMS.map((p) => {
              const isSelected = selectedPlatform === p.id;
              const count = SMM_SERVICES.filter((s) => s.platform === p.id).length;
              return (
                <button
                  key={p.id}
                  onClick={() => setSelectedPlatform(p.id)}
                  style={
                    isSelected
                      ? {
                          borderColor: p.color,
                          boxShadow: `0 0 16px ${p.glowColor}`,
                        }
                      : undefined
                  }
                  className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border cursor-pointer ${
                    isSelected
                      ? "bg-zinc-800 text-white"
                      : "bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 border-white/10"
                  }`}
                >
                  {getFilterIcon(p.id)}
                  <span>{p.name}</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-white/10 text-zinc-400">{count}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Services Table Card */}
        <div className="rounded-3xl bg-zinc-900/80 backdrop-blur-xl border border-white/10 overflow-hidden shadow-2xl shadow-black/60">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm text-zinc-300">
              <thead className="bg-zinc-950/80 text-zinc-400 uppercase text-[10px] sm:text-xs font-semibold tracking-wider border-b border-white/5">
                <tr>
                  <th scope="col" className="px-5 py-4">ID</th>
                  <th scope="col" className="px-5 py-4">Serviço & Categoria</th>
                  <th scope="col" className="px-5 py-4">Preço / 1.000</th>
                  <th scope="col" className="px-5 py-4 hidden md:table-cell">Mín / Máx</th>
                  <th scope="col" className="px-5 py-4 hidden sm:table-cell">Início</th>
                  <th scope="col" className="px-5 py-4 hidden lg:table-cell">Refill</th>
                  <th scope="col" className="px-5 py-4 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-medium">
                {filteredServices.length > 0 ? (
                  filteredServices.map((s) => (
                    <tr
                      key={s.id}
                      className="hover:bg-white/[0.02] transition-colors group"
                    >
                      {/* ID */}
                      <td className="px-5 py-4 whitespace-nowrap font-mono text-zinc-500">
                        #{s.id}
                      </td>

                      {/* Name & Badge */}
                      <td className="px-5 py-4">
                        <div className="flex flex-col gap-1 max-w-md">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-white group-hover:text-amber-400 transition-colors">
                              {s.name}
                            </span>
                            {s.badge && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-300 border border-orange-500/30">
                                {s.badge}
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-zinc-500">
                            {s.category}
                          </span>
                        </div>
                      </td>

                      {/* Price */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        <span className="text-base font-extrabold text-amber-400">
                          R$ {s.pricePerThousand.toFixed(2).replace(".", ",")}
                        </span>
                      </td>

                      {/* Min / Max */}
                      <td className="px-5 py-4 whitespace-nowrap hidden md:table-cell text-zinc-400">
                        {s.minQuantity.toLocaleString("pt-BR")} /{" "}
                        {s.maxQuantity.toLocaleString("pt-BR")}
                      </td>

                      {/* Average Time */}
                      <td className="px-5 py-4 whitespace-nowrap hidden sm:table-cell text-zinc-300">
                        {s.averageTime}
                      </td>

                      {/* Refill */}
                      <td className="px-5 py-4 whitespace-nowrap hidden lg:table-cell">
                        {s.refill ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400">
                            <ShieldCheck className="w-3.5 h-3.5" /> {s.refillDays}d Reposição
                          </span>
                        ) : (
                          <span className="text-[11px] text-zinc-500">Sem Refill</span>
                        )}
                      </td>

                      {/* Action */}
                      <td className="px-5 py-4 whitespace-nowrap text-right">
                        <button
                          onClick={() => onSelectService(s.id)}
                          className="px-3.5 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500 border border-amber-500/30 hover:border-amber-500 text-amber-300 hover:text-black font-bold text-xs transition-all flex items-center gap-1.5 ml-auto"
                        >
                          <span>Pedir</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="px-5 py-12 text-center text-zinc-500">
                      Nenhum serviço encontrado para "{searchTerm}".
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}
