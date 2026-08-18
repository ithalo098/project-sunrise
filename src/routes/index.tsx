import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef } from "react";
import { useLiquidGlass } from "../lib/useLiquidGlass";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    title: "SPECTRE FOFFEE - Coffee Tracker",
    meta: [
      {
        name: "description",
        content: "Controle seu consumo diário de café com SPECTRE FOFFEE.",
      },
      { property: "og:title", content: "SPECTRE FOFFEE - Coffee Tracker" },
      {
        property: "og:description",
        content: "Acompanhe quanto café você tomou hoje.",
      },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

interface Product {
  id: number;
  name: string;
  description: string;
  price: string;
  image: string;
  category: string;
}

const PRODUCTS: Product[] = [
  {
    id: 1,
    name: "Latte Parfait",
    description: "Com toque de ameixa",
    price: "R$ 19,50",
    image: "https://polo-pecan-73837341.figma.site/_assets/v11/a8ba62db54d1e331b7beb36d69308e9b92516b99.png",
    category: "Cafés",
  },
  {
    id: 2,
    name: "Cappuccino",
    description: "Espuma cremosa",
    price: "R$ 16,00",
    image: "https://polo-pecan-73837341.figma.site/_assets/v11/976a811111808abc50be33c2483872dbdb6ad5a8.png",
    category: "Cafés",
  },
  {
    id: 3,
    name: "Sanduíche Artisan",
    description: "Pão de fermentação natural",
    price: "R$ 24,90",
    image: "https://polo-pecan-73837341.figma.site/_assets/v11/953600065119f54f64ab9edb076b3cbb289fcff8.png",
    category: "Comidas",
  },
  {
    id: 4,
    name: "Espresso SPECTRE",
    description: "Grãos selecionados",
    price: "R$ 9,00",
    image: "https://polo-pecan-73837341.figma.site/_assets/v11/aef68e05f729a30ed177f74c2cece578c05bfdba.png",
    category: "Cafés",
  },
];

function Index() {
  const containerRef = useLiquidGlass();
  const [activeTab, setActiveTab] = useState<'loja' | 'perfil'>('loja');
  const [cartCount, setCartCount] = useState(0);

  return (
    <div className="flex min-h-screen items-center justify-center p-4" ref={containerRef}>
      {/* Phone Mockup Frame */}
      <div
        className="relative shadow-[0_40px_80px_-15px_rgba(0,0,0,0.8)] bg-black overflow-hidden border-[12px] border-black"
        style={{
          width: "390px",
          height: "844px",
          borderRadius: "44px",
          transform: "scale(0.78)",
        }}
      >
        <div className="screen w-full h-full bg-[#180a06] overflow-hidden flex flex-col text-[#ede4d8]">
          
          <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-hide pb-20">
            {activeTab === 'loja' ? (
              <div className="animate-hero">
                {/* Hero / Header Loja */}
                <div className="relative h-[280px]">
                  <video
                    autoPlay
                    muted
                    loop
                    playsInline
                    className="w-full h-full object-cover"
                  >
                    <source
                      src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260707_003042_3d2380a6-1ce6-4407-a2e2-cfec46546407.mp4"
                      type="video/mp4"
                    />
                  </video>
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#180a06]" />
                  <div className="absolute bottom-6 left-6 right-6">
                    <h1 className="text-3xl font-bold tracking-tight">SPECTRE LOJA</h1>
                    <p className="text-[rgba(235,220,205,0.55)]">O café do futuro, hoje.</p>
                  </div>
                </div>

                {/* Categories */}
                <div className="px-4 py-6 overflow-x-auto flex gap-3 scrollbar-hide">
                  {['Tudo', 'Cafés', 'Comidas', 'Grãos'].map((cat, i) => (
                    <button key={cat} className={`glass glass-pill px-6 flex-shrink-0 animate-dropIn opacity-0`} style={{ animationDelay: `${0.1 + i * 0.1}s` }} data-liquid>
                      {cat}
                    </button>
                  ))}
                </div>

                {/* Products Grid */}
                <div className="px-4 grid grid-cols-2 gap-4">
                  {PRODUCTS.map((product, i) => (
                    <div 
                      key={product.id} 
                      className="bg-[rgba(255,255,255,0.06)] rounded-[24px] p-4 flex flex-col animate-fadeRise opacity-0"
                      style={{ animationDelay: `${0.4 + i * 0.1}s` }}
                    >
                      <img src={product.image} alt={product.name} className="w-full aspect-square object-contain mb-3" />
                      <h3 className="font-medium text-[15px]">{product.name}</h3>
                      <p className="text-[12px] text-[rgba(235,220,205,0.55)] mb-3">{product.description}</p>
                      <div className="mt-auto flex justify-between items-center">
                        <span className="font-bold">{product.price}</span>
                        <button 
                          className="glass w-10 h-10 rounded-full flex items-center justify-center text-xl" 
                          data-liquid
                          onClick={() => setCartCount(prev => prev + 1)}
                        >
                          +
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="animate-hero">
                {/* Profile View (Existing Content adapted) */}
                <div className="relative w-full h-[320px]">
                  <div className="w-full h-full bg-[rgba(255,255,255,0.03)] flex items-center justify-center">
                     <div className="w-24 h-24 rounded-full bg-[rgba(255,255,255,0.1)] flex items-center justify-center text-3xl font-bold">SF</div>
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#180a06]" />
                </div>
                
                <div className="flex flex-col items-center -mt-16 px-6">
                  <h2 className="text-2xl font-bold">SPECTRE USUÁRIO</h2>
                  <p className="text-[rgba(235,220,205,0.55)]">Membro Premium desde 2026</p>
                  
                  <div className="mt-8 grid grid-cols-3 gap-3 w-full">
                    <StatCard number="154" label="bebidas" delay="0.1s" />
                    <StatCard number="36" label="pedidos" delay="0.2s" />
                    <StatCard number="12" label="nível" delay="0.3s" />
                  </div>

                  <div className="w-full mt-8 flex flex-col gap-4">
                    <button className="glass glass-pill justify-between w-full" data-liquid>
                      <span>Minhas Conquistas</span>
                      <span className="text-xs px-2 py-1 bg-white/10 rounded-full">12</span>
                    </button>
                    <button className="glass glass-pill justify-between w-full" data-liquid>
                      <span>Histórico de Pedidos</span>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
                    </button>
                    <button className="glass glass-pill justify-between w-full text-red-400/80" data-liquid>
                      <span>Sair da Conta</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Nav */}
          <div className="absolute bottom-0 left-0 right-0 h-20 bg-[rgba(24,10,6,0.8)] backdrop-blur-xl border-t border-white/5 flex items-center justify-around px-6 z-20">
            <button 
              onClick={() => setActiveTab('loja')}
              className={`flex flex-col items-center gap-1 ${activeTab === 'loja' ? 'text-[#ede4d8]' : 'text-[#ede4d8]/40'}`}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
              <span className="text-[10px] font-medium">Loja</span>
            </button>
            <div className="relative">
              <button className="text-[#ede4d8]/40 flex flex-col items-center gap-1">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
                <span className="text-[10px] font-medium">Carrinho</span>
              </button>
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                  {cartCount}
                </span>
              )}
            </div>
            <button 
              onClick={() => setActiveTab('perfil')}
              className={`flex flex-col items-center gap-1 ${activeTab === 'perfil' ? 'text-[#ede4d8]' : 'text-[#ede4d8]/40'}`}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              <span className="text-[10px] font-medium">Perfil</span>
            </button>
          </div>
        </div>
      </div>

      <style>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        
        .animate-hero { animation: heroReveal 1s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .animate-dropIn { animation: dropIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .animate-fadeRise { animation: fadeRise 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; }

        @media (max-width: 440px) {
          .relative.shadow-[0_40px_80px_-15px_rgba(0,0,0,0.8)] {
            transform: scale(0.6) !important;
          }
        }
      `}</style>
    </div>
  );
}

function StatCard({ number, label, delay }: { number: string; label: string; delay: string }) {
  return (
    <div
      className="bg-[rgba(255,255,255,0.06)] rounded-[20px] py-4 flex flex-col items-center text-center animate-fadeRise opacity-0"
      style={{ animationDelay: delay }}
    >
      <span className="text-[22px] font-bold leading-none">{number}</span>
      <span className="text-[11px] text-[#BAAA9A8C] mt-1 leading-tight uppercase tracking-wider">{label}</span>
    </div>
  );
}
