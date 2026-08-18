import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
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
  { id: 'espresso', name: "Espresso", icon: "☕" },
  { id: 'latte', name: "Latte", icon: "🥛" },
  { id: 'cappuccino', name: "Cappuccino", icon: "☁️" },
  { id: 'americano', name: "Americano", icon: "💧" },
  { id: 'coado', name: "Coado", icon: "⏳" },
  { id: 'mocha', name: "Mocha", icon: "🍫" },
  { id: 'macchiato', name: "Macchiato", icon: "🥛" },
  { id: 'cold-brew', name: "Cold Brew", icon: "❄️" },
  { id: 'iced-coffee', name: "Iced Coffee", icon: "🧊" },
] as const;


type CoffeeTypeName = (typeof COFFEE_TYPES)[number]["name"];

const VOLUMES = [50, 150, 250, 350];

const STORAGE_KEY = "spectre-coffee-logs";

function Index() {
  const containerRef = useLiquidGlass();
  const [activeTab, setActiveTab] = useState<'tracker' | 'ranking' | 'historico' | 'perfil'>('tracker');

  const [logs, setLogs] = useState<CoffeeLog[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [selectedType, setSelectedType] = useState<CoffeeTypeName>(COFFEE_TYPES[0].name);
  const [selectedVolume, setSelectedVolume] = useState(150);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Array<Omit<CoffeeLog, "timestamp"> & { timestamp: string }>;
        setLogs(parsed.map((l) => ({ ...l, timestamp: new Date(l.timestamp) })));
      }
    } catch {
      /* ignore corrupted storage */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(logs.map((l) => ({ ...l, timestamp: l.timestamp.toISOString() }))),
      );
    } catch {
      /* storage unavailable */
    }
  }, [logs, hydrated]);

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
        <main className="flex-1 overflow-y-auto pb-24 scrollbar-hide">
          {activeTab === 'tracker' && (
            <div className="animate-hero">
              {/* Hero Header with Video */}
              <div className="relative h-[320px]">
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
                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#070402]" />
                
                {/* Progress Circle - will be moved below */}


                <div className="absolute bottom-6 left-6 right-6">
                  <h1 className="text-3xl font-bold tracking-tight">SPECTRE TRACKER</h1>
                  <p className="text-[rgba(235,220,205,0.55)] text-sm">Controle seu consumo diário</p>
                </div>
              </div>

              <div className="px-6">
                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-4 mt-8">
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
                  className="mt-8 w-full h-16 glass glass-pill text-lg font-bold flex items-center justify-center gap-2 animate-fadeRise opacity-0"
                  style={{ animationDelay: '0.4s' }}
                  data-liquid
                >
                  <span>+</span> Registrar Café
                </button>

                {/* Progress Circle below button */}
                <div className="mt-8 flex flex-col items-center animate-fadeRise opacity-0" style={{ animationDelay: '0.5s' }}>
                  <div className="relative w-40 h-40 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle
                        cx="80"
                        cy="80"
                        r="72"
                        stroke="rgba(255,255,255,0.05)"
                        strokeWidth="6"
                        fill="transparent"
                      />
                      <circle
                        cx="80"
                        cy="80"
                        r="72"
                        stroke="#D97706"
                        strokeWidth="6"
                        fill="transparent"
                        strokeDasharray={2 * Math.PI * 72}
                        strokeDashoffset={2 * Math.PI * 72 * (1 - progress / 100)}
                        strokeLinecap="round"
                        className="transition-all duration-1000 ease-out"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-3xl font-bold tracking-tight">{totalToday} <span className="text-sm font-medium text-amber-500/80">ml</span></span>
                      <span className="text-[9px] text-[rgba(235,220,205,0.4)] uppercase tracking-[0.2em] mt-1">Consumo de Hoje</span>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-col items-center">
                    <span className="text-[10px] text-[rgba(235,220,205,0.4)] uppercase tracking-widest">Meta Diária: {goal}ml</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'ranking' && (
            <div className="animate-hero pt-4 px-6 h-full flex flex-col">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-bold tracking-tight">RANKING</h2>
                <div className="flex gap-2 bg-white/5 p-1 rounded-xl">
                  {['Hoje', 'Semana', 'Mês', 'Geral'].map((t) => (
                    <button key={t} className={`text-[10px] px-3 py-1.5 rounded-lg transition-all ${t === 'Hoje' ? 'bg-amber-500 text-black font-bold' : 'text-white/40'}`}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Podium */}
              <div className="flex items-end justify-center gap-4 mb-10 pt-4">
                {/* 2nd Place */}
                <div className="flex flex-col items-center gap-2">
                  <div className="relative">
                    <div className="w-16 h-16 rounded-full border-2 border-white/10 p-1">
                      <div className="w-full h-full rounded-full bg-white/5 flex items-center justify-center text-xl font-bold">L</div>
                    </div>
                    <div className="absolute -top-2 -right-2 bg-slate-300 text-black text-[10px] font-bold w-6 h-6 rounded-full flex items-center justify-center border-2 border-[#070402]">2</div>
                  </div>
                  <span className="text-xs font-medium">@lucas</span>
                  <span className="text-[10px] text-amber-500/80 font-bold">1.630 ml</span>
                </div>

                {/* 1st Place */}
                <div className="flex flex-col items-center gap-2 pb-6 scale-110">
                  <div className="relative">
                    <div className="w-20 h-20 rounded-full border-2 border-amber-500/50 p-1">
                      <div className="w-full h-full rounded-full bg-amber-500/10 flex items-center justify-center text-2xl font-bold">A</div>
                    </div>
                    <div className="absolute -top-3 -right-3 bg-amber-500 text-black text-[10px] font-bold w-8 h-8 rounded-full flex items-center justify-center border-2 border-[#070402]">1</div>
                  </div>
                  <span className="text-sm font-bold">@ana</span>
                  <span className="text-[11px] text-amber-500 font-bold">1.850 ml</span>
                </div>

                {/* 3rd Place */}
                <div className="flex flex-col items-center gap-2">
                  <div className="relative">
                    <div className="w-16 h-16 rounded-full border-2 border-white/10 p-1">
                      <div className="w-full h-full rounded-full bg-white/5 flex items-center justify-center text-xl font-bold">R</div>
                    </div>
                    <div className="absolute -top-2 -right-2 bg-amber-800 text-black text-[10px] font-bold w-6 h-6 rounded-full flex items-center justify-center border-2 border-[#070402]">3</div>
                  </div>
                  <span className="text-xs font-medium">@rafael</span>
                  <span className="text-[10px] text-amber-500/80 font-bold">1.420 ml</span>
                </div>
              </div>

              {/* List */}
              <div className="flex flex-col gap-3">
                {[
                  { pos: 4, name: 'João', handle: '@joao', ml: 1180 },
                  { pos: 5, name: 'Pedro', handle: '@pedro', ml: 980 },
                  { pos: 6, name: 'Spectre', handle: '@spectre', ml: 850 },
                ].map((u, i) => (
                  <div key={u.pos} className="glass p-4 rounded-2xl flex items-center justify-between animate-fadeRise opacity-0" style={{ animationDelay: `${i * 0.1}s` }}>
                    <div className="flex items-center gap-4">
                      <span className="text-xs font-bold text-white/30 w-4">{u.pos}</span>
                      <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-sm font-bold">{u.name[0]}</div>
                      <div>
                        <p className="text-sm font-bold">{u.name}</p>
                        <p className="text-[10px] text-white/40">{u.handle}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold">{u.ml}ml</p>
                      <p className="text-[9px] text-amber-500/60 uppercase tracking-tighter">▲ 2 posições</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Your position footer */}
              <div className="mt-8 mb-4 p-4 glass rounded-3xl border border-amber-500/20 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <span className="text-xs font-bold text-amber-500/60">#1.428</span>
                  <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center text-sm font-bold text-amber-500">VC</div>
                  <div>
                    <p className="text-sm font-bold">Você</p>
                    <p className="text-[10px] text-white/40">Faltam 120ml para #1.427</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold">{totalToday}ml</p>
                  <p className="text-[9px] text-white/40 uppercase">Geral</p>
                </div>
              </div>
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
               </div>
            </div>
          )}
        </main>

        {/* Bottom Nav */}
        <nav className="absolute bottom-0 left-0 right-0 h-20 glass border-t border-white/5 flex items-center justify-around px-2 z-20 rounded-t-[32px]">
          <button 
            onClick={() => setActiveTab('tracker')}
            className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'tracker' ? 'text-amber-500' : 'text-white/40'}`}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>
            <span className="text-[9px] font-medium">Home</span>
          </button>
          <button 
            onClick={() => setActiveTab('ranking')}
            className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'ranking' ? 'text-amber-500' : 'text-white/40'}`}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>
            <span className="text-[9px] font-medium">Ranking</span>
          </button>

          {/* Center Action Button */}
          <button 
            onClick={() => setShowAdd(true)}
            className="w-14 h-14 bg-amber-500 rounded-full flex items-center justify-center -mt-8 shadow-lg shadow-amber-500/20 active:scale-90 transition-transform"
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          </button>

          <button 
            onClick={() => setActiveTab('historico')}
            className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'historico' ? 'text-amber-500' : 'text-white/40'}`}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
            <span className="text-[9px] font-medium">Histórico</span>
          </button>

          <button 
            onClick={() => setActiveTab('perfil')}
            className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'perfil' ? 'text-amber-500' : 'text-white/40'}`}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            <span className="text-[9px] font-medium">Perfil</span>
          </button>

        </nav>

        {/* Add Modal */}
        {showAdd && (
          <div className="absolute inset-0 z-50 flex items-end justify-center animate-in fade-in duration-300 backdrop-blur-md">
            <div className="absolute inset-0 bg-black/40" onClick={() => setShowAdd(false)} />
            <div className="relative w-full glass rounded-t-[40px] p-8 pb-12 animate-in slide-in-from-bottom duration-500 max-h-[90vh] overflow-y-auto scrollbar-hide">
              <div className="w-12 h-1.5 bg-white/10 rounded-full mx-auto mb-8" />
              
              <div className="mb-8">
                <h3 className="text-xl font-bold mb-2">Novo Registro</h3>
                <p className="text-xs text-white/30">Comprove seu café para subir no ranking.</p>
              </div>

              {/* Step 1: Photo (Simulated for now) */}
              <div className="mb-8">
                <p className="text-[10px] text-[rgba(235,220,205,0.4)] mb-4 uppercase tracking-widest font-bold">1. Comprovação por Foto</p>
                <div className="w-full aspect-video rounded-3xl bg-white/5 border-2 border-dashed border-white/10 flex flex-col items-center justify-center gap-3 active:bg-white/10 transition-colors cursor-pointer relative overflow-hidden group">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white/20 group-hover:text-amber-500/50 transition-colors"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                  <span className="text-xs text-white/30 font-medium">Tire uma foto do seu café</span>
                  <div className="absolute inset-0 bg-amber-500/5 opacity-0 group-active:opacity-100 transition-opacity" />
                </div>
                <p className="text-[9px] text-white/20 mt-3 text-center italic">Sua foto é privada e usada apenas para validação antifraude.</p>
              </div>

              
              <div className="mb-8">
                <p className="text-[10px] text-[rgba(235,220,205,0.4)] mb-4 uppercase tracking-widest font-bold">2. Detalhes do Café</p>
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
                <p className="text-[10px] text-[rgba(235,220,205,0.4)] mb-4 uppercase tracking-widest font-bold">3. Quantidade (ml)</p>
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
