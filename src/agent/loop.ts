import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { toolDefinitions, executeTool } from "./tools.js";
import type { EnvConfig } from "../config/env.js";
import type { MemoryManager } from "../memory/index.js";

const MAX_ITERATIONS = 10;

const BASE_SYSTEM_PROMPT = `Sen Hafız — kişisel AI asistansın. Türkçe ve İngilizce konuşabilirsin.
Kullanıcıya yardımcı, kısa ve öz yanıtlar ver. Gerekirse araçları (tools) kullan.
Emoji kullanabilirsin ama abartma.
Kullanıcı ismi: Hakan.
Kullanıcı hakkında önemli bilgileri remember_fact ile kaydet.
Daha önce kaydedilmiş bilgilere recall_memories ile ulaşabilirsin.`;

/**
 * System prompt'a core memory ve ilgili anıları ekler.
 */
function buildSystemPrompt(
  userMessage: string,
  memory: MemoryManager
): string {
  let prompt = BASE_SYSTEM_PROMPT;

  const coreMemory = memory.getCoreMemory();
  if (coreMemory.trim()) {
    prompt += `\n\n--- TEMEL HAFIZA ---\n${coreMemory}`;
  }

  const relatedMemories = memory.recall(userMessage, 3);
  if (relatedMemories.length > 0) {
    const memoriesText = relatedMemories
      .map((m) => `- [${m.created_at}] ${m.content}`)
      .join("\n");
    prompt += `\n\n--- İLGİLİ ANILAR ---\n${memoriesText}`;
  }

  return prompt;
}

// ──────────────────────────────────────
//  Anthropic doğrudan API
// ──────────────────────────────────────
async function runWithAnthropic(
  userMessage: string,
  config: EnvConfig,
  memory: MemoryManager,
  systemPrompt: string
): Promise<string> {
  const client = new Anthropic({ apiKey: config.MODEL_API_KEY });

  const messages: Anthropic.MessageParam[] = [
    { role: "user", content: userMessage },
  ];

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const response = await client.messages.create({
      model: config.MODEL_NAME,
      max_tokens: 1024,
      system: systemPrompt,
      tools: toolDefinitions,
      messages,
    });

    if (response.stop_reason === "end_turn") {
      const textBlock = response.content.find((b) => b.type === "text");
      return textBlock ? textBlock.text : "(Boş yanıt)";
    }

    if (response.stop_reason === "tool_use") {
      messages.push({ role: "assistant", content: response.content });
      const toolResults: Anthropic.ToolResultBlockParam[] = [];

      for (const block of response.content) {
        if (block.type === "tool_use") {
          const result = await executeTool(block.name, block.input, memory, config);
          toolResults.push({
            type: "tool_result",
            tool_use_id: block.id,
            content: result,
          });
        }
      }

      messages.push({ role: "user", content: toolResults });
      continue;
    }

    const textBlock = response.content.find((b) => b.type === "text");
    return textBlock ? textBlock.text : "(Beklenmeyen yanıt)";
  }

  return "⚠️ Maksimum iterasyon sayısına ulaşıldı.";
}

// ──────────────────────────────────────
//  OpenRouter (OpenAI-uyumlu API)
// ──────────────────────────────────────

/** Tool tanımlarını OpenAI formatına dönüştür */
function toOpenAITools(): OpenAI.ChatCompletionTool[] {
  return toolDefinitions.map((t) => ({
    type: "function" as const,
    function: {
      name: t.name,
      description: t.description,
      parameters: t.input_schema,
    },
  }));
}

async function runWithOpenRouter(
  userMessage: string,
  config: EnvConfig,
  memory: MemoryManager,
  systemPrompt: string
): Promise<string> {
  const client = new OpenAI({
    apiKey: config.MODEL_API_KEY,
    baseURL: "https://openrouter.ai/api/v1",
  });

  const messages: OpenAI.ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userMessage },
  ];

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const response = await client.chat.completions.create({
      model: config.MODEL_NAME,
      max_tokens: 1024,
      tools: toOpenAITools(),
      messages,
    });

    const choice = response.choices[0];
    const msg = choice.message;
    console.log(`OpenRouter [${i}]: finish_reason=${choice?.finish_reason}, content="${msg?.content?.substring(0, 50)}...", has_tools=${!!msg?.tool_calls?.length}`);
    if (!choice) return "(Boş yanıt)";

    // Tool çağrısı yoksa metin yanıtı döner
    if (choice.finish_reason === "stop" || !msg.tool_calls?.length) {
      return msg.content || "(Boş yanıt)";
    }

    // Tool çağrılarını işle
    messages.push(msg);

    for (const toolCall of msg.tool_calls) {
      const args = JSON.parse(toolCall.function.arguments || "{}");
      const result = await executeTool(toolCall.function.name, args, memory, config);
      messages.push({
        role: "tool",
        tool_call_id: toolCall.id,
        content: result,
      });
    }
  }

  return "⚠️ Maksimum iterasyon sayısına ulaşıldı.";
}

// ──────────────────────────────────────
//  Ana giriş noktası
// ──────────────────────────────────────
export async function runAgentLoop(
  userMessage: string,
  config: EnvConfig,
  memory: MemoryManager
): Promise<string> {
  const systemPrompt = buildSystemPrompt(userMessage, memory);

  if (config.MODEL_PROVIDER === "openrouter") {
    return runWithOpenRouter(userMessage, config, memory, systemPrompt);
  }

  return runWithAnthropic(userMessage, config, memory, systemPrompt);
}
