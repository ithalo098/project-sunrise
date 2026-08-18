import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from "@/integrations/lovable/index";

export const Route = createFileRoute('/auth')({
  component: AuthPage,
});

function AuthPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const navigate = useNavigate();

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    // Simula um login básico "não precisa ser forte"
    // Em uma aplicação real sem Supabase Auth, salvaríamos em localStorage ou DB simples
    // Como estamos usando Supabase Auth, convertemos username em um formato de email fictício se necessário,
    // ou usamos o Auth nativo do Supabase que já lida com persistência.
    
    const fakeEmail = `${username.toLowerCase().trim()}@spectre.local`;
    
    const { error } = await supabase.auth.signInWithPassword({ 
      email: fakeEmail, 
      password 
    });

    if (error) {
      // Se falhar login (provavelmente não existe), tenta signup
      const { error: signUpError } = await supabase.auth.signUp({ 
        email: fakeEmail, 
        password 
      });
      
      if (signUpError) {
        alert("Erro: Verifique os dados.");
      } else {
        alert("Conta criada! Redirecionando...");
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

        <form onSubmit={handleEmailAuth} className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] text-white/30 uppercase tracking-widest ml-2">Usuário</label>
              <input
                type="text"
                placeholder="Ex: spectre_user"
                className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl px-6 outline-none focus:border-amber-500/50 transition-colors"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] text-white/30 uppercase tracking-widest ml-2">Senha</label>
              <input
                type="password"
                placeholder="••••••••"
                className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl px-6 outline-none focus:border-amber-500/50 transition-colors"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="flex items-center justify-between px-2">
            <label className="flex items-center gap-3 cursor-pointer group">
              <div className={`w-5 h-5 rounded-md border border-white/10 flex items-center justify-center transition-colors ${rememberMe ? 'bg-amber-500 border-amber-500' : 'bg-white/5'}`}>
                {rememberMe && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="4"><polyline points="20 6 9 17 4 12"/></svg>}
              </div>
              <input 
                type="checkbox" 
                className="hidden" 
                checked={rememberMe} 
                onChange={() => setRememberMe(!rememberMe)} 
              />
              <span className="text-xs text-white/40 group-hover:text-white/60 transition-colors">Lembrar de mim</span>
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-16 bg-[#ede4d8] text-black rounded-3xl font-bold hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 shadow-xl shadow-white/5"
          >
            {loading ? 'Carregando...' : 'Entrar'}
          </button>
        </form>

        <p className="text-center text-[10px] text-white/15 px-8">
          A autenticação social foi removida conforme solicitado. Login básico simplificado com persistência de sessão.
        </p>

      </div>
    </div>
  );
}
