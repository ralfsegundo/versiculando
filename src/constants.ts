export const BIBLE_BOOKS = [
  { id: 'gen', name: 'Gênesis', chapters: 50, testament: 'VT', group: 'Pentateuco' },
  { id: 'exo', name: 'Êxodo', chapters: 40, testament: 'VT', group: 'Pentateuco' },
  { id: 'lev', name: 'Levítico', chapters: 27, testament: 'VT', group: 'Pentateuco' },
  { id: 'num', name: 'Números', chapters: 36, testament: 'VT', group: 'Pentateuco' },
  { id: 'deu', name: 'Deuteronômio', chapters: 34, testament: 'VT', group: 'Pentateuco' },
  { id: 'jos', name: 'Josué', chapters: 24, testament: 'VT', group: 'Livros Históricos' },
  { id: 'jdg', name: 'Juízes', chapters: 21, testament: 'VT', group: 'Livros Históricos' },
  { id: 'rut', name: 'Rute', chapters: 4, testament: 'VT', group: 'Livros Históricos' },
  { id: '1sa', name: '1 Samuel', chapters: 31, testament: 'VT', group: 'Livros Históricos' },
  { id: '2sa', name: '2 Samuel', chapters: 24, testament: 'VT', group: 'Livros Históricos' },
  { id: '1ki', name: '1 Reis', chapters: 22, testament: 'VT', group: 'Livros Históricos' },
  { id: '2ki', name: '2 Reis', chapters: 25, testament: 'VT', group: 'Livros Históricos' },
  { id: '1ch', name: '1 Crônicas', chapters: 29, testament: 'VT', group: 'Livros Históricos' },
  { id: '2ch', name: '2 Crônicas', chapters: 36, testament: 'VT', group: 'Livros Históricos' },
  { id: 'ezr', name: 'Esdras', chapters: 10, testament: 'VT', group: 'Livros Históricos' },
  { id: 'neh', name: 'Neemias', chapters: 13, testament: 'VT', group: 'Livros Históricos' },
  { id: 'tob', name: 'Tobias', chapters: 14, testament: 'VT', group: 'Livros Históricos' },
  { id: 'jdt', name: 'Judite', chapters: 16, testament: 'VT', group: 'Livros Históricos' },
  { id: 'est', name: 'Ester', chapters: 16, testament: 'VT', group: 'Livros Históricos' },
  { id: '1ma', name: '1 Macabeus', chapters: 16, testament: 'VT', group: 'Livros Históricos' },
  { id: '2ma', name: '2 Macabeus', chapters: 15, testament: 'VT', group: 'Livros Históricos' },
  { id: 'job', name: 'Jó', chapters: 42, testament: 'VT', group: 'Livros Sapienciais' },
  { id: 'psa', name: 'Salmos', chapters: 150, testament: 'VT', group: 'Livros Sapienciais' },
  { id: 'pro', name: 'Provérbios', chapters: 31, testament: 'VT', group: 'Livros Sapienciais' },
  { id: 'ecc', name: 'Eclesiastes', chapters: 12, testament: 'VT', group: 'Livros Sapienciais' },
  { id: 'sng', name: 'Cânticos', chapters: 8, testament: 'VT', group: 'Livros Sapienciais' },
  { id: 'wis', name: 'Sabedoria', chapters: 19, testament: 'VT', group: 'Livros Sapienciais' },
  { id: 'sir', name: 'Eclesiástico', chapters: 51, testament: 'VT', group: 'Livros Sapienciais' },
  { id: 'isa', name: 'Isaías', chapters: 66, testament: 'VT', group: 'Livros Proféticos' },
  { id: 'jer', name: 'Jeremias', chapters: 52, testament: 'VT', group: 'Livros Proféticos' },
  { id: 'lam', name: 'Lamentações', chapters: 5, testament: 'VT', group: 'Livros Proféticos' },
  { id: 'bar', name: 'Baruc', chapters: 6, testament: 'VT', group: 'Livros Proféticos' },
  { id: 'ezk', name: 'Ezequiel', chapters: 48, testament: 'VT', group: 'Livros Proféticos' },
  { id: 'dan', name: 'Daniel', chapters: 14, testament: 'VT', group: 'Livros Proféticos' },
  { id: 'hos', name: 'Oseias', chapters: 14, testament: 'VT', group: 'Livros Proféticos' },
  { id: 'jol', name: 'Joel', chapters: 3, testament: 'VT', group: 'Livros Proféticos' },
  { id: 'amo', name: 'Amós', chapters: 9, testament: 'VT', group: 'Livros Proféticos' },
  { id: 'oba', name: 'Obadias', chapters: 1, testament: 'VT', group: 'Livros Proféticos' },
  { id: 'jon', name: 'Jonas', chapters: 4, testament: 'VT', group: 'Livros Proféticos' },
  { id: 'mic', name: 'Miqueias', chapters: 7, testament: 'VT', group: 'Livros Proféticos' },
  { id: 'nam', name: 'Naum', chapters: 3, testament: 'VT', group: 'Livros Proféticos' },
  { id: 'hab', name: 'Habacuque', chapters: 3, testament: 'VT', group: 'Livros Proféticos' },
  { id: 'zep', name: 'Sofonias', chapters: 3, testament: 'VT', group: 'Livros Proféticos' },
  { id: 'hag', name: 'Ageu', chapters: 2, testament: 'VT', group: 'Livros Proféticos' },
  { id: 'zec', name: 'Zacarias', chapters: 14, testament: 'VT', group: 'Livros Proféticos' },
  { id: 'mal', name: 'Malaquias', chapters: 4, testament: 'VT', group: 'Livros Proféticos' },
  { id: 'mat', name: 'Mateus', chapters: 28, testament: 'NT', group: 'Evangelhos' },
  { id: 'mrk', name: 'Marcos', chapters: 16, testament: 'NT', group: 'Evangelhos' },
  { id: 'luk', name: 'Lucas', chapters: 24, testament: 'NT', group: 'Evangelhos' },
  { id: 'jhn', name: 'João', chapters: 21, testament: 'NT', group: 'Evangelhos' },
  { id: 'act', name: 'Atos', chapters: 28, testament: 'NT', group: 'Atos dos Apóstolos' },
  { id: 'rom', name: 'Romanos', chapters: 16, testament: 'NT', group: 'Cartas Paulinas' },
  { id: '1co', name: '1 Coríntios', chapters: 16, testament: 'NT', group: 'Cartas Paulinas' },
  { id: '2co', name: '2 Coríntios', chapters: 13, testament: 'NT', group: 'Cartas Paulinas' },
  { id: 'gal', name: 'Gálatas', chapters: 6, testament: 'NT', group: 'Cartas Paulinas' },
  { id: 'eph', name: 'Efésios', chapters: 6, testament: 'NT', group: 'Cartas Paulinas' },
  { id: 'php', name: 'Filipenses', chapters: 4, testament: 'NT', group: 'Cartas Paulinas' },
  { id: 'col', name: 'Colossenses', chapters: 4, testament: 'NT', group: 'Cartas Paulinas' },
  { id: '1th', name: '1 Tessalonicenses', chapters: 5, testament: 'NT', group: 'Cartas Paulinas' },
  { id: '2th', name: '2 Tessalonicenses', chapters: 3, testament: 'NT', group: 'Cartas Paulinas' },
  { id: '1ti', name: '1 Timóteo', chapters: 6, testament: 'NT', group: 'Cartas Paulinas' },
  { id: '2ti', name: '2 Timóteo', chapters: 4, testament: 'NT', group: 'Cartas Paulinas' },
  { id: 'tit', name: 'Tito', chapters: 3, testament: 'NT', group: 'Cartas Paulinas' },
  { id: 'phm', name: 'Filemom', chapters: 1, testament: 'NT', group: 'Cartas Paulinas' },
  { id: 'heb', name: 'Hebreus', chapters: 13, testament: 'NT', group: 'Cartas Paulinas' },
  { id: 'jas', name: 'Tiago', chapters: 5, testament: 'NT', group: 'Cartas Católicas' },
  { id: '1pe', name: '1 Pedro', chapters: 5, testament: 'NT', group: 'Cartas Católicas' },
  { id: '2pe', name: '2 Pedro', chapters: 3, testament: 'NT', group: 'Cartas Católicas' },
  { id: '1jn', name: '1 João', chapters: 5, testament: 'NT', group: 'Cartas Católicas' },
  { id: '2jn', name: '2 João', chapters: 1, testament: 'NT', group: 'Cartas Católicas' },
  { id: '3jn', name: '3 João', chapters: 1, testament: 'NT', group: 'Cartas Católicas' },
  { id: 'jud', name: 'Judas', chapters: 1, testament: 'NT', group: 'Cartas Católicas' },
  { id: 'rev', name: 'Apocalipse', chapters: 22, testament: 'NT', group: 'Apocalipse' }
];

export const GROUP_COLORS: Record<string, string> = {
  'Pentateuco': 'bg-amber-100 text-amber-900 border-amber-200 hover:bg-amber-200',
  'Livros Históricos': 'bg-emerald-100 text-emerald-900 border-emerald-200 hover:bg-emerald-200',
  'Livros Sapienciais': 'bg-purple-100 text-purple-900 border-purple-200 hover:bg-purple-200',
  'Livros Proféticos': 'bg-blue-100 text-blue-900 border-blue-200 hover:bg-blue-200',
  'Evangelhos': 'bg-rose-100 text-rose-950 border-rose-200 hover:bg-rose-200',
  'Atos dos Apóstolos': 'bg-teal-100 text-teal-900 border-teal-200 hover:bg-teal-200',
  'Cartas Paulinas': 'bg-indigo-100 text-indigo-900 border-indigo-200 hover:bg-indigo-200',
  'Cartas Católicas': 'bg-violet-100 text-violet-900 border-violet-200 hover:bg-violet-200',
  'Apocalipse': 'bg-fuchsia-100 text-fuchsia-900 border-fuchsia-200 hover:bg-fuchsia-200',
};

export const GROUP_THEMES: Record<string, { primary: string, text: string, border: string, light: string }> = {
  'Pentateuco': { primary: 'bg-purple-600', text: 'text-purple-600', border: 'border-purple-600', light: 'bg-purple-50' },
  'Livros Históricos': { primary: 'bg-emerald-600', text: 'text-emerald-600', border: 'border-emerald-600', light: 'bg-emerald-50' },
  'Livros Sapienciais': { primary: 'bg-amber-600', text: 'text-amber-600', border: 'border-amber-600', light: 'bg-amber-50' },
  'Livros Proféticos': { primary: 'bg-blue-800', text: 'text-blue-800', border: 'border-blue-800', light: 'bg-blue-50' },
  'Evangelhos': { primary: 'bg-blue-600', text: 'text-blue-600', border: 'border-blue-600', light: 'bg-blue-50' },
  'Atos dos Apóstolos': { primary: 'bg-teal-600', text: 'text-teal-600', border: 'border-teal-600', light: 'bg-teal-50' },
  'Cartas Paulinas': { primary: 'bg-indigo-600', text: 'text-indigo-600', border: 'border-indigo-600', light: 'bg-indigo-50' },
  'Cartas Católicas': { primary: 'bg-violet-600', text: 'text-violet-600', border: 'border-violet-600', light: 'bg-violet-50' },
  'Apocalipse': { primary: 'bg-rose-700', text: 'text-rose-700', border: 'border-rose-700', light: 'bg-rose-50' },
};

export const BEGINNER_PATH = [
  {
    title: "Passo 1: O Amor de Deus",
    description: "Comece pelo básico e mais importante: a primeira carta de São João ensina que Deus é amor.",
    books: ['1jn']
  },
  {
    title: "Passo 2: A Vida de Jesus",
    description: "Conheça a história, os milagres e os ensinamentos de Cristo através dos Evangelhos.",
    books: ['jhn', 'mrk', 'luk', 'mat']
  },
  {
    title: "Passo 3: A Igreja Nascente",
    description: "Veja como os primeiros cristãos viveram e espalharam a fé após a ressurreição.",
    books: ['act']
  },
  {
    title: "Passo 4: Orientações Práticas",
    description: "Cartas com conselhos valiosos de São Paulo e São Tiago para o dia a dia do cristão.",
    books: ['rom', '1co', 'eph', 'php', 'jas']
  },
  {
    title: "Passo 5: A Origem de Tudo",
    description: "A criação do mundo, a queda do homem e a formação do povo de Deus no Antigo Testamento.",
    books: ['gen', 'exo']
  },
  {
    title: "Passo 6: Oração e Sabedoria",
    description: "Livros poéticos perfeitos para rezar, louvar e buscar sabedoria divina.",
    books: ['psa', 'pro', 'sir', 'wis']
  },
  {
    title: "Passo 7: Os Grandes Profetas",
    description: "Os quatro profetas maiores que anunciaram Cristo séculos antes de seu nascimento. Isaías é chamado de '5º Evangelho' pela riqueza de profecias messiânicas.",
    books: ['isa', 'jer', 'lam', 'ezk', 'dan']
  },
  {
    title: "Passo 8: Os Doze Profetas Menores",
    description: "Doze livros curtos mas densos em revelação. Cada profeta fala a uma época e situação específica de Israel, completando o panorama profético do Antigo Testamento.",
    books: ['hos', 'jol', 'amo', 'oba', 'jon', 'mic', 'nam', 'hab', 'zep', 'hag', 'zec', 'mal']
  },
  {
    title: "Passo 9: A História de Israel",
    description: "Da conquista da Terra Prometida até o retorno do exílio. Estes livros mostram como Deus age na história do seu povo através de juízes, reis e profetas.",
    books: ['jos', 'jdg', 'rut', '1sa', '2sa', '1ki', '2ki', '1ch', '2ch', 'ezr', 'neh']
  },
  {
    title: "Passo 10: Deuterocanônicos e Jó",
    description: "Livros do cânon católico com forte valor espiritual e histórico, mais o livro de Jó — uma profunda meditação sobre o sofrimento humano e a fidelidade a Deus.",
    books: ['tob', 'jdt', 'est', '1ma', '2ma', 'bar', 'job', 'ecc', 'sng']
  },
  {
    title: "Passo 11: Paulo Completo",
    description: "As cartas paulinas restantes, completando o pensamento teológico de São Paulo — da justificação pela fé até as instruções pastorais para as primeiras comunidades.",
    books: ['2co', 'gal', 'col', '1th', '2th', '1ti', '2ti', 'tit', 'phm', 'heb']
  },
  {
    title: "Passo 12: O Fim e o Novo Começo",
    description: "As cartas católicas universais e o Apocalipse — o grande livro profético do Novo Testamento que revela a vitória final de Cristo sobre o mal e a chegada da Nova Jerusalém.",
    books: ['1pe', '2pe', '2jn', '3jn', 'jud', 'rev']
  }
];
