import { useState, useEffect, type FormEvent } from 'react';
import { supabase } from '../lib/supabase';
import { Mail, Lock, Loader2, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Estatísticas motivacionais exibidas na tela de login
const STATS = [
  { emoji: '📖', value: '73', label: 'livros bíblicos' },
  { emoji: '🔥', value: '12.4k', label: 'usuários ativos' },
  { emoji: '⭐', value: '847k', label: 'XP conquistados' },
  { emoji: '🏆', value: '230+', label: 'conquistas' },
];

// Frases que aparecem rotacionando
const QUOTES = [
  { text: '"A tua palavra é lâmpada para os meus pés."', ref: 'Salmo 119,105' },
  { text: '"No princípio era o Verbo."', ref: 'João 1,1' },
  { text: '"Tudo posso naquele que me fortalece."', ref: 'Filipenses 4,13' },
  { text: '"Buscai e encontrareis."', ref: 'Mateus 7,7' },
];

// Badges de isca para motivar cadastro
const TEASER_BADGES = [
  { emoji: '🌱', title: 'Semente da Fé', desc: 'Primeiro livro concluído' },
  { emoji: '🔥', title: 'Fogo do Espírito', desc: '7 dias seguidos' },
  { emoji: '📖', title: 'Leitor do Pentateuco', desc: 'Os 5 primeiros livros' },
  { emoji: '🕊️', title: 'Pomba da Paz', desc: 'Todo o Novo Testamento' },
  { emoji: '🏆', title: 'Servo Fiel', desc: 'Todos os 73 livros' },
  { emoji: '🎯', title: 'Peregrino', desc: 'Trilha do Discípulo completa' },
];

export default function Auth({ onAuthSuccess }: { onAuthSuccess: () => void }) {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [quoteIdx, setQuoteIdx] = useState(0);
  const [mascotMood, setMascotMood] = useState<'idle' | 'happy' | 'sad'>('idle');

  // Rotaciona citações
  useEffect(() => {
    const t = setInterval(() => setQuoteIdx(i => (i + 1) % QUOTES.length), 4000);
    return () => clearInterval(t);
  }, []);

  // Reseta mascote após reação
  useEffect(() => {
    if (mascotMood !== 'idle') {
      const t = setTimeout(() => setMascotMood('idle'), 2000);
      return () => clearTimeout(t);
    }
  }, [mascotMood]);

  const handleAuth = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        setMascotMood('happy');
        setTimeout(() => onAuthSuccess(), 600);
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setSuccessMsg('Cadastro realizado! Verifique seu email para confirmar e depois faça login.');
        setIsLogin(true);
        setMascotMood('happy');
      }
    } catch (err: any) {
      setMascotMood('sad');
      const msg = err.message || '';
      if (msg.includes('Invalid login credentials')) setError('Email ou senha incorretos.');
      else if (msg.includes('Email not confirmed')) setError('Confirme seu email antes de entrar.');
      else if (msg.includes('User already registered')) setError('Este email já está cadastrado. Faça login.');
      else if (msg.includes('Password should be')) setError('A senha precisa ter pelo menos 6 caracteres.');
      else setError(msg || 'Ocorreu um erro. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const quote = QUOTES[quoteIdx];

  return (
    <div className="min-h-screen bg-[#fdfbf7] flex flex-col overflow-hidden">

      {/* ── TOP HERO (visível só em telas maiores como complemento visual) ── */}
      <div className="hidden md:block absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full bg-amber-100/60 blur-3xl" />
        <div className="absolute top-1/2 -right-40 w-[400px] h-[400px] rounded-full bg-rose-100/50 blur-3xl" />
        <div className="absolute -bottom-20 left-1/3 w-[350px] h-[350px] rounded-full bg-indigo-100/40 blur-3xl" />
      </div>

      <div className="relative flex-1 flex flex-col md:flex-row items-stretch max-w-6xl mx-auto w-full px-4">

        {/* ── LADO ESQUERDO — hero motivacional (md+) ── */}
        <div className="hidden md:flex flex-col justify-center flex-1 pr-12 py-12">

          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3 mb-10"
          >
            <div className="w-10 h-10 bg-stone-900 rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-amber-400 text-sm font-black">BM</span>
            </div>
            <span className="font-serif font-bold text-stone-800 text-xl">Versiculando</span>
          </motion.div>

          {/* Mascote + frase */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-8"
          >
            <Mascot mood={mascotMood} />
          </motion.div>

          {/* Citação rotativa */}
          <div className="mb-10 min-h-[72px]">
            <AnimatePresence mode="wait">
              <motion.div
                key={quoteIdx}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.4 }}
              >
                <p className="text-2xl font-serif italic text-stone-700 leading-snug mb-1">
                  {quote.text}
                </p>
                <p className="text-sm font-bold text-amber-600 uppercase tracking-widest">{quote.ref}</p>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="grid grid-cols-2 gap-3 mb-10"
          >
            {STATS.map((s, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.25 + i * 0.06 }}
                className="bg-white/70 backdrop-blur-sm border border-stone-200 rounded-2xl px-4 py-3 flex items-center gap-3 shadow-sm"
              >
                <span className="text-2xl">{s.emoji}</span>
                <div>
                  <p className="font-black text-stone-900 text-base leading-none">{s.value}</p>
                  <p className="text-xs text-stone-500 font-medium mt-0.5">{s.label}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>

          {/* Teaser de badges */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <p className="text-xs font-black uppercase tracking-widest text-stone-400 mb-3">
              🏅 Conquistas para desbloquear
            </p>
            <div className="flex flex-wrap gap-2">
              {TEASER_BADGES.map((b, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.55 + i * 0.05 }}
                  className="flex items-center gap-1.5 bg-white border border-stone-200 rounded-full px-3 py-1.5 shadow-sm group cursor-default"
                  title={b.desc}
                >
                  <span className="text-base grayscale group-hover:grayscale-0 transition-all">{b.emoji}</span>
                  <span className="text-xs font-bold text-stone-600">{b.title}</span>
                  <span className="w-3 h-3 rounded-full bg-stone-200 flex items-center justify-center shrink-0">
                    <span className="text-[7px] text-stone-400 font-black">🔒</span>
                  </span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* ── LADO DIREITO — formulário ── */}
        <div className="flex flex-col justify-center py-8 md:py-12 w-full md:w-[420px] md:border-l md:border-stone-200 md:pl-12">

          {/* Logo mobile */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center mb-6 md:hidden"
          >
            <div className="w-14 h-14 bg-stone-900 rounded-2xl flex items-center justify-center shadow-xl mb-3">
              <span className="text-amber-400 text-xl font-black">BM</span>
            </div>
            <h1 className="font-serif font-bold text-stone-900 text-2xl">Versiculando</h1>
            <p className="text-stone-500 text-sm mt-0.5">Sua jornada pela Bíblia Católica</p>
          </motion.div>

          {/* Mascote mobile */}
          <div className="flex justify-center mb-4 md:hidden">
            <Mascot mood={mascotMood} size="sm" />
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            {/* Tabs Login / Cadastro estilo Duolingo */}
            <div className="flex bg-stone-100 rounded-2xl p-1 mb-6 gap-1">
              {(['login', 'cadastro'] as const).map((tab) => {
                const active = (tab === 'login') === isLogin;
                return (
                  <button
                    key={tab}
                    onClick={() => { setIsLogin(tab === 'login'); setError(null); setSuccessMsg(null); }}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
                      active
                        ? 'bg-white shadow-sm text-stone-900'
                        : 'text-stone-500 hover:text-stone-700'
                    }`}
                  >
                    {tab === 'login' ? '👋 Entrar' : '✨ Cadastrar'}
                  </button>
                );
              })}
            </div>

            {/* Cabeçalho contextual */}
            <div className="mb-6">
              <h2 className="text-2xl font-serif font-bold text-stone-900 leading-tight">
                {isLogin ? 'Bem-vindo de volta!' : 'Comece sua jornada'}
              </h2>
              <p className="text-stone-500 text-sm mt-1">
                {isLogin
                  ? 'Entre para continuar de onde parou.'
                  : 'Cadastre-se grátis e ganhe 50 XP de bônus!'}
              </p>
            </div>

            {/* Mensagem de sucesso */}
            <AnimatePresence>
              {successMsg && (
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="bg-emerald-50 border-2 border-emerald-200 text-emerald-800 p-4 rounded-2xl text-sm mb-5 flex items-start gap-3"
                >
                  <CheckCircle2 size={18} className="text-emerald-500 shrink-0 mt-0.5" />
                  <span>{successMsg}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Erro */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: [0, -6, 6, -4, 4, 0] }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.4 }}
                  className="bg-red-50 border-2 border-red-200 text-red-700 p-4 rounded-2xl text-sm mb-5 flex items-center gap-2"
                >
                  <span className="text-lg">😬</span>
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Formulário */}
            <form onSubmit={handleAuth} className="space-y-3">

              {/* Email */}
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-stone-500 mb-1.5">
                  Email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Mail className="h-4 w-4 text-stone-400" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full pl-11 pr-4 py-3.5 border-2 border-stone-200 rounded-2xl focus:border-amber-400 focus:ring-4 focus:ring-amber-400/10 transition-all outline-none text-sm bg-white font-medium placeholder:text-stone-300"
                    placeholder="seu@email.com"
                  />
                </div>
              </div>

              {/* Senha */}
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-stone-500 mb-1.5">
                  Senha
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="h-4 w-4 text-stone-400" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full pl-11 pr-12 py-3.5 border-2 border-stone-200 rounded-2xl focus:border-amber-400 focus:ring-4 focus:ring-amber-400/10 transition-all outline-none text-sm bg-white font-medium placeholder:text-stone-300"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-stone-400 hover:text-stone-600 transition-colors"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {!isLogin && (
                  <p className="text-xs text-stone-400 mt-1.5 ml-1">Mínimo de 6 caracteres.</p>
                )}
              </div>

              {/* Bônus de cadastro */}
              <AnimatePresence>
                {!isLogin && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl px-4 py-3 flex items-center gap-3">
                      <span className="text-2xl">🎁</span>
                      <div>
                        <p className="text-xs font-black text-amber-800 uppercase tracking-wide">Bônus de boas-vindas</p>
                        <p className="text-sm text-amber-700 font-medium">+50 XP ao criar sua conta</p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Botão principal — estilo Duolingo com borda inferior */}
              <motion.button
                type="submit"
                disabled={loading}
                whileTap={!loading ? { scale: 0.97, y: 2 } : {}}
                className={`w-full font-black text-base py-4 rounded-2xl transition-all flex items-center justify-center gap-2 mt-2 shadow-md active:shadow-sm
                  ${loading
                    ? 'bg-stone-200 text-stone-400 cursor-not-allowed border-b-4 border-stone-300'
                    : isLogin
                      ? 'bg-amber-400 hover:bg-amber-500 text-amber-900 border-b-4 border-amber-600 hover:border-amber-700 active:border-b-0 active:border-t-[3px] active:border-t-amber-600'
                      : 'bg-emerald-500 hover:bg-emerald-600 text-white border-b-4 border-emerald-700 hover:border-emerald-800 active:border-b-0 active:border-t-[3px] active:border-t-emerald-700'
                  }`}
              >
                {loading
                  ? <Loader2 className="w-5 h-5 animate-spin" />
                  : isLogin
                    ? '👋 Entrar na jornada'
                    : '✨ Criar minha conta grátis'}
              </motion.button>
            </form>

            {/* Divisor */}
            <div className="flex items-center gap-3 my-5">
              <div className="flex-1 h-px bg-stone-200" />
              <span className="text-xs text-stone-400 font-bold">ou</span>
              <div className="flex-1 h-px bg-stone-200" />
            </div>

            {/* Toggle login/cadastro */}
            <button
              onClick={() => { setIsLogin(v => !v); setError(null); setSuccessMsg(null); }}
              className={`w-full py-3.5 rounded-2xl border-2 font-bold text-sm transition-all
                ${isLogin
                  ? 'border-stone-200 text-stone-700 hover:border-stone-300 hover:bg-stone-50'
                  : 'border-stone-200 text-stone-700 hover:border-stone-300 hover:bg-stone-50'
                }`}
            >
              {isLogin ? 'Não tem conta? Cadastre-se grátis' : 'Já tem conta? Faça login'}
            </button>

            {/* Rodapé motivacional mobile */}
            <div className="mt-8 md:hidden">
              <p className="text-center text-xs text-stone-400 font-medium mb-4">🏅 Conquistas para desbloquear</p>
              <div className="flex flex-wrap justify-center gap-2">
                {TEASER_BADGES.slice(0, 4).map((b, i) => (
                  <div key={i} className="flex items-center gap-1.5 bg-white border border-stone-200 rounded-full px-3 py-1.5 shadow-sm">
                    <span className="text-sm grayscale">{b.emoji}</span>
                    <span className="text-xs font-bold text-stone-500">{b.title}</span>
                  </div>
                ))}
              </div>
            </div>

          </motion.div>
        </div>
      </div>

      {/* Rodapé */}
      <div className="relative text-center py-4 px-4">
        <p className="text-xs text-stone-400">
          Ao entrar, você concorda com os{' '}
          <span className="underline cursor-pointer hover:text-stone-600 transition-colors">Termos de Uso</span>
          {' '}e{' '}
          <span className="underline cursor-pointer hover:text-stone-600 transition-colors">Privacidade</span>.
        </p>
      </div>
    </div>
  );
}

// ── Mascote SVG animado ──────────────────────────────────────
function Mascot({ mood = 'idle', size = 'md' }: { mood?: 'idle' | 'happy' | 'sad'; size?: 'sm' | 'md' }) {
  const dim = size === 'sm' ? 80 : 120;

  return (
    <motion.div
      animate={
        mood === 'happy'
          ? { y: [0, -12, 0, -8, 0], rotate: [0, -5, 5, -3, 0] }
          : mood === 'sad'
            ? { x: [0, -6, 6, -4, 4, 0], y: [0, 3, 0] }
            : { y: [0, -4, 0] }
      }
      transition={
        mood === 'idle'
          ? { repeat: Infinity, duration: 3, ease: 'easeInOut' }
          : { duration: 0.6 }
      }
      style={{ width: dim, height: dim }}
      className="relative"
    >
      <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" width={dim} height={dim}>
        {/* Corpo redondo */}
        <circle cx="60" cy="72" r="38" fill="#1c1917" />
        {/* Orelhas / páginas do livro */}
        <rect x="18" y="54" width="14" height="22" rx="4" fill="#292524" />
        <rect x="88" y="54" width="14" height="22" rx="4" fill="#292524" />
        {/* Rosto — fundo claro */}
        <ellipse cx="60" cy="68" rx="28" ry="26" fill="#fdf8f0" />
        {/* Olhos */}
        {mood === 'sad' ? (
          <>
            {/* Olhos tristes */}
            <ellipse cx="49" cy="63" rx="5" ry="5" fill="#1c1917" />
            <ellipse cx="71" cy="63" rx="5" ry="5" fill="#1c1917" />
            <path d="M46 60 Q49 57 52 60" stroke="#1c1917" strokeWidth="1.5" fill="none" strokeLinecap="round" />
            <path d="M68 60 Q71 57 74 60" stroke="#1c1917" strokeWidth="1.5" fill="none" strokeLinecap="round" />
            {/* Lágrima */}
            <ellipse cx="49" cy="70" rx="2" ry="3" fill="#93c5fd" opacity="0.8" />
          </>
        ) : mood === 'happy' ? (
          <>
            {/* Olhos felizes — estrelas */}
            <path d="M44 63 L49 58 L54 63 L49 68 Z" fill="#f59e0b" />
            <path d="M66 63 L71 58 L76 63 L71 68 Z" fill="#f59e0b" />
          </>
        ) : (
          <>
            {/* Olhos normais com brilho */}
            <ellipse cx="49" cy="63" rx="5.5" ry="5.5" fill="#1c1917" />
            <ellipse cx="71" cy="63" rx="5.5" ry="5.5" fill="#1c1917" />
            <circle cx="51" cy="61" r="1.5" fill="white" opacity="0.8" />
            <circle cx="73" cy="61" r="1.5" fill="white" opacity="0.8" />
          </>
        )}
        {/* Boca */}
        {mood === 'sad' ? (
          <path d="M50 77 Q60 72 70 77" stroke="#1c1917" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        ) : mood === 'happy' ? (
          <path d="M48 74 Q60 84 72 74" stroke="#1c1917" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        ) : (
          <path d="M50 75 Q60 81 70 75" stroke="#1c1917" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        )}
        {/* Chapéu / coroa */}
        <rect x="42" y="36" width="36" height="8" rx="4" fill="#f59e0b" />
        <rect x="48" y="28" width="24" height="12" rx="5" fill="#f59e0b" />
        <circle cx="60" cy="26" r="4" fill="#fbbf24" />
        {/* Cruz pequena no chapéu */}
        <rect x="58" y="21" width="4" height="10" rx="1" fill="#fff7ed" opacity="0.8" />
        <rect x="55" y="24" width="10" height="4" rx="1" fill="#fff7ed" opacity="0.8" />
        {/* Pernas */}
        <rect x="48" y="108" width="10" height="8" rx="4" fill="#1c1917" />
        <rect x="62" y="108" width="10" height="8" rx="4" fill="#1c1917" />
        {/* XP badge */}
        <rect x="76" y="44" width="28" height="16" rx="8" fill="#f59e0b" />
        <text x="90" y="55" textAnchor="middle" fontSize="8" fontWeight="bold" fill="#78350f">+XP</text>
      </svg>
    </motion.div>
  );
}
