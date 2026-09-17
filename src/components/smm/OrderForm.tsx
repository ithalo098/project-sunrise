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
  Copy,
  Check,
  ExternalLink,
  MessageCircle,
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
  onOpenTracker?: (() => void) | undefined;
  onOpenWhatsAppSupport?: ((msg: string) => void) | undefined;
}

export function OrderForm({
  balance,
  onDeductBalance,
  onOpenPixModal,
  onOrderCreated,
  initialServiceId,
  onOpenTracker,
  onOpenWhatsAppSupport,
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
  const [copiedReceipt, setCopiedReceipt] = useState(false);

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

  const handleCopyOrderReceipt = () => {
    if (!successOrder) return;
    const formatted = `
🧾 COMPROVANTE OFICIAL DE PEDIDO - BRSMM
------------------------------------------------
Protocolo: ${successOrder.id}
${successOrder.providerOrderId ? `ID Provedor: #${successOrder.providerOrderId}\n` : ""}Serviço: ${successOrder.serviceName}
Destino: ${successOrder.link}
Quantidade: ${successOrder.quantity.toLocaleString("pt-BR")} unidades
Valor Total: R$ ${successOrder.totalPrice.toFixed(2).replace(".", ",")}
Data/Hora: ${new Date(successOrder.createdAt).toLocaleString("pt-BR")}
Status: Fila Prioritária (Processando)
Segurança: 100% Sem Senha | Reposição Ativa
------------------------------------------------
Suporte 24h WhatsApp BRSMM Oficial
`.trim();

    navigator.clipboard.writeText(formatted);
    setCopiedReceipt(true);
    setTimeout(() => setCopiedReceipt(false), 2500);
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
    <section id="order-form" className="py-16 md:py-24 relative scroll-mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-xs font-semibold text-amber-300 mb-3">
            <Zap className="w-3.5 h-3.5" />
            <span>Painel Automatizado de Pedidos</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            Faça seu Pedido em Segundos
          </h2>
          <p className="mt-3 text-sm sm:text-base text-zinc-400">
            Selecione a rede social, configure a quantidade e impulsione sua presença com entrega rápida.
          </p>

          {/* Customer Trust Callout Banner */}
          <div className="mt-6 p-3 rounded-2xl bg-zinc-950/80 border border-emerald-500/30 flex flex-wrap items-center justify-around gap-3 text-xs text-zinc-300">
            <span className="flex items-center gap-1.5 text-emerald-300 font-semibold">
              <ShieldCheck className="w-4 h-4 text-emerald-400" /> 100% Sem Senha
            </span>
            <span className="flex items-center gap-1.5 text-amber-300 font-semibold">
              <Clock className="w-4 h-4 text-amber-400" /> Entrega Automática
            </span>
            <span className="flex items-center gap-1.5 text-sky-300 font-semibold">
              <RefreshCw className="w-4 h-4 text-sky-400" /> Reposição Grátis (Refill)
            </span>
            <span className="flex items-center gap-1.5 text-rose-300 font-semibold">
              <Wallet className="w-4 h-4 text-rose-400" /> Saldo Protegido
            </span>
          </div>
        </div>

        {/* Platform Selection Tabs */}
        <div className="mb-8">
          <div className="flex items-center gap-2 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-zinc-800">
            {PLATFORMS.map((platform) => {
              const isActive = activePlatform === platform.id;
              return (
                <button
                  key={platform.id}
                  onClick={() => handlePlatformChange(platform.id as SMMService["platform"])}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-bold text-xs whitespace-nowrap transition-all duration-300 shrink-0 border ${
                    isActive
                      ? "bg-zinc-900 border-amber-500/80 text-white shadow-lg shadow-amber-500/20 scale-105"
                      : "bg-zinc-950/60 border-white/5 text-zinc-400 hover:text-white hover:border-white/20 hover:bg-zinc-900/40"
                  }`}
                >
                  <span className={isActive ? "text-amber-400" : "text-zinc-400"}>
                    {getPlatformIcon(platform.id)}
                  </span>
                  <span>{platform.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Main Grid: Form + Service Details */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Form Column */}
          <div className="lg:col-span-7 rounded-3xl bg-zinc-900/80 backdrop-blur-xl border border-white/10 p-6 sm:p-8 shadow-2xl shadow-black/60 relative">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Category Selector */}
              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                  1. Categoria do Serviço
                </label>
                <div className="relative">
                  <select
                    value={selectedCategory}
                    onChange={(e) => handleCategoryChange(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-zinc-950 border border-white/10 text-white text-sm focus:outline-none focus:border-amber-500 transition-colors cursor-pointer appearance-none"
                  >
                    {categories.map((cat) => (
                      <option key={cat} value={cat} className="bg-zinc-950 text-white">
                        {cat}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-400 text-xs">
                    ▼
                  </div>
                </div>
              </div>

              {/* Service Selector */}
              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                  2. Serviço Específico
                </label>
                <div className="relative">
                  <select
                    value={selectedService.id}
                    onChange={(e) => setSelectedServiceId(Number(e.target.value))}
                    className="w-full px-4 py-3 rounded-xl bg-zinc-950 border border-white/10 text-white text-sm focus:outline-none focus:border-amber-500 transition-colors cursor-pointer appearance-none"
                  >
                    {categoryServices.map((svc) => (
                      <option key={svc.id} value={svc.id} className="bg-zinc-950 text-white">
                        #{svc.id} - {svc.name} (R$ {svc.pricePerThousand.toFixed(2)} / 1k)
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-400 text-xs">
                    ▼
                  </div>
                </div>
              </div>

              {/* Link / Username input */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                    3. Link ou @ do Perfil / Canal
                  </label>
                  <span className="text-[11px] text-emerald-400 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" /> 100% Sem Senha
                  </span>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder={placeholderText}
                    value={link}
                    onChange={(e) => setLink(e.target.value)}
                    className="w-full px-4 py-3.5 rounded-xl bg-zinc-950 border border-white/10 text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-amber-500 transition-colors"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                    {getPlatformIcon(activePlatform)}
                  </div>
                </div>
                <p className="mt-1.5 text-[11px] text-zinc-500">
                  Importante: Seu perfil ou vídeo precisa estar <strong>público</strong> durante o envio.
                </p>
              </div>

              {/* Custom Comments field (if service is of type custom comments) */}
              {selectedService.isCustomComments && (
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                    Comentários Personalizados (1 por linha)
                  </label>
                  <textarea
                    rows={4}
                    placeholder="Excelente post!&#10;Muito bom, parabéns!&#10;Adorei o conteúdo!"
                    value={customComments}
                    onChange={(e) => {
                      setCustomComments(e.target.value);
                      const lines = e.target.value.split("\n").filter((l) => l.trim().length > 0);
                      if (lines.length > 0) {
                        setQuantity(lines.length);
                      }
                    }}
                    className="w-full px-4 py-3 rounded-xl bg-zinc-950 border border-white/10 text-white text-xs font-mono focus:outline-none focus:border-amber-500 transition-colors resize-none"
                  />
                  <span className="text-[10px] text-zinc-400 block mt-1">
                    Total de linhas detectadas: {customComments.split("\n").filter((l) => l.trim()).length}
                  </span>
                </div>
              )}

              {/* Quantity input & quick buttons */}
              {!selectedService.isCustomComments && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                      4. Quantidade Desejada
                    </label>
                    <span className="text-[11px] text-zinc-400">
                      Mín: {selectedService.minQuantity.toLocaleString("pt-BR")} | Máx:{" "}
                      {selectedService.maxQuantity.toLocaleString("pt-BR")}
                    </span>
                  </div>

                  <input
                    type="number"
                    min={selectedService.minQuantity}
                    max={selectedService.maxQuantity}
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full px-4 py-3.5 rounded-xl bg-zinc-950 border border-white/10 text-white font-bold text-base focus:outline-none focus:border-amber-500 transition-colors"
                  />

                  {/* Preset Pills */}
                  <div className="mt-2.5 flex flex-wrap gap-2">
                    <span className="text-[11px] text-zinc-500 self-center mr-1">Atalhos:</span>
                    {[
                      { label: "+500", val: 500 },
                      { label: "+1.000", val: 1000 },
                      { label: "+2.500", val: 2500 },
                      { label: "+5.000", val: 5000 },
                      { label: "+10.000", val: 10000 },
                    ].map((pill) => (
                      <button
                        key={pill.val}
                        type="button"
                        onClick={() => handleAddQuantity(pill.val)}
                        className="px-2.5 py-1 rounded-lg bg-zinc-950 hover:bg-zinc-800 border border-white/5 hover:border-white/20 text-xs font-medium text-zinc-300 transition-colors"
                      >
                        {pill.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Drip-feed feature */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setDripfeedActive(!dripfeedActive)}
                  className="text-xs text-zinc-400 hover:text-amber-400 transition-colors flex items-center gap-1.5 font-medium"
                >
                  <Layers className="w-3.5 h-3.5 text-amber-400" />
                  <span>
                    {dripfeedActive ? "Ocultar Envio Gradual (Drip-feed)" : "Ativar Envio Gradual (Drip-feed)"}
                  </span>
                </button>

                {dripfeedActive && (
                  <div className="mt-3 p-4 rounded-2xl bg-zinc-950/90 border border-amber-500/20 space-y-3">
                    <p className="text-[11px] text-zinc-400">
                      O Drip-feed permite dividir a entrega em múltiplos envios automáticos para parecer ainda mais orgânico.
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] text-zinc-400 block mb-1">Repetições (Runs)</label>
                        <input
                          type="number"
                          min={2}
                          max={50}
                          value={runs}
                          onChange={(e) => setRuns(Math.max(2, parseInt(e.target.value) || 2))}
                          className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-white/10 text-white text-xs"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-zinc-400 block mb-1">Intervalo (Minutos)</label>
                        <input
                          type="number"
                          min={10}
                          max={1440}
                          value={intervalMinutes}
                          onChange={(e) => setIntervalMinutes(Math.max(10, parseInt(e.target.value) || 60))}
                          className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-white/10 text-white text-xs"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Order Summary Box */}
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
                    <span>Recarregar Saldo via PIX</span>
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

              {/* Service Meta Specs */}
              <div className="space-y-3 pt-4 border-t border-white/10 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400 flex items-center gap-1.5">
                    <Clock3 className="w-4 h-4 text-amber-400" /> Início Estimado:
                  </span>
                  <span className="font-semibold text-white">
                    {selectedService.averageTime}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-zinc-400 flex items-center gap-1.5">
                    <Zap className="w-4 h-4 text-orange-400" /> Velocidade Média:
                  </span>
                  <span className="font-semibold text-white">
                    {selectedService.speed}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-zinc-400 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" /> Reposição (Refill):
                  </span>
                  <span className="font-semibold text-white">
                    {selectedService.refill ? (
                      <span className="text-emerald-400 font-bold">Ativa ({selectedService.refillDays} dias)</span>
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
              <ul className="space-y-1.5 list-disc list-inside text-zinc-400 leading-relaxed">
                <li>O perfil ou canal deve permanecer <strong>aberto (público)</strong> até a conclusão.</li>
                <li>Não altere o link ou @ do usuário enquanto o pedido estiver em processamento.</li>
                <li>Para YouTube, envie o link completo do vídeo ou do canal.</li>
                <li>Caso o link seja inválido, o valor é estornado automaticamente para seu saldo.</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Order Confirmation Modal / Official Voucher */}
        {successOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-xl animate-in fade-in duration-200">
            <div className="w-full max-w-lg rounded-[28px] bg-[#0e0705] border border-emerald-500/40 p-6 sm:p-8 text-center space-y-4 shadow-2xl shadow-emerald-500/20 max-h-[92vh] overflow-y-auto">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/10">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <div>
                <h3 className="text-2xl font-black text-white">
                  Pedido Criado com Sucesso!
                </h3>
                <p className="text-xs text-zinc-300 mt-1">
                  Seu pedido foi registrado em nossa fila prioritária e a entrega iniciará em instantes.
                </p>
              </div>

              {/* Official Voucher Card */}
              <div className="p-4 rounded-2xl bg-zinc-950 border border-emerald-500/30 text-left text-xs space-y-2 text-zinc-300">
                <div className="flex justify-between items-center pb-2 border-b border-white/10">
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Comprovante de Pedido
                  </span>
                  <span className="text-[10px] font-mono text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded">
                    Processando
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Protocolo Oficial:</span>
                  <span className="font-mono text-amber-400 font-bold">{successOrder.id}</span>
                </div>
                {successOrder.providerOrderId && (
                  <div className="flex justify-between">
                    <span className="text-zinc-400">ID BRSMM Provedor:</span>
                    <span className="font-mono text-emerald-400 font-bold">
                      #{successOrder.providerOrderId}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-zinc-400">Serviço:</span>
                  <span className="font-semibold text-white truncate max-w-[220px]">
                    {successOrder.serviceName}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Destino:</span>
                  <span className="font-semibold text-white truncate max-w-[220px]">{successOrder.link}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Quantidade:</span>
                  <span className="font-bold text-white">
                    {successOrder.quantity.toLocaleString("pt-BR")} un.
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Data e Hora:</span>
                  <span className="text-white">{new Date(successOrder.createdAt).toLocaleString("pt-BR")}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-white/5">
                  <span className="text-zinc-400 font-semibold">Valor Total Pago:</span>
                  <span className="font-black text-emerald-400 text-sm">
                    R$ {successOrder.totalPrice.toFixed(2).replace(".", ",")}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={handleCopyOrderReceipt}
                  className="w-full py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors"
                >
                  {copiedReceipt ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span>Comprovante Copiado para a Área de Transferência!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 text-amber-400" />
                      <span>Copiar Comprovante Oficial</span>
                    </>
                  )}
                </button>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSuccessOrder(null);
                      if (onOpenTracker) onOpenTracker();
                    }}
                    className="py-2.5 rounded-xl bg-sky-600/20 hover:bg-sky-600/30 border border-sky-500/40 text-sky-300 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <span>Rastrear Pedido</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const msg = `Olá! Gostaria de acompanhar meu pedido código ${successOrder.id} (${successOrder.serviceName}) no BRSMM.`;
                      if (onOpenWhatsAppSupport) {
                        onOpenWhatsAppSupport(msg);
                      } else {
                        window.open(`https://wa.me/5511999999999?text=${encodeURIComponent(msg)}`, "_blank");
                      }
                    }}
                    className="py-2.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>Dúvida no WhatsApp</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setSuccessOrder(null)}
                  className="w-full py-3.5 rounded-xl rgb-button font-black text-sm transition-all"
                >
                  Continuar no Painel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
