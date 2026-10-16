import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  isStepCount,
  streamText,
  toUIMessageStream,
  type UIMessage,
} from "ai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { buildPilotTools } from "@/ai/tools";
import { pilotSystemPrompt } from "@/ai/prompt";
import { getAuthContext } from "@/lib/auth";
import { recordLlmUsage } from "@/lib/queries";

export const maxDuration = 60;

export async function POST(req: Request) {
  const auth = await getAuthContext();
  if (!auth) {
    return new Response(null, { status: 401 });
  }

  const apiKey = process.env.LLM_API_KEY;
  const baseUrl = process.env.LLM_BASE_URL ?? "https://api.openai.com/v1";
  const modelId = process.env.LLM_MODEL ?? "gpt-4o-mini";
  if (!apiKey) {
    return Response.json(
      {
        error:
          "The AI pilot is not configured. Set LLM_API_KEY (and optionally LLM_BASE_URL, LLM_MODEL) in the environment.",
      },
      { status: 503 },
    );
  }

  const { messages }: { messages: UIMessage[] } = await req.json();

  const provider = createOpenAICompatible({
    name: "uanglite",
    baseURL: baseUrl,
    apiKey,
  });
  const tools = buildPilotTools(auth.org.id, auth.user.id);
  const startedAt = Date.now();

  const result = streamText({
    model: provider.chatModel(modelId),
    system: pilotSystemPrompt(auth.org),
    messages: await convertToModelMessages(messages),
    tools,
    stopWhen: isStepCount(8),
    toolApproval: {
      create_purchase_order_draft: "user-approval",
      draft_payment_reminder: "user-approval",
    },
    onError: ({ error }) => {
      console.error("[pilot] stream error:", error);
    },
    onFinish: async (event) => {
      try {
        await recordLlmUsage({
          orgId: auth.org.id,
          model: modelId,
          promptTokens: event.usage.inputTokens ?? 0,
          completionTokens: event.usage.outputTokens ?? 0,
          steps: event.steps.length,
          toolNames: event.toolCalls.map((call) => call.toolName),
          latencyMs: Date.now() - startedAt,
        });
      } catch (err) {
        console.error("[pilot] failed to record usage:", err);
      }
    },
  });

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({
      stream: result.stream,
      onError: (error) => {
        if (typeof error === "string") return error;
        if (error instanceof Error) return error.message;
        return "An error occurred while streaming the pilot response.";
      },
    }),
  });
}
