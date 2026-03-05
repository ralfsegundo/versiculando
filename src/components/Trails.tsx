import { useState, useEffect } from 'react';
import { Heart, Brain, Users, Zap, Wind, Moon, ArrowRight, Lock, CheckCircle2, Clock, Flame, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { fetchTrails, fetchUserProgress, getTrailCompletedDays, Trail, UserTrailProgress } from '../services/trails';
import { supabase } from '../lib/supabase';

interface TrailsProps {
  onSelectTrail: (trail: Trail) => void;
}

const CATEGORY_META: Record<string, { icon: typeof Heart; gradient: string; bg: string; border: string; label: string }> = {
  relacionamento: { icon: Heart,  gradient: 'from-rose-600 to-pink-700',    bg: 'bg-rose-50',    border: 'border-rose-200',  label: 'Relacionamentos' },
  'saude-mental': { icon: Brain,  gradient: 'from-violet-500 to-purple-600', bg: 'bg-violet-50',  border: 'border-violet-200',label: 'Saúde Mental' },
  espiritualidade:{ icon: Wind,   gradient: 'from-sky-500 to-blue-600',      bg: 'bg-sky-50',     border: 'border-sky-200',   label: 'Espiritualidade' },
  vicios:         { icon: Zap,    gradient: 'from-amber-500 to-orange-600',  bg: 'bg-amber-50',   border: 'border-amber-200', label: 'Vícios' },
  sofrimento:     { icon: Moon,   gradient: 'from-slate-500 to-stone-600',   bg: 'bg-slate-50',   border: 'border-slate-200', label: 'Sofrimento' },
  comunidade:     { icon: Users,  gradient: 'from-emerald-500 to-teal-600',  bg: 'bg-emerald-50', border: 'border-emerald-200',label: 'Comunidade' },
};

const DEFAULT_META = CATEGORY_META['espiritualidade'];

// Fallback local para quando o Supabase não tem trilhas ainda
const FALLBACK_TRAILS: Trail[] = [
  {
    id: 'infidelidade',
    slug: 'infidelidade',
    title: 'Infidelidade Ovo — O Caminho do Perdão',
    description: 'Encontre cura, perdão e renovação pelo olhar da fé católica após a traição no casamento.',
    duration_days: 7,
    category: 'relacionamento',
    emoji: '💔',
    is_premium: false,
    order_index: 1,
  },
  {
    id: 'depressao',
    slug: 'depressao',
    title: 'Depressão — A Luz nas Trevas',
    description: 'Descubra na Bíblia o conforto de Deus para os momentos mais escuros da alma.',
    duration_days: 7,
    category: 'saude-mental',
    emoji: '🌑',
    is_premium: false,
    order_index: 2,
  },
  {
    id: 'solidao',
    slug: 'solidao',
    title: 'Solidão — Deus como Companhia',
    description: 'Aprenda a transformar a solidão em encontro com Deus e consigo mesmo.',
    duration_days: 5,
    category: 'espiritualidade',
    emoji: '🕊️',
    is_premium: false,
    order_index: 3,
  },
  {
    id: 'vicios',
    slug: 'vicios',
    title: 'Vícios — Libertação pelo Evangelho',
    description: 'Um caminho de 7 dias para sair da escravidão dos vícios pela força da fé.',
    duration_days: 7,
    category: 'vicios',
    emoji: '⛓️',
    is_premium: false,
    order_index: 4,
  },
  {
    id: 'ansiedade',
    slug: 'ansiedade',
    title: 'Ansiedade — Paz que Excede',
    description: 'Encontre a paz que excede todo entendimento através da Palavra de Deus.',
    duration_days: 5,
    category: 'saude-mental',
    emoji: '🌪️',
    is_premium: true,
    order_index: 5,
  },
  {
    id: 'luto',
    slug: 'luto',
    title: 'Luto — A Esperança da Ressurreição',
    description: 'Percorra o caminho da perda com a promessa cristã da vida eterna.',
    duration_days: 7,
    category: 'sofrimento',
    emoji: '🌿',
    is_premium: true,
    order_index: 6,
  },
];

export default function Trails({ onSelectTrail }: TrailsProps) {
  const [trails, setTrails] = useState<Trail[]>([]);
  const [progress, setProgress] = useState<UserTrailProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>('todos');

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [fetchedTrails, session] = await Promise.all([
          fetchTrails(),
          supabase.auth.getSession(),
        ]);

        const trailsToUse = fetchedTrails.length > 0 ? fetchedTrails : FALLBACK_TRAILS;
        setTrails(trailsToUse);

        if (session.data.session?.user) {
          const prog = await fetchUserProgress(session.data.session.user.id);
          setProgress(prog);
        }
      } catch {
        setTrails(FALLBACK_TRAILS);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const categories = ['todos', ...Array.from(new Set(trails.map(t => t.category)))];

  const filtered = activeCategory === 'todos'
    ? trails
    : trails.filter(t => t.category === activeCategory);

  const getTrailProgress = (trail: Trail) => {
    const completed = getTrailCompletedDays(progress, trail.id);
    return { completed: completed.length, total: trail.duration_days };
  };

  const isStarted = (trail: Trail) => getTrailCompletedDays(progress, trail.id).length > 0;
  const isFinished = (trail: Trail) => {
    const { completed, total } = getTrailProgress(trail);
    return completed >= total;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fdfbf7] flex items-center justify-center pb-28">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600" />
          <p className="text-sm text-stone-500">Carregando trilhas...</p>
        </div>
      </div>
    );
  }

  // Count how many trails user has started/finished
  const startedCount = trails.filter(t => isStarted(t) && !isFinished(t)).length;
  const finishedCount = trails.filter(t => isFinished(t)).length;

  return (
    <div className="min-h-screen bg-[#fdfbf7] text-stone-900 font-sans pb-28">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 pt-5 md:pt-8">

        {/* Header */}
        <header className="mb-6 pr-10 md:pr-0">
          <div className="flex items-center gap-3 md:flex-col md:text-center md:items-center">
            <div className="w-9 h-9 md:w-12 md:h-12 bg-gradient-to-br from-rose-600 to-pink-700 text-white rounded-xl flex items-center justify-center shadow-md shrink-0">
              <Heart size={18} className="md:w-6 md:h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg md:text-3xl font-serif font-bold tracking-tight text-stone-900">
                Trilhas Temáticas
              </h1>
              <p className="text-xs md:text-sm text-stone-500 mt-0.5">
                Caminhos de fé para os desafios da vida
              </p>
            </div>
          </div>

          {/* Stats bar */}
          {(startedCount > 0 || finishedCount > 0) && (
            <div className="mt-4 flex gap-3">
              {startedCount > 0 && (
                <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                  <Flame size={14} className="text-amber-500" />
                  <span className="text-xs font-bold text-amber-800">{startedCount} em andamento</span>
                </div>
              )}
              {finishedCount > 0 && (
                <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2">
                  <CheckCircle2 size={14} className="text-emerald-500" />
                  <span className="text-xs font-bold text-emerald-800">{finishedCount} concluídas</span>
                </div>
              )}
            </div>
          )}
        </header>

        {/* Category Filter */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-6 scrollbar-hide -mx-4 px-4">
          {categories.map((cat: any) => {
            const meta = cat === 'todos' ? null : CATEGORY_META[cat as keyof typeof CATEGORY_META] || DEFAULT_META;
            const isActive = activeCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold transition-all active:scale-95 ${
                  isActive
                    ? 'bg-stone-900 text-white shadow-sm'
                    : 'bg-stone-100 text-stone-500 hover:bg-stone-200'
                }`}
              >
                {cat === 'todos' ? 'Todas' : (meta?.label || cat)}
              </button>
            );
          })}
        </div>

        {/* Trails Grid */}
        <div className="space-y-4">
          <AnimatePresence mode="popLayout">
            {filtered.map((trail, index) => {
              const meta = CATEGORY_META[trail.category] || DEFAULT_META;
              const Icon = meta.icon;
              const { completed, total } = getTrailProgress(trail);
              const started = isStarted(trail);
              const finished = isFinished(trail);
              const progressPct = total > 0 ? Math.round((completed / total) * 100) : 0;

              return (
                <motion.div
                  key={trail.id}
                  layout
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <button
                    onClick={() => !trail.is_premium && onSelectTrail(trail)}
                    className={`w-full text-left rounded-2xl border overflow-hidden transition-all active:scale-[0.99] shadow-sm hover:shadow-md ${
                      trail.is_premium
                        ? 'opacity-75 cursor-default'
                        : 'cursor-pointer'
                    } ${meta.border} bg-white`}
                  >
                    {/* Top colored strip */}
                    <div className={`h-1.5 w-full bg-gradient-to-r ${meta.gradient}`} />

                    <div className="p-4">
                      <div className="flex items-start gap-3">
                        {/* Icon */}
                        <div className={`w-11 h-11 rounded-xl ${meta.bg} flex items-center justify-center shrink-0`}>
                          <span className="text-xl">{trail.emoji}</span>
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 mb-0.5">
                                <span className={`text-[10px] font-bold uppercase tracking-wider ${meta.bg.replace('bg-', 'text-').replace('-50', '-600')}`}>
                                  {meta.label}
                                </span>
                                {trail.is_premium && (
                                  <span className="flex items-center gap-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded-full">
                                    <Lock size={9} /> Premium
                                  </span>
                                )}
                                {finished && (
                                  <span className="flex items-center gap-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded-full">
                                    <CheckCircle2 size={9} /> Concluída
                                  </span>
                                )}
                              </div>
                              <h3 className="font-serif font-bold text-stone-900 text-base leading-tight">
                                {trail.title}
                              </h3>
                              <p className="text-xs text-stone-500 mt-1 leading-relaxed line-clamp-2">
                                {trail.description}
                              </p>
                            </div>

                            {/* Arrow */}
                            {!trail.is_premium && (
                              <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 bg-gradient-to-br ${meta.gradient} text-white shadow-sm mt-0.5`}>
                                <ChevronRight size={16} />
                              </div>
                            )}
                            {trail.is_premium && (
                              <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 bg-stone-100 text-stone-400 mt-0.5">
                                <Lock size={14} />
                              </div>
                            )}
                          </div>

                          {/* Meta info */}
                          <div className="flex items-center gap-3 mt-2.5">
                            <div className="flex items-center gap-1 text-[11px] text-stone-400 font-medium">
                              <Clock size={11} />
                              {trail.duration_days} dias
                            </div>
                            {started && !finished && (
                              <div className="flex items-center gap-1 text-[11px] font-bold text-amber-600">
                                <Flame size={11} />
                                {completed}/{total} dias
                              </div>
                            )}
                          </div>

                          {/* Progress bar */}
                          {started && (
                            <div className="mt-2">
                              <div className="w-full h-1.5 bg-stone-100 rounded-full overflow-hidden">
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: `${progressPct}%` }}
                                  transition={{ duration: 0.8, ease: 'easeOut' }}
                                  className={`h-full rounded-full bg-gradient-to-r ${meta.gradient}`}
                                />
                              </div>
                            </div>
                          )}

                          {/* CTA text */}
                          {!trail.is_premium && (
                            <div className={`mt-2.5 text-[11px] font-bold ${meta.bg.replace('bg-', 'text-').replace('-50', '-600')}`}>
                              {finished ? '✓ Trilha concluída · Ver novamente' : started ? 'Continuar trilha →' : 'Começar trilha →'}
                            </div>
                          )}
                          {trail.is_premium && (
                            <div className="mt-2.5 text-[11px] font-bold text-stone-400">
                              Em breve
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-16 text-stone-400">
            <Heart size={32} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">Nenhuma trilha nesta categoria ainda.</p>
          </div>
        )}

        {/* Footer note */}
        <div className="mt-10 text-center">
          <p className="text-xs text-stone-400 leading-relaxed">
            Novas trilhas são adicionadas regularmente.<br />
            Todo conteúdo é baseado na Bíblia Católica.
          </p>
        </div>

      </div>
    </div>
  );
}
