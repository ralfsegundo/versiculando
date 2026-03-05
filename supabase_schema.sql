-- ============================================================
--  VERSICULANDO — Schema Supabase
--  Execute no SQL Editor do seu projeto Supabase
-- ============================================================

-- ──────────────────────────────────────────────
-- 1. PERFIS DE USUÁRIO
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  name TEXT,
  email TEXT,
  avatar_id TEXT,
  avatar_url TEXT,
  join_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  weekly_activity JSONB DEFAULT '[]'::jsonb,
  points INTEGER DEFAULT 0,
  points_breakdown JSONB DEFAULT '{"freeExploration": 0, "discipleTrail": 0, "bonus": 0}'::jsonb,
  streak INTEGER DEFAULT 0,
  last_active_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  title TEXT DEFAULT 'Iniciante',
  completed_books JSONB DEFAULT '[]'::jsonb,
  disciple_completed_books JSONB DEFAULT '[]'::jsonb,
  visited_books JSONB DEFAULT '[]'::jsonb,
  read_chapters JSONB DEFAULT '{}'::jsonb,
  notes_count INTEGER DEFAULT 0,
  favorites_count INTEGER DEFAULT 0,
  daily_verse_count INTEGER DEFAULT 0,
  completed_plans INTEGER DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ──────────────────────────────────────────────
-- 2. CONQUISTAS / BADGES
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_badges (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  emoji TEXT NOT NULL,
  unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, badge_id)
);

-- ──────────────────────────────────────────────
-- 3. NOTAS BÍBLICAS
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.bible_notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  book_id TEXT NOT NULL,
  chapter INTEGER NOT NULL,
  verse INTEGER NOT NULL,
  text TEXT NOT NULL,
  color TEXT DEFAULT 'bg-amber-100',
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ──────────────────────────────────────────────
-- 4. FAVORITOS
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.bible_favorites (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  book_id TEXT NOT NULL,
  chapter INTEGER NOT NULL,
  verse INTEGER NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, book_id, chapter, verse)
);

-- ──────────────────────────────────────────────
-- 5. CONTEÚDO DOS LIVROS BÍBLICOS
--    Armazena mapas mentais, capítulos, timeline e versículos
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.bible_books_data (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  book_name TEXT NOT NULL UNIQUE,  -- ex: 'Gênesis', 'Êxodo'
  book_id TEXT NOT NULL UNIQUE,    -- ex: 'gen', 'exo'
  testament TEXT NOT NULL,         -- 'VT' ou 'NT'
  data JSONB NOT NULL,             -- BookData completo (mindmap, chapters, timeline, mainVerses)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Política pública de leitura (conteúdo é público para usuários autenticados)
ALTER TABLE public.bible_books_data ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Conteúdo público para leitura"
  ON public.bible_books_data FOR SELECT
  TO authenticated
  USING (true);

-- ──────────────────────────────────────────────
-- 6. TRILHAS TEMÁTICAS
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.trails (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,           -- 'infidelidade', 'depressao', 'solidao'
  title TEXT NOT NULL,                 -- 'Infidelidade — O Caminho do Perdão'
  description TEXT NOT NULL,
  duration_days INTEGER NOT NULL,
  category TEXT NOT NULL,              -- 'relacionamento', 'saude-mental', 'vicios', 'espiritualidade'
  emoji TEXT NOT NULL,
  is_premium BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ──────────────────────────────────────────────
-- 7. DIAS DAS TRILHAS
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.trail_days (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  trail_id UUID REFERENCES public.trails(id) ON DELETE CASCADE,
  day_number INTEGER NOT NULL,
  title TEXT NOT NULL,                 -- 'A Dor é Real'
  reading TEXT NOT NULL,               -- 'Salmo 51'
  reflection TEXT NOT NULL,
  verse TEXT NOT NULL,
  verse_reference TEXT NOT NULL,
  practice TEXT,                       -- exercício prático opcional
  emoji TEXT DEFAULT '📖',
  UNIQUE(trail_id, day_number)
);

-- ──────────────────────────────────────────────
-- 8. PROGRESSO DO USUÁRIO NAS TRILHAS
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_trail_progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  trail_id UUID REFERENCES public.trails(id) ON DELETE CASCADE,
  day_number INTEGER NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, trail_id, day_number)
);

-- ──────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ──────────────────────────────────────────────
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bible_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bible_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trails ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trail_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_trail_progress ENABLE ROW LEVEL SECURITY;

-- Perfis
CREATE POLICY "Ver próprio perfil" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Atualizar próprio perfil" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Inserir próprio perfil" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Badges
CREATE POLICY "Ver próprias conquistas" ON public.user_badges FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Inserir próprias conquistas" ON public.user_badges FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Notas
CREATE POLICY "Ver próprias notas" ON public.bible_notes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Inserir próprias notas" ON public.bible_notes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Atualizar próprias notas" ON public.bible_notes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Deletar próprias notas" ON public.bible_notes FOR DELETE USING (auth.uid() = user_id);

-- Favoritos
CREATE POLICY "Ver próprios favoritos" ON public.bible_favorites FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Inserir próprios favoritos" ON public.bible_favorites FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Deletar próprios favoritos" ON public.bible_favorites FOR DELETE USING (auth.uid() = user_id);

-- Trilhas (leitura pública para autenticados)
CREATE POLICY "Ver trilhas ativas" ON public.trails FOR SELECT TO authenticated USING (is_active = true);
CREATE POLICY "Ver dias das trilhas" ON public.trail_days FOR SELECT TO authenticated USING (true);

-- Progresso nas trilhas
CREATE POLICY "Ver próprio progresso" ON public.user_trail_progress FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Inserir próprio progresso" ON public.user_trail_progress FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Deletar próprio progresso" ON public.user_trail_progress FOR DELETE USING (auth.uid() = user_id);

-- ──────────────────────────────────────────────
-- TRIGGER: cria perfil automaticamente no cadastro
-- ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name)
  VALUES (new.id, new.email, split_part(new.email, '@', 1));
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ──────────────────────────────────────────────
-- DADOS INICIAIS: Trilhas Temáticas
-- ──────────────────────────────────────────────
INSERT INTO public.trails (slug, title, description, duration_days, category, emoji, order_index) VALUES
('infidelidade', 'Infidelidade — O Caminho do Perdão', 'Uma jornada bíblica de 7 dias para encontrar cura, perdão e renovação após a traição, pela luz da fé católica.', 7, 'relacionamento', '💔', 1),
('depressao', 'Depressão — A Luz nas Trevas', 'Encontre esperança e força nos Salmos e nos santos que também sofreram, sabendo que Deus está presente na escuridão.', 7, 'saude-mental', '🌑', 2),
('solidao', 'Solidão — Deus como Companhia', 'Descubra que nunca estamos verdadeiramente sozinhos e aprenda a transformar a solidão em encontro com Deus.', 5, 'espiritualidade', '🕊️', 3),
('vicios', 'Vícios — Libertação pelo Evangelho', 'Uma trilha de libertação espiritual para quem busca vencer dependências com o apoio da fé e dos sacramentos.', 7, 'vicios', '⛓️', 4),
('ansiedade', 'Ansiedade — A Paz que Excede', 'Aprenda com São Paulo e os Salmos a confiar em Deus no meio das preocupações e encontrar a paz que só Ele pode dar.', 5, 'saude-mental', '🌊', 5),
('luto', 'Luto — A Esperança da Ressurreição', 'Uma caminhada gentil de 7 dias para processar a perda de alguém amado à luz da fé na ressurreição.', 7, 'sofrimento', '🕯️', 6)
ON CONFLICT (slug) DO NOTHING;

-- ──────────────────────────────────────────────
-- DADOS INICIAIS: Dias da Trilha Infidelidade
-- ──────────────────────────────────────────────
INSERT INTO public.trail_days (trail_id, day_number, title, reading, reflection, verse, verse_reference, practice, emoji)
SELECT
  t.id,
  d.day_number,
  d.title,
  d.reading,
  d.reflection,
  d.verse,
  d.verse_reference,
  d.practice,
  d.emoji
FROM public.trails t
CROSS JOIN (VALUES
  (1, 'A Dor é Real', 'Salmo 51', 'Deus não foge da nossa dor — Ele entra nela. Davi escreveu este salmo depois do seu maior pecado. Sua dor era real, sua culpa era real, mas sua esperança em Deus também era real.', 'Cria em mim um coração puro, ó Deus, e renova em mim um espírito reto.', 'Salmo 51,12', 'Escreva em um papel o que você está sentindo, sem filtro. Depois leve isso à oração.', '😢'),
  (2, 'O Que é o Matrimônio', 'Gênesis 2,18-24 e Efésios 5,25-33', 'O casamento não é apenas um contrato humano — é um sacramento que reflete o amor de Cristo pela Igreja. Entender isso ajuda a compreender a profundidade da ferida.', 'O que Deus uniu, o homem não separe.', 'Mateus 19,6', 'Releia suas promessas de casamento. O que elas significam para você hoje?', '💍'),
  (3, 'Até Deus Conhece a Traição', 'Oseias 1-3', 'O livro de Oseias é uma história de traição e amor incondicional. Deus mesmo usou a experiência de Oseias para mostrar como Se sente quando Seu povo O abandona.', 'Vou seduzi-la, levá-la ao deserto e falarei ao seu coração.', 'Oseias 2,16', 'Leia Oseias 2 inteiro e anote o que te tocou.', '💬'),
  (4, 'Jesus Não Veio Condenar', 'João 8,1-11', 'A mulher adúltera foi trazida para ser condenada. Jesus não a condenou — Ele a restaurou. Esse mesmo Jesus está com você hoje, seja você o traído ou o culpado.', 'Nem eu te condeno. Vai e não peques mais.', 'João 8,11', 'Imagine-se diante de Jesus nessa cena. O que Ele te diz?', '🙏'),
  (5, 'O Sacramento da Cura', 'Carta de Tiago 5,13-16', 'A Confissão não é punição — é o abraço de Deus. O Sacramento da Reconciliação existe exatamente para momentos como este, para limpar o que foi corrompido e renovar o que foi ferido.', 'Se confessarmos nossos pecados, Ele é fiel e justo para nos perdoar.', '1 João 1,9', 'Marque uma confissão esta semana. Se não souber como se preparar, leia o exame de consciência para casais.', '✝️'),
  (6, 'Perdoar Não é Esquecer', 'Mateus 18,21-35', 'Pedro perguntou se devia perdoar sete vezes. Jesus disse setenta vezes sete — não como número, mas como atitude do coração. Perdoar é um processo, não um momento.', 'Perdoai-vos uns aos outros, como também Deus vos perdoou em Cristo.', 'Efésios 4,32', 'Escreva uma carta de perdão (não precisa enviar). Perdoe a si mesmo também.', '🤝'),
  (7, 'Renovação ou Recomeço', 'Apocalipse 21,1-5', 'Deus faz novas todas as coisas. Seja renovando seu casamento, seja seguindo em paz após o fim, há um recomeço possível para você. A última palavra não é da traição — é de Deus.', 'Eis que faço novas todas as coisas.', 'Apocalipse 21,5', 'Escreva três palavras que descrevem como você quer se sentir daqui a 6 meses. Ore por isso.', '🌅')
) AS d(day_number, title, reading, reflection, verse, verse_reference, practice, emoji)
WHERE t.slug = 'infidelidade'
ON CONFLICT (trail_id, day_number) DO NOTHING;
