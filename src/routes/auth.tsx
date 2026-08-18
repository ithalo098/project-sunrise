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
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      // Se falhar login, tenta signup
      const { error: signUpError } = await supabase.auth.signUp({ email, password });
      if (signUpError) alert(signUpError.message);
      else alert('Verifique seu e-mail!');
    } else {
      navigate({ to: '/' });
    }
    setLoading(false);
  };

  const handleOAuth = async (provider: 'google' | 'apple') => {
    await lovable.auth.signInWithOAuth(provider, {
      redirect_uri: window.location.origin,
    });
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

        <form onSubmit={handleEmailAuth} className="space-y-4">
          <div className="space-y-4">
            <input
              type="email"
              placeholder="Email"
              className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl px-6 outline-none focus:border-amber-500/50 transition-colors"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <input
              type="password"
              placeholder="Senha"
              className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl px-6 outline-none focus:border-amber-500/50 transition-colors"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full h-14 bg-[#ede4d8] text-black rounded-2xl font-bold hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {loading ? 'Carregando...' : 'Entrar ou Criar Conta'}
          </button>
        </form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/10"></div></div>
          <div className="relative flex justify-center text-xs uppercase"><span className="bg-[#070402] px-4 text-white/20">Ou continue com</span></div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => handleOAuth('google')}
            className="h-14 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center gap-3 hover:bg-white/10 transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 24 24"><path fill="#EA4335" d="M24 12.27c0-.85-.07-1.7-.22-2.52H12.25v4.77h6.6a5.64 5.64 0 0 1-2.45 3.7v3.08h3.97c2.32-2.13 3.65-5.28 3.65-8.83z"/><path fill="#FBBC05" d="M12.25 24c3.24 0 5.96-1.07 7.95-2.9l-3.97-3.08c-1.1.74-2.5 1.18-3.98 1.18-3.06 0-5.65-2.07-6.58-4.85H1.66v3.1A11.99 11.99 0 0 0 12.25 24z"/><path fill="#34A853" d="M5.67 14.35A7.17 7.17 0 0 1 5.25 12c0-.82.14-1.62.42-2.35v-3.1H1.66A11.98 11.98 0 0 0 0 12c0 1.9.44 3.7 1.22 5.3l4.45-2.95z"/><path fill="#4285F4" d="M12.25 4.8c1.76 0 3.34.6 4.58 1.8l3.43-3.43A11.95 11.95 0 0 0 12.25 0 11.99 11.99 0 0 0 1.66 6.55l4.01 3.12c.93-2.78 3.52-4.85 6.58-4.87z"/></svg>
            <span className="text-sm font-medium">Google</span>
          </button>
          <button
            onClick={() => handleOAuth('apple')}
            className="h-14 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center gap-3 hover:bg-white/10 transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M17.05 20.28c-.98.95-2.05 1.72-3.2 1.72-1.13 0-1.5-.68-2.8-.68-1.3 0-1.72.66-2.8.66-1.1 0-2.2-.77-3.2-1.72-2.08-1.96-3.2-4.9-3.2-7.8 0-4.66 3-7.1 5.86-7.1 1.48 0 2.6.9 3.5 1.1.92-.2 2.3-1.1 3.8-1.1 1.6 0 3.08.6 4 1.7-3.3 1.9-2.76 6.2.5 7.4-1.1 2.6-2.5 5.1-4 6.6zM12.03 5.3c-.02-2.14 1.75-3.95 3.75-4.1.2 2.2-1.93 4.2-3.75 4.1z"/></svg>
            <span className="text-sm font-medium">Apple</span>
          </button>
        </div>

        <p className="text-center text-[10px] text-white/20 px-8">
          Ao entrar, você concorda com nossos Termos de Serviço e Política de Privacidade.
        </p>
      </div>
    </div>
  );
}
