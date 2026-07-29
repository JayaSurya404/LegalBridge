import { z } from "zod";

const environmentSchema = z.discriminatedUnion("dataMode", [
  z.object({
    dataMode: z.literal("mock"),
    apiBaseUrl: z.string().optional(),
  }),
  z.object({
    dataMode: z.literal("http"),
    apiBaseUrl: z.url("NEXT_PUBLIC_API_BASE_URL must be a valid URL."),
  }),
]);

const parsed = environmentSchema.safeParse({
  dataMode: process.env.NEXT_PUBLIC_DATA_MODE ?? "mock",
  apiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL || undefined,
});

export const publicEnv = {
  dataMode: parsed.success ? parsed.data.dataMode : null,
  apiBaseUrl: parsed.success ? parsed.data.apiBaseUrl ?? null : null,
  configurationError: parsed.success
    ? null
    : parsed.error.issues[0]?.message ??
      "Use mock mode, or configure HTTP mode with a valid API base URL.",
} as const;
