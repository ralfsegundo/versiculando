import { useState, useEffect } from 'react';
import { ArrowLeft, BookOpen, Lightbulb, Heart, CheckCircle2, ChevronLeft, ChevronRight, Lock, Flame, Trophy, Star, Loader2, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { fetchTrailDays, fetchUserProgress, completeTrailDay, getTrailCompletedDays, Trail, TrailDay, UserTrailProgress } from '../services/trails';
import { useGamification } from '../services/gamification';
import confetti from 'canvas-confetti';

interface TrailDetailProps {
  trail: Trail;
  onBack: () => void;
}

const CATEGORY_THEME: Record<string, { gradient: string; light: string; text: string; border: string }> = {
  relacionamento: { gradient: 'from-rose-600 to-pink-700',    light: 'bg-rose-50',    text: 'text-rose-700',    border: 'border-rose-200' },
  'saude-mental': { gradient: 'from-violet-500 to-purple-600',light: 'bg-violet-50',  text: 'text-violet-600',  border: 'border-violet-200' },
  espiritualidade:{ gradient: 'from-sky-500 to-blue-600',     light: 'bg-sky-50',     text: 'text-sky-600',     border: 'border-sky-200' },
  vicios:         { gradient: 'from-amber-500 to-orange-600', light: 'bg-amber-50',   text: 'text-amber-600',   border: 'border-amber-200' },
  sofrimento:     { gradient: 'from-slate-500 to-stone-600',  light: 'bg-slate-50',   text: 'text-slate-600',   border: 'border-slate-200' },
  comunidade:     { gradient: 'from-emerald-500 to-teal-600', light: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200' },
};
const DEFAULT_THEME = CATEGORY_THEME['espiritualidade'];

// Fallback de dias para a trilha de infidelidade (caso não tenha no Supabase)
const FALLBACK_DAYS: Record<string, TrailDay[]> = {
  infidelidade: [
    { id: '1', trail_id: 'infidelidade', day_number: 1, emoji: '💔', title: 'A Dor é Real', reading: 'Salmo 51', reflection: 'Deus não foge da nossa dor, Ele entra nela. O Salmo 51 é o grito de Davi após seu maior pecado — e Deus o ouviu. Sua dor hoje também é ouvida.', verse: 'Cria em mim um coração puro, ó Deus, e renova em mim um espírito inabalável.', verse_reference: 'Salmo 51,12', practice: 'Escreva em um papel como você está se sentindo hoje. Não precisa ser bonito. Seja honesto com Deus.' },
    { id: '2', trail_id: 'infidelidade', day_number: 2, emoji: '💍', title: 'O Sacramento Ferido', reading: 'Gênesis 2,18-24 · Efésios 5,25-33', reflection: 'O matrimônio não é apenas um contrato humano — é um sacramento. Quando ele é ferido, a dor vai além da emoção: algo sagrado foi quebrado. Compreender isso é o primeiro passo para a cura.', verse: 'O que Deus uniu, o homem não separe.', verse_reference: 'Mateus 19,6', practice: 'Reflita: o que o matrimônio representa para você hoje? Pode escrever ou orar em silêncio.' },
    { id: '3', trail_id: 'infidelidade', day_number: 3, emoji: '😢', title: 'A Ferida do Traído', reading: 'Oseias 2,1-25', reflection: 'Deus conhece a dor da traição. O livro de Oseias relata como Deus mesmo foi "traído" por Israel — e como Ele respondeu com amor restaurador, não com abandono. Você não está só nessa dor.', verse: 'Por isso, vou atraí-la e conduzi-la ao deserto, para falar ao seu coração.', verse_reference: 'Oseias 2,16', practice: 'Leia Oseias 2 com calma. Substitua mentalmente "Israel" pelo seu próprio nome.' },
    { id: '4', trail_id: 'infidelidade', day_number: 4, emoji: '🙏', title: 'O Peso do Culpado', reading: 'João 8,1-11', reflection: 'Se você é quem errou, este é o seu dia. Jesus não veio condenar — veio restaurar. A mulher adúltera saiu daquele encontro transformada, não esmagada. Há misericórdia para você também.', verse: 'Nem eu te condeno. Vai, e de agora em diante não peques mais.', verse_reference: 'João 8,11', practice: 'Se ainda não foi, considere se confessar. A confissão não é punição — é libertação.' },
    { id: '5', trail_id: 'infidelidade', day_number: 5, emoji: '✝️', title: 'O Sacramento da Cura', reading: '1 João 1,5-10', reflection: 'A Confissão existe porque Deus sabe que precisamos de um momento concreto de encontro com a misericórdia. Não é sobre o padre — é sobre Deus que perdoa. O Sacramento da Reconciliação é uma das maiores dádivas da fé católica.', verse: 'Se confessarmos os nossos pecados, ele é fiel e justo para nos perdoar os pecados.', verse_reference: '1 João 1,9', practice: 'Prepare um exame de consciência. Há um guia na seção de recursos do app.' },
    { id: '6', trail_id: 'infidelidade', day_number: 6, emoji: '🤲', title: 'Perdoar Não é Esquecer', reading: 'Mateus 18,21-35', reflection: 'Perdoar não é fingir que não doeu. É escolher não deixar a raiva controlar sua vida. É um processo — às vezes longo. A Parábola do Servo Impiedoso nos lembra que fomos perdoados imensamente, e que esse perdão recebido nos capacita a perdoar.', verse: 'Perdoai como o Senhor vos perdoou.', verse_reference: 'Colossenses 3,13', practice: 'Ore pelo seu cônjuge — mesmo que seja difícil. Não precisa ser longo. Um minuto já é um começo.' },
    { id: '7', trail_id: 'infidelidade', day_number: 7, emoji: '🌅', title: 'Renovação ou Recomeço', reading: 'Apocalipse 21,1-5', reflection: 'Chegamos ao último dia. Hoje há dois caminhos possíveis: renovar o casamento com Deus no centro, ou seguir em paz se o caminho foi a separação. Em ambos os casos, Deus diz: "Faço novas todas as coisas." O fim desta trilha é um começo.', verse: 'Eis que faço novas todas as coisas.', verse_reference: 'Apocalipse 21,5', practice: 'Escreva uma carta para si mesmo: o que você aprendeu nesta semana? O que você deseja para o futuro?' },
  ],
  solidao: [
    { id: 's1', trail_id: 'solidao', day_number: 1, emoji: '🌙', title: 'A Solidão que Dói', reading: 'Salmo 22', reflection: 'O Salmo 22 começa com um grito: "Deus meu, Deus meu, por que me abandonaste?" Mesmo Jesus orou com essas palavras na cruz. Sentir solidão não é fraqueza — é humanidade.', verse: 'Deus meu, Deus meu, por que me abandonaste?', verse_reference: 'Salmo 22,2', practice: 'Sente-se em silêncio por 5 minutos. Sem celular, sem distração. Observe o que sente.' },
    { id: 's2', trail_id: 'solidao', day_number: 2, emoji: '👣', title: 'Deus no Deserto', reading: '1 Reis 19,1-13', reflection: 'Elias fugiu para o deserto exausto e só. Deus não apareceu no vento forte nem no terremoto — apareceu no silêncio suave. Às vezes Deus só consegue falar quando estamos parados o suficiente para ouvi-Lo.', verse: 'Levanta-te e come, porque o caminho é longo demais para ti.', verse_reference: '1 Reis 19,7', practice: 'Prepare uma refeição com cuidado hoje. Coma devagar, sem pressa. Deixe que seja um momento sagrado.' },
    { id: 's3', trail_id: 'solidao', day_number: 3, emoji: '💎', title: 'O Valor do Silêncio', reading: 'Lucas 5,15-16', reflection: 'Jesus — que tinha multidões ao redor — escolhia momentos de solidão. Não porque fosse solitário, mas porque sabia que o encontro com o Pai era insubstituível. A solidão pode ser escola, não prisão.', verse: 'Mas Jesus retirava-se para lugares desertos e orava.', verse_reference: 'Lucas 5,16', practice: 'Passe 10 minutos em oração silenciosa hoje. Se não sabe como, basta ficar quieto e dizer: "Aqui estou, Senhor."' },
    { id: 's4', trail_id: 'solidao', day_number: 4, emoji: '🕊️', title: 'Nunca Verdadeiramente Só', reading: 'João 14,15-21', reflection: 'Jesus prometeu o Espírito Santo como "outro Paráclito" — o Consolador. Você nunca está verdadeiramente sozinho. Há uma Presença constante que habita em você desde o Batismo.', verse: 'Eu não vos deixarei órfãos; voltarei a vós.', verse_reference: 'João 14,18', practice: 'Acenda uma vela hoje à noite. Observe a chama e lembre que o Espírito habita em você.' },
    { id: 's5', trail_id: 'solidao', day_number: 5, emoji: '🌅', title: 'A Solidão Fecunda', reading: 'Gênesis 2,18 · Eclesiastes 4,9-12', reflection: 'Deus disse "não é bom que o homem esteja só" — mas também criou cada pessoa como um ser único e irrepetível. A solidão saudável é aquela que nos leva ao encontro com Deus e, daí, ao encontro com os outros. Você está pronto para esse próximo passo?', verse: 'Melhor são dois do que um, porque têm melhor paga do seu trabalho.', verse_reference: 'Eclesiastes 4,9', practice: 'Entre em contato hoje com alguém de quem você sente falta. Uma mensagem simples já é um gesto de amor.' },
  ],
};

export default function TrailDetail({ trail, onBack }: TrailDetailProps) {
  const { userId } = useGamification();
  const [days, setDays] = useState<TrailDay[]>([]);
  const [progress, setProgress] = useState<UserTrailProgress[]>([]);
  const [currentDay, setCurrentDay] = useState(1);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [showTrailCompleteModal, setShowTrailCompleteModal] = useState(false);
  const [activeSection, setActiveSection] = useState<'reading' | 'reflection' | 'verse' | 'practice'>('reading');

  const theme = CATEGORY_THEME[trail.category] || DEFAULT_THEME;

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const fetchedDays = await fetchTrailDays(trail.id);
        const daysToUse = fetchedDays.length > 0
          ? fetchedDays
          : (FALLBACK_DAYS[trail.slug] || []);
        setDays(daysToUse);

        if (userId) {
          const prog = await fetchUserProgress(userId);
          setProgress(prog);
          const completedNums = getTrailCompletedDays(prog, trail.id);
          const nextDay = daysToUse.find(d => !completedNums.includes(d.day_number));
          if (nextDay) setCurrentDay(nextDay.day_number);
          else if (daysToUse.length > 0) setCurrentDay(daysToUse[daysToUse.length - 1].day_number);
        }
      } catch {
        setDays(FALLBACK_DAYS[trail.slug] || []);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [trail, userId]);

  const completedDayNums = getTrailCompletedDays(progress, trail.id);
  const dayData = days.find(d => d.day_number === currentDay);
  const isDayCompleted = completedDayNums.includes(currentDay);
  const isTrailFinished = days.length > 0 && completedDayNums.length >= days.length;

  const handleCompleteDay = async () => {
    if (!userId || isDayCompleted || completing) return;
    setCompleting(true);
    try {
      const success = await completeTrailDay(userId, trail.id, currentDay);
      if (success) {
        const newProgress = [...progress, {
          trail_id: trail.id,
          day_number: currentDay,
          completed_at: new Date().toISOString(),
        }];
        setProgress(newProgress);

        const newCompletedNums = getTrailCompletedDays(newProgress, trail.id);
        const trailDone = newCompletedNums.length >= days.length;

        confetti({ particleCount: trailDone ? 200 : 80, spread: trailDone ? 100 : 60, origin: { y: 0.6 }, colors: ['#f59e0b', '#10b981', '#3b82f6'] });

        if (trailDone) {
          setTimeout(() => setShowTrailCompleteModal(true), 400);
        } else {
          setShowCompletionModal(true);
        }
      }
    } finally {
      setCompleting(false);
    }
  };

  const goToNextDay = () => {
    const next = days.find(d => d.day_number > currentDay);
    if (next) {
      setCurrentDay(next.day_number);
      setActiveSection('reading');
      setShowCompletionModal(false);
    }
  };

  const sections = [
    { id: 'reading' as const,    label: 'Leitura',    icon: BookOpen,   color: 'text-blue-500' },
    { id: 'reflection' as const, label: 'Reflexão',   icon: Lightbulb,  color: 'text-amber-500' },
    { id: 'verse' as const,      label: 'Versículo',  icon: Star,       color: 'text-purple-500' },
    { id: 'practice' as const,   label: 'Prática',    icon: Heart,      color: 'text-rose-700' },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fdfbf7] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={28} className="animate-spin text-amber-600" />
          <p className="text-sm text-stone-500">Carregando trilha...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fdfbf7] text-stone-900 font-sans pb-10">

      {/* Header */}
      <div className={`bg-gradient-to-br ${theme.gradient} text-white`}>
        <div className="max-w-2xl mx-auto px-4 pt-5 pb-6">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-white/80 hover:text-white transition-colors mb-4 active:scale-95"
          >
            <ArrowLeft size={18} />
            <span className="text-sm font-medium">Trilhas</span>
          </button>

          <div className="flex items-start gap-3">
            <span className="text-3xl">{trail.emoji}</span>
            <div className="flex-1 min-w-0">
              <p className="text-white/70 text-xs font-bold uppercase tracking-wider mb-1">
                {trail.duration_days} dias · {completedDayNums.length} concluídos
              </p>
              <h1 className="font-serif font-bold text-xl leading-tight">{trail.title}</h1>
              <p className="text-white/70 text-sm mt-1 leading-relaxed">{trail.description}</p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-4">
            <div className="w-full h-2 bg-white/20 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${days.length > 0 ? (completedDayNums.length / days.length) * 100 : 0}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                className="h-full bg-white/80 rounded-full"
              />
            </div>
            <p className="text-white/60 text-xs mt-1.5">
              {completedDayNums.length}/{days.length} dias concluídos
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4">

        {/* Day Selector */}
        <div className="flex gap-2 overflow-x-auto py-4 scrollbar-hide -mx-4 px-4">
          {days.map(day => {
            const isCompleted = completedDayNums.includes(day.day_number);
            const isActive = day.day_number === currentDay;
            const isLocked = !isCompleted && day.day_number > (completedDayNums.length + 1);

            return (
              <button
                key={day.day_number}
                onClick={() => { if (!isLocked) { setCurrentDay(day.day_number); setActiveSection('reading'); } }}
                disabled={isLocked}
                className={`shrink-0 w-12 h-12 rounded-xl flex flex-col items-center justify-center transition-all active:scale-95 border-2 ${
                  isLocked
                    ? 'bg-stone-50 border-stone-100 text-stone-300'
                    : isCompleted
                      ? `bg-white ${theme.border} ${theme.text}`
                      : isActive
                        ? `bg-gradient-to-br ${theme.gradient} border-transparent text-white shadow-md`
                        : 'bg-white border-stone-200 text-stone-500'
                }`}
              >
                {isLocked ? (
                  <Lock size={13} />
                ) : isCompleted ? (
                  <CheckCircle2 size={16} />
                ) : (
                  <span className="text-sm font-bold">{day.day_number}</span>
                )}
                <span className="text-[9px] font-medium mt-0.5 opacity-70">Dia</span>
              </button>
            );
          })}
        </div>

        {/* Day Content */}
        {dayData ? (
          <AnimatePresence mode="wait">
            <motion.div
              key={currentDay}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
            >
              {/* Day header */}
              <div className={`${theme.light} ${theme.border} border rounded-2xl p-4 mb-4`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-2xl">{dayData.emoji}</span>
                  <div>
                    <p className={`text-[10px] font-bold uppercase tracking-wider ${theme.text}`}>
                      Dia {dayData.day_number}
                    </p>
                    <h2 className="font-serif font-bold text-stone-900 text-lg leading-tight">
                      {dayData.title}
                    </h2>
                  </div>
                </div>
                {isDayCompleted && (
                  <div className="flex items-center gap-1.5 mt-2 text-emerald-600">
                    <CheckCircle2 size={14} />
                    <span className="text-xs font-bold">Dia concluído</span>
                  </div>
                )}
              </div>

              {/* Section Tabs */}
              <div className="flex gap-1 bg-stone-100 p-1 rounded-xl mb-4 overflow-x-auto">
                {sections.map(s => (
                  <button
                    key={s.id}
                    onClick={() => setActiveSection(s.id)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap active:scale-95 ${
                      activeSection === s.id
                        ? 'bg-white text-stone-900 shadow-sm'
                        : 'text-stone-400 hover:text-stone-600'
                    }`}
                  >
                    <s.icon size={13} className={activeSection === s.id ? s.color : ''} />
                    <span className="hidden sm:inline">{s.label}</span>
                  </button>
                ))}
              </div>

              {/* Section Content */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeSection}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.2 }}
                  className="bg-white rounded-2xl border border-stone-200 p-5 mb-4 shadow-sm min-h-[180px]"
                >
                  {activeSection === 'reading' && (
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <BookOpen size={16} className="text-blue-500" />
                        <h3 className="font-bold text-stone-700 text-sm">Leitura do Dia</h3>
                      </div>
                      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                        <p className="font-serif text-blue-900 font-bold text-lg leading-snug">
                          {dayData.reading}
                        </p>
                        <p className="text-blue-600 text-xs mt-2 font-medium">
                          Abra sua Bíblia e leia com calma antes de continuar.
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 mt-3 text-stone-400">
                        <Clock size={13} />
                        <span className="text-xs">~5-10 minutos de leitura</span>
                      </div>
                    </div>
                  )}

                  {activeSection === 'reflection' && (
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <Lightbulb size={16} className="text-amber-500" />
                        <h3 className="font-bold text-stone-700 text-sm">Reflexão</h3>
                      </div>
                      <p className="text-stone-700 leading-relaxed text-sm">
                        {dayData.reflection}
                      </p>
                    </div>
                  )}

                  {activeSection === 'verse' && (
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <Star size={16} className="text-purple-500" />
                        <h3 className="font-bold text-stone-700 text-sm">Versículo do Dia</h3>
                      </div>
                      <blockquote className="border-l-4 border-purple-300 pl-4">
                        <p className="font-serif italic text-stone-800 text-base leading-relaxed">
                          "{dayData.verse}"
                        </p>
                        <cite className="text-purple-600 text-xs font-bold not-italic mt-2 block">
                          — {dayData.verse_reference}
                        </cite>
                      </blockquote>
                    </div>
                  )}

                  {activeSection === 'practice' && (
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <Heart size={16} className="text-rose-700" />
                        <h3 className="font-bold text-stone-700 text-sm">Prática do Dia</h3>
                      </div>
                      {dayData.practice ? (
                        <div className="bg-rose-50 border border-rose-100 rounded-xl p-4">
                          <p className="text-stone-700 text-sm leading-relaxed">
                            {dayData.practice}
                          </p>
                        </div>
                      ) : (
                        <p className="text-stone-400 text-sm italic">
                          Nenhuma prática específica para hoje. Apenas contemple o que aprendeu.
                        </p>
                      )}
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>

              {/* Section navigation */}
              <div className="flex items-center justify-between mb-6">
                <button
                  onClick={() => {
                    const idx = sections.findIndex(s => s.id === activeSection);
                    if (idx > 0) setActiveSection(sections[idx - 1].id);
                  }}
                  disabled={activeSection === 'reading'}
                  className="flex items-center gap-1.5 text-sm font-medium text-stone-400 hover:text-stone-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors active:scale-95"
                >
                  <ChevronLeft size={16} /> Anterior
                </button>

                <div className="flex gap-1.5">
                  {sections.map(s => (
                    <button
                      key={s.id}
                      onClick={() => setActiveSection(s.id)}
                      className={`w-2 h-2 rounded-full transition-all ${
                        activeSection === s.id ? `w-6 bg-gradient-to-r ${theme.gradient}` : 'bg-stone-200'
                      }`}
                    />
                  ))}
                </div>

                <button
                  onClick={() => {
                    const idx = sections.findIndex(s => s.id === activeSection);
                    if (idx < sections.length - 1) setActiveSection(sections[idx + 1].id);
                  }}
                  disabled={activeSection === 'practice'}
                  className="flex items-center gap-1.5 text-sm font-medium text-stone-400 hover:text-stone-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors active:scale-95"
                >
                  Próximo <ChevronRight size={16} />
                </button>
              </div>

              {/* Complete Day Button */}
              {!isDayCompleted ? (
                <button
                  onClick={handleCompleteDay}
                  disabled={completing}
                  className={`w-full bg-gradient-to-r ${theme.gradient} text-white font-bold py-4 px-6 rounded-2xl shadow-md hover:shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-2 text-base`}
                >
                  {completing ? (
                    <><Loader2 size={18} className="animate-spin" /> Salvando...</>
                  ) : (
                    <><CheckCircle2 size={18} /> Concluir Dia {currentDay}</>
                  )}
                </button>
              ) : (
                <div className="space-y-3">
                  <div className="w-full bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold py-3 px-6 rounded-2xl flex items-center justify-center gap-2">
                    <CheckCircle2 size={18} /> Dia {currentDay} concluído!
                  </div>
                  {currentDay < days.length && (
                    <button
                      onClick={goToNextDay}
                      className={`w-full bg-gradient-to-r ${theme.gradient} text-white font-bold py-3 px-6 rounded-2xl shadow-sm hover:shadow-md transition-all active:scale-[0.98] flex items-center justify-center gap-2`}
                    >
                      Ir para o Dia {currentDay + 1} <ChevronRight size={18} />
                    </button>
                  )}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        ) : (
          <div className="text-center py-16 text-stone-400">
            <p className="text-sm">Nenhum conteúdo disponível para este dia.</p>
          </div>
        )}
      </div>

      {/* Day Completion Modal */}
      <AnimatePresence>
        {showCompletionModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-stone-900/50 backdrop-blur-sm"
          >
            <motion.div
              initial={{ y: 40, scale: 0.95 }}
              animate={{ y: 0, scale: 1 }}
              exit={{ y: 40, scale: 0.95 }}
              transition={{ type: 'spring', damping: 22, stiffness: 280 }}
              className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl text-center"
            >
              <div className="text-4xl mb-3">{dayData?.emoji || '✅'}</div>
              <h3 className="font-serif font-bold text-xl text-stone-900 mb-1">
                Dia {currentDay} concluído!
              </h3>
              <p className="text-stone-500 text-sm mb-5">
                Você completou mais um dia da sua jornada. Continue amanhã!
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowCompletionModal(false)}
                  className="flex-1 bg-stone-100 text-stone-700 font-bold py-3 rounded-xl hover:bg-stone-200 transition-colors"
                >
                  Fechar
                </button>
                <button
                  onClick={goToNextDay}
                  className={`flex-1 bg-gradient-to-r ${theme.gradient} text-white font-bold py-3 rounded-xl shadow-sm`}
                >
                  Próximo dia
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Trail Complete Modal */}
      <AnimatePresence>
        {showTrailCompleteModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.85, y: 30 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.85, y: 30 }}
              transition={{ type: 'spring', damping: 20, stiffness: 260 }}
              className="bg-white rounded-[2rem] max-w-sm w-full shadow-2xl overflow-hidden"
            >
              <div className={`bg-gradient-to-br ${theme.gradient} p-7 text-center text-white`}>
                <div className="text-5xl mb-3">{trail.emoji}</div>
                <Trophy size={32} className="mx-auto mb-2 opacity-80" />
                <h2 className="font-serif font-bold text-2xl">Trilha Concluída!</h2>
                <p className="text-white/80 text-sm mt-1">{trail.title}</p>
              </div>
              <div className="p-6 text-center">
                <div className="flex justify-center gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} size={20} className={`${theme.text} fill-current`} />
                  ))}
                </div>
                <p className="text-stone-600 text-sm leading-relaxed mb-5">
                  Você concluiu todos os {trail.duration_days} dias desta trilha. Que essa jornada tenha tocado seu coração.
                </p>
                <button
                  onClick={() => { setShowTrailCompleteModal(false); onBack(); }}
                  className={`w-full bg-gradient-to-r ${theme.gradient} text-white font-bold py-4 rounded-xl shadow-sm flex items-center justify-center gap-2`}
                >
                  Ver outras trilhas <ChevronRight size={18} />
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
