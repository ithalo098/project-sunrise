import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Navbar } from "../components/smm/Navbar";
import { HeroSection } from "../components/smm/HeroSection";
import { StatsBar } from "../components/smm/StatsBar";
import { OrderForm } from "../components/smm/OrderForm";
import { ServicesTable } from "../components/smm/ServicesTable";
import { ProfitCalculator } from "../components/smm/ProfitCalculator";
import { WhyChooseUs } from "../components/smm/WhyChooseUs";
import { Testimonials } from "../components/smm/Testimonials";
import { FaqSection } from "../components/smm/FaqSection";
import { Footer } from "../components/smm/Footer";
import { PixModal } from "../components/smm/PixModal";
import { OrderTracker, OrderItem } from "../components/smm/OrderTracker";
import { ApiStatusModal } from "../components/smm/ApiStatusModal";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    title: "BRSMM | #1 Painel SMM do Brasil: Revenda de Seguidores Barato",
    meta: [
      {
        name: "description",
        content:
          "Suba nas redes sociais com o BRSMM! O painel SMM barato com revenda de seguidores no Brasil. Aproveite serviços de alta qualidade, recarga via PIX e suporte 24/7!",
      },
      {
        property: "og:title",
        content: "BRSMM | #1 Painel SMM do Brasil: Revenda de Seguidores Barato",
      },
      {
        property: "og:description",
        content:
          "Seguidores, curtidas e visualizações para Instagram, TikTok e YouTube com entrega rápida via PIX!",
      },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

const BALANCE_STORAGE_KEY = "brsmm-user-balance";
const ORDERS_STORAGE_KEY = "brsmm-user-orders";

function Index() {
  const [balance, setBalance] = useState<number>(50.0); // Saldo inicial para teste
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [isPixModalOpen, setIsPixModalOpen] = useState(false);
  const [suggestedPixAmount, setSuggestedPixAmount] = useState<number | undefined>();
  const [isTrackerOpen, setIsTrackerOpen] = useState(false);
  const [isApiModalOpen, setIsApiModalOpen] = useState(false);
  const [selectedServiceId, setSelectedServiceId] = useState<number>(101);

  // Load persisted balance and orders from localStorage
  useEffect(() => {
    try {
      const savedBalance = localStorage.getItem(BALANCE_STORAGE_KEY);
      if (savedBalance !== null) {
        setBalance(parseFloat(savedBalance));
      }

      const savedOrders = localStorage.getItem(ORDERS_STORAGE_KEY);
      if (savedOrders) {
        setOrders(JSON.parse(savedOrders));
      }
    } catch (e) {
      console.error("Erro ao carregar dados do armazenamento:", e);
    }
  }, []);

  const handleDeductBalance = (amount: number) => {
    setBalance((prev) => {
      const next = Math.max(0, prev - amount);
      try {
        localStorage.setItem(BALANCE_STORAGE_KEY, next.toString());
      } catch (e) {}
      return next;
    });
  };

  const handleRechargeSuccess = (amount: number) => {
    setBalance((prev) => {
      const next = prev + amount;
      try {
        localStorage.setItem(BALANCE_STORAGE_KEY, next.toString());
      } catch (e) {}
      return next;
    });
  };

  const handleOrderCreated = (order: OrderItem) => {
    setOrders((prev) => {
      const next = [order, ...prev];
      try {
        localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(next));
      } catch (e) {}
      return next;
    });
  };

  const handleScrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const handleSelectServiceFromTable = (serviceId: number) => {
    setSelectedServiceId(serviceId);
    handleScrollTo("order-form");
  };

  const handleOpenPixModal = (suggested?: number) => {
    setSuggestedPixAmount(suggested);
    setIsPixModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#070402] text-zinc-100 font-sans selection:bg-amber-500 selection:text-black">
      {/* Navigation */}
      <Navbar
        balance={balance}
        onOpenPixModal={() => handleOpenPixModal()}
        onOpenTracker={() => setIsTrackerOpen(true)}
        onOpenApiStatus={() => setIsApiModalOpen(true)}
        onScrollTo={handleScrollTo}
      />

      {/* Hero Section */}
      <HeroSection
        onScrollTo={handleScrollTo}
        onOpenPixModal={() => handleOpenPixModal()}
      />

      {/* Live Stats Bar */}
      <StatsBar />

      {/* Order Form (Core Feature) */}
      <OrderForm
        balance={balance}
        onDeductBalance={handleDeductBalance}
        onOpenPixModal={handleOpenPixModal}
        onOrderCreated={handleOrderCreated}
        initialServiceId={selectedServiceId}
      />

      {/* Complete Services & Price Catalog Table */}
      <ServicesTable onSelectService={handleSelectServiceFromTable} />

      {/* Reseller Profit Simulator */}
      <ProfitCalculator />

      {/* Why Choose Us */}
      <WhyChooseUs />

      {/* Testimonials */}
      <Testimonials />

      {/* FAQs */}
      <FaqSection />

      {/* Footer */}
      <Footer />

      {/* Pix Modal */}
      <PixModal
        isOpen={isPixModalOpen}
        onClose={() => setIsPixModalOpen(false)}
        onRechargeSuccess={handleRechargeSuccess}
        suggestedAmount={suggestedPixAmount}
      />

      {/* Order Tracker Modal */}
      <OrderTracker
        isOpen={isTrackerOpen}
        onClose={() => setIsTrackerOpen(false)}
        orders={orders}
      />

      {/* API Status Modal */}
      <ApiStatusModal
        isOpen={isApiModalOpen}
        onClose={() => setIsApiModalOpen(false)}
      />
    </div>
  );
}
