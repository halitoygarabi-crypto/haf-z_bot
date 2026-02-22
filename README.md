# 🤖 Agent Claw

Telegram üzerinden çalışan, Claude destekli kişisel AI asistan botu.

## Özellikler

- **Metin sohbeti** — Claude ile doğal dil konuşma
- **Sesli mesaj desteği** — Ses mesajını otomatik transkribe edip yanıtlar (Whisper)
- **Sesli yanıt (TTS)** — "reply with voice" deyince sesli yanıt gönderir (ElevenLabs)
- **Uzun süreli hafıza** — SQLite + FTS5 ile kalıcı hafıza, core memory, /remember ve /recall
- **Ajan döngüsü** — Claude araçları (tools) kullanabilir
- **Güvenlik** — Kullanıcı ID whitelist, log'a anahtar yazılmaz, web server yok

---

## Kurulum

### 1. Bağımlılıkları yükle

```powershell
npm install
```

### 2. Ortam değişkenlerini ayarla

```powershell
copy .env.example .env
```

`.env` dosyasını aç ve gerçek değerleri gir:

| Değişken                     | Zorunlu | Açıklama                              |
| ---------------------------- | ------- | ------------------------------------- |
| `TELEGRAM_BOT_TOKEN`         | ✅      | @BotFather'dan aldığın bot token      |
| `MODEL_API_KEY`              | ✅      | Anthropic Claude API key              |
| `TELEGRAM_ALLOWLIST_USER_ID` | ✅      | Senin Telegram kullanıcı ID'n         |
| `TRANSCRIPTION_API_KEY`      | ❌      | OpenAI API key (ses mesajı için)      |
| `TTS_API_KEY`                | ❌      | ElevenLabs API key (sesli yanıt için) |
| `VECTOR_DB_API_KEY`          | ❌      | Vektör DB key (placeholder, ileride)  |
| `VECTOR_DB_INDEX`            | ❌      | Vektör DB index adı (placeholder)     |
| `MOCK_TRANSCRIPTION`         | ❌      | `true` = sahte transkripsiyon (test)  |
| `MOCK_TTS`                   | ❌      | `true` = sahte TTS (test)             |
| `MOCK_MEMORY`                | ❌      | `true` = sahte hafıza (test)          |

### 3. Botu çalıştır

```powershell
npm run dev
```

---

## 🧠 Hafıza Sistemi

Agent Claw konuşmalar arasında bilgi hatırlar. İki katmanlı hafıza sistemi vardır:

### Core Memory (`memory/core_memory.md`)

- **Elle düzenlenebilir** — istediğin zaman açıp düzenleyebilirsin
- Sabit tercihler: isim, dil, saat dilimi, yanıt tonu vs.
- Her mesajda system prompt'a eklenir

### Dinamik Hafıza (SQLite + FTS5)

- Otomatik veya açık komutla kaydedilen bilgiler
- FTS5 tam metin arama ile top-k ilgili anı getirilir
- Veritabanı: `memory/agent_claw.db`

### Komutlar

| Komut               | Açıklama                       |
| ------------------- | ------------------------------ |
| `/remember <bilgi>` | Bilgiyi hafızaya kaydet        |
| `/recall <sorgu>`   | Hafızadan ilgili anıları getir |

### Gizlilik Notları

> ⚠️ **Hafıza dosyaları sadece yerel makinende kalır.**
>
> - `memory/` klasöründeki tüm dosyalar `.gitignore`'a eklenmiştir
> - API anahtarları hiçbir zaman hafızaya yazılmaz
> - `memory_log.md` sadece güvenli özetler içerir
> - Hafıza Claude'a gönderilirken sadece ilgili parçalar (top-3) eklenir

---

## Sesli Yanıt (TTS) Kullanımı

Varsayılan davranış **metin yanıttır**. Sesli yanıt almak için mesajında "reply with voice" ekle:

```
Bugün hava nasıl olacak? reply with voice
```

---

## Mock Modları (API Anahtarı Olmadan Test)

```env
MOCK_TRANSCRIPTION=true
MOCK_TTS=true
```

### Hafıza Testi

```powershell
npm run test:memory
```

Bu script gerçek API çağrısı yapmadan SQLite hafıza yazma/okuma işlemlerini test eder.

---

## Sorun Giderme

| Sorun                              | Çözüm                                                             |
| ---------------------------------- | ----------------------------------------------------------------- |
| `❌ Gerekli ortam değişkeni eksik` | `.env` dosyasında ilgili değişkeni doldur                         |
| Bot yanıt vermiyor                 | `TELEGRAM_ALLOWLIST_USER_ID` doğru mu kontrol et                  |
| Ses mesajı çalışmıyor              | `TRANSCRIPTION_API_KEY` ayarla veya `MOCK_TRANSCRIPTION=true` yap |
| TTS çalışmıyor                     | `TTS_API_KEY` ayarla veya `MOCK_TTS=true` yap                     |
| `/recall` sonuç döndürmüyor        | Önce `/remember` ile bilgi kaydet                                 |
| `ERR_MODULE_NOT_FOUND`             | `npm install` çalıştır                                            |

---

## Self-Test Kontrol Listesi

- [ ] Konsolda `🤖 Agent Claw başlatılıyor...` görünüyor
- [ ] Konsolda `🧠 Hafıza sistemi başlatıldı` görünüyor
- [ ] Konsolda **hiçbir API anahtarı** görünmüyor
- [ ] Metin mesajı → Claude yanıtı geliyor
- [ ] İzinsiz kullanıcıdan mesaj → yanıt yok
- [ ] `/remember Benim adım Test` → hafıza kaydedildi
- [ ] `/recall isim` → kayıtlı bilgi döner
- [ ] Ses mesajı → transkripsiyon + yanıt (opsiyonel)
- [ ] "reply with voice" → sesli yanıt (opsiyonel)

---

## Mimari

```
src/
├── index.ts              # Ana giriş noktası
├── config/env.ts         # Ortam değişkenleri
├── telegram/
│   ├── bot.ts            # Grammy bot + allowlist
│   └── voice.ts          # Ses dosyası indirme
├── memory/
│   ├── index.ts          # MemoryManager
│   ├── store.ts          # SQLite + FTS5
│   ├── core.ts           # core_memory.md okuma
│   └── log.ts            # memory_log.md yazma
├── transcription/
│   ├── index.ts          # Strateji seçici
│   ├── whisper.ts        # OpenAI Whisper
│   └── mock.ts           # Mock transkripsiyon
├── tts/
│   ├── index.ts          # Strateji seçici
│   ├── elevenlabs.ts     # ElevenLabs TTS
│   └── mock.ts           # Mock TTS
├── agent/
│   ├── loop.ts           # Claude ajan döngüsü + hafıza
│   └── tools.ts          # Tool tanımları + hafıza araçları
└── handlers/
    ├── index.ts          # /remember, /recall + handler kayıt
    ├── text.ts           # Metin mesaj handler
    └── voice.ts          # Ses mesaj handler

memory/                   # Proje kökünde (veritabanı + dosyalar)
├── agent_claw.db         # SQLite veritabanı (otomatik oluşur)
├── core_memory.md        # Sabit tercihler (elle düzenle)
└── memory_log.md         # İşlem günlüğü (append-only)
```
