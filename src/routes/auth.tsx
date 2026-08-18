import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from "@/integrations/lovable/index";

export const Route = createFileRoute('/auth')({
  component: AuthPage,
});

function AuthPage() {
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleSimpleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;
    setLoading(true);
    
    const fakeEmail = `${username.toLowerCase().trim()}@spectre.local`;
    const simplePassword = "password123"; // Senha fixa para remover burocracia
    
    const { error } = await supabase.auth.signInWithPassword({ 
      email: fakeEmail, 
      password: simplePassword 
    });

    if (error) {
      const { error: signUpError } = await supabase.auth.signUp({ 
        email: fakeEmail, 
        password: simplePassword
      });
      
      if (signUpError) {
        alert("Erro ao entrar.");
      } else {
        navigate({ to: '/' });
      }
    } else {
      navigate({ to: '/' });
    }
    setLoading(false);
  };


  return (
    <div className="min-h-screen bg-[#070402] text-[#ede4d8] flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-[-20%] left-[-20%] w-[80%] h-[80%] rounded-full bg-[#2a1810] blur-[150px] opacity-30" />
      <div className="absolute bottom-[-20%] right-[-20%] w-[80%] h-[80%] rounded-full bg-[#1a0f0a] blur-[150px] opacity-30" />

      <div className="w-full max-w-md z-10 space-y-8 animate-hero">
        <div className="text-center space-y-2">
          <div className="w-20 h-20 bg-amber-500 rounded-3xl mx-auto flex items-center justify-center text-4xl shadow-2xl shadow-amber-500/20 mb-6">☕</div>
          <h1 className="text-4xl font-bold tracking-tighter">SPECTRE</h1>
          <p className="text-white/40 text-sm uppercase tracking-widest">Coffee Social Club</p>
        </div>

        <form onSubmit={handleSimpleAuth} className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] text-white/30 uppercase tracking-widest ml-2">Qual seu nome?</label>
              <input
                type="text"
                placeholder="Digite seu usuário..."
                className="w-full h-16 bg-white/5 border border-white/10 rounded-2xl px-6 outline-none focus:border-amber-500/50 transition-colors text-lg"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-16 bg-[#ede4d8] text-black rounded-3xl font-bold hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 shadow-xl shadow-white/5 text-lg"
          >
            {loading ? 'Entrando...' : 'Entrar Agora'}
          </button>
        </form>

        <p className="text-center text-[10px] text-white/15 px-8">
          A autenticação social foi removida conforme solicitado. Login básico simplificado com persistência de sessão.
        </p>

      </div>
    </div>
  );
}
