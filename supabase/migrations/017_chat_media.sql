-- 017_chat_media.sql
-- Suporte a mídia no chat: áudio, foto, vídeo

-- 1. Adicionar colunas de mídia na tabela messages
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS tipo TEXT DEFAULT 'text'
    CHECK (tipo IN ('text', 'audio', 'photo', 'video')),
  ADD COLUMN IF NOT EXISTS arquivo_url TEXT,
  ADD COLUMN IF NOT EXISTS duracao INTEGER; -- duração em segundos (áudio/vídeo)

-- 2. Criar bucket de storage para mídia do chat
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'chat-media',
  'chat-media',
  false,
  52428800, -- 50MB max (vídeo Elite)
  ARRAY[
    'audio/webm', 'audio/ogg', 'audio/mp4', 'audio/mpeg', 'audio/x-m4a',
    'image/jpeg', 'image/png', 'image/webp',
    'video/mp4', 'video/webm'
  ]
) ON CONFLICT (id) DO NOTHING;

-- 3. RLS no bucket: upload apenas na própria pasta
CREATE POLICY "Users can upload their own chat media"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'chat-media'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- 4. RLS no bucket: leitura para participantes da conversa
CREATE POLICY "Users can read chat media from their conversations"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'chat-media'
    AND (
      auth.uid()::text = (storage.foldername(name))[1]
      OR EXISTS (
        SELECT 1 FROM public.messages m
        WHERE m.arquivo_url LIKE '%' || storage.filename(name)
          AND (m.sender_id = auth.uid() OR m.receiver_id = auth.uid())
      )
    )
  );

-- 5. Índice para queries de mídia
CREATE INDEX IF NOT EXISTS idx_messages_tipo
  ON public.messages(tipo) WHERE tipo != 'text';
