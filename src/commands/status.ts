import { Command } from "commander";
import chalk from "chalk";
import {
  loadConfig,
  getConfigPath,
  resolveApiKey,
  resolveManagementKey,
  resolveRegion,
  getBaseUrl,
} from "../config.js";
import { getGlobalOptions, isCI } from "../globals.js";
import { printData } from "../output.js";
import { withErrorHandler } from "../utils.js";
import ora from "ora";

export function registerStatusCommand(parent: Command): void {
  parent
    .command("status")
    .description("Show current configuration and connectivity status")
    .addHelpText(
      "after",
      `
Examples:
  authsignal status
  authsignal status --output json
  authsignal status --verbose`,
    )
    .action(
      withErrorHandler(async () => {
        const globals = getGlobalOptions(parent);
        const config = loadConfig();
        const region = resolveRegion(globals.region);
        const apiKey = resolveApiKey(globals.apiKey);
        const managementKey = resolveManagementKey(globals.managementKey);
        const baseUrl = getBaseUrl(region);
        const version = parent.version() || "unknown";

        // For JSON output, collect everything and print at once
        if (globals.output === "json") {
          const result: Record<string, unknown> = {
            version,
            region,
            baseUrl,
            configPath: getConfigPath(),
            apiKeyConfigured: !!apiKey,
            managementKeyConfigured: !!managementKey,
            ci: isCI(),
          };

          // Connectivity check
          if (apiKey) {
            try {
              const res = await fetch(`${baseUrl}/v1/authenticators`, {
                headers: {
                  Authorization: "Basic " + Buffer.from(`${apiKey}:`).toString("base64"),
                  Accept: "application/json",
                },
              });
              result.apiKeyValid = res.ok;
              result.apiLatencyMs = 0; // approximate
            } catch {
              result.apiKeyValid = false;
            }
          }

          printData(result, globals);
          return;
        }

        // Interactive table output with live checks
        console.error(chalk.bold("Authsignal CLI Status\n"));

        console.error(`  ${chalk.bold("Version:")}          ${version}`);
        console.error(`  ${chalk.bold("Config:")}           ${getConfigPath()}`);
        console.error(`  ${chalk.bold("Region:")}           ${region} (${baseUrl})`);

        // API key status
        if (apiKey) {
          const masked = apiKey.slice(0, 6) + "..." + apiKey.slice(-4);
          console.error(`  ${chalk.bold("API Key:")}          ${chalk.green(masked)}`);
        } else {
          console.error(`  ${chalk.bold("API Key:")}          ${chalk.red("not configured")}`);
        }

        // Management key status
        if (managementKey) {
          const masked = managementKey.slice(0, 6) + "..." + managementKey.slice(-4);
          console.error(`  ${chalk.bold("Management Key:")}   ${chalk.green(masked)}`);
        } else {
          console.error(`  ${chalk.bold("Management Key:")}   ${chalk.red("not configured")}`);
        }

        // Connectivity check
        if (apiKey) {
          const s = ora({ text: "Checking API connectivity...", stream: process.stderr }).start();
          try {
            const start = Date.now();
            const res = await fetch(`${baseUrl}/v1/authenticators`, {
              headers: {
                Authorization: "Basic " + Buffer.from(`${apiKey}:`).toString("base64"),
                Accept: "application/json",
              },
            });
            const elapsed = Date.now() - start;

            if (res.ok) {
              s.succeed(`API connected (${elapsed}ms)`);
            } else if (res.status === 401) {
              s.fail("API key is invalid or expired");
              console.error(chalk.dim("  Run: authsignal config set api-key <new-key>"));
            } else {
              s.fail(`API returned ${res.status}`);
            }
          } catch (err) {
            s.fail("Cannot reach API");
            console.error(chalk.dim(`  Check your network and region setting (${region})`));
          }
        }

        console.error("");

        if (!apiKey && !managementKey) {
          console.error(chalk.yellow("Get started:"));
          console.error(chalk.dim("  authsignal login              Interactive setup"));
          console.error(chalk.dim("  Docs: https://docs.authsignal.com/\n"));
        }
      }),
    );
}
