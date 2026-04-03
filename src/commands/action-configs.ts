import { Command } from "commander";
import { createManagementClient, spin } from "../client.js";
import { getGlobalOptions } from "../globals.js";
import { printData, printSuccess, printDryRun } from "../output.js";
import { confirm, withErrorHandler } from "../utils.js";

const RESULTS = ["ALLOW", "BLOCK", "CHALLENGE", "REVIEW"];

export function registerActionConfigCommands(parent: Command): void {
  const ac = parent
    .command("action-configs")
    .description("Manage action configurations (Management API)");

  ac.command("list")
    .description("List all action configurations")
    .addHelpText(
      "after",
      `
Examples:
  authsignal action-configs list
  authsignal action-configs list --output json`,
    )
    .action(
      withErrorHandler(async () => {
        const globals = getGlobalOptions(ac);
        const client = createManagementClient(globals);

        const s = spin("Fetching action configs...", globals);
        const data = await client.get("/action-configurations");
        s.stop();

        printData(data, globals, [
          { key: "actionCode", header: "Action Code" },
          { key: "defaultUserActionResult", header: "Default Result" },
          { key: "verificationMethods", header: "Methods" },
        ]);
      }),
    );

  ac.command("create")
    .description("Create an action configuration")
    .argument("<actionCode>", "Action code (e.g. signIn, transfer)")
    .option(
      "--default-result <result>",
      `Default result (${RESULTS.join(", ")})`,
      "ALLOW",
    )
    .option("--methods <methods>", "Comma-separated verification methods")
    .addHelpText(
      "after",
      `
Examples:
  authsignal action-configs create signIn --default-result CHALLENGE
  authsignal action-configs create transfer --default-result BLOCK --methods SMS,EMAIL_OTP
  authsignal action-configs create withdraw --output json`,
    )
    .action(
      withErrorHandler(async (actionCode: unknown, _opts: unknown) => {
        const opts = _opts as Record<string, string | undefined>;
        const globals = getGlobalOptions(ac);
        const client = createManagementClient(globals);

        const body: Record<string, unknown> = {
          actionCode: String(actionCode),
          defaultUserActionResult: opts.defaultResult || "ALLOW",
        };
        if (opts.methods) {
          body.verificationMethods = opts.methods.split(",").map((m: string) => m.trim());
        }

        const s = spin(`Creating action config "${actionCode}"...`, globals);
        const data = await client.post("/action-configurations", body);
        s.stop();

        printData(data, globals);
        printSuccess(`Action config "${actionCode}" created.`, globals);
      }),
    );

  ac.command("get")
    .description("Get an action configuration")
    .argument("<actionCode>", "Action code")
    .addHelpText(
      "after",
      `
Examples:
  authsignal action-configs get signIn
  authsignal action-configs get signIn --output json`,
    )
    .action(
      withErrorHandler(async (actionCode: unknown) => {
        const globals = getGlobalOptions(ac);
        const client = createManagementClient(globals);

        const s = spin("Fetching action config...", globals);
        const data = await client.get(
          `/action-configurations/${encodeURIComponent(String(actionCode))}`,
        );
        s.stop();

        printData(data, globals);
      }),
    );

  ac.command("update")
    .description("Update an action configuration")
    .argument("<actionCode>", "Action code")
    .option(
      "--default-result <result>",
      `Default result (${RESULTS.join(", ")})`,
    )
    .option("--methods <methods>", "Comma-separated verification methods")
    .addHelpText(
      "after",
      `
Examples:
  authsignal action-configs update signIn --default-result CHALLENGE
  authsignal action-configs update transfer --methods SMS,PASSKEY`,
    )
    .action(
      withErrorHandler(async (actionCode: unknown, _opts: unknown) => {
        const opts = _opts as Record<string, string | undefined>;
        const globals = getGlobalOptions(ac);
        const client = createManagementClient(globals);

        const body: Record<string, unknown> = {};
        if (opts.defaultResult) body.defaultUserActionResult = opts.defaultResult;
        if (opts.methods) {
          body.verificationMethods = opts.methods.split(",").map((m: string) => m.trim());
        }

        const s = spin(`Updating action config "${actionCode}"...`, globals);
        const data = await client.patch(
          `/action-configurations/${encodeURIComponent(String(actionCode))}`,
          body,
        );
        s.stop();

        printData(data, globals);
        printSuccess(`Action config "${actionCode}" updated.`, globals);
      }),
    );

  ac.command("delete")
    .description("Delete an action configuration")
    .argument("<actionCode>", "Action code")
    .addHelpText(
      "after",
      `
Examples:
  authsignal action-configs delete signIn
  authsignal action-configs delete signIn --yes
  authsignal action-configs delete signIn --dry-run`,
    )
    .action(
      withErrorHandler(async (actionCode: unknown) => {
        const globals = getGlobalOptions(ac);

        if (globals.dryRun) {
          printDryRun("delete action config", { actionCode: String(actionCode) });
          return;
        }

        const ok = await confirm(`Delete action config "${actionCode}"?`, globals);
        if (!ok) {
          console.error("Aborted.");
          return;
        }

        const client = createManagementClient(globals);
        const s = spin(`Deleting action config "${actionCode}"...`, globals);
        await client.delete(
          `/action-configurations/${encodeURIComponent(String(actionCode))}`,
        );
        s.stop();

        printSuccess(`Deleted action config "${actionCode}".`, globals);
      }),
    );
}
