import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Mail, Lock, Loader2, CheckCircle2, Library } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function Auth({ onAuthSuccess }: { onAuthSuccess: () => void }) {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        onAuthSuccess();
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setSuccessMsg('Cadastro realizado! Verifique seu email para confirmar e depois faça login.');
        setIsLogin(true);
      }
    } catch (err: any) {
      const msg = err.message || '';
      if (msg.includes('Invalid login credentials')) setError('Email ou senha incorretos.');
      else if (msg.includes('Email not confirmed')) setError('Confirme seu email antes de entrar. Verifique sua caixa de entrada.');
      else if (msg.includes('User already registered')) setError('Este email já está cadastrado. Faça login.');
      else if (msg.includes('Password should be')) setError('A senha precisa ter pelo menos 6 caracteres.');
      else setError(msg || 'Ocorreu um erro. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fdfbf7] flex flex-col justify-center items-center p-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-stone-900 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Library size={24} className="text-amber-400" />
          </div>
          <h1 className="text-3xl font-serif font-bold text-stone-900">Versiculando</h1>
          <p className="text-stone-500 text-sm mt-1">Sua jornada pela Bíblia Católica</p>
        </div>
        <div className="bg-white rounded-3xl shadow-xl p-8 border border-stone-100">
          <h2 className="text-xl font-bold text-stone-900 mb-1">{isLogin ? 'Bem-vindo de volta' : 'Criar conta'}</h2>
          <p className="text-stone-500 text-sm mb-6">{isLogin ? 'Entre para sincronizar seu progresso.' : 'Cadastre-se para salvar sua jornada na nuvem.'}</p>
          <AnimatePresence>
            {successMsg && (
              <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl text-sm mb-5 flex items-start gap-3">
                <CheckCircle2 size={18} className="text-emerald-600 shrink-0 mt-0.5" />
                <span>{successMsg}</span>
              </motion.div>
            )}
          </AnimatePresence>
          <AnimatePresence>
            {error && (
              <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-sm mb-5">
                {error}
              </motion.div>
            )}
          </AnimatePresence>
          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1.5">Email</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none"><Mail className="h-4 w-4 text-stone-400" /></div>
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border border-stone-200 rounded-xl focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400 transition-colors outline-none text-sm"
                  placeholder="seu@email.com" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1.5">Senha</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none"><Lock className="h-4 w-4 text-stone-400" /></div>
                <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border border-stone-200 rounded-xl focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400 transition-colors outline-none text-sm"
                  placeholder="••••••••" />
              </div>
              {!isLogin && <p className="text-xs text-stone-400 mt-1.5">Mínimo de 6 caracteres.</p>}
            </div>
            <button type="submit" disabled={loading}
              className="w-full bg-stone-900 hover:bg-stone-800 text-white font-bold py-3.5 px-4 rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-60 mt-2">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : isLogin ? 'Entrar' : 'Cadastrar'}
            </button>
          </form>
          <div className="mt-5 text-center">
            <button onClick={() => { setIsLogin(!isLogin); setError(null); setSuccessMsg(null); }}
              className="text-sm text-amber-600 hover:text-amber-700 font-medium">
              {isLogin ? 'Não tem conta? Cadastre-se' : 'Já tem conta? Faça login'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
