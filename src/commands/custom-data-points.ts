import { Command } from "commander";
import { createManagementClient, spin } from "../client.js";
import { getGlobalOptions } from "../globals.js";
import { printData, printSuccess, printDryRun } from "../output.js";
import { confirm, withErrorHandler } from "../utils.js";

const DATA_TYPES = ["text", "number", "boolean", "multiselect"];
const MODEL_TYPES = ["user", "action"];

export function registerCustomDataPointCommands(parent: Command): void {
  const cdp = parent
    .command("custom-data-points")
    .description("Manage custom data points for rules (Management API)");

  cdp
    .command("list")
    .description("List all custom data points")
    .addHelpText(
      "after",
      `
Examples:
  authsignal custom-data-points list
  authsignal custom-data-points list --output json`,
    )
    .action(
      withErrorHandler(async () => {
        const globals = getGlobalOptions(cdp);
        const client = createManagementClient(globals);

        const s = spin("Fetching custom data points...", globals);
        const data = await client.get("/custom-data-points");
        s.stop();

        printData(data, globals, [
          { key: "id", header: "ID" },
          { key: "name", header: "Name" },
          { key: "dataType", header: "Data Type" },
          { key: "modelType", header: "Model Type" },
        ]);
      }),
    );

  cdp
    .command("create")
    .description("Create a custom data point")
    .requiredOption("--name <name>", "Data point name")
    .requiredOption(
      "--data-type <type>",
      `Data type (${DATA_TYPES.join(", ")})`,
    )
    .requiredOption(
      "--model-type <type>",
      `Model type (${MODEL_TYPES.join(", ")})`,
    )
    .addHelpText(
      "after",
      `
Examples:
  authsignal custom-data-points create --name "risk_score" --data-type number --model-type action
  authsignal custom-data-points create --name "account_tier" --data-type text --model-type user
  authsignal custom-data-points create --name "is_verified" --data-type boolean --model-type user`,
    )
    .action(
      withErrorHandler(async (_opts: unknown) => {
        const opts = _opts as { name: string; dataType: string; modelType: string };
        const globals = getGlobalOptions(cdp);
        const client = createManagementClient(globals);

        const s = spin(`Creating custom data point "${opts.name}"...`, globals);
        const data = await client.post("/custom-data-points", {
          name: opts.name,
          dataType: opts.dataType,
          modelType: opts.modelType,
        });
        s.stop();

        printData(data, globals);
        printSuccess(`Custom data point "${opts.name}" created.`, globals);
      }),
    );

  cdp
    .command("get")
    .description("Get a custom data point")
    .argument("<id>", "Custom data point ID")
    .addHelpText(
      "after",
      `
Examples:
  authsignal custom-data-points get cdp_abc123
  authsignal custom-data-points get cdp_abc123 --output json`,
    )
    .action(
      withErrorHandler(async (id: unknown) => {
        const globals = getGlobalOptions(cdp);
        const client = createManagementClient(globals);

        const s = spin("Fetching custom data point...", globals);
        const data = await client.get(
          `/custom-data-points/${encodeURIComponent(String(id))}`,
        );
        s.stop();

        printData(data, globals);
      }),
    );

  cdp
    .command("delete")
    .description("Delete a custom data point")
    .argument("<id>", "Custom data point ID")
    .addHelpText(
      "after",
      `
Examples:
  authsignal custom-data-points delete cdp_abc123
  authsignal custom-data-points delete cdp_abc123 --yes
  authsignal custom-data-points delete cdp_abc123 --dry-run`,
    )
    .action(
      withErrorHandler(async (id: unknown) => {
        const globals = getGlobalOptions(cdp);

        if (globals.dryRun) {
          printDryRun("delete custom data point", { id: String(id) });
          return;
        }

        const ok = await confirm(`Delete custom data point ${id}?`, globals);
        if (!ok) {
          console.error("Aborted.");
          return;
        }

        const client = createManagementClient(globals);
        const s = spin("Deleting custom data point...", globals);
        await client.delete(
          `/custom-data-points/${encodeURIComponent(String(id))}`,
        );
        s.stop();

        printSuccess(`Deleted custom data point ${id}.`, globals);
      }),
    );
}
