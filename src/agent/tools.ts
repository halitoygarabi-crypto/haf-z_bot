import type { MemoryManager } from "../memory/index.js";
import type { EnvConfig } from "../config/env.js";
import { isToolAllowed, sanitizeForLog } from "../mcp/guard.js";
import { getEventsForDate, formatEventsAsText } from "../mcp/calendar.js";
import { generateFluxImage } from "../mcp/image.js";
import { postToSocialMedia } from "../mcp/social.js";
import { generateVideo } from "../mcp/video.js";
import { generateCaption, generateVideoPrompt } from "../mcp/caption.js";
import { generateInfluencer } from "../mcp/influencer.js";
import { getSupabase } from "../utils/supabase.js";
import { DashboardService } from "../services/dashboard_service.js";

/**
 * Tool tanımları — Claude'un kullanabileceği araçlar.
 */
export interface ToolResult {
  name: string;
  result: string;
}

export const toolDefinitions = [
  {
    name: "get_current_time" as const,
    description:
      "Şu anki tarih ve saati döner. Kullanıcı saati veya tarihi sorduğunda kullan.",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [] as string[],
    },
  },
  {
    name: "remember_fact" as const,
    description:
      "Kullanıcı hakkında önemli bir bilgiyi hafızaya kaydeder. Kullanıcının ismi, tercihleri, alışkanlıkları gibi bilgileri saklamak için kullan.",
    input_schema: {
      type: "object" as const,
      properties: {
        content: {
          type: "string" as const,
          description: "Hatırlanacak bilgi veya gerçek.",
        },
      },
      required: ["content"],
    },
  },
  {
    name: "recall_memories" as const,
    description:
      "Hafızadan ilgili anıları arar. Kullanıcının daha önce söylediği şeyleri hatırlamak için kullan.",
    input_schema: {
      type: "object" as const,
      properties: {
        query: {
          type: "string" as const,
          description: "Aranacak konu veya anahtar kelimeler.",
        },
        top_k: {
          type: "number" as const,
          description: "Döndürülecek maksimum sonuç sayısı (varsayılan: 3).",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "get_calendar_events" as const,
    description:
      "Google Calendar'dan belirli bir tarihteki etkinlikleri getirir. Salt okunur — sadece okuma yapar, etkinlik oluşturmaz. Kullanıcı takvimini veya programını sorduğunda kullan.",
    input_schema: {
      type: "object" as const,
      properties: {
        date: {
          type: "string" as const,
          description:
            "Etkinliklerin sorgulanacağı tarih (YYYY-MM-DD formatında). Örn: 2026-02-23",
        },
      },
      required: ["date"],
    },
  },
  {
    name: "generate_image" as const,
    description:
      "Yapay zeka (Flux.1) kullanarak yeni bir görsel üretir. Sosyal medya paylaşımları, içerik görselleri veya sanatsal talepler için kullan. Maliyet: ~$0.003/görsel.",
    input_schema: {
      type: "object" as const,
      properties: {
        prompt: {
          type: "string" as const,
          description: "Üretilecek görselin detaylı açıklaması (İngilizce daha iyi sonuç verir).",
        },
      },
      required: ["prompt"],
    },
  },
  {
    name: "post_to_social" as const,
    description:
      "Instagram, TikTok, Twitter gibi sosyal medya platformlarında paylaşım yapar. Görsel URL'si ve metin (caption) alır. LIME Social API'sini kullanır.",
    input_schema: {
      type: "object" as const,
      properties: {
        title: {
          type: "string" as const,
          description: "Paylaşım açıklaması (caption).",
        },
        mediaUrl: {
          type: "string" as const,
          description: "Paylaşılacak görsel veya video URL'si (opsiyonel).",
        },
        platforms: {
          type: "array" as const,
          items: {
            type: "string" as const,
            enum: ["instagram", "tiktok", "x", "linkedin", "facebook"],
          },
          description: "Paylaşım yapılacak platformlar listesi.",
        },
        usernames: {
          type: "array" as const,
          items: {
            type: "string" as const,
          },
          description: "Platform sırasıyla kullanılacak kullanıcı adları.",
        },
      },
      required: ["title", "platforms", "usernames"],
    },
  },

  // ═══════════════════════════════════════════
  // FAZ 1: Yeni Araçlar
  // ═══════════════════════════════════════════

  {
    name: "generate_video" as const,
    description:
      "Yapay zeka ile video üretir (Kling AI). Text-to-video veya image-to-video destekler. Sosyal medya reels, tanıtım videoları için kullan. Süre: ~60-120 saniye. Maliyet: ~$0.05/video.",
    input_schema: {
      type: "object" as const,
      properties: {
        prompt: {
          type: "string" as const,
          description: "Video için detaylı açıklama. Türkçe verilirse otomatik optimize edilir. İngilizce tercih edilir.",
        },
        imageUrl: {
          type: "string" as const,
          description: "Opsiyonel: Image-to-video modu için kaynak görsel URL'si. Gönderilirse görselden video üretilir.",
        },
        aspectRatio: {
          type: "string" as const,
          enum: ["16:9", "9:16", "1:1"],
          description: "Video en-boy oranı. 9:16 = Reels/TikTok dikey, 16:9 = YouTube yatay, 1:1 = kare. Varsayılan: 16:9",
        },
        duration: {
          type: "number" as const,
          description: "Video süresi saniye cinsinden (5 veya 10). Varsayılan: 5",
        },
        autoOptimizePrompt: {
          type: "boolean" as const,
          description: "true ise prompt'u önce LLM ile sinematik İngilizce prompt'a çevirir. Varsayılan: true",
        },
      },
      required: ["prompt"],
    },
  },
  {
    name: "generate_caption" as const,
    description:
      "Verilen konu/başlık için sosyal medya caption'ı (açıklama metni) üretir. Platform'a özel optimize eder (Instagram, TikTok, X vb.). Hashtag ve emoji dahil. Paylaşım yapmadan önce bu araçla caption üret.",
    input_schema: {
      type: "object" as const,
      properties: {
        title: {
          type: "string" as const,
          description: "Caption üretilecek konu veya başlık.",
        },
        platform: {
          type: "string" as const,
          enum: ["instagram", "tiktok", "x", "linkedin", "facebook"],
          description: "Hedef platform. Varsayılan: instagram",
        },
        tone: {
          type: "string" as const,
          enum: ["professional", "casual", "funny", "inspiring"],
          description: "Caption tonu. Varsayılan: professional",
        },
        clientContext: {
          type: "string" as const,
          description: "Opsiyonel: Marka/müşteri bağlamı. Daha hedefli caption üretmek için.",
        },
      },
      required: ["title"],
    },
  },
  {
    name: "generate_influencer" as const,
    description:
      "Yapay zeka ile AI influencer görseli üretir (Flux Pro). Gerçekçi insan yüzleri, moda, ürün tanıtımı gibi görseller için kullan. Üretilen görsel sosyal medyada paylaşılabilir. Maliyet: ~$0.05/görsel.",
    input_schema: {
      type: "object" as const,
      properties: {
        prompt: {
          type: "string" as const,
          description: "Influencer görselinin detaylı açıklaması. Kıyafet, poz, mekan, ışık gibi detaylar ekle. İngilizce tercih edilir.",
        },
        aspectRatio: {
          type: "string" as const,
          enum: ["1:1", "9:16", "16:9", "4:3"],
          description: "Görsel en-boy oranı. 9:16 = story/reels dikey, 1:1 = kare post. Varsayılan: 1:1",
        },
        model: {
          type: "string" as const,
          enum: ["flux-pro", "flux-schnell"],
          description: "AI model. flux-pro = yüksek kalite (yavaş), flux-schnell = hızlı (düşük maliyet). Varsayılan: flux-pro",
        },
      },
      required: ["prompt"],
    },
  },
  {
    name: "manage_subordinate_bot" as const,
    description:
      "Diğer yardımcı botlara (Utus veya Avyna) görev atar. HafızBot yönetici olarak diğer botları kontrol edebilir.",
    input_schema: {
      type: "object" as const,
      properties: {
        target: {
          type: "string" as const,
          enum: ["utus", "avyna", "all"],
          description: "Görevin gönderileceği bot.",
        },
        task: {
          type: "string" as const,
          description: "Botun gerçekleştirmesi gereken görev açıklaması.",
        },
        priority: {
          type: "string" as const,
          enum: ["low", "normal", "high"],
          description: "Görevin önceliği.",
        },
      },
      required: ["target", "task"],
    },
  },
  {
    name: "dashboard_list_clients" as const,
    description:
      "Sosyal Medya Dashboard'undaki kayıtlı müşteri listesini getirir. Hangi müşteriler için içerik üretilebileceğini görmek için kullan.",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [] as string[],
    },
  },
  {
    name: "dashboard_create_post" as const,
    description:
      "Sosyal Medya Dashboard'una yeni bir paylaşım (post) ekler. Bu araçla eklenen postlar panelde 'İçerikler' bölümünde görünür ve planlanan zamanda otomatik paylaşılabilir.",
    input_schema: {
      type: "object" as const,
      properties: {
        clientId: {
          type: "string" as const,
          description: "Müşterinin UUID'si (dashboard_list_clients ile alınır).",
        },
        title: {
          type: "string" as const,
          description: "Görselin başlığı veya kısa tanımı.",
        },
        content: {
          type: "string" as const,
          description: "Paylaşım metni (caption).",
        },
        imageUrls: {
          type: "array" as const,
          items: { type: "string" as const },
          description: "Paylaşılacak görsel veya video URL'leri.",
        },
        platforms: {
          type: "array" as const,
          items: {
            type: "string" as const,
            enum: ["instagram", "twitter", "linkedin", "tiktok"],
          },
          description: "Paylaşım yapılacak platformlar.",
        },
        status: {
          type: "string" as const,
          enum: ["scheduled", "posted", "failed", "draft"],
          description: "Postun durumu. Hemen panelde görünsün ama paylaşılmasın istiyorsan 'draft', planlansın istiyorsan 'scheduled'. Varsayılan: draft",
        },
        scheduledTime: {
          type: "string" as const,
          description: "Planlanan paylaşım zamanı (ISO formatında). Örn: 2026-03-05T14:30:00Z",
        },
      },
      required: ["clientId", "title", "content", "platforms"],
    },
  },
  {
    name: "dashboard_get_stats" as const,
    description: "Sosyal medya platformlarındaki güncel takipçi, etkileşim ve erişim istatistiklerini getirir.",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [] as string[],
    },
  },
];

/**
 * Tool çağrısını çalıştırır.
 */
export async function executeTool(
  name: string,
  input: unknown,
  memory: MemoryManager,
  config: EnvConfig
): Promise<string> {
  // Allowlist kontrolü
  if (!isToolAllowed(name)) {
    console.warn(sanitizeForLog("BLOCKED_TOOL", { name }));
    return `⛔ Bu araç kullanılamaz: ${name}`;
  }

  const params = input as Record<string, unknown>;

  switch (name) {
    case "get_current_time":
      return new Date().toLocaleString("tr-TR", {
        timeZone: "Europe/Istanbul",
        dateStyle: "full",
        timeStyle: "long",
      });

    case "remember_fact": {
      const content = params.content as string;
      if (!content) return "Hata: content parametresi gerekli.";
      const id = memory.remember(content, "agent");
      return `Hafızaya kaydedildi (ID: ${id}): "${content}"`;
    }

    case "recall_memories": {
      const query = params.query as string;
      if (!query) return "Hata: query parametresi gerekli.";
      const topK = (params.top_k as number) || 3;
      const results = memory.recall(query, topK);
      if (results.length === 0) {
        return "Hafızada bu konuyla ilgili kayıt bulunamadı.";
      }
      return results
        .map((r, i) => `${i + 1}. [${r.created_at}] ${r.content}`)
        .join("\n");
    }

    case "get_calendar_events": {
      const date = params.date as string;
      if (!date) return "Hata: date parametresi gerekli (YYYY-MM-DD).";

      if (!config.GOOGLE_SERVICE_ACCOUNT_KEY_PATH) {
        return "⚠️ Google Calendar yapılandırılmamış. GOOGLE_SERVICE_ACCOUNT_KEY_PATH ayarla.";
      }

      try {
        const events = await getEventsForDate(date, {
          serviceAccountKeyPath: config.GOOGLE_SERVICE_ACCOUNT_KEY_PATH,
          calendarId: config.GOOGLE_CALENDAR_ID,
        });
        return formatEventsAsText(events);
      } catch (error) {
        console.error(sanitizeForLog("CALENDAR_ERROR", { date, error: String(error) }));
        return "❌ Takvim etkinlikleri alınırken bir hata oluştu.";
      }
    }

    case "generate_image": {
      const prompt = params.prompt as string;
      if (!prompt) return "Hata: prompt parametresi gerekli.";

      if (!config.REPLICATE_API_TOKEN) {
        return "⚠️ Görsel üretme yapılandırılmamış. REPLICATE_API_TOKEN ayarla.";
      }

      try {
        const imageUrl = await generateFluxImage(prompt, config.REPLICATE_API_TOKEN);
        // KRİTİK: Üretilen her şeyi kalıcı hafızaya çak!
        memory.remember(`[ÜRETİLDİ] Görsel İstemi: ${prompt} | URL: ${imageUrl}`, "agent-action");
        return `✅ Görsel başarıyla üretildi!\n🔗 URL: ${imageUrl}\n\nNot: Bu görseli Hafızama kaydettim, istediğin zaman "paylaş" diyebilirsin.`;
      } catch (error) {
        console.error(sanitizeForLog("IMAGE_GENERATION_ERROR", { prompt, error: String(error) }));
        return "❌ Görsel üretilirken bir hata oluştu. Replicate bakiyenizi veya API anahtarınızı kontrol edin.";
      }
    }

    case "post_to_social": {
      const { title, mediaUrl, platforms, usernames } = params as any;

      if (!config.LIME_SOCIAL_API_KEY) {
        return "⚠️ Sosyal medya paylaşımı yapılandırılmamış. LIME_SOCIAL_API_KEY ayarla.";
      }

      const accounts = platforms.map((p: string, i: number) => ({
        platform: p,
        username: usernames[i]
      }));

      try {
        const result = await postToSocialMedia({ title, mediaUrl, accounts }, config.LIME_SOCIAL_API_KEY);
        memory.remember(`Sosyal medyada paylaşıldı: "${title}" (${platforms.join(", ")})`, "agent-action");
        return `✅ Paylaşım başarıyla gönderildi!\nSonuç: ${JSON.stringify(result)}`;
      } catch (error) {
        console.error(sanitizeForLog("SOCIAL_POST_ERROR", { title, error: String(error) }));
        return `❌ Paylaşım sırasında hata oluştu: ${String(error)}`;
      }
    }

    // ═══════════════════════════════════════════
    // FAZ 1: Yeni Tool'lar
    // ═══════════════════════════════════════════

    case "generate_video": {
      let prompt = params.prompt as string;
      if (!prompt) return "Hata: prompt parametresi gerekli.";

      if (!config.FAL_API_KEY) {
        return "⚠️ Video üretme yapılandırılmamış. FAL_API_KEY ayarla.";
      }

      try {
        // Auto-optimize: Türkçe veya kısa prompt'u sinematik İngilizce'ye çevir
        const autoOptimize = params.autoOptimizePrompt !== false;
        if (autoOptimize && config.MODEL_API_KEY) {
          console.log("🎬 Video prompt optimize ediliyor...");
          const optimizedPrompt = await generateVideoPrompt(prompt, config.MODEL_API_KEY, config.MODEL_NAME);
          console.log(`📝 Orijinal: "${prompt.substring(0, 50)}..." → Optimize: "${optimizedPrompt.substring(0, 50)}..."`);
          prompt = optimizedPrompt;
        }

        console.log("🎬 Video üretimi başlıyor...");
        const result = await generateVideo(
          {
            prompt,
            imageUrl: params.imageUrl as string | undefined,
            aspectRatio: (params.aspectRatio as string) || "16:9",
            duration: (params.duration as number) || 5,
          },
          config.FAL_API_KEY
        );

        if (!result.videoUrl) {
          return `❌ Video üretilemedi: ${result.error || "Bilinmeyen hata"}`;
        }

        memory.remember(`[ÜRETİLDİ] Video İstemi: ${params.prompt} | URL: ${result.videoUrl}`, "agent-action");
        return `✅ Video başarıyla üretildi! 🎬\n🔗 URL: ${result.videoUrl}\n\nBu videoyu Hafızama kaydettim. Paylaşmamı ister misin?`;
      } catch (error) {
        console.error(sanitizeForLog("VIDEO_GENERATION_ERROR", { prompt, error: String(error) }));
        return `❌ Video üretilirken hata oluştu: ${String(error)}`;
      }
    }

    case "generate_caption": {
      const title = params.title as string;
      if (!title) return "Hata: title parametresi gerekli.";

      try {
        console.log("✍️ Caption üretiliyor...");
        const caption = await generateCaption(
          {
            title,
            platform: (params.platform as string) || "instagram",
            clientContext: params.clientContext as string | undefined,
            tone: (params.tone as "professional" | "casual" | "funny" | "inspiring") || "professional",
          },
          config.MODEL_API_KEY,
          config.MODEL_NAME
        );

        memory.remember(`Caption üretildi (${(params.platform as string) || "instagram"}): "${title}"`, "agent-action");
        return `✅ Caption üretildi! ✍️\n\n${caption}`;
      } catch (error) {
        console.error(sanitizeForLog("CAPTION_GENERATION_ERROR", { title, error: String(error) }));
        return `❌ Caption üretilirken hata oluştu: ${String(error)}`;
      }
    }

    case "generate_influencer": {
      const prompt = params.prompt as string;
      if (!prompt) return "Hata: prompt parametresi gerekli.";

      if (!config.FAL_API_KEY) {
        return "⚠️ Influencer üretme yapılandırılmamış. FAL_API_KEY ayarla.";
      }

      try {
        console.log("🤖 AI Influencer üretiliyor...");
        const result = await generateInfluencer(
          {
            prompt,
            aspectRatio: (params.aspectRatio as "1:1" | "9:16" | "16:9" | "4:3") || "1:1",
            model: (params.model as "flux-pro" | "flux-schnell") || "flux-pro",
          },
          config.FAL_API_KEY
        );

        if (!result.success || !result.imageUrl) {
          return `❌ Influencer görseli üretilemedi: ${result.error || "Bilinmeyen hata"}`;
        }

        memory.remember(`AI Influencer görseli üretildi: "${prompt.substring(0, 50)}..." - URL: ${result.imageUrl}`, "agent-action");
        return `✅ AI Influencer görseli üretildi! 🤖\n🔗 URL: ${result.imageUrl}\n🎲 Seed: ${result.seed}\n📐 Format: ${(params.aspectRatio as string) || "1:1"}\n\nBu görseli sosyal medyada paylaşmak ister misin?`;
      } catch (error) {
        console.error(sanitizeForLog("INFLUENCER_GENERATION_ERROR", { prompt, error: String(error) }));
        return `❌ Influencer görseli üretilirken hata oluştu: ${String(error)}`;
      }
    }

    case "manage_subordinate_bot": {
      const { target, task, priority = "normal" } = params as any;

      if (!config.SUPABASE_URL) {
        return "⚠️ Supabase yapılandırılmamış. Bot yönetimi için SUPABASE_URL gereklidir.";
      }

      try {
        const supabase = getSupabase(config);
        const { data, error } = await supabase
          .from("bot_directives")
          .insert([
            {
              sender: "hafiz",
              target,
              command: task,
              payload: { priority },
              status: "pending",
            },
          ])
          .select();

        if (error) {
          if (error.code === "42P01") { // Relation does not exist
            return "❌ 'bot_directives' tablosu bulunamadı. Lütfen önce veritabanında gerekli tabloyu oluşturun.";
          }
          throw error;
        }

        memory.remember(`Yardımcı bota görev verildi: ${target} -> ${task}`, "agent-action");
        return `✅ Görev başarıyla iletildi!\n🤖 Hedef: ${target}\n📝 Görev: ${task}\n\nHafızBot yönetici olarak görevi kayıt altına aldı. ${target === "all" ? "Botlar" : target + " Bot"} bu görevi en kısa sürede işleyecektir.`;
      } catch (error) {
        console.error("Bot management error:", error);
        return `❌ Görev iletilirken hata oluştu: ${String(error)}`;
      }
    }

    case "dashboard_list_clients": {
      try {
        const clients = await DashboardService.listClients(config);
        if (clients.length === 0) return "Dashboard'da kayıtlı müşteri bulunamadı.";
        return clients
          .map((c: any) => `- ID: ${c.id} | Firma: ${c.company_name} | Sektör: ${c.industry || "Belirtilmemiş"}`)
          .join("\n");
      } catch (error) {
        return `❌ Müşteri listesi alınırken hata: ${String(error)}`;
      }
    }

    case "dashboard_create_post": {
      const { clientId, title, content, imageUrls, platforms, status = "draft", scheduledTime } = params as any;
      try {
        await DashboardService.createPost(
          {
            customer_id: clientId,
            title,
            content,
            image_urls: imageUrls,
            platforms,
            status,
            scheduled_time: scheduledTime,
          },
          config
        );
        return `✅ Post başarıyla Dashboard'a eklendi!\n📌 Başlık: ${title}\n🏢 Müşteri ID: ${clientId}\n🛠️ Durum: ${status}`;
      } catch (error) {
        return `❌ Dashboard'a post eklenirken hata: ${String(error)}`;
      }
    }

    case "dashboard_get_stats": {
      try {
        const stats = await DashboardService.getStats(config);
        if (stats.length === 0) return "Henüz istatistik verisi bulunmuyor.";
        return stats
          .map((s: any) => `📊 [${s.platform.toUpperCase()}] Takipçi: ${s.followers} | Etkileşim: %${s.avg_engagement_rate} | Erişim: ${s.reach}`)
          .join("\n");
      } catch (error) {
        return `❌ İstatistikler alınırken hata: ${String(error)}`;
      }
    }

    default:
      return `Bilinmeyen tool: ${name}`;
  }
}
