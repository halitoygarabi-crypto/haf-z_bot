-- ⚠️ DİKKAT: Bu script mevcut tabloları silip yeniden oluşturur (Temiz Kurulum).

DROP TABLE IF EXISTS platform_stats CASCADE;
DROP TABLE IF EXISTS posts CASCADE;
DROP TABLE IF EXISTS customer_profiles CASCADE;
DROP TABLE IF EXISTS bot_directives CASCADE;

-- 1. Bot Yönergeleri
CREATE TABLE bot_directives (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  sender TEXT NOT NULL,
  target TEXT NOT NULL, 
  command TEXT NOT NULL,
  payload JSONB DEFAULT '{}',
  status TEXT DEFAULT 'pending', 
  result TEXT,
  finished_at TIMESTAMPTZ
);

-- 2. Müşteri Profilleri
CREATE TABLE customer_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  company_name TEXT NOT NULL,
  industry TEXT,
  contact_person TEXT,
  notes TEXT
);

-- 3. Sosyal Medya Postları
CREATE TABLE posts (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  customer_id UUID REFERENCES customer_profiles(id),
  title TEXT,
  content TEXT,
  image_urls TEXT[],
  platforms TEXT[],
  status TEXT DEFAULT 'draft',
  scheduled_time TIMESTAMPTZ,
  created_by TEXT DEFAULT 'HafızBot'
);

-- 4. Platform İstatistikleri
CREATE TABLE platform_stats (
  id BIGSERIAL PRIMARY KEY,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  platform TEXT NOT NULL, 
  username TEXT NOT NULL, 
  followers INTEGER DEFAULT 0,
  reach INTEGER DEFAULT 0,
  avg_engagement_rate DECIMAL(5,2) DEFAULT 0.0
);

-- Örnek Veri (Heartbeat testi için)
INSERT INTO platform_stats (platform, username, followers, avg_engagement_rate)
VALUES 
('instagram', 'theavynaofficial', 2900, 4.5),
('instagram', 'kasktasarimtr', 1200, 3.2),
('tiktok', 'kasktasarim_99', 850, 7.8);
