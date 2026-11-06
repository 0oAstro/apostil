import type { LanguageModel } from "ai";

export type ProviderId = "amazon-bedrock" | "anthropic" | "openai" | "google" | "openai-compatible";

export type Connection = {
  provider: ProviderId;
  apiKey: string;
  model: string;
  endpoint: string;
  region: string;
};

type ProviderInfo = {
  label: string;
  keyHint: string;
  endpointHint: string;
  modelHint: string;
  load: (connection: Connection) => Promise<LanguageModel>;
};

const endpointOf = (connection: Connection) => connection.endpoint.trim() || undefined;

export const PROVIDERS: Record<ProviderId, ProviderInfo> = {
  "amazon-bedrock": {
    label: "Amazon Bedrock",
    keyHint: "Bedrock API key (bedrock-api-key-… or ABSK…)",
    endpointHint: "Default: bedrock-runtime.<region>.amazonaws.com",
    modelHint: "us.anthropic.claude-haiku-5-5",
    load: async (connection) => {
      const { createAmazonBedrock } = await import("@ai-sdk/amazon-bedrock");
      const provider = createAmazonBedrock({
        apiKey: connection.apiKey,
        region: connection.region || "us-east-1",
        baseURL: endpointOf(connection),
      });
      return provider(connection.model);
    },
  },
  anthropic: {
    label: "Anthropic",
    keyHint: "sk-ant-…",
    endpointHint: "Default: api.anthropic.com/v1",
    modelHint: "claude-haiku-5-5",
    load: async (connection) => {
      const { createAnthropic } = await import("@ai-sdk/anthropic");
      const provider = createAnthropic({
        apiKey: connection.apiKey,
        baseURL: endpointOf(connection),
        headers: { "anthropic-dangerous-direct-browser-access": "true" },
      });
      return provider(connection.model);
    },
  },
  openai: {
    label: "OpenAI",
    keyHint: "sk-…",
    endpointHint: "Default: api.openai.com/v1",
    modelHint: "gpt-5.5",
    load: async (connection) => {
      const { createOpenAI } = await import("@ai-sdk/openai");
      const provider = createOpenAI({ apiKey: connection.apiKey, baseURL: endpointOf(connection) });
      return provider(connection.model);
    },
  },
  google: {
    label: "Google Gemini",
    keyHint: "AIza…",
    endpointHint: "Default: generativelanguage.googleapis.com/v1beta",
    modelHint: "gemini-2.5-flash",
    load: async (connection) => {
      const { createGoogleGenerativeAI } = await import("@ai-sdk/google");
      const provider = createGoogleGenerativeAI({ apiKey: connection.apiKey, baseURL: endpointOf(connection) });
      return provider(connection.model);
    },
  },
  "openai-compatible": {
    label: "Any OpenAI-compatible endpoint",
    keyHint: "Whatever the endpoint expects. Leave blank for local servers.",
    endpointHint: "https://openrouter.ai/api/v1 or http://localhost:11434/v1",
    modelHint: "The endpoint's model id",
    load: async (connection) => {
      const { createOpenAICompatible } = await import("@ai-sdk/openai-compatible");
      const provider = createOpenAICompatible({
        name: "custom",
        apiKey: connection.apiKey || undefined,
        baseURL: connection.endpoint.trim(),
      });
      return provider(connection.model);
    },
  },
};

export const EMPTY_CONNECTION: Connection = {
  provider: "amazon-bedrock",
  apiKey: "",
  model: "us.anthropic.claude-haiku-5-5",
  endpoint: "",
  region: "us-east-1",
};

export function connectionIsComplete(connection: Connection): boolean {
  if (!connection.model.trim()) return false;
  if (connection.provider === "openai-compatible") return connection.endpoint.trim() !== "";
  return connection.apiKey.trim() !== "";
}

export function explainProviderError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (/failed to fetch|networkerror|load failed/i.test(message)) {
    return "The browser could not reach this endpoint. It may be offline, or it may not allow requests from web pages (CORS).";
  }
  return message;
}
