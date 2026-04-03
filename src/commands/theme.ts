import { Command } from "commander";
import { readFileSync } from "node:fs";
import { createManagementClient, spin } from "../client.js";
import { getGlobalOptions } from "../globals.js";
import { printData, printSuccess } from "../output.js";
import { readStdin, withErrorHandler } from "../utils.js";

export function registerThemeCommands(parent: Command): void {
  const theme = parent
    .command("theme")
    .description("Manage UI theme (Management API)");

  theme
    .command("get")
    .description("Get current theme configuration")
    .addHelpText(
      "after",
      `
Examples:
  authsignal theme get
  authsignal theme get --output json
  authsignal theme get --output json > theme.json`,
    )
    .action(
      withErrorHandler(async () => {
        const globals = getGlobalOptions(theme);
        const client = createManagementClient(globals);

        const s = spin("Fetching theme...", globals);
        const data = await client.get("/theme");
        s.stop();

        printData(data, globals);
      }),
    );

  theme
    .command("update")
    .description("Update theme configuration")
    .option("--file <path>", "Path to JSON theme file")
    .option("--stdin", "Read theme JSON from stdin")
    .addHelpText(
      "after",
      `
Examples:
  authsignal theme update --file theme.json
  cat theme.json | authsignal theme update --stdin
  authsignal theme get --output json | jq '.colors.primary = "#ff0000"' | authsignal theme update --stdin`,
    )
    .action(
      withErrorHandler(async (_opts: unknown) => {
        const opts = _opts as { file?: string; stdin?: boolean };
        const globals = getGlobalOptions(theme);
        const client = createManagementClient(globals);

        let json: string;
        if (opts.file) {
          json = readFileSync(opts.file, "utf-8");
        } else if (opts.stdin) {
          json = await readStdin();
        } else {
          throw new Error(
            "Provide theme data via --file or --stdin.\n" +
              "  Example: authsignal theme update --file theme.json\n" +
              "  Example: cat theme.json | authsignal theme update --stdin",
          );
        }

        const body = JSON.parse(json);
        const s = spin("Updating theme...", globals);
        const data = await client.patch("/theme", body);
        s.stop();

        printData(data, globals);
        printSuccess("Theme updated.", globals);
      }),
    );
}
