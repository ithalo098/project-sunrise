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
import { PixModal, DepositHistoryItem, DEPOSIT_HISTORY_KEY } from "../components/smm/PixModal";
import { OrderTracker, OrderItem } from "../components/smm/OrderTracker";
import { ApiStatusModal } from "../components/smm/ApiStatusModal";
import { CustomerWalletModal } from "../components/smm/CustomerWalletModal";
import { FloatingWhatsApp } from "../components/smm/FloatingWhatsApp";

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
  const [depositHistory, setDepositHistory] = useState<DepositHistoryItem[]>([]);
  const [isPixModalOpen, setIsPixModalOpen] = useState(false);
  const [suggestedPixAmount, setSuggestedPixAmount] = useState<number | undefined>();
  const [isTrackerOpen, setIsTrackerOpen] = useState(false);
  const [isWalletOpen, setIsWalletOpen] = useState(false);
  const [isApiModalOpen, setIsApiModalOpen] = useState(false);
  const [selectedServiceId, setSelectedServiceId] = useState<number>(101);

  // Load persisted balance, orders and deposits from localStorage
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

      const savedDeposits = localStorage.getItem(DEPOSIT_HISTORY_KEY);
      if (savedDeposits) {
        setDepositHistory(JSON.parse(savedDeposits));
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

    // Refresh deposits in memory
    try {
      const savedDeposits = localStorage.getItem(DEPOSIT_HISTORY_KEY);
      if (savedDeposits) {
        setDepositHistory(JSON.parse(savedDeposits));
      }
    } catch (e) {}
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

  const handleOpenWhatsAppSupport = (msg?: string) => {
    const text = msg || "Olá! Gostaria de conversar com o suporte oficial do BRSMM Brasil.";
    window.open(`https://wa.me/5511999999999?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="min-h-screen bg-[#030305] text-zinc-100 font-sans selection:bg-cyan-400 selection:text-black">
      {/* Navigation */}
      <Navbar
        balance={balance}
        onOpenPixModal={() => handleOpenPixModal()}
        onOpenTracker={() => setIsTrackerOpen(true)}
        onOpenApiStatus={() => setIsApiModalOpen(true)}
        onOpenWallet={() => setIsWalletOpen(true)}
        onOpenWhatsApp={() => handleOpenWhatsAppSupport()}
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
        onOpenTracker={() => setIsTrackerOpen(true)}
        onOpenWhatsAppSupport={handleOpenWhatsAppSupport}
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

      {/* Floating 24/7 WhatsApp Support Widget */}
      <FloatingWhatsApp phoneNumber="5511999999999" />

      {/* Pix Recharge Modal */}
      <PixModal
        isOpen={isPixModalOpen}
        onClose={() => setIsPixModalOpen(false)}
        onRechargeSuccess={handleRechargeSuccess}
        suggestedAmount={suggestedPixAmount}
        onOpenWhatsAppSupport={handleOpenWhatsAppSupport}
      />

      {/* Customer Wallet & Statement Modal */}
      <CustomerWalletModal
        isOpen={isWalletOpen}
        onClose={() => setIsWalletOpen(false)}
        balance={balance}
        onOpenPixModal={() => handleOpenPixModal()}
        depositHistory={depositHistory}
        orders={orders}
      />

      {/* Order Tracker Modal */}
      <OrderTracker
        isOpen={isTrackerOpen}
        onClose={() => setIsTrackerOpen(false)}
        orders={orders}
        onOpenWhatsAppSupport={handleOpenWhatsAppSupport}
      />

      {/* API Status Modal */}
      <ApiStatusModal
        isOpen={isApiModalOpen}
        onClose={() => setIsApiModalOpen(false)}
      />
    </div>
  );
}
