import { z } from "zod";

const dataModeSchema = z.enum(["mock"]);

const parsed = dataModeSchema.safeParse(
  process.env.NEXT_PUBLIC_DATA_MODE ?? "mock",
);

export const publicEnv = {
  dataMode: parsed.success ? parsed.data : null,
  configurationError: parsed.success
    ? null
    : "Unsupported data mode. This frontend checkpoint supports mock mode only.",
} as const;
