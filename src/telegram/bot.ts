import { Bot, Context } from "grammy";
import type { EnvConfig } from "../config/env.js";

export function createBot(config: EnvConfig): Bot {
  const bot = new Bot(config.TELEGRAM_BOT_TOKEN);

  // Allowlist middleware — sadece izinli kullanıcıya yanıt ver
  bot.use(async (ctx: Context, next) => {
    const userId = ctx.from?.id;
    if (!userId || userId !== config.TELEGRAM_ALLOWLIST_USER_ID) {
      // Sessizce yok say — log'a da yazma (güvenlik)
      return;
    }
    await next();
  });

  return bot;
}
