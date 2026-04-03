import { Command } from "commander";
import {
  loadConfig,
  saveConfig,
  getConfigPath,
  REGIONS,
  AuthsignalConfig,
} from "../config.js";
import { getGlobalOptions } from "../globals.js";
import { printData, printSuccess } from "../output.js";
import { withErrorHandler } from "../utils.js";

const VALID_KEYS: Record<string, keyof AuthsignalConfig> = {
  "api-key": "apiKey",
  "management-key": "managementKey",
  region: "region",
};

export function registerConfigCommands(parent: Command): void {
  const config = parent.command("config").description("Manage CLI configuration");

  config
    .command("set")
    .description("Set a configuration value")
    .argument("<key>", `Config key (${Object.keys(VALID_KEYS).join(", ")})`)
    .argument("<value>", "Config value")
    .addHelpText(
      "after",
      `
Examples:
  authsignal config set api-key sk_live_abc123
  authsignal config set management-key mk_live_abc123
  authsignal config set region eu`,
    )
    .action(
      withErrorHandler(async (key: unknown, value: unknown) => {
        const globals = getGlobalOptions(config);
        const k = String(key);
        const v = String(value);

        const configKey = VALID_KEYS[k];
        if (!configKey) {
          const valid = Object.keys(VALID_KEYS).join(", ");
          throw new Error(
            `Unknown config key "${k}".\n  Valid keys: ${valid}\n  Example: authsignal config set api-key <value>`,
          );
        }

        if (k === "region" && !REGIONS[v]) {
          const valid = Object.keys(REGIONS).join(", ");
          throw new Error(`Invalid region "${v}". Valid regions: ${valid}`);
        }

        const current = loadConfig();
        current[configKey] = v;
        saveConfig(current);
        printSuccess(`Set ${k} in ${getConfigPath()}`, globals);
      }),
    );

  config
    .command("get")
    .description("Show current configuration")
    .addHelpText(
      "after",
      `
Examples:
  authsignal config get
  authsignal config get --output json`,
    )
    .action(
      withErrorHandler(async () => {
        const globals = getGlobalOptions(config);
        const current = loadConfig();
        const display = {
          region: current.region || "us (default)",
          apiKey: current.apiKey ? maskKey(current.apiKey) : "(not set)",
          managementKey: current.managementKey
            ? maskKey(current.managementKey)
            : "(not set)",
          configPath: getConfigPath(),
        };
        printData(display, globals);
      }),
    );

  config
    .command("regions")
    .description("List available regions and base URLs")
    .addHelpText(
      "after",
      `
Examples:
  authsignal config regions
  authsignal config regions --output json`,
    )
    .action(
      withErrorHandler(async () => {
        const globals = getGlobalOptions(config);
        const rows = Object.entries(REGIONS).map(([name, url]) => ({
          region: name,
          url,
        }));
        printData(rows, globals, [
          { key: "region", header: "Region" },
          { key: "url", header: "Base URL" },
        ]);
      }),
    );
}

function maskKey(key: string): string {
  if (key.length <= 8) return "****";
  return key.slice(0, 6) + "..." + key.slice(-4);
}
