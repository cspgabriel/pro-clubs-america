-- ========================================================
-- PRO CLUBS AMÉRICA — MIGRATION SCHEMA OFICIAL (SUPABASE)
-- Project Ref: mdqtlkvkpacjouwgtibr
-- Region: sa-east-1 (São Paulo)
-- ========================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. TABELA DE PERFIS DE USUÁRIOS
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT,
    gamertag TEXT,
    country_code VARCHAR(5) DEFAULT 'BR',
    role TEXT DEFAULT 'player' CHECK (role IN ('player', 'captain', 'admin')),
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. TABELA DE CLUBES DA COMUNIDADE
CREATE TABLE IF NOT EXISTS public.clubs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ea_club_id VARCHAR(50) NOT NULL UNIQUE,
    platform VARCHAR(20) NOT NULL CHECK (platform IN ('common-gen5', 'common-gen4', 'nx')),
    name TEXT NOT NULL,
    captain_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    ea_url TEXT NOT NULL,
    verified BOOLEAN DEFAULT FALSE,
    country_code VARCHAR(5) DEFAULT 'BR',
    skill_rating INT DEFAULT 0,
    wins INT DEFAULT 0,
    ties INT DEFAULT 0,
    losses INT DEFAULT 0,
    games_played INT DEFAULT 0,
    goals INT DEFAULT 0,
    goals_against INT DEFAULT 0,
    clean_sheets INT DEFAULT 0,
    reputation_level TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. TABELA DE JOGADORES E ESTATÍSTICAS DE CARREIRA
CREATE TABLE IF NOT EXISTS public.players (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    club_id UUID REFERENCES public.clubs(id) ON DELETE CASCADE,
    gamertag TEXT NOT NULL,
    favorite_position VARCHAR(20) DEFAULT 'Midfielder',
    rating INT DEFAULT 85,
    games_played INT DEFAULT 0,
    goals INT DEFAULT 0,
    assists INT DEFAULT 0,
    passes_made INT DEFAULT 0,
    pass_success_rate NUMERIC(5,2) DEFAULT 0.00,
    tackles_made INT DEFAULT 0,
    tackle_success_rate NUMERIC(5,2) DEFAULT 0.00,
    clean_sheets_def INT DEFAULT 0,
    clean_sheets_gk INT DEFAULT 0,
    man_of_the_match INT DEFAULT 0,
    win_rate NUMERIC(5,2) DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_gamertag_club UNIQUE (gamertag, club_id)
);

-- 4. TABELA DE PARTIDAS E DESAFIOS DE AMISTOSOS
CREATE TABLE IF NOT EXISTS public.matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    home_club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
    away_club_id UUID REFERENCES public.clubs(id) ON DELETE SET NULL,
    match_type VARCHAR(20) DEFAULT 'Friendly' CHECK (match_type IN ('Friendly', 'League', 'Playoff')),
    status VARCHAR(30) DEFAULT 'open_challenge' CHECK (status IN ('open_challenge', 'accepted', 'waiting_ea_verification', 'completed', 'cancelled')),
    home_score INT,
    away_score INT,
    ea_match_id TEXT,
    scheduled_at TIMESTAMPTZ DEFAULT NOW(),
    confirmed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. TABELA DO MERCADO DE TRANSFERÊNCIAS
CREATE TABLE IF NOT EXISTS public.market_listings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    club_id UUID REFERENCES public.clubs(id) ON DELETE CASCADE,
    listing_type VARCHAR(30) NOT NULL CHECK (listing_type IN ('club_seeking_player', 'player_seeking_club')),
    position_needed VARCHAR(20) NOT NULL,
    min_ovr INT DEFAULT 80,
    country_code VARCHAR(5) DEFAULT 'BR',
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- HABILITAR ROW LEVEL SECURITY (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_listings ENABLE ROW LEVEL SECURITY;

-- POLÍTICAS DE SEGURANÇA LEITURA PÚBLICA (TODOS PODEM VER RANKINGS)
CREATE POLICY "Public Read Profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Public Read Clubs" ON public.clubs FOR SELECT USING (true);
CREATE POLICY "Public Read Players" ON public.players FOR SELECT USING (true);
CREATE POLICY "Public Read Matches" ON public.matches FOR SELECT USING (true);
CREATE POLICY "Public Read Market" ON public.market_listings FOR SELECT USING (true);

-- POLÍTICAS DE INSERÇÃO/EDIÇÃO PARA USUÁRIOS AUTENTICADOS
CREATE POLICY "Users Can Update Own Profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Captains Can Manage Clubs" ON public.clubs FOR ALL USING (auth.uid() = captain_id);
CREATE POLICY "Users Can Manage Market Listings" ON public.market_listings FOR ALL USING (auth.uid() = creator_id);
