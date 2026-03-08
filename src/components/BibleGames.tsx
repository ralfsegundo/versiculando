import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Zap, Trophy, RotateCcw, ChevronRight, Star, X } from 'lucide-react';
import { useGamification, getStreakMultiplier } from '../services/gamification';

// ─── GAME DATA ────────────────────────────────────────────────────────────────

const VERSE_FILL_QUESTIONS = [
  { verse: 'Porque Deus amou o mundo de tal maneira que deu o seu ___ unigênito.', answer: 'Filho', options: ['Filho', 'Anjo', 'Espírito', 'Nome'], ref: 'João 3,16' },
  { verse: 'O Senhor é o meu ___ e o meu Salvador; a quem temerei?', answer: 'Luz', options: ['Luz', 'Escudo', 'Rei', 'Deus'], ref: 'Salmo 27,1' },
  { verse: 'Posso tudo naquele que me ___.', answer: 'fortalece', options: ['fortalece', 'ilumina', 'guarda', 'chama'], ref: 'Filipenses 4,13' },
  { verse: 'Vinde a mim, todos os que estais ___ e sobrecarregados.', answer: 'cansados', options: ['cansados', 'perdidos', 'fracos', 'tristes'], ref: 'Mateus 11,28' },
  { verse: 'Confiai no Senhor com todo o vosso ___.', answer: 'coração', options: ['coração', 'ser', 'espírito', 'amor'], ref: 'Provérbios 3,5' },
  { verse: 'O Senhor é o meu ___, nada me faltará.', answer: 'pastor', options: ['pastor', 'rei', 'pai', 'guia'], ref: 'Salmo 23,1' },
  { verse: 'Sede ___ e sabei que eu sou Deus.', answer: 'quietos', options: ['quietos', 'firmes', 'fortes', 'santos'], ref: 'Salmo 46,11' },
  { verse: 'Alegrai-vos sempre no Senhor; outra vez digo: ___.', answer: 'Alegrai-vos', options: ['Alegrai-vos', 'Louvai-o', 'Servi-o', 'Orai'], ref: 'Filipenses 4,4' },
  { verse: 'Ensina-me, Senhor, o teu ___, para que eu ande na tua verdade.', answer: 'caminho', options: ['caminho', 'amor', 'nome', 'poder'], ref: 'Salmo 86,11' },
  { verse: 'Com efeito, pela graça sois salvos, por meio da ___.', answer: 'fé', options: ['fé', 'lei', 'obra', 'graça'], ref: 'Efésios 2,8' },
  { verse: 'Busca primeiro o ___ de Deus e a sua justiça.', answer: 'reino', options: ['reino', 'nome', 'amor', 'templo'], ref: 'Mateus 6,33' },
  { verse: 'A ___ do Senhor é eterna.', answer: 'misericórdia', options: ['misericórdia', 'palavra', 'glória', 'graça'], ref: 'Salmo 136,1' },
  { verse: 'Pedi e dar-se-vos-á; ___ e achareis.', answer: 'buscai', options: ['buscai', 'esperai', 'orai', 'servi'], ref: 'Mateus 7,7' },
  { verse: 'Não temas, porque eu sou contigo; não te desanimes, porque eu sou o teu ___.', answer: 'Deus', options: ['Deus', 'Senhor', 'Pai', 'Guia'], ref: 'Isaías 41,10' },
  { verse: 'Sede fortes e corajosos. Não temais nem vos apavoreis diante deles, porque o Senhor, vosso Deus, ___ convosco.', answer: 'caminha', options: ['caminha', 'está', 'fala', 'luta'], ref: 'Deuteronômio 31,6' },
];

const BOOK_QUIZ_QUESTIONS = [
  { quote: '"No princípio, Deus criou os céus e a terra."', answer: 'Gênesis', options: ['Gênesis', 'Êxodo', 'Números', 'Josué'] },
  { quote: '"O Senhor é meu pastor; nada me faltará."', answer: 'Salmos', options: ['Provérbios', 'Salmos', 'Jó', 'Eclesiastes'] },
  { quote: '"Porque Deus amou o mundo de tal maneira que deu o seu Filho unigênito."', answer: 'João', options: ['Marcos', 'Lucas', 'João', 'Mateus'] },
  { quote: '"No princípio era o Verbo, e o Verbo estava com Deus."', answer: 'João', options: ['Gênesis', 'João', 'Hebreus', 'Sabedoria'] },
  { quote: '"Posso tudo naquele que me fortalece."', answer: 'Filipenses', options: ['Romanos', 'Coríntios', 'Filipenses', 'Gálatas'] },
  { quote: '"Honra a teu pai e a tua mãe."', answer: 'Êxodo', options: ['Gênesis', 'Êxodo', 'Levítico', 'Deuteronômio'] },
  { quote: '"Sede quietos e sabei que eu sou Deus."', answer: 'Salmos', options: ['Isaías', 'Salmos', 'Jó', 'Provérbios'] },
  { quote: '"A sabedoria tem sua morada na prudência."', answer: 'Provérbios', options: ['Eclesiastes', 'Sabedoria', 'Provérbios', 'Sirácide'] },
  { quote: '"Alegrai-vos sempre no Senhor; outra vez digo: Alegrai-vos."', answer: 'Filipenses', options: ['Tessalonicenses', 'Efésios', 'Filipenses', 'Colossenses'] },
  { quote: '"Não temas, porque eu sou contigo."', answer: 'Isaías', options: ['Jeremias', 'Isaías', 'Ezequiel', 'Daniel'] },
  { quote: '"Tudo tem o seu tempo determinado, e há tempo para todo propósito debaixo do céu."', answer: 'Eclesiastes', options: ['Jó', 'Provérbios', 'Eclesiastes', 'Cânticos'] },
  { quote: '"O amor é paciente, o amor é bondoso."', answer: '1 Coríntios', options: ['Romanos', 'Efésios', '1 Coríntios', 'Colossenses'] },
  { quote: '"Fé é a certeza daquilo que esperamos."', answer: 'Hebreus', options: ['Tiago', 'Hebreus', 'Pedro', 'Judas'] },
  { quote: '"No começo era o caos, e Deus disse: Haja luz."', answer: 'Gênesis', options: ['Gênesis', 'Êxodo', 'Isaías', 'João'] },
  { quote: '"Vinde a mim, todos os que estais cansados e sobrecarregados, e eu vos darei repouso."', answer: 'Mateus', options: ['Lucas', 'Marcos', 'Mateus', 'João'] },
];

const WORD_SCRAMBLE_ROUNDS = [
  { words: ['AMOR', 'DEUS', 'FÉ', 'PAZ', 'GRAÇA'], hint: 'Palavras fundamentais da fé cristã' },
  { words: ['SALMO', 'PROFETA', 'APÓSTOLO', 'EVANGELHOS', 'ALIANÇA'], hint: 'Termos bíblicos essenciais' },
  { words: ['BATISMO', 'EUCARISTIA', 'CONFISSÃO', 'CRISMA', 'ORAÇÃO'], hint: 'Sacramentos e práticas cristãs' },
  { words: ['ABRAÃO', 'MOISÉS', 'DAVI', 'MARIA', 'PAULO'], hint: 'Personagens bíblicos importantes' },
  { words: ['PARAÍSO', 'TEMPLO', 'NAZARÉ', 'BELÉM', 'JERUSALÉM'], hint: 'Lugares da Bíblia' },
];

const WORD_SEARCH_ROUNDS = [
  {
    hint: 'Virtudes cristãs',
    words: ['FE', 'AMOR', 'PAZ', 'GRACA', 'VIDA'],
    gridSize: 8,
  },
  {
    hint: 'Livros do Novo Testamento',
    words: ['MARCOS', 'JOAO', 'LUCAS', 'ATOS'],
    gridSize: 8,
  },
  {
    hint: 'Personagens bíblicos',
    words: ['DAVI', 'JOSE', 'MARIA', 'PAULO'],
    gridSize: 8,
  },
];

// ─── WORD SEARCH GENERATOR ───────────────────────────────────────────────────

function buildWordSearchGrid(words: string[], size: number) {
  const grid: string[][] = Array.from({ length: size }, () => Array(size).fill(''));
  const placed: { word: string; cells: [number, number][] }[] = [];

  const directions = [
    [0, 1], [1, 0], [1, 1], [0, -1], [-1, 0],
  ];

  const tryPlace = (word: string) => {
    const shuffledDirs = [...directions].sort(() => Math.random() - 0.5);
    for (let attempt = 0; attempt < 60; attempt++) {
      const [dr, dc] = shuffledDirs[attempt % shuffledDirs.length];
      const r = Math.floor(Math.random() * size);
      const c = Math.floor(Math.random() * size);
      const cells: [number, number][] = [];
      let fits = true;
      for (let i = 0; i < word.length; i++) {
        const nr = r + dr * i;
        const nc = c + dc * i;
        if (nr < 0 || nr >= size || nc < 0 || nc >= size) { fits = false; break; }
        if (grid[nr][nc] !== '' && grid[nr][nc] !== word[i]) { fits = false; break; }
        cells.push([nr, nc]);
      }
      if (fits) {
        cells.forEach(([nr, nc], i) => { grid[nr][nc] = word[i]; });
        placed.push({ word, cells });
        return true;
      }
    }
    return false;
  };

  words.forEach(w => tryPlace(w));

  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  for (let r = 0; r < size; r++)
    for (let c = 0; c < size; c++)
      if (grid[r][c] === '') grid[r][c] = letters[Math.floor(Math.random() * letters.length)];

  return { grid, placed };
}

// ─── TYPES ───────────────────────────────────────────────────────────────────

type GameId = 'menu' | 'complete-verse' | 'book-quiz' | 'word-scramble' | 'word-search';

interface GameResult { correct: boolean; points: number }

// ─── SCORE FLASH ─────────────────────────────────────────────────────────────

function ScoreFlash({ points, correct }: { points: number; correct: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.8 }}
      animate={{ opacity: 1, y: -20, scale: 1 }}
      exit={{ opacity: 0, y: -40 }}
      transition={{ duration: 0.6 }}
      className={`fixed top-24 left-1/2 -translate-x-1/2 z-50 pointer-events-none px-4 py-2 rounded-full font-black text-xl shadow-lg ${correct ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}
    >
      {correct ? `+${points} XP ✨` : '✗ Errou!'}
    </motion.div>
  );
}

// ─── GAME: COMPLETE O VERSÍCULO ───────────────────────────────────────────────

function CompleteVerse({ onResult, onEnd }: { onResult: (r: GameResult) => void; onEnd: () => void }) {
  const [qIdx, setQIdx] = useState(() => Math.floor(Math.random() * VERSE_FILL_QUESTIONS.length));
  const [selected, setSelected] = useState<string | null>(null);
  const [combo, setCombo] = useState(0);
  const [score, setScore] = useState(0);
  const [round, setRound] = useState(1);
  const [showFlash, setShowFlash] = useState<{ correct: boolean; points: number } | null>(null);
  const [usedIdx, setUsedIdx] = useState<Set<number>>(new Set([qIdx]));

  const q = VERSE_FILL_QUESTIONS[qIdx];
  const TOTAL_ROUNDS = 5;

  const shuffledOptions = q.options.slice().sort(() => Math.random() - 0.5);

  const handleAnswer = (opt: string) => {
    if (selected) return;
    setSelected(opt);
    const correct = opt === q.answer;
    const pts = correct ? (40 + combo * 10) : 0;
    if (correct) setCombo(c => c + 1); else setCombo(0);
    setScore(s => s + pts);
    setShowFlash({ correct, points: pts });
    onResult({ correct, points: pts });
    setTimeout(() => {
      setShowFlash(null);
      if (round >= TOTAL_ROUNDS) { onEnd(); return; }
      let next = qIdx;
      let tries = 0;
      while ((next === qIdx || usedIdx.has(next)) && tries < 20) {
        next = Math.floor(Math.random() * VERSE_FILL_QUESTIONS.length);
        tries++;
      }
      setUsedIdx(prev => new Set([...prev, next]));
      setQIdx(next);
      setSelected(null);
      setRound(r => r + 1);
    }, 1100);
  };

  const parts = q.verse.split('___');

  return (
    <div className="space-y-5">
      <AnimatePresence>{showFlash && <ScoreFlash {...showFlash} />}</AnimatePresence>

      {/* HUD */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-stone-400">Rodada</span>
          <div className="flex gap-1">
            {Array.from({ length: TOTAL_ROUNDS }).map((_, i) => (
              <div key={i} className={`w-2 h-2 rounded-full ${i < round ? 'bg-violet-500' : 'bg-stone-200'}`} />
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {combo >= 2 && <div className="flex items-center gap-1 bg-amber-100 text-amber-700 text-xs font-black px-2 py-1 rounded-full"><Zap size={11} /> {combo}x combo</div>}
          <div className="flex items-center gap-1 bg-violet-100 text-violet-700 text-xs font-black px-2 py-1 rounded-full"><Star size={11} /> {score} XP</div>
        </div>
      </div>

      {/* Verse */}
      <AnimatePresence mode="wait">
        <motion.div key={qIdx} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
          className="bg-gradient-to-br from-violet-50 to-purple-50 border-2 border-violet-100 rounded-2xl p-5">
          <p className="font-serif text-stone-800 text-base leading-relaxed text-center">
            {parts[0]}
            <span className={`inline-block min-w-[80px] mx-1 px-3 py-0.5 rounded-lg font-black text-center border-2 transition-all
              ${selected === null ? 'border-dashed border-violet-400 text-violet-300 bg-violet-50' :
                selected === q.answer ? 'border-emerald-400 bg-emerald-100 text-emerald-800' :
                'border-rose-400 bg-rose-100 text-rose-800'}`}>
              {selected ?? '___'}
            </span>
            {parts[1]}
          </p>
          <p className="text-center text-xs text-violet-400 font-bold mt-3">{q.ref}</p>
        </motion.div>
      </AnimatePresence>

      {/* Options */}
      <div className="grid grid-cols-2 gap-2.5">
        {shuffledOptions.map(opt => {
          const isSelected = selected === opt;
          const isCorrect = opt === q.answer;
          let cls = 'bg-white border-2 border-stone-200 text-stone-800 hover:border-violet-300 hover:bg-violet-50';
          if (selected) {
            if (isCorrect) cls = 'bg-emerald-100 border-2 border-emerald-400 text-emerald-800 scale-105 shadow-md';
            else if (isSelected) cls = 'bg-rose-100 border-2 border-rose-400 text-rose-800';
            else cls = 'bg-stone-50 border-2 border-stone-100 text-stone-400';
          }
          return (
            <motion.button key={opt} whileTap={{ scale: 0.95 }} onClick={() => handleAnswer(opt)}
              disabled={!!selected}
              className={`py-3.5 px-3 rounded-2xl font-bold text-sm transition-all ${cls}`}>
              {opt}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

// ─── GAME: QUAL É O LIVRO? ────────────────────────────────────────────────────

function BookQuiz({ onResult, onEnd }: { onResult: (r: GameResult) => void; onEnd: () => void }) {
  const [qIdx, setQIdx] = useState(() => Math.floor(Math.random() * BOOK_QUIZ_QUESTIONS.length));
  const [selected, setSelected] = useState<string | null>(null);
  const [combo, setCombo] = useState(0);
  const [score, setScore] = useState(0);
  const [round, setRound] = useState(1);
  const [showFlash, setShowFlash] = useState<{ correct: boolean; points: number } | null>(null);
  const [usedIdx, setUsedIdx] = useState<Set<number>>(new Set([qIdx]));
  const TOTAL_ROUNDS = 5;

  const q = BOOK_QUIZ_QUESTIONS[qIdx];
  const shuffled = q.options.slice().sort(() => Math.random() - 0.5);

  const handle = (opt: string) => {
    if (selected) return;
    setSelected(opt);
    const correct = opt === q.answer;
    const pts = correct ? (50 + combo * 15) : 0;
    if (correct) setCombo(c => c + 1); else setCombo(0);
    setScore(s => s + pts);
    setShowFlash({ correct, points: pts });
    onResult({ correct, points: pts });
    setTimeout(() => {
      setShowFlash(null);
      if (round >= TOTAL_ROUNDS) { onEnd(); return; }
      let next = qIdx;
      let tries = 0;
      while ((next === qIdx || usedIdx.has(next)) && tries < 20) {
        next = Math.floor(Math.random() * BOOK_QUIZ_QUESTIONS.length);
        tries++;
      }
      setUsedIdx(p => new Set([...p, next]));
      setQIdx(next);
      setSelected(null);
      setRound(r => r + 1);
    }, 1100);
  };

  return (
    <div className="space-y-5">
      <AnimatePresence>{showFlash && <ScoreFlash {...showFlash} />}</AnimatePresence>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-stone-400">Rodada</span>
          <div className="flex gap-1">
            {Array.from({ length: TOTAL_ROUNDS }).map((_, i) => (
              <div key={i} className={`w-2 h-2 rounded-full ${i < round ? 'bg-sky-500' : 'bg-stone-200'}`} />
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {combo >= 2 && <div className="flex items-center gap-1 bg-amber-100 text-amber-700 text-xs font-black px-2 py-1 rounded-full"><Zap size={11} /> {combo}x</div>}
          <div className="flex items-center gap-1 bg-sky-100 text-sky-700 text-xs font-black px-2 py-1 rounded-full"><Star size={11} /> {score} XP</div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={qIdx} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
          className="bg-gradient-to-br from-sky-50 to-blue-50 border-2 border-sky-100 rounded-2xl p-5 text-center">
          <p className="text-[10px] font-bold uppercase tracking-widest text-sky-400 mb-2">De qual livro é este versículo?</p>
          <p className="font-serif italic text-stone-800 text-base leading-relaxed">{q.quote}</p>
        </motion.div>
      </AnimatePresence>

      <div className="grid grid-cols-2 gap-2.5">
        {shuffled.map(opt => {
          const isSelected = selected === opt;
          const isCorrect = opt === q.answer;
          let cls = 'bg-white border-2 border-stone-200 text-stone-800 hover:border-sky-300 hover:bg-sky-50';
          if (selected) {
            if (isCorrect) cls = 'bg-emerald-100 border-2 border-emerald-400 text-emerald-800 scale-105 shadow-md';
            else if (isSelected) cls = 'bg-rose-100 border-2 border-rose-400 text-rose-800';
            else cls = 'bg-stone-50 border-2 border-stone-100 text-stone-400';
          }
          return (
            <motion.button key={opt} whileTap={{ scale: 0.95 }} onClick={() => handle(opt)}
              disabled={!!selected}
              className={`py-3.5 px-3 rounded-2xl font-bold text-sm transition-all ${cls}`}>
              {opt}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

// ─── GAME: PALAVRA EMBARALHADA ────────────────────────────────────────────────

function WordScramble({ onResult, onEnd }: { onResult: (r: GameResult) => void; onEnd: () => void }) {
  const [roundIdx, setRoundIdx] = useState(0);
  const [wordIdx, setWordIdx] = useState(0);
  const [scrambled, setScrambled] = useState<string[]>([]);
  const [typed, setTyped] = useState<string[]>([]);
  const [score, setScore] = useState(0);
  const [showFlash, setShowFlash] = useState<{ correct: boolean; points: number } | null>(null);
  const [wordsDone, setWordsDone] = useState(0);
  const TOTAL = 3; // rounds

  const round = WORD_SCRAMBLE_ROUNDS[roundIdx % WORD_SCRAMBLE_ROUNDS.length];
  const currentWord = round.words[wordIdx % round.words.length];

  const scramble = useCallback((word: string) => {
    let arr = word.split('');
    do { arr.sort(() => Math.random() - 0.5); } while (arr.join('') === word);
    return arr;
  }, []);

  useEffect(() => {
    setScrambled(scramble(currentWord));
    setTyped([]);
  }, [wordIdx, roundIdx, currentWord, scramble]);

  const handlePick = (letter: string, idx: number) => {
    if (scrambled[idx] === '') return;
    const newTyped = [...typed, letter];
    const newScrambled = [...scrambled];
    newScrambled[idx] = '';
    setScrambled(newScrambled);
    setTyped(newTyped);

    if (newTyped.length === currentWord.length) {
      const attempt = newTyped.join('');
      const correct = attempt === currentWord;
      const pts = correct ? 60 : 0;
      setScore(s => s + pts);
      setShowFlash({ correct, points: pts });
      onResult({ correct, points: pts });
      setWordsDone(d => d + 1);
      setTimeout(() => {
        setShowFlash(null);
        if (wordsDone + 1 >= TOTAL) { onEnd(); return; }
        setWordIdx(i => i + 1);
        if ((wordIdx + 1) % round.words.length === 0) setRoundIdx(r => r + 1);
      }, 1000);
    }
  };

  const handleRemove = (idx: number) => {
    if (typed.length === 0) return;
    const letter = typed[idx];
    const newTyped = typed.slice(0, idx);
    const newScrambled = [...scrambled];
    // put letter back in first empty slot
    const emptyIdx = newScrambled.findIndex(l => l === '');
    if (emptyIdx !== -1) newScrambled[emptyIdx] = letter;
    setTyped(newTyped);
    setScrambled(newScrambled);
  };

  return (
    <div className="space-y-6">
      <AnimatePresence>{showFlash && <ScoreFlash {...showFlash} />}</AnimatePresence>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-stone-400">Palavra</span>
          <div className="flex gap-1">
            {Array.from({ length: TOTAL }).map((_, i) => (
              <div key={i} className={`w-2 h-2 rounded-full ${i < wordsDone ? 'bg-amber-500' : 'bg-stone-200'}`} />
            ))}
          </div>
        </div>
        <div className="flex items-center gap-1 bg-amber-100 text-amber-700 text-xs font-black px-2 py-1 rounded-full">
          <Star size={11} /> {score} XP
        </div>
      </div>

      {/* Hint */}
      <div className="bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-100 rounded-2xl p-4 text-center">
        <p className="text-[10px] font-bold uppercase tracking-widest text-amber-400 mb-1">Tema</p>
        <p className="font-bold text-stone-700 text-sm">{round.hint}</p>
      </div>

      {/* Answer slots */}
      <div className="flex justify-center gap-2 flex-wrap min-h-[56px]">
        {Array.from({ length: currentWord.length }).map((_, i) => (
          <motion.button key={i} whileTap={{ scale: 0.9 }}
            onClick={() => i === typed.length - 1 && handleRemove(i)}
            className={`w-11 h-12 rounded-xl border-2 font-black text-lg flex items-center justify-center transition-all
              ${typed[i] ? 'bg-amber-100 border-amber-400 text-amber-800 shadow-sm' : 'bg-white border-dashed border-stone-300 text-transparent'}`}>
            {typed[i] || '_'}
          </motion.button>
        ))}
      </div>

      {/* Letter bank */}
      <div className="flex justify-center gap-2 flex-wrap">
        {scrambled.map((letter, i) => (
          <motion.button key={i} whileTap={{ scale: 0.85 }}
            onClick={() => letter && handlePick(letter, i)}
            disabled={!letter}
            className={`w-11 h-12 rounded-xl border-2 font-black text-base flex items-center justify-center transition-all
              ${letter ? 'bg-white border-stone-300 text-stone-800 hover:border-amber-400 hover:bg-amber-50 shadow-sm active:scale-95' : 'bg-stone-50 border-stone-100 text-transparent cursor-not-allowed'}`}>
            {letter}
          </motion.button>
        ))}
      </div>

      <p className="text-center text-xs text-stone-400">Toque nas letras para montar a palavra · Toque na resposta para apagar</p>
    </div>
  );
}

// ─── GAME: CAÇA-PALAVRAS ──────────────────────────────────────────────────────

function WordSearch({ onResult, onEnd }: { onResult: (r: GameResult) => void; onEnd: () => void }) {
  const [roundIdx, setRoundIdx] = useState(0);
  const round = WORD_SEARCH_ROUNDS[roundIdx % WORD_SEARCH_ROUNDS.length];
  const { grid, placed } = useRef(buildWordSearchGrid(round.words, round.gridSize)).current;
  const [gridState, setGridState] = useState(grid);
  const [placedState] = useState(placed);

  const [selecting, setSelecting] = useState<[number, number][]>([]);
  const [found, setFound] = useState<Set<string>>(new Set());
  const [foundCells, setFoundCells] = useState<Set<string>>(new Set());
  const [score, setScore] = useState(0);
  const [showFlash, setShowFlash] = useState<{ correct: boolean; points: number } | null>(null);

  // Rebuild grid when round changes
  const [currentGrid, setCurrentGrid] = useState(gridState);
  useEffect(() => {
    const { grid: g } = buildWordSearchGrid(round.words, round.gridSize);
    setCurrentGrid(g);
    setSelecting([]);
    setFound(new Set());
    setFoundCells(new Set());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roundIdx]);

  const isAdjacent = (a: [number, number], b: [number, number]) => {
    const dr = Math.abs(a[0] - b[0]);
    const dc = Math.abs(a[1] - b[1]);
    return dr <= 1 && dc <= 1 && !(dr === 0 && dc === 0);
  };

  const handleCellClick = (r: number, c: number) => {
    const key = `${r},${c}`;
    if (foundCells.has(key)) return;

    if (selecting.length === 0) {
      setSelecting([[r, c]]);
      return;
    }

    const last = selecting[selecting.length - 1];
    if (last[0] === r && last[1] === c) {
      // deselect last
      setSelecting(s => s.slice(0, -1));
      return;
    }

    if (!isAdjacent(last, [r, c])) {
      setSelecting([[r, c]]);
      return;
    }

    const newSel = [...selecting, [r, c] as [number, number]];
    setSelecting(newSel);

    const attempt = newSel.map(([row, col]) => currentGrid[row][col]).join('');
    const match = placedState.find(p =>
      p.word === attempt &&
      !found.has(p.word) &&
      JSON.stringify(p.cells) === JSON.stringify(newSel)
    );

    if (match) {
      const pts = 80;
      setScore(s => s + pts);
      setFound(f => new Set([...f, match.word]));
      setFoundCells(fc => {
        const nfc = new Set(fc);
        match.cells.forEach(([cr, cc]) => nfc.add(`${cr},${cc}`));
        return nfc;
      });
      setShowFlash({ correct: true, points: pts });
      onResult({ correct: true, points: pts });
      setSelecting([]);
      setTimeout(() => setShowFlash(null), 900);

      const allFound = found.size + 1 >= placedState.length;
      if (allFound) {
        setTimeout(() => {
          if (roundIdx + 1 >= WORD_SEARCH_ROUNDS.length) { onEnd(); }
          else { setRoundIdx(i => i + 1); }
        }, 1200);
      }
    }
  };

  const isSelecting = (r: number, c: number) => selecting.some(([sr, sc]) => sr === r && sc === c);
  const isFound = (r: number, c: number) => foundCells.has(`${r},${c}`);
  const GRID_SIZE = round.gridSize;

  return (
    <div className="space-y-4">
      <AnimatePresence>{showFlash && <ScoreFlash {...showFlash} />}</AnimatePresence>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          {round.words.map(w => (
            <span key={w} className={`text-xs font-black px-2 py-1 rounded-full border transition-all ${found.has(w) ? 'bg-emerald-100 border-emerald-400 text-emerald-700 line-through' : 'bg-white border-stone-200 text-stone-600'}`}>
              {w}
            </span>
          ))}
        </div>
        <div className="flex items-center gap-1 bg-emerald-100 text-emerald-700 text-xs font-black px-2 py-1 rounded-full shrink-0">
          <Star size={11} /> {score}
        </div>
      </div>

      <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border-2 border-emerald-100 rounded-2xl p-2">
        <p className="text-center text-[10px] font-bold text-emerald-400 uppercase tracking-widest mb-2">{round.hint}</p>
        <div className="grid gap-0.5" style={{ gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)` }}>
          {currentGrid.map((row, r) =>
            row.map((letter, c) => {
              const sel = isSelecting(r, c);
              const fnd = isFound(r, c);
              return (
                <motion.button
                  key={`${r}-${c}`}
                  whileTap={{ scale: 0.85 }}
                  onClick={() => handleCellClick(r, c)}
                  className={`aspect-square rounded-lg flex items-center justify-center font-black text-sm transition-all select-none
                    ${fnd ? 'bg-emerald-400 text-white shadow-sm' :
                      sel ? 'bg-amber-400 text-white shadow-sm scale-110' :
                      'bg-white/80 text-stone-700 hover:bg-white'}`}
                >
                  {letter}
                </motion.button>
              );
            })
          )}
        </div>
      </div>
      <p className="text-center text-xs text-stone-400">Toque as letras em sequência para selecionar palavras</p>
    </div>
  );
}

// ─── GAME CARD (menu) ─────────────────────────────────────────────────────────

const GAME_META: Record<Exclude<GameId, 'menu'>, {
  title: string; desc: string; emoji: string;
  gradient: string; light: string; border: string; pts: string;
}> = {
  'complete-verse': {
    title: 'Complete o Versículo',
    desc: 'Uma palavra falta. Você sabe qual é?',
    emoji: '✍️',
    gradient: 'from-violet-500 to-purple-600',
    light: 'from-violet-50 to-purple-50',
    border: 'border-violet-200',
    pts: '+40~90 XP',
  },
  'book-quiz': {
    title: 'Qual é o Livro?',
    desc: 'Uma citação. Qual livro bíblico é esse?',
    emoji: '📚',
    gradient: 'from-sky-500 to-blue-600',
    light: 'from-sky-50 to-blue-50',
    border: 'border-sky-200',
    pts: '+50~110 XP',
  },
  'word-scramble': {
    title: 'Palavra Embaralhada',
    desc: 'Letras misturadas. Monte a palavra bíblica.',
    emoji: '🔀',
    gradient: 'from-amber-500 to-orange-500',
    light: 'from-amber-50 to-orange-50',
    border: 'border-amber-200',
    pts: '+60 XP',
  },
  'word-search': {
    title: 'Caça-Palavras',
    desc: 'Encontre as palavras escondidas na grade.',
    emoji: '🔍',
    gradient: 'from-emerald-500 to-teal-600',
    light: 'from-emerald-50 to-teal-50',
    border: 'border-emerald-200',
    pts: '+80 XP/palavra',
  },
};

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

// Teto diário de XP por jogo (sem multiplicador de streak).
// Equivale a ~3 sessões perfeitas — suficiente para engajamento real, sem farming.
const DAILY_XP_CAP: Record<Exclude<GameId, 'menu'>, number> = {
  'complete-verse': 900,
  'book-quiz':      1200,
  'word-scramble':  540,
  'word-search':    1200,
};

const TODAY_KEY = () => {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
};

// Retorna quantos XP o jogador já ganhou hoje neste jogo
function getDailyXpEarned(gameId: Exclude<GameId, 'menu'>, userId: string | null): number {
  try {
    const key = userId ? `${userId}_games_daily_xp_${gameId}` : `games_daily_xp_${gameId}`;
    const raw = localStorage.getItem(key);
    if (!raw) return 0;
    const { date, xp } = JSON.parse(raw);
    return date === TODAY_KEY() ? xp : 0; // reseta a cada novo dia
  } catch { return 0; }
}

// Registra XP ganho hoje neste jogo
function addDailyXpEarned(gameId: Exclude<GameId, 'menu'>, amount: number, userId: string | null): void {
  try {
    const key = userId ? `${userId}_games_daily_xp_${gameId}` : `games_daily_xp_${gameId}`;
    const current = getDailyXpEarned(gameId, userId);
    localStorage.setItem(key, JSON.stringify({
      date: TODAY_KEY(),
      xp: current + amount,
    }));
  } catch { /* ignora */ }
}

export default function BibleGames() {
  const { addPoints, showFloatingPoints, profile, userId, triggerNotificationPrompt } = useGamification();
  const [activeGame, setActiveGame] = useState<GameId>('menu');
  const [sessionScore, setSessionScore] = useState(0);
  const [sessionCorrect, setSessionCorrect] = useState(0);
  const [sessionTotal, setSessionTotal] = useState(0);
  const [gameEnded, setGameEnded] = useState(false);
  const [capReached, setCapReached] = useState(false);

  const handleResult = useCallback(({ correct, points }: GameResult) => {
    setSessionTotal(t => t + 1);
    if (correct && activeGame !== 'menu') {
      const gameId = activeGame as Exclude<GameId, 'menu'>;
      const cap     = DAILY_XP_CAP[gameId];
      const earned  = getDailyXpEarned(gameId, userId);
      const remaining = cap - earned;

      if (remaining <= 0) {
        // Teto atingido — acerto conta para o score da sessão mas não gera XP
        setSessionScore(s => s + points); // mostra o esforço visualmente
        setCapReached(true);
        return;
      }

      const rawXp    = Math.round(points * getStreakMultiplier(profile.streak));
      const xp       = Math.min(rawXp, remaining); // respeita o teto
      const hitsCap  = xp < rawXp;

      setSessionCorrect(c => c + 1);
      setSessionScore(s => s + xp);
      addDailyXpEarned(gameId, xp, userId);
      addPoints(xp, 'Jogo Bíblico', 'bonus');
      showFloatingPoints(xp, 'bonus_step');
      if (hitsCap) setCapReached(true);
      // Primeiro acerto na sessão — momento de satisfação, ideal para o prompt
      triggerNotificationPrompt();
    }
  }, [activeGame, addPoints, showFloatingPoints, profile.streak]);

  const handleEnd = useCallback(() => {
    setGameEnded(true);
  }, []);

  const startGame = (id: GameId) => {
    setActiveGame(id);
    setSessionScore(0);
    setSessionCorrect(0);
    setSessionTotal(0);
    setGameEnded(false);
    setCapReached(false);
    if (id !== 'menu') {
      // Pré-carrega estado do teto para este jogo
      const earned = getDailyXpEarned(id as Exclude<GameId, 'menu'>, userId);
      const cap    = DAILY_XP_CAP[id as Exclude<GameId, 'menu'>];
      if (earned >= cap) setCapReached(true);
    }
  };

  const backToMenu = () => {
    setActiveGame('menu');
    setGameEnded(false);
  };

  const meta = activeGame !== 'menu' ? GAME_META[activeGame] : null;

  return (
    <div>
      {/* Menu */}
      <AnimatePresence mode="wait">
        {activeGame === 'menu' && (
          <motion.div key="menu" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            {/* Header */}
            <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-5 mb-6 shadow-lg shadow-purple-200/50">
              <div className="absolute -top-6 -right-6 w-32 h-32 bg-white/10 rounded-full pointer-events-none" />
              <div className="absolute -bottom-8 -left-4 w-40 h-40 bg-white/10 rounded-full pointer-events-none" />
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center border border-white/30 text-xl">🎮</div>
                  <div>
                    <h2 className="font-serif font-bold text-white text-xl">Jogos Bíblicos</h2>
                    <p className="text-white/70 text-xs font-medium">Aprenda jogando e ganhe pontos</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <div className="flex items-center gap-1.5 bg-white/20 backdrop-blur-sm rounded-full px-3 py-1.5 border border-white/20">
                    <Trophy size={12} className="text-yellow-200" />
                    <span className="text-white font-bold text-xs">Pontos vão para seu ranking</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Game cards */}
            <div className="grid grid-cols-1 gap-3">
              {(Object.entries(GAME_META) as [Exclude<GameId, 'menu'>, typeof GAME_META[keyof typeof GAME_META]][]).map(([id, g], i) => {
                const cap      = DAILY_XP_CAP[id];
                const used     = getDailyXpEarned(id, userId);
                const pct      = Math.min(100, Math.round((used / cap) * 100));
                const isCapped = pct >= 100;
                return (
                  <motion.button key={id}
                    initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => startGame(id)}
                    className={`w-full text-left bg-gradient-to-r ${g.light} border-2 ${g.border} rounded-2xl p-4 flex items-center gap-4 shadow-sm hover:shadow-md transition-all`}>
                    <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${g.gradient} flex items-center justify-center text-2xl shadow-md shrink-0`}>
                      {g.emoji}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-stone-900 text-base">{g.title}</h3>
                      <p className="text-stone-500 text-xs mt-0.5 leading-snug">{g.desc}</p>
                      <div className="mt-2 flex items-center gap-2">
                        <div className={`text-[10px] font-black uppercase tracking-wider bg-gradient-to-r ${g.gradient} bg-clip-text text-transparent`}>
                          {g.pts}
                        </div>
                        {/* Teto diário */}
                        <div className="flex items-center gap-1 ml-auto">
                          <div className="w-16 h-1.5 bg-white/60 rounded-full overflow-hidden border border-stone-200">
                            <div
                              className={`h-full rounded-full transition-all ${isCapped ? 'bg-rose-400' : 'bg-gradient-to-r ' + g.gradient}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className={`text-[9px] font-black ${isCapped ? 'text-rose-500' : 'text-stone-400'}`}>
                            {isCapped ? 'MAX' : `${pct}%`}
                          </span>
                        </div>
                      </div>
                    </div>
                    <ChevronRight size={18} className="text-stone-300 shrink-0" />
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Active Game */}
        {activeGame !== 'menu' && meta && (
          <motion.div key={activeGame} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}>
            {/* Game header */}
            <div className={`relative rounded-3xl overflow-hidden bg-gradient-to-br ${meta.gradient} p-4 mb-3 shadow-lg`}>
              <div className="absolute -top-4 -right-4 w-24 h-24 bg-white/10 rounded-full pointer-events-none" />
              <div className="relative z-10 flex items-center gap-3">
                <button onClick={backToMenu} className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center border border-white/30 active:scale-95 transition-all shrink-0">
                  <X size={16} className="text-white" />
                </button>
                <div className="flex-1 min-w-0">
                  <p className="text-white/70 text-[10px] font-bold uppercase tracking-widest">{meta.emoji} Jogo</p>
                  <h2 className="font-bold text-white text-base leading-tight">{meta.title}</h2>
                </div>
                <div className="flex flex-col items-end gap-0.5">
                  <div className="flex items-center gap-1 bg-white/20 rounded-xl px-3 py-1.5 border border-white/20">
                    <Trophy size={13} className="text-yellow-200" />
                    <span className="text-white font-black text-sm">{sessionScore}</span>
                  </div>
                  {/* Teto diário — barra de progresso compacta */}
                  {activeGame !== 'menu' && (() => {
                    const gid  = activeGame as Exclude<GameId, 'menu'>;
                    const cap  = DAILY_XP_CAP[gid];
                    const used = getDailyXpEarned(gid, userId);
                    const pct  = Math.min(100, Math.round((used / cap) * 100));
                    return (
                      <div className="flex items-center gap-1.5 bg-white/10 rounded-lg px-2 py-1 border border-white/10 min-w-[90px]">
                        <div className="flex-1 h-1.5 bg-white/20 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${pct >= 100 ? 'bg-rose-300' : 'bg-yellow-200'}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-white/70 text-[9px] font-bold whitespace-nowrap">
                          {pct >= 100 ? 'Limite ✓' : `${pct}%`}
                        </span>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>

            {/* Banner de teto atingido */}
            {capReached && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-3 flex items-center gap-2.5 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-2.5"
              >
                <span className="text-lg">🏅</span>
                <div className="flex-1">
                  <p className="text-amber-800 font-black text-xs">Limite diário de XP atingido!</p>
                  <p className="text-amber-600 text-[11px]">Continue jogando — seu progresso conta, mas o XP retoma amanhã.</p>
                </div>
              </motion.div>
            )}

            {/* Game over screen */}
            <AnimatePresence mode="wait">
              {gameEnded ? (
                <motion.div key="end" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                  className="bg-white rounded-3xl border-2 border-stone-100 p-6 text-center shadow-sm space-y-4">
                  <div className="text-5xl">{sessionCorrect === sessionTotal ? '🎉' : sessionCorrect > sessionTotal / 2 ? '😊' : '💪'}</div>
                  <div>
                    <h3 className="font-serif font-bold text-2xl text-stone-900">Jogo encerrado!</h3>
                    <p className="text-stone-500 text-sm mt-1">{sessionCorrect}/{sessionTotal} acertos</p>
                  </div>
                  <div className={`bg-gradient-to-br ${meta.light} border-2 ${meta.border} rounded-2xl p-4`}>
                    <p className="text-stone-500 text-xs font-bold uppercase tracking-widest mb-1">Pontos conquistados</p>
                    <p className={`font-black text-3xl bg-gradient-to-r ${meta.gradient} bg-clip-text text-transparent`}>+{sessionScore}</p>
                    {capReached && (
                      <p className="text-amber-600 text-[11px] font-bold mt-1">🏅 Limite diário atingido — volte amanhã para mais XP!</p>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <button onClick={() => startGame(activeGame)}
                      className={`flex items-center justify-center gap-2 bg-gradient-to-r ${meta.gradient} text-white font-bold py-3.5 rounded-2xl shadow-md active:scale-95 transition-all`}>
                      <RotateCcw size={16} /> Jogar de novo
                    </button>
                    <button onClick={backToMenu}
                      className="flex items-center justify-center gap-2 bg-stone-100 text-stone-700 font-bold py-3.5 rounded-2xl hover:bg-stone-200 active:scale-95 transition-all">
                      Outros jogos <ChevronRight size={16} />
                    </button>
                  </div>
                </motion.div>
              ) : (
                <motion.div key="playing">
                  {activeGame === 'complete-verse' && <CompleteVerse onResult={handleResult} onEnd={handleEnd} />}
                  {activeGame === 'book-quiz' && <BookQuiz onResult={handleResult} onEnd={handleEnd} />}
                  {activeGame === 'word-scramble' && <WordScramble onResult={handleResult} onEnd={handleEnd} />}
                  {activeGame === 'word-search' && <WordSearch onResult={handleResult} onEnd={handleEnd} />}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
