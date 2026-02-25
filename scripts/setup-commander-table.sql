-- ============================================================
-- Botlar Arası Yönetim (Commander Mode) Migration
-- Bu SQL'i Supabase Dashboard > SQL Editor'de çalıştırın
-- ============================================================

CREATE TABLE IF NOT EXISTS bot_directives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender TEXT NOT NULL,         -- 'hafiz'
  target TEXT NOT NULL,         -- 'utus', 'avyna', 'all'
  command TEXT NOT NULL,        -- Görev açıklaması
  payload JSONB DEFAULT '{}',   -- Ek detaylar (priority vb.)
  status TEXT DEFAULT 'pending' 
    CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  result TEXT,                  -- İşlem sonucu
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Realtime desteği (diğer botların anlık duyması için)
ALTER publication supabase_realtime ADD TABLE bot_directives;
