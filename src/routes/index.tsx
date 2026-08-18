import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { useLiquidGlass } from "../lib/useLiquidGlass";


export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    title: "SPECTRE FOFFEE - Perfil",
    meta: [
      {
        name: "description",
        content: "Perfil exclusivo SPECTRE FOFFEE - Sua experiência premium com café.",
      },
      { property: "og:title", content: "SPECTRE FOFFEE - Perfil" },
      {
        property: "og:description",
        content: "Veja suas conquistas e bebidas favoritas na SPECTRE FOFFEE.",
      },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

function Index() {
  const containerRef = useLiquidGlass();
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
        <div className="screen w-full h-full bg-[#180a06] overflow-y-auto overflow-x-hidden scrollbar-hide text-[#ede4d8]">
          {/* Hero Section */}
          <div className="relative w-full h-[430px] animate-hero">
            <video
              autoPlay
              muted
              loop
              playsInline
              className="w-full h-full object-cover object-[center_top]"
            >
              <source
                src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260707_003042_3d2380a6-1ce6-4407-a2e2-cfec46546407.mp4"
                type="video/mp4"
              />
            </video>
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#180a06] opacity-100 via-[52%] h-full pointer-events-none" />

            {/* Top Bar */}
            <div className="absolute top-[18px] left-[18px] right-[18px] flex justify-between items-center z-10">
              <button className="glass glass-circle animate-dropIn opacity-0 [animation-delay:0.35s]" data-liquid>

                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              </button>
              <button className="glass glass-circle animate-dropIn opacity-0 [animation-delay:0.42s]" data-liquid>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          </div>

          {/* Identity Section */}
          <div className="relative flex flex-col items-center -mt-[112px] pb-8 z-10">
            <div className="relative">
              <img
                src="/assets/images/laurel-left.png"
                alt=""
                className="absolute right-[calc(50%+66px)] top-[-20px] h-[73px] opacity-60 animate-fadeIn opacity-0 [animation-delay:0.5s]"
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
              <h1 className="text-[28px] font-medium tracking-tight animate-fadeRise opacity-0 [animation-delay:0.5s]">
                SPECTRE FOFFEE
              </h1>
              <img
                src="/assets/images/laurel-right.png"
                alt=""
                className="absolute left-[calc(50%+66px)] top-[-20px] h-[73px] opacity-60 animate-fadeIn opacity-0 [animation-delay:0.5s]"
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
            </div>
            <p className="text-[15px] text-[rgba(235,220,205,0.55)] mt-1 animate-fadeRise opacity-0 [animation-delay:0.58s]">
              Latte Parfait de Ameixa
            </p>

            {/* Achievements Pill */}
            <div className="mt-[30px] animate-fadeRise opacity-0 [animation-delay:0.66s]">
              <button className="glass glass-pill w-[225px]" data-liquid>

                <img src="/assets/images/icon-trophy.png" alt="" className="w-[18px] h-[18px]" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                <span className="text-[18px] font-medium">12 conquistas</span>
              </button>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-3 px-4 pt-[26px]">
            <StatCard
              image="https://polo-pecan-73837341.figma.site/_assets/v11/a8ba62db54d1e331b7beb36d69308e9b92516b99.png"
              number="154"
              label="bebidas consumidas"
              delay="0.74s"
            />
            <StatCard
              image="https://polo-pecan-73837341.figma.site/_assets/v11/953600065119f54f64ab9edb076b3cbb289fcff8.png"
              number="36"
              label="sanduíches consumidos"
              delay="0.80s"
            />
            <StatCard
              image="https://polo-pecan-73837341.figma.site/_assets/v11/aef68e05f729a30ed177f74c2cece578c05bfdba.png"
              number="12"
              label="cafeterias visitadas"
              delay="0.86s"
            />
          </div>

          {/* Favorite Card */}
          <div className="mx-4 mt-3 rounded-[24px] bg-[rgba(255,255,255,0.06)] h-[110px] flex items-center p-4 gap-4 animate-fadeRise opacity-0 [animation-delay:0.94s]">
            <div className="w-[108px] h-[108px] flex-shrink-0 -ml-2">
              <img
                src="https://polo-pecan-73837341.figma.site/_assets/v11/976a811111808abc50be33c2483872dbdb6ad5a8.png"
                alt="Latte"
                className="w-full h-full object-contain"
              />
            </div>
            <div className="flex flex-col flex-grow">
              <span className="text-[13px] font-medium">Favorito</span>
              <span className="text-[19px] font-medium">Latte</span>
              <span className="text-[13px] text-[#BAAA9A8C]">Pedido 73 vezes</span>
            </div>
            <button className="glass glass-circle flex-shrink-0" data-liquid>
               <img src="/assets/images/icon-shuffle.png" alt="" className="w-[19px] h-[19px]" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
            </button>
          </div>

          {/* Next Card Teaser */}
          <div className="mx-4 mt-3 rounded-t-[24px] bg-[rgba(255,255,255,0.06)] h-[34px] animate-fadeIn opacity-0 [animation-delay:1.02s]" />
        </div>
      </div>

      <style>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        
        .animate-fadeIn {
          animation: fadeIn 0.8s ease-out forwards;
        }
        
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @media (max-width: 440px) {
          .relative.shadow-[0_40px_80px_-15px_rgba(0,0,0,0.8)] {
            transform: scale(0.6) !important;
          }
        }
      `}</style>
    </div>
  );
}

function StatCard({ image, number, label, delay }: { image: string; number: string; label: string; delay: string }) {
  return (
    <div
      className="bg-[rgba(255,255,255,0.06)] rounded-[24px] p-4 flex flex-col items-center text-center animate-fadeRise opacity-0"
      style={{ animationDelay: delay }}
    >
      <img src={image} alt="" className="w-[84px] h-[84px] object-contain mb-1" />
      <span className="text-[25px] font-medium leading-none">{number}</span>
      <span className="text-[13px] text-[#BAAA9A8C] mt-1 leading-tight">{label}</span>
    </div>
  );
}
