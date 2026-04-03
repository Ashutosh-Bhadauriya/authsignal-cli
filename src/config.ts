import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

export interface AuthsignalConfig {
  apiKey?: string;
  managementKey?: string;
  region?: string;
}

const CONFIG_DIR = join(homedir(), ".config", "authsignal");
const CONFIG_FILE = join(CONFIG_DIR, "config.json");

export const REGIONS: Record<string, string> = {
  us: "https://api.authsignal.com",
  au: "https://au.api.authsignal.com",
  eu: "https://eu.api.authsignal.com",
  ca: "https://ca.api.authsignal.com",
};

export function loadConfig(): AuthsignalConfig {
  if (!existsSync(CONFIG_FILE)) return {};
  try {
    return JSON.parse(readFileSync(CONFIG_FILE, "utf-8"));
  } catch {
    return {};
  }
}

export function saveConfig(config: AuthsignalConfig): void {
  mkdirSync(CONFIG_DIR, { recursive: true });
  writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2) + "\n");
}

export function getConfigPath(): string {
  return CONFIG_FILE;
}

export function resolveRegion(flagRegion?: string): string {
  return (
    flagRegion ||
    process.env.AUTHSIGNAL_REGION ||
    loadConfig().region ||
    "us"
  );
}

export function resolveApiKey(flagKey?: string): string | undefined {
  return flagKey || process.env.AUTHSIGNAL_API_KEY || loadConfig().apiKey;
}

export function resolveManagementKey(flagKey?: string): string | undefined {
  return (
    flagKey ||
    process.env.AUTHSIGNAL_MANAGEMENT_KEY ||
    loadConfig().managementKey
  );
}

export function getBaseUrl(region: string): string {
  const url = REGIONS[region];
  if (!url) {
    const valid = Object.keys(REGIONS).join(", ");
    throw new Error(
      `Unknown region "${region}". Valid regions: ${valid}`
    );
  }
  return url;
}
