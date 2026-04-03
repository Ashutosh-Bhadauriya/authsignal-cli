import { Command } from "commander";
import { createInterface } from "node:readline";
import { exec } from "node:child_process";
import { platform } from "node:os";
import { chmodSync, statSync } from "node:fs";
import chalk from "chalk";
import ora from "ora";
import {
  loadConfig,
  saveConfig,
  getConfigPath,
  getBaseUrl,
  REGIONS,
} from "../config.js";
import { getGlobalOptions } from "../globals.js";
import { printSuccess } from "../output.js";
import { withErrorHandler } from "../utils.js";

const DASHBOARD_URL = "https://portal.authsignal.com";

function openUrl(url: string): void {
  const os = platform();
  const cmd = os === "darwin" ? "open" : os === "win32" ? "start" : "xdg-open";
  exec(`${cmd} "${url}"`);
}

function ask(prompt: string, hidden = false): Promise<string> {
  const rl = createInterface({
    input: process.stdin,
    output: process.stderr,
  });

  return new Promise((resolve) => {
    if (hidden && process.stdin.isTTY) {
      // Hide input for secrets
      process.stderr.write(prompt);
      const stdin = process.stdin;
      const wasRaw = stdin.isRaw;
      stdin.setRawMode?.(true);
      let input = "";
      const onData = (ch: Buffer) => {
        const c = ch.toString();
        if (c === "\n" || c === "\r") {
          stdin.setRawMode?.(wasRaw ?? false);
          stdin.removeListener("data", onData);
          process.stderr.write("\n");
          rl.close();
          resolve(input);
        } else if (c === "\u0003") {
          // Ctrl+C
          stdin.setRawMode?.(wasRaw ?? false);
          process.exit(130);
        } else if (c === "\u007F" || c === "\b") {
          // Backspace
          if (input.length > 0) {
            input = input.slice(0, -1);
          }
        } else {
          input += c;
        }
      };
      stdin.on("data", onData);
    } else {
      rl.question(prompt, (answer) => {
        rl.close();
        resolve(answer.trim());
      });
    }
  });
}

export function registerLoginCommand(parent: Command): void {
  parent
    .command("login")
    .description("Configure authentication with Authsignal")
    .option("--api-key <key>", "Server API key (non-interactive)")
    .option("--management-key <key>", "Management API key (non-interactive)")
    .option("--region <region>", "Region (non-interactive)")
    .addHelpText(
      "after",
      `
This command helps you configure your Authsignal CLI credentials.
It opens the dashboard where you can find your API keys, then
prompts you to paste them.

Non-interactive usage (for CI/scripts):
  authsignal login --api-key sk_... --region us
  authsignal login --api-key sk_... --management-key mk_... --region au

Interactive usage:
  authsignal login

You can also set keys via environment variables:
  AUTHSIGNAL_API_KEY=sk_... authsignal users list

Examples:
  authsignal login
  authsignal login --api-key sk_live_abc123 --region us`,
    )
    .action(
      withErrorHandler(async (_opts: unknown) => {
        const opts = _opts as {
          apiKey?: string;
          managementKey?: string;
          region?: string;
        };
        const globals = getGlobalOptions(parent);
        const config = loadConfig();

        // Merge: local opts (if they get through) + global opts (where Commander routes them)
        const apiKey = opts.apiKey || globals.apiKey;
        const managementKey = opts.managementKey || globals.managementKey;
        const region = opts.region || globals.region;

        // Non-interactive mode: all values provided via flags
        if (apiKey) {
          config.apiKey = apiKey;
          if (managementKey) config.managementKey = managementKey;
          if (region) config.region = region;
          saveConfig(config);
          secureConfigFile();

          // Verify the key works
          const verifyRegion = region || config.region || "us";
          const s = ora({ text: "Verifying API key...", stream: process.stderr }).start();
          try {
            const baseUrl = getBaseUrl(verifyRegion);
            const res = await fetch(`${baseUrl}/v1/authenticators`, {
              headers: {
                Authorization: "Basic " + Buffer.from(`${apiKey}:`).toString("base64"),
                Accept: "application/json",
              },
            });
            if (res.ok) {
              s.succeed("API key verified");
            } else {
              s.warn(`API returned ${res.status} - key may be invalid`);
            }
          } catch {
            s.warn("Could not verify key (network error)");
          }

          printSuccess(`Logged in. Config saved to ${getConfigPath()}`, globals);
          return;
        }

        // Interactive mode
        if (!process.stdin.isTTY) {
          throw new Error(
            "Interactive login requires a terminal.\n" +
              "  For CI/scripts, use: authsignal login --api-key <key> --region <region>\n" +
              "  Or set: AUTHSIGNAL_API_KEY=<key>",
          );
        }

        console.error(chalk.bold("\nAuthsignal CLI Login\n"));
        console.error(
          "You'll need your API keys from the Authsignal dashboard.\n" +
            `Opening ${chalk.cyan(DASHBOARD_URL)} ...\n`,
        );

        // Try to open dashboard
        openUrl(DASHBOARD_URL);
        console.error(
          chalk.dim(
            "Navigate to Settings > API Keys to find your keys.\n" +
              "If the browser didn't open, visit the URL above manually.\n",
          ),
        );

        // Region selection
        const validRegions = Object.keys(REGIONS);
        const currentRegion = config.region || "us";
        const regionInput = await ask(
          `Region (${validRegions.join("/")}) [${currentRegion}]: `,
        );
        const chosenRegion = regionInput && validRegions.includes(regionInput) ? regionInput : currentRegion;
        config.region = chosenRegion;

        // Server API key
        const enteredKey = await ask("Server API key: ", true);
        if (enteredKey) {
          config.apiKey = enteredKey;
        }

        // Management API key (optional)
        const mgmtKey = await ask("Management API key (optional, press Enter to skip): ", true);
        if (mgmtKey) {
          config.managementKey = mgmtKey;
        }

        saveConfig(config);
        secureConfigFile();

        // Verify
        if (config.apiKey) {
          const s = ora({ text: "Verifying API key...", stream: process.stderr }).start();
          try {
            const baseUrl = getBaseUrl(chosenRegion);
            const res = await fetch(`${baseUrl}/v1/authenticators`, {
              headers: {
                Authorization:
                  "Basic " + Buffer.from(`${config.apiKey}:`).toString("base64"),
                Accept: "application/json",
              },
            });
            if (res.ok) {
              s.succeed("API key verified");
            } else if (res.status === 401) {
              s.fail("API key is invalid");
              console.error(
                chalk.dim("  Check your key at: " + DASHBOARD_URL),
              );
            } else {
              s.warn(`API returned ${res.status}`);
            }
          } catch {
            s.warn("Could not verify (network error)");
          }
        }

        console.error("");
        printSuccess(`Config saved to ${getConfigPath()}`, globals);
        console.error(
          chalk.dim(
            "\nTry it out:\n" +
              "  authsignal status\n" +
              "  authsignal users list\n",
          ),
        );
      }),
    );

  parent
    .command("logout")
    .description("Remove stored credentials")
    .addHelpText(
      "after",
      `
Examples:
  authsignal logout
  authsignal logout --yes`,
    )
    .action(
      withErrorHandler(async () => {
        const globals = getGlobalOptions(parent);
        const config = loadConfig();

        if (!config.apiKey && !config.managementKey) {
          console.error("No credentials stored.");
          return;
        }

        if (!globals.yes && process.stdin.isTTY) {
          const rl = createInterface({
            input: process.stdin,
            output: process.stderr,
          });
          const answer = await new Promise<string>((resolve) => {
            rl.question("Remove stored credentials? [y/N] ", resolve);
            rl.once("close", () => resolve(""));
          });
          rl.close();
          if (answer.toLowerCase() !== "y" && answer.toLowerCase() !== "yes") {
            console.error("Aborted.");
            return;
          }
        }

        delete config.apiKey;
        delete config.managementKey;
        saveConfig(config);
        printSuccess("Credentials removed.", globals);
      }),
    );
}

function secureConfigFile(): void {
  try {
    const configPath = getConfigPath();
    chmodSync(configPath, 0o600);
  } catch {
    // Ignore - Windows or permission issues
  }
}
