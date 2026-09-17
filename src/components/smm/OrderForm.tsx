import { useState, useMemo, useEffect } from "react";
import {
  SMMService,
  SMM_SERVICES,
  PLATFORMS,
  PlatformConfig,
} from "../../data/smm-services";
import { addBrsmmOrder } from "../../lib/brsmm-api";
import {
  Zap,
  CheckCircle2,
  Clock,
  ShieldCheck,
  RefreshCw,
  Sparkles,
  ArrowRight,
  Instagram,
  Youtube,
  Music2,
  Flame,
  Twitter,
  Send,
  Headphones,
  Facebook,
  Twitch,
  Tv,
  Wallet,
  MessageSquare,
  Clock3,
  Layers,
} from "lucide-react";

interface OrderFormProps {
  balance: number;
  onDeductBalance: (amount: number) => void;
  onOpenPixModal: (suggestedAmount?: number) => void;
  onOrderCreated: (order: {
    id: string;
    serviceName: string;
    link: string;
    quantity: number;
    totalPrice: number;
    status: string;
    createdAt: Date;
    providerOrderId?: number | undefined;
  }) => void;
  initialServiceId?: number | undefined;
}

export function OrderForm({
  balance,
  onDeductBalance,
  onOpenPixModal,
  onOrderCreated,
  initialServiceId,
}: OrderFormProps) {
  // Active platform
  const [activePlatform, setActivePlatform] = useState<SMMService["platform"]>("instagram");

  // Filter services by platform
  const platformServices = useMemo(() => {
    return SMM_SERVICES.filter((s) => s.platform === activePlatform);
  }, [activePlatform]);

  // Categories for this platform
  const categories = useMemo(() => {
    const set = new Set<string>();
    platformServices.forEach((s) => set.add(s.category));
    return Array.from(set);
  }, [platformServices]);

  const [selectedCategory, setSelectedCategory] = useState<string>(
    categories[0] || ""
  );

  // Filtered services for current category
  const categoryServices = useMemo(() => {
    const list = platformServices.filter((s) => s.category === selectedCategory);
    return list.length > 0 ? list : platformServices;
  }, [platformServices, selectedCategory]);

  const defaultService = SMM_SERVICES[0] as SMMService;

  // Selected Service
  const [selectedServiceId, setSelectedServiceId] = useState<number>(
    initialServiceId || 101
  );

  // Synchronize when initialServiceId changes (e.g. from ServicesTable)
  useEffect(() => {
    if (initialServiceId) {
      const match = SMM_SERVICES.find((s) => s.id === initialServiceId);
      if (match) {
        setActivePlatform(match.platform);
        setSelectedCategory(match.category);
        setSelectedServiceId(match.id);
        setQuantity(Math.max(1000, match.minQuantity));
      }
    }
  }, [initialServiceId]);

  const selectedService: SMMService = useMemo(() => {
    const found = SMM_SERVICES.find((s) => s.id === selectedServiceId);
    if (found) return found;
    const firstCat = categoryServices[0];
    if (firstCat) return firstCat;
    return defaultService;
  }, [selectedServiceId, categoryServices, defaultService]);

  // Link / Username
  const [link, setLink] = useState("");
  // Quantity
  const [quantity, setQuantity] = useState<number>(1000);
  // Custom comments
  const [customComments, setCustomComments] = useState("");
  // Drip-feed
  const [dripfeedActive, setDripfeedActive] = useState(false);
  const [runs, setRuns] = useState<number>(2);
  const [intervalMinutes, setIntervalMinutes] = useState<number>(60);

  // State for order feedback
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successOrder, setSuccessOrder] = useState<any>(null);

  // Calculate total price
  const totalPrice = useMemo(() => {
    if (!quantity) return 0;
    const base = (quantity / 1000) * selectedService.pricePerThousand;
    return dripfeedActive ? base * runs : base;
  }, [selectedService, quantity, dripfeedActive, runs]);

  // Check if balance covers
  const canAffordWithBalance = balance >= totalPrice;

  // Handle platform change
  const handlePlatformChange = (p: SMMService["platform"]) => {
    setActivePlatform(p);
    const newServices = SMM_SERVICES.filter((s) => s.platform === p);
    const first = newServices[0];
    if (first) {
      setSelectedCategory(first.category);
      setSelectedServiceId(first.id);
      setQuantity(Math.max(1000, first.minQuantity));
    }
  };

  // Handle Category change
  const handleCategoryChange = (cat: string) => {
    setSelectedCategory(cat);
    const inCat = platformServices.filter((s) => s.category === cat);
    const first = inCat[0];
    if (first) {
      setSelectedServiceId(first.id);
      setQuantity(Math.max(1000, first.minQuantity));
    }
  };

  // Handle preset quantities
  const handleAddQuantity = (add: number) => {
    const next = quantity + add;
    if (next <= selectedService.maxQuantity) {
      setQuantity(next);
    }
  };

  // Submit Order
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!link.trim()) {
      alert("Por favor, insira o link ou o @ do seu perfil.");
      return;
    }

    if (quantity < selectedService.minQuantity) {
      alert(`Quantidade mínima para este serviço é ${selectedService.minQuantity.toLocaleString('pt-BR')}.`);
      return;
    }

    if (quantity > selectedService.maxQuantity) {
      alert(`Quantidade máxima para este serviço é ${selectedService.maxQuantity.toLocaleString('pt-BR')}.`);
      return;
    }

    if (!canAffordWithBalance) {
      onOpenPixModal(Math.ceil(totalPrice - balance));
      return;
    }

    setIsSubmitting(true);

    // Call BRSMM API
    let providerId: number | undefined;
    try {
      const res = await addBrsmmOrder({
        service: selectedService.id,
        link: link.trim(),
        quantity,
        ...(customComments ? { comments: customComments } : {}),
        ...(dripfeedActive ? { runs, interval: intervalMinutes } : {}),
      });
      if (res && res.order) {
        providerId = res.order;
      }
    } catch (e) {
      console.warn("API BRSMM Call:", e);
    }

    setTimeout(() => {
      onDeductBalance(totalPrice);
      const newOrderId = `BRSMM-${Math.floor(100000 + Math.random() * 900000)}`;
      const orderObj = {
        id: newOrderId,
        serviceName: selectedService.name,
        link: link.trim(),
        quantity,
        totalPrice,
        status: "Processando",
        createdAt: new Date(),
        providerOrderId: providerId,
      };

      onOrderCreated(orderObj);
      setSuccessOrder(orderObj);
      setIsSubmitting(false);
      setLink("");
      setCustomComments("");
    }, 700);
  };

  const getPlatformIcon = (id: string) => {
    switch (id) {
      case "instagram":
        return <Instagram className="w-5 h-5 text-[#E1306C]" />;
      case "tiktok":
        return <Music2 className="w-5 h-5 text-[#00F2FE]" />;
      case "youtube":
        return <Youtube className="w-5 h-5 text-[#FF0000]" />;
      case "kwai":
        return <Flame className="w-5 h-5 text-[#FF7700]" />;
      case "twitter":
        return <Twitter className="w-5 h-5 text-[#1DA1F2]" />;
      case "telegram":
        return <Send className="w-5 h-5 text-[#2AABEE]" />;
      case "spotify":
        return <Headphones className="w-5 h-5 text-[#1DB954]" />;
      case "facebook":
        return <Facebook className="w-5 h-5 text-[#1877F2]" />;
      case "twitch":
        return <Twitch className="w-5 h-5 text-[#9146FF]" />;
      case "kick":
        return <Tv className="w-5 h-5 text-[#53FC18]" />;
      default:
        return <Sparkles className="w-5 h-5 text-amber-400" />;
    }
  };

  const currentPlatformConfig = PLATFORMS.find((p) => p.id === activePlatform);
  const placeholderText =
    currentPlatformConfig?.placeholder || "Insira o link ou @ do perfil";

  return (
    <section id="order-form" className="py-16 md:py-24 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-xs font-semibold text-amber-300 mb-3">
            <Zap className="w-3.5 h-3.5" />
            <span>Sistema 100% Automatizado & API Integrada</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            Fazer Novo Pedido
          </h2>
          <p className="mt-3 text-sm sm:text-base text-zinc-400">
            Selecione a plataforma, configure seu pedido e veja o valor calcular em tempo real.
          </p>
        </div>

        {/* Platform Horizontal Selector Tabs */}
        <div className="flex items-center gap-2.5 overflow-x-auto pb-4 scrollbar-none mb-8 -mx-4 px-4 sm:mx-0 sm:px-0 justify-start md:justify-center">
          {PLATFORMS.map((platform) => {
            const isActive = activePlatform === platform.id;
            return (
              <button
                key={platform.id}
                onClick={() => handlePlatformChange(platform.id)}
                style={
                  isActive
                    ? {
                        borderColor: platform.color,
                        boxShadow: `0 0 24px ${platform.glowColor}, inset 0 0 12px ${platform.glowColor}`,
                      }
                    : undefined
                }
                className={`flex items-center gap-2.5 px-4 py-3 rounded-2xl font-bold text-xs sm:text-sm whitespace-nowrap transition-all duration-300 border cursor-pointer ${
                  isActive
                    ? "bg-zinc-800 text-white scale-[1.04]"
                    : "bg-zinc-900/60 hover:bg-zinc-800/60 border-white/5 text-zinc-400 hover:text-zinc-200"
                }`}
              >
                {getPlatformIcon(platform.id)}
                <span>{platform.name}</span>
              </button>
            );
          })}
        </div>

        {/* Main Grid: Form + Specifications Card */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Order Form Column */}
          <div className="lg:col-span-7 rounded-3xl bg-zinc-900/80 backdrop-blur-xl border border-white/10 p-6 sm:p-8 shadow-2xl shadow-black/60">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Category Dropdown */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
                  1. Categoria
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                  className="w-full px-4 py-3.5 rounded-xl bg-zinc-950 border border-white/10 text-white text-sm font-medium focus:outline-none focus:border-amber-500 transition-colors"
                >
                  {categories.map((cat) => (
                    <option key={cat} value={cat} className="bg-zinc-950 text-white">
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Service Dropdown */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
                  2. Serviço
                </label>
                <select
                  value={selectedServiceId}
                  onChange={(e) => setSelectedServiceId(Number(e.target.value))}
                  className="w-full px-4 py-3.5 rounded-xl bg-zinc-950 border border-white/10 text-white text-sm font-medium focus:outline-none focus:border-amber-500 transition-colors"
                >
                  {categoryServices.map((service) => (
                    <option key={service.id} value={service.id} className="bg-zinc-950 text-white">
                      [{service.id}] {service.name} — R$ {service.pricePerThousand.toFixed(2).replace(".", ",")} / 1k
                    </option>
                  ))}
                </select>
              </div>

              {/* Link / Username Input */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                    3. Link ou @ Nome de Usuário
                  </label>
                  <span className="text-[11px] text-emerald-400 font-medium flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" /> 100% Seguro • Sem Senha
                  </span>
                </div>
                <input
                  type="text"
                  value={link}
                  onChange={(e) => setLink(e.target.value)}
                  placeholder={placeholderText}
                  required
                  className="w-full px-4 py-3.5 rounded-xl bg-zinc-950 border border-white/10 text-white text-sm placeholder-zinc-500 focus:outline-none focus:border-amber-500 transition-colors"
                />
                <p className="mt-1.5 text-[11px] text-zinc-500">
                  Importante: Mantenha a conta ou postagem em modo <strong>Público</strong> durante o envio.
                </p>
              </div>

              {/* Custom Comments field (only if service is comments) */}
              {selectedService.isCustomComments && (
                <div className="p-4 rounded-2xl bg-zinc-950 border border-amber-500/20 space-y-2">
                  <label className="text-xs font-semibold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5" /> Digite os Comentários (1 por linha)
                  </label>
                  <textarea
                    rows={4}
                    value={customComments}
                    onChange={(e) => {
                      setCustomComments(e.target.value);
                      const lines = e.target.value.split("\n").filter((l) => l.trim().length > 0);
                      if (lines.length > 0) {
                        setQuantity(lines.length);
                      }
                    }}
                    placeholder={"Exemplo:\nAdorei o conteúdo! 🔥\nMuito bom, parabéns 👏\nTop demais!"}
                    className="w-full p-3 rounded-xl bg-black border border-white/10 text-white text-xs font-mono focus:outline-none focus:border-amber-500"
                  />
                  <p className="text-[11px] text-zinc-400">
                    A quantidade será definida automaticamente pelo número de linhas preenchidas.
                  </p>
                </div>
              )}

              {/* Quantity Input and Presets */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                    4. Quantidade
                  </label>
                  <span className="text-xs text-zinc-400 font-medium">
                    Mín: <strong>{selectedService.minQuantity.toLocaleString("pt-BR")}</strong> | Máx: <strong>{selectedService.maxQuantity.toLocaleString("pt-BR")}</strong>
                  </span>
                </div>

                <div className="relative">
                  <input
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                    min={selectedService.minQuantity}
                    max={selectedService.maxQuantity}
                    step={10}
                    className="w-full px-4 py-3.5 rounded-xl bg-zinc-950 border border-white/10 text-white font-bold text-lg focus:outline-none focus:border-amber-500 transition-colors pr-24"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-zinc-400 uppercase">
                    Unidades
                  </span>
                </div>

                {/* Preset Fast Add Buttons */}
                <div className="mt-3 flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] text-zinc-400 font-medium mr-1">Adicionar:</span>
                  {[500, 1000, 2500, 5000, 10000].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => handleAddQuantity(preset)}
                      className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 text-xs text-zinc-300 font-medium transition-colors"
                    >
                      +{preset.toLocaleString("pt-BR")}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setQuantity(selectedService.minQuantity)}
                    className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 text-xs text-amber-300 font-medium transition-colors"
                  >
                    Mínimo
                  </button>
                </div>
              </div>

              {/* Drip-Feed Option (Dividir Entrega) */}
              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-zinc-300">
                  <input
                    type="checkbox"
                    checked={dripfeedActive}
                    onChange={(e) => setDripfeedActive(e.target.checked)}
                    className="rounded bg-zinc-900 border-white/10 text-amber-500 focus:ring-amber-500"
                  />
                  <span className="flex items-center gap-1.5">
                    <Clock3 className="w-3.5 h-3.5 text-amber-400" /> Ativar Drip-feed (Dividir envio em partes graduais)
                  </span>
                </label>

                {dripfeedActive && (
                  <div className="mt-3 p-4 rounded-2xl bg-zinc-950 border border-white/10 grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-zinc-400 block mb-1">Execuções (Runs):</span>
                      <input
                        type="number"
                        min={2}
                        max={50}
                        value={runs}
                        onChange={(e) => setRuns(Number(e.target.value))}
                        className="w-full p-2.5 rounded-xl bg-zinc-900 border border-white/10 text-white font-bold text-xs"
                      />
                    </div>
                    <div>
                      <span className="text-zinc-400 block mb-1">Intervalo (Minutos):</span>
                      <input
                        type="number"
                        min={10}
                        max={1440}
                        step={10}
                        value={intervalMinutes}
                        onChange={(e) => setIntervalMinutes(Number(e.target.value))}
                        className="w-full p-2.5 rounded-xl bg-zinc-900 border border-white/10 text-white font-bold text-xs"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Live Calculation Summary Card */}
              <div className="p-4 rounded-2xl bg-zinc-950/70 border border-white/5 space-y-2.5">
                <div className="flex items-center justify-between text-xs text-zinc-400">
                  <span>Preço por 1.000 unidades:</span>
                  <span className="font-semibold text-zinc-200">
                    R$ {selectedService.pricePerThousand.toFixed(2).replace(".", ",")}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-zinc-400">
                  <span>Quantidade selecionada:</span>
                  <span className="font-semibold text-zinc-200">
                    {quantity.toLocaleString("pt-BR")} un. {dripfeedActive && `(${runs}x = ${(quantity * runs).toLocaleString("pt-BR")} un.)`}
                  </span>
                </div>
                <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-zinc-400 block">
                      Valor Total a Pagar
                    </span>
                    <span className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-400">
                      R$ {totalPrice.toFixed(2).replace(".", ",")}
                    </span>
                  </div>

                  {/* Payment Indicator */}
                  <div className="text-right">
                    <span className="text-[11px] text-zinc-400 block">Seu saldo:</span>
                    <span className={`text-xs font-bold ${canAffordWithBalance ? "text-emerald-400" : "text-rose-400"}`}>
                      R$ {balance.toFixed(2).replace(".", ",")}
                    </span>
                  </div>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="pt-2">
                {canAffordWithBalance ? (
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-4 rounded-2xl rgb-button font-black text-base shadow-2xl flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99] transition-all"
                  >
                    {isSubmitting ? (
                      <>
                        <RefreshCw className="w-5 h-5 animate-spin text-amber-300" />
                        <span>Disparando Pedido na Rede...</span>
                      </>
                    ) : (
                      <>
                        <Zap className="w-5 h-5 text-amber-300" />
                        <span>Confirmar Pedido & Iniciar Entrega</span>
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => onOpenPixModal(Math.ceil(totalPrice - balance))}
                    className="w-full py-4 rounded-2xl rgb-button font-black text-base shadow-2xl flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99] transition-all"
                  >
                    <Wallet className="w-5 h-5 text-emerald-400" />
                    <span>Recarregar Saldo com Bônus RGB</span>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 ml-1">
                      Falta R$ {(totalPrice - balance).toFixed(2).replace(".", ",")}
                    </span>
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Service Specifications and Guarantees Column */}
          <div className="lg:col-span-5 space-y-6">
            {/* Service Details Card */}
            <div className="rounded-3xl bg-zinc-900/80 backdrop-blur-xl border border-white/10 p-6 sm:p-7 shadow-2xl shadow-black/60">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    ID #{selectedService.id}
                  </span>
                  <h3 className="mt-2 text-lg font-bold text-white leading-snug">
                    {selectedService.name}
                  </h3>
                </div>
                {selectedService.badge && (
                  <span className="shrink-0 text-xs font-bold px-2.5 py-1 rounded-full bg-orange-500/20 text-orange-300 border border-orange-500/30">
                    {selectedService.badge}
                  </span>
                )}
              </div>

              <p className="text-xs text-zinc-300 leading-relaxed mb-6">
                {selectedService.description}
              </p>

              {/* Spec list */}
              <div className="space-y-3 pt-4 border-t border-white/5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400 flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-amber-400" /> Início Estimado:
                  </span>
                  <span className="font-semibold text-white">{selectedService.averageTime}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-zinc-400 flex items-center gap-1.5">
                    <Zap className="w-4 h-4 text-orange-400" /> Velocidade:
                  </span>
                  <span className="font-semibold text-white">{selectedService.speed}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-zinc-400 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" /> Reposição (Refill):
                  </span>
                  <span className="font-semibold text-white">
                    {selectedService.refill ? (
                      <span className="text-emerald-400">Ativa ({selectedService.refillDays} dias)</span>
                    ) : (
                      <span className="text-zinc-400">Sem Refill</span>
                    )}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-zinc-400 flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-sky-400" /> Limites por Pedido:
                  </span>
                  <span className="font-semibold text-white">
                    {selectedService.minQuantity.toLocaleString("pt-BR")} a{" "}
                    {selectedService.maxQuantity.toLocaleString("pt-BR")}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Tips Box */}
            <div className="rounded-3xl bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-transparent border border-amber-500/20 p-6 text-xs text-zinc-300 space-y-2.5">
              <h4 className="text-sm font-bold text-amber-300 flex items-center gap-2">
                <Sparkles className="w-4 h-4" /> Dicas Importantes para Entrega Rápida
              </h4>
              <ul className="space-y-1.5 list-disc list-inside text-zinc-400">
                <li>O perfil ou canal deve permanecer <strong>aberto (público)</strong> até a conclusão.</li>
                <li>Não altere o link/@ do usuário enquanto o pedido estiver em processamento.</li>
                <li>Para YouTube, envie o link completo do vídeo ou do canal.</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Order Confirmation Modal / Alert */}
        {successOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
            <div className="w-full max-w-md rounded-3xl bg-[#0e0705] border border-emerald-500/40 p-6 sm:p-8 text-center space-y-4 shadow-2xl shadow-emerald-500/20">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h3 className="text-2xl font-black text-white">
                Pedido Criado com Sucesso!
              </h3>
              <p className="text-xs text-zinc-300">
                Seu pedido foi registrado em nossa fila prioritária e a entrega iniciará em instantes.
              </p>

              <div className="p-4 rounded-2xl bg-zinc-950 border border-white/10 text-left text-xs space-y-2 text-zinc-300">
                <div className="flex justify-between">
                  <span className="text-zinc-400">Código do Pedido:</span>
                  <span className="font-bold text-amber-400">{successOrder.id}</span>
                </div>
                {successOrder.providerOrderId && (
                  <div className="flex justify-between">
                    <span className="text-zinc-400">ID Fornecedor BRSMM:</span>
                    <span className="font-mono text-emerald-400 font-bold">
                      #{successOrder.providerOrderId}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-zinc-400">Serviço:</span>
                  <span className="font-semibold text-white truncate max-w-[200px]">
                    {successOrder.serviceName}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Destino:</span>
                  <span className="font-semibold text-white truncate max-w-[200px]">{successOrder.link}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Quantidade:</span>
                  <span className="font-bold text-white">
                    {successOrder.quantity.toLocaleString("pt-BR")}
                  </span>
                </div>
                <div className="flex justify-between pt-1 border-t border-white/5">
                  <span className="text-zinc-400">Valor Pago:</span>
                  <span className="font-bold text-emerald-400">
                    R$ {successOrder.totalPrice.toFixed(2).replace(".", ",")}
                  </span>
                </div>
              </div>

              <button
                onClick={() => setSuccessOrder(null)}
                className="w-full py-3 rounded-xl rgb-button font-bold text-sm transition-all"
              >
                Entendido, Fechar
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
