# 💓 Bot Heartbeat: Hafız

HafızBot'un arka planda sürekli yürüttüğü otonom görevler.

## 🕒 Cron Joblar (Zamanlanmış Görevler)

### 1. Günlük AI Haber Özeti
- **Zamanlama:** Her sabah 09:00
- **Görev:** Son 24 saatteki AI haberlerini tara, özetle ve Hakan'a gönder.
- **Odak:** Social media automation, AI agents, MiniMax/Kimi güncellemeleri.

### 2. Haftalık Rakip Analizi
- **Zamanlama:** Her Pazartesi 08:30
- **Görev:** Belirlenen rakiplerin sosyal medya ve web sitesi değişikliklerini kontrol et.

### 3. Trend Alarmı
- **Zamanlama:** Her gün 19:00
- **Görev:** X/Twitter ve LinkedIn üzerindeki popüler pazarlama trendlerini analiz et.

## 🛠️ Sistem Sağlığı
- **Memory Check:** SQLite veritabanı bütünlüğünü kontrol et.
- **Auth Token Check:** Telegram ve OpenAI API durumlarını izle.
- **Subordinate Bots:** Avyna ve Utus botlarının aktiflik durumunu kontrol et.
