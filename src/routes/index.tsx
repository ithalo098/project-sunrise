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

interface CoffeeLog {
  id: string;
  type: CoffeeTypeName;
  volume: number;
  timestamp: Date;
}

const COFFEE_TYPES = [
  { name: "Espresso", icon: "☕" },
  { name: "Latte", icon: "🥛" },
  { name: "Cappuccino", icon: "☁️" },
  { name: "Americano", icon: "💧" },
  { name: "Coado", icon: "⏳" },
] as const;

type CoffeeTypeName = (typeof COFFEE_TYPES)[number]["name"];

const VOLUMES = [50, 150, 250, 350];

function Index() {
  const containerRef = useLiquidGlass();
  const [activeTab, setActiveTab] = useState<'tracker' | 'historico' | 'perfil'>('tracker');
  const [logs, setLogs] = useState<CoffeeLog[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [selectedType, setSelectedType] = useState(COFFEE_TYPES[0].name);
  const [selectedVolume, setSelectedVolume] = useState(150);

  const totalToday = logs.reduce((acc, log) => acc + log.volume, 0);
  const goal = 800;
  const progress = Math.min((totalToday / goal) * 100, 100);

  const addLog = () => {
    const newLog: CoffeeLog = {
      id: Math.random().toString(36).substr(2, 9),
      type: selectedType,
      volume: selectedVolume,
      timestamp: new Date(),
    };
    setLogs([newLog, ...logs]);
    setShowAdd(false);
  };

  return (
    <div className="flex h-screen w-full bg-[#070402] overflow-hidden relative" ref={containerRef}>
      {/* Background Gradients */}
      <div className="absolute inset-0 pointer-events-none opacity-40">
        <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] rounded-full bg-[#2a1810] blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-[#1a0f0a] blur-[120px]" />
      </div>

      <div className="flex-1 w-full max-w-[500px] mx-auto flex flex-col relative z-10 text-[#ede4d8]">
        {/* Header */}
        <header className="p-6 pt-12 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">SPECTRE FOFFEE</h1>
            <p className="text-[rgba(235,220,205,0.55)] text-sm">Controle de Consumo</p>
          </div>
          <div className="w-10 h-10 rounded-full glass flex items-center justify-center font-bold" data-liquid>
            SF
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-6 pb-24 scrollbar-hide">
          {activeTab === 'tracker' && (
            <div className="animate-hero">
              {/* Progress Circle */}
              <div className="relative w-64 h-64 mx-auto mt-8 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="128"
                    cy="128"
                    r="110"
                    stroke="rgba(255,255,255,0.05)"
                    strokeWidth="12"
                    fill="transparent"
                  />
                  <circle
                    cx="128"
                    cy="128"
                    r="110"
                    stroke="#D97706"
                    strokeWidth="12"
                    fill="transparent"
                    strokeDasharray={2 * Math.PI * 110}
                    strokeDashoffset={2 * Math.PI * 110 * (1 - progress / 100)}
                    strokeLinecap="round"
                    className="transition-all duration-1000 ease-out"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-4xl font-bold">{totalToday}ml</span>
                  <span className="text-sm text-[rgba(235,220,205,0.4)]">Meta: {goal}ml</span>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-4 mt-12">
                <StatCard 
                  number={logs.length.toString()} 
                  label="Cafés Hoje" 
                  delay="0.1s" 
                />
                <StatCard 
                  number={`${Math.round(progress)}%`} 
                  label="Da Meta" 
                  delay="0.2s" 
                />
              </div>

              {/* Add Button */}
              <button 
                onClick={() => setShowAdd(true)}
                className="mt-12 w-full h-16 glass glass-pill text-lg font-bold flex items-center justify-center gap-2 animate-fadeRise opacity-0"
                style={{ animationDelay: '0.4s' }}
                data-liquid
              >
                <span>+</span> Adicionar Café
              </button>
            </div>
          )}

          {activeTab === 'historico' && (
            <div className="animate-hero pt-4">
              <h2 className="text-xl font-bold mb-6">Histórico de Hoje</h2>
              <div className="flex flex-col gap-4">
                {logs.length === 0 ? (
                  <p className="text-center text-[rgba(235,220,205,0.3)] mt-12">Nenhum café registrado ainda.</p>
                ) : (
                  logs.map((log, i) => (
                    <div 
                      key={log.id} 
                      className="glass p-4 rounded-2xl flex items-center justify-between animate-fadeRise opacity-0"
                      style={{ animationDelay: `${i * 0.1}s` }}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-xl">
                          {COFFEE_TYPES.find(t => t.name === log.type)?.icon || "☕"}
                        </div>
                        <div>
                          <p className="font-medium">{log.type}</p>
                          <p className="text-xs text-[rgba(235,220,205,0.4)]">
                            {log.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                      <span className="font-bold">{log.volume}ml</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'perfil' && (
            <div className="animate-hero pt-4">
               <div className="flex flex-col items-center gap-4 py-8">
                  <div className="w-24 h-24 rounded-full glass flex items-center justify-center text-3xl font-bold" data-liquid>SF</div>
                  <div className="text-center">
                    <h2 className="text-2xl font-bold">Café Enthusiast</h2>
                    <p className="text-[rgba(235,220,205,0.55)]">Membro desde 2026</p>
                  </div>
               </div>

               <div className="grid grid-cols-2 gap-4 mt-4">
                 <div className="glass p-6 rounded-3xl text-center">
                    <p className="text-3xl font-bold">128</p>
                    <p className="text-xs text-[rgba(235,220,205,0.4)] uppercase tracking-widest mt-1">Total Lts</p>
                 </div>
                 <div className="glass p-6 rounded-3xl text-center">
                    <p className="text-3xl font-bold">Level 8</p>
                    <p className="text-xs text-[rgba(235,220,205,0.4)] uppercase tracking-widest mt-1">Barista Elite</p>
                 </div>
               </div>

               <div className="mt-8 flex flex-col gap-3">
                 <button className="glass glass-pill justify-between" data-liquid>Configurações</button>
                 <button className="glass glass-pill justify-between" data-liquid>Metas Diárias</button>
                 <button className="glass glass-pill justify-between text-red-400/60" data-liquid>Sair</button>
               </div>
            </div>
          )}
        </main>

        {/* Bottom Nav */}
        <nav className="absolute bottom-0 left-0 right-0 h-20 glass border-t border-white/5 flex items-center justify-around px-6 z-20 rounded-t-[32px]">
          <button 
            onClick={() => setActiveTab('tracker')}
            className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'tracker' ? 'text-amber-500' : 'text-white/40'}`}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>
            <span className="text-[10px] font-medium">Tracker</span>
          </button>
          <button 
            onClick={() => setActiveTab('historico')}
            className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'historico' ? 'text-amber-500' : 'text-white/40'}`}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
            <span className="text-[10px] font-medium">Histórico</span>
          </button>
          <button 
            onClick={() => setActiveTab('perfil')}
            className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'perfil' ? 'text-amber-500' : 'text-white/40'}`}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            <span className="text-[10px] font-medium">Perfil</span>
          </button>
        </nav>

        {/* Add Modal */}
        {showAdd && (
          <div className="absolute inset-0 z-50 flex items-end justify-center animate-in fade-in duration-300">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setShowAdd(false)} />
            <div className="relative w-full glass rounded-t-[40px] p-8 pb-12 animate-in slide-in-from-bottom duration-500">
              <div className="w-12 h-1.5 bg-white/10 rounded-full mx-auto mb-8" />
              <h3 className="text-xl font-bold mb-6">Adicionar Registro</h3>
              
              <div className="mb-8">
                <p className="text-sm text-[rgba(235,220,205,0.4)] mb-4 uppercase tracking-widest">Tipo de Café</p>
                <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
                  {COFFEE_TYPES.map(type => (
                    <button 
                      key={type.name}
                      onClick={() => setSelectedType(type.name)}
                      className={`flex-shrink-0 flex flex-col items-center gap-2 p-4 rounded-2xl transition-all ${selectedType === type.name ? 'bg-amber-500/20 ring-1 ring-amber-500/50' : 'bg-white/5'}`}
                    >
                      <span className="text-2xl">{type.icon}</span>
                      <span className="text-xs font-medium">{type.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-8">
                <p className="text-sm text-[rgba(235,220,205,0.4)] mb-4 uppercase tracking-widest">Quantidade (ml)</p>
                <div className="grid grid-cols-4 gap-3">
                  {VOLUMES.map(vol => (
                    <button 
                      key={vol}
                      onClick={() => setSelectedVolume(vol)}
                      className={`py-3 rounded-xl font-bold transition-all ${selectedVolume === vol ? 'bg-amber-500 text-black' : 'bg-white/5'}`}
                    >
                      {vol}
                    </button>
                  ))}
                </div>
              </div>

              <button 
                onClick={addLog}
                className="w-full h-16 bg-[#ede4d8] text-black rounded-3xl font-bold text-lg"
              >
                Salvar Registro
              </button>
            </div>
          </div>
        )}
      </div>

      <style>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        
        .animate-hero { animation: heroReveal 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .animate-fadeRise { animation: fadeRise 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; }

        @keyframes in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slide-in-from-bottom { from { transform: translateY(100%); } to { transform: translateY(0); } }
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
