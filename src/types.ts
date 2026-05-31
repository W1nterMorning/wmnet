import { z } from "zod";

// Zod v4 removed .ip(). Use regex + refine for IPv4.
const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
const ipv4 = z.string().regex(ipv4Regex, "Must be a valid IPv4 address").refine(
  (val) => {
    const parts = val.split(".").map(Number);
    return parts.every((p) => p >= 0 && p <= 255);
  },
  { message: "IP octets must be 0-255" },
);

// ── Profile ──
export const ProfileSchema = z.object({
  id: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/, "lowercase-dash-only"),
  name: z.string().min(1).max(64),
  gateway: ipv4,
  interface: z.string().optional(),
  useDhcp: z.boolean().default(true),
  staticIp: ipv4.optional(),
  subnetMask: z.string().optional(),
  dns: z.array(z.string()).default([]),
  shortcut: z.string().max(3).optional(),
  description: z.string().max(200).default(""),
  testTarget: z.string().default("8.8.8.8"),
  color: z.string().default("cyan"),
  order: z.number().int().default(0),
}).refine(
  (p) => p.useDhcp || (p.staticIp && p.subnetMask),
  { message: "Static IP and Subnet Mask required when DHCP is disabled" },
);

export type Profile = z.infer<typeof ProfileSchema>;

// ── App settings ──
export const THEME_NAMES = [
  // ── 原始色调 ──
  "cyan", "sunset", "forest", "purple", "rose", "monochrome",
  // ── 渐变 ──
  "aurora", "ocean", "sakura", "neon",
  "matrix", "lava", "midnight", "cotton-candy", "sunflare", "mint",
  "tricolor", "galaxy", "candy",
  // ── 多色硬切 ──
  "gundam", "eva-01", "voltron", "cyber", "joker",
  "frost", "inferno", "thor", "venom", "rainbow", "prism", "voltron-prism",
] as const;

export const SettingsSchema = z.object({
  confirmBeforeSwitch: z.boolean().default(true),
  autoTestAfterSwitch: z.boolean().default(true),
  testTimeoutSeconds: z.number().int().min(1).max(10).default(3),
  theme: z.enum(THEME_NAMES).default("cyan"),
});

export type Settings = z.infer<typeof SettingsSchema>;

// ── Undo snapshot ──
export const UndoSnapshotSchema = z.object({
  gateway: z.string(),
  serviceName: z.string(),
  dns: z.array(z.string()).default([]),
  dhcp: z.boolean().default(true),
  staticIp: z.string().optional(),
  subnetMask: z.string().optional(),
  timestamp: z.string(),
});

export type UndoSnapshot = z.infer<typeof UndoSnapshotSchema>;

// ── Config file ──
export const ConfigFileSchema = z.object({
  version: z.number().int().default(1),
  profiles: z.array(ProfileSchema).default([]),
  settings: SettingsSchema.default({ confirmBeforeSwitch: true, autoTestAfterSwitch: true, testTimeoutSeconds: 3, theme: "cyan" }),
  undoState: UndoSnapshotSchema.nullable().default(null),
});

export type ConfigFile = z.infer<typeof ConfigFileSchema>;

// ── Network status (live) ──
export interface NetworkStatus {
  localIp: string | null;
  gateway: string | null;
  interfaceName: string | null;
  serviceName: string | null;
  ssid: string | null;
  dns: string[];
  dhcp: boolean;
}

// ── Form field for editing ──
export interface FieldDef {
  key: string;
  label: string;
  value: string;
  placeholder: string;
}

// ── App state machine ──
export type AppStep =
  | { kind: "loading" }
  | { kind: "selecting"; highlightIndex: number }
  | { kind: "confirming"; highlightIndex: number }
  | { kind: "switching"; profile: Profile; stages: StageState[] }
  | { kind: "done"; profile: Profile; success: boolean; error?: string }
  | { kind: "theme-picker"; themeIndex: number }
  | { kind: "exit-confirm" }
  | { kind: "editing"; fields: FieldDef[]; fieldIndex: number; profileId: string }
  | { kind: "adding"; fields: FieldDef[]; fieldIndex: number }
  | { kind: "delete-confirm"; profileIndex: number };

export interface StageState {
  label: string;
  status: "pending" | "running" | "done" | "failed";
  detail?: string;
}

export interface PingResult {
  transmitted: number;
  received: number;
  lossPercent: number;
  min: number;
  avg: number;
  max: number;
  success: boolean;
}
