import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BookOpen, Clock, Heart, ChevronRight, Star, Compass } from 'lucide-react';

export interface OnboardingProfile {
  experience: 'never' | 'little' | 'some' | 'regular';
  timePerDay: '5' | '15' | '30' | '60';
  goal: 'faith' | 'knowledge' | 'prayer' | 'complete';
}

interface OnboardingProps {
  onComplete: (profile: OnboardingProfile) => void;
}

const questions = [
  {
    id: 'experience',
    icon: BookOpen,
    color: 'from-amber-400 to-orange-500',
    bgLight: 'bg-amber-50',
    borderColor: 'border-amber-200',
    activeColor: 'bg-amber-500',
    step: 1,
    title: 'Qual é a sua relação com a Bíblia?',
    subtitle: 'Seja honesto — não tem resposta errada aqui.',
    options: [
      { value: 'never', emoji: '🌱', label: 'Nunca li', desc: 'Estou começando do zero' },
      { value: 'little', emoji: '📖', label: 'Li um pouco', desc: 'Conheço alguns livros ou histórias' },
      { value: 'some', emoji: '✝️', label: 'Leio às vezes', desc: 'Tenho alguma prática de leitura' },
      { value: 'regular', emoji: '🔥', label: 'Leio com frequência', desc: 'Já tenho uma rotina estabelecida' },
    ]
  },
  {
    id: 'timePerDay',
    icon: Clock,
    color: 'from-blue-400 to-indigo-500',
    bgLight: 'bg-blue-50',
    borderColor: 'border-blue-200',
    activeColor: 'bg-blue-500',
    step: 2,
    title: 'Quanto tempo você tem por dia?',
    subtitle: 'Vamos montar uma trilha que cabe na sua rotina.',
    options: [
      { value: '5', emoji: '⚡', label: '5 minutos', desc: 'Leitura rápida, mas consistente' },
      { value: '15', emoji: '🕐', label: '15 minutos', desc: 'O tempo ideal para a maioria' },
      { value: '30', emoji: '🕧', label: '30 minutos', desc: 'Para quem quer aprofundar' },
      { value: '60', emoji: '🌟', label: '1 hora ou mais', desc: 'Estudo intenso e contemplativo' },
    ]
  },
  {
    id: 'goal',
    icon: Heart,
    color: 'from-rose-600 to-pink-700',
    bgLight: 'bg-rose-50',
    borderColor: 'border-rose-200',
    activeColor: 'bg-rose-600',
    step: 3,
    title: 'Qual é o seu maior objetivo?',
    subtitle: 'Isso nos ajuda a personalizar sua experiência.',
    options: [
      { value: 'faith', emoji: '🙏', label: 'Aprofundar minha fé', desc: 'Quero me aproximar mais de Deus' },
      { value: 'knowledge', emoji: '🧠', label: 'Entender a Bíblia', desc: 'Quero compreender o contexto e a história' },
      { value: 'prayer', emoji: '✨', label: 'Melhorar minha oração', desc: 'Quero usar a Palavra na minha vida espiritual' },
      { value: 'complete', emoji: '🏆', label: 'Ler a Bíblia inteira', desc: 'Quero concluir os 73 livros' },
    ]
  }
];

export default function Onboarding({ onComplete }: OnboardingProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Partial<OnboardingProfile>>({});
  const [selected, setSelected] = useState<string | null>(null);
  const [direction, setDirection] = useState(1);

  const question = questions[currentStep];
  const isLast = currentStep === questions.length - 1;
  const progress = ((currentStep) / questions.length) * 100;

  const handleSelect = (value: string) => {
    setSelected(value);
  };

  const handleNext = () => {
    if (!selected) return;

    const newAnswers = { ...answers, [question.id]: selected };
    setAnswers(newAnswers);

    if (isLast) {
      onComplete(newAnswers as OnboardingProfile);
      return;
    }

    setDirection(1);
    setSelected(null);
    setCurrentStep(prev => prev + 1);
  };

  const handleBack = () => {
    if (currentStep === 0) return;
    setDirection(-1);
    setSelected(answers[questions[currentStep - 1].id as keyof OnboardingProfile] || null);
    setCurrentStep(prev => prev - 1);
  };

  const Icon = question.icon;

  return (
    <div className="min-h-screen bg-[#fdfbf7] flex flex-col">
      {/* Header com logo e progresso */}
      <div className="px-4 pt-6 pb-3">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-stone-900 rounded-lg flex items-center justify-center">
              <span className="text-amber-400 text-[10px] font-bold">BM</span>
            </div>
            <span className="font-serif font-bold text-stone-700 text-xs">Versiculando</span>
          </div>
          <span className="text-xs text-stone-400 font-medium">
            {currentStep + 1} de {questions.length}
          </span>
        </div>

        {/* Barra de progresso */}
        <div className="w-full h-1.5 bg-stone-200 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-amber-400 rounded-full"
            initial={{ width: `${(currentStep / questions.length) * 100}%` }}
            animate={{ width: `${((currentStep + 1) / questions.length) * 100}%` }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          />
        </div>
      </div>

      {/* Conteúdo principal */}
      <div className="flex-1 flex flex-col px-4 pb-6">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentStep}
            custom={direction}
            initial={{ opacity: 0, x: direction * 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction * -40 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="flex-1 flex flex-col"
          >
            {/* Ícone e título */}
            <div className="pt-5 pb-5 text-center">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1, type: 'spring', stiffness: 300 }}
                className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${question.color} flex items-center justify-center mx-auto mb-4 shadow-lg`}
              >
                <Icon size={26} className="text-white" />
              </motion.div>
              <h1 className="text-xl md:text-3xl font-serif font-bold text-stone-900 mb-1.5 leading-tight">
                {question.title}
              </h1>
              <p className="text-stone-500 text-sm">{question.subtitle}</p>
            </div>

            {/* Opções */}
            <div className="space-y-2.5 flex-1">
              {question.options.map((option, index) => {
                const isActive = selected === option.value;
                return (
                  <motion.button
                    key={option.value}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 * index, duration: 0.3 }}
                    onClick={() => handleSelect(option.value)}
                    className={`w-full flex items-center gap-3 p-3.5 rounded-2xl border-2 text-left transition-all active:scale-[0.98] ${
                      isActive
                        ? 'border-stone-900 bg-stone-900 shadow-lg scale-[1.01]'
                        : 'border-stone-200 bg-white hover:border-stone-300 hover:shadow-sm'
                    }`}
                  >
                    <span className="text-xl shrink-0">{option.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className={`font-bold text-sm leading-tight ${isActive ? 'text-white' : 'text-stone-900'}`}>
                        {option.label}
                      </p>
                      <p className={`text-xs mt-0.5 ${isActive ? 'text-stone-300' : 'text-stone-400'}`}>
                        {option.desc}
                      </p>
                    </div>
                    {isActive && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="w-5 h-5 bg-amber-400 rounded-full flex items-center justify-center shrink-0"
                      >
                        <span className="text-stone-900 text-[10px] font-bold">✓</span>
                      </motion.div>
                    )}
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Botões de navegação */}
        <div className="pt-4 flex gap-3">
          {currentStep > 0 && (
            <button
              onClick={handleBack}
              className="px-4 py-3.5 rounded-xl border-2 border-stone-200 text-stone-500 font-bold hover:border-stone-300 transition-all text-sm active:scale-95"
            >
              Voltar
            </button>
          )}
          <motion.button
            onClick={handleNext}
            disabled={!selected}
            whileTap={selected ? { scale: 0.97 } : {}}
            className={`flex-1 py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
              selected
                ? 'bg-stone-900 text-white shadow-lg hover:bg-stone-800'
                : 'bg-stone-100 text-stone-400 cursor-not-allowed'
            }`}
          >
            {isLast ? 'Começar minha jornada' : 'Continuar'}
            {selected && <ChevronRight size={18} />}
          </motion.button>
        </div>
      </div>
    </div>
  );
}

// Função auxiliar para gerar mensagem personalizada de boas-vindas
export function getWelcomeConfig(profile: OnboardingProfile): {
  message: string;
  recommendation: 'beginners' | 'canonical';
  startBookId: string;
} {
  // Sempre recomenda a Trilha do Discípulo para quem nunca leu ou leu pouco
  const recommendation = profile.experience === 'regular' && profile.goal === 'complete'
    ? 'canonical'
    : 'beginners';

  const startBookId = '1jn'; // Sempre começa por 1 João na trilha

  const messages: Record<string, string> = {
    // Por experiência
    never: 'Bem-vindo! Preparamos o caminho perfeito para quem está começando do zero.',
    little: 'Que bom ter você aqui! Vamos consolidar o que você já conhece e ir além.',
    some: 'Ótimo! Sua experiência vai te ajudar a aprofundar ainda mais na Palavra.',
    regular: 'Excelente! Que esta jornada renove e aprofunde sua relação com as Escrituras.',
  };

  // Personaliza por objetivo
  const goalMessages: Record<string, string> = {
    faith: 'Começamos pelo coração da fé: a primeira carta de São João.',
    knowledge: 'Vamos construir uma base sólida, livro por livro, com contexto e clareza.',
    prayer: 'A Palavra de Deus é o melhor alimento para a oração. Vamos começar.',
    complete: 'Uma jornada de 73 livros começa com um único passo. Vamos lá!',
  };

  return {
    message: goalMessages[profile.goal] || messages[profile.experience],
    recommendation,
    startBookId,
  };
}
