import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { homedir } from "node:os";
import { parse, stringify } from "yaml";
import type { ConfigFile, Profile, Settings } from "./types";
import { ConfigFileSchema } from "./types";
import { setTheme } from "./theme";

const CONFIG_DIR = join(homedir(), ".config", "wmnet");
const CONFIG_PATH = join(CONFIG_DIR, "profiles.yaml");
const UNDO_PATH = join(CONFIG_DIR, ".undo.yaml");

function ensureDir() {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true });
  }
}

export function loadConfig(): ConfigFile {
  ensureDir();

  if (!existsSync(CONFIG_PATH)) {
    return getDefaultConfig();
  }

  try {
    const raw = readFileSync(CONFIG_PATH, "utf8");
    const parsed = parse(raw);
    const result = ConfigFileSchema.safeParse(parsed);
    if (result.success) {
      setTheme(result.data.settings.theme);
      return result.data;
    }
    console.warn("Config file corrupted, using defaults:", result.error.message);
    return getDefaultConfig();
  } catch (e) {
    console.warn("Failed to read config, using defaults:", (e as Error).message);
    return getDefaultConfig();
  }
}

export function saveConfig(config: ConfigFile): void {
  ensureDir();
  const yaml = stringify(config, { lineWidth: 120 });
  writeFileSync(CONFIG_PATH, yaml, "utf8");
}

function getDefaultConfig(): ConfigFile {
  return {
    version: 1,
    profiles: [],
    settings: { confirmBeforeSwitch: true, autoTestAfterSwitch: true, testTimeoutSeconds: 3, theme: "cyan", language: "en" as const },
    undoState: null,
  };
}

export function hasProfiles(): boolean {
  const config = loadConfig();
  return config.profiles.length > 0;
}

export function getProfiles(): Profile[] {
  const config = loadConfig();
  return [...config.profiles].sort((a, b) => a.order - b.order);
}

export function getProfile(id: string): Profile | undefined {
  const config = loadConfig();
  return config.profiles.find((p) => p.id === id);
}

export function addProfile(profile: Profile): void {
  const config = loadConfig();
  if (config.profiles.some((p) => p.id === profile.id)) {
    throw new Error(`Profile "${profile.id}" already exists`);
  }
  config.profiles.push(profile);
  saveConfig(config);
}

export function updateProfile(id: string, updates: Partial<Profile>): void {
  const config = loadConfig();
  const index = config.profiles.findIndex((p) => p.id === id);
  if (index === -1) throw new Error(`Profile "${id}" not found`);
  config.profiles[index] = { ...config.profiles[index]!, ...updates };
  saveConfig(config);
}

export function removeProfile(id: string): void {
  const config = loadConfig();
  config.profiles = config.profiles.filter((p) => p.id !== id);
  saveConfig(config);
}

export function getSettings(): Settings {
  return loadConfig().settings;
}

export function updateSettings(updates: Partial<Settings>): void {
  const config = loadConfig();
  config.settings = { ...config.settings, ...updates };
  if (updates.theme) setTheme(updates.theme);
  saveConfig(config);
}

export function saveUndoState(snapshot: { gateway: string; serviceName: string; dns: string[]; dhcp: boolean; staticIp?: string; subnetMask?: string }): void {
  ensureDir();
  const yaml = stringify({ ...snapshot, timestamp: new Date().toISOString() }, { lineWidth: 120 });
  writeFileSync(UNDO_PATH, yaml, "utf8");
}

export function getUndoState(): { gateway: string; serviceName: string; dns: string[]; dhcp: boolean; staticIp?: string; subnetMask?: string } | null {
  if (!existsSync(UNDO_PATH)) return null;
  try {
    const raw = readFileSync(UNDO_PATH, "utf8");
    return parse(raw) as any;
  } catch {
    return null;
  }
}

export function clearUndoState(): void {
  if (existsSync(UNDO_PATH)) {
    writeFileSync(UNDO_PATH, "", "utf8");
  }
}
