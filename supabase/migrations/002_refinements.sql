-- =====================================================
-- PROFIX: Schema Refinements (Categories, Messages, Portfolio)
-- =====================================================

-- 1. CATEGORIES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  icon TEXT,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Seed basic categories
INSERT INTO public.categories (id, name, icon) VALUES
  ('encanador', 'Encanador', 'Droplets'),
  ('eletricista', 'Eletricista', 'Zap'),
  ('diarista', 'Diarista', 'Sparkles'),
  ('pedreiro', 'Pedreiro', 'Hammer'),
  ('pintor', 'Pintor', 'Paintbrush'),
  ('frete', 'Frete e Mudança', 'Truck')
ON CONFLICT (id) DO NOTHING;

-- 2. MESSAGES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  service_request_id UUID REFERENCES public.service_requests(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 3. PORTFOLIO ITEMS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.portfolio_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  professional_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 4. RLS POLICIES
-- =====================================================

-- Enable RLS
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolio_items ENABLE ROW LEVEL SECURITY;

-- CATEGORIES: Public read
CREATE POLICY "Categories are viewable by everyone" 
  ON public.categories FOR SELECT USING (true);

-- MESSAGES: Only sender or receiver can see
CREATE POLICY "Users can view their own messages"
  ON public.messages FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can send messages"
  ON public.messages FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

-- PORTFOLIO: Public read, owner write
CREATE POLICY "Portfolio items are viewable by everyone"
  ON public.portfolio_items FOR SELECT USING (true);

CREATE POLICY "Professionals can manage their own portfolio"
  ON public.portfolio_items FOR ALL
  USING (auth.uid() = professional_id);

-- 5. UPDATING TRIGGER (Refinement)
-- =====================================================
-- Ensure we handle professional_profiles creation if user_type is professional
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_user_type text;
BEGIN
  v_user_type := COALESCE(NEW.raw_user_meta_data ->> 'user_type', 'client');

  -- Profile
  INSERT INTO public.profiles (user_id, full_name, user_type)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email),
    v_user_type::public.user_type
  );

  -- Professional Profile (if applicable)
  IF v_user_type = 'professional' THEN
    INSERT INTO public.professional_profiles (user_id, category_id, category_name)
    VALUES (
      NEW.id,
      'geral', -- Default category
      'Serviços Gerais'
    );
  END IF;

  RETURN NEW;
END;
$$;
