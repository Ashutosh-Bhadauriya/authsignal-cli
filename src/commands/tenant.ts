import { Command } from "commander";
import { createManagementClient, spin } from "../client.js";
import { getGlobalOptions } from "../globals.js";
import { printData, printSuccess } from "../output.js";
import { withErrorHandler } from "../utils.js";

export function registerTenantCommands(parent: Command): void {
  const tenant = parent
    .command("tenant")
    .description("Manage tenant configuration (Management API)");

  tenant
    .command("get")
    .description("Get tenant configuration")
    .addHelpText(
      "after",
      `
Examples:
  authsignal tenant get
  authsignal tenant get --output json`,
    )
    .action(
      withErrorHandler(async () => {
        const globals = getGlobalOptions(tenant);
        const client = createManagementClient(globals);

        const s = spin("Fetching tenant...", globals);
        const data = await client.get("/tenant");
        s.stop();

        printData(data, globals);
      }),
    );

  tenant
    .command("update")
    .description("Update tenant configuration")
    .option("--name <name>", "Tenant name")
    .option("--disable-recovery-codes <bool>", "Disable recovery codes")
    .option("--token-duration <minutes>", "Token duration in minutes")
    .addHelpText(
      "after",
      `
Examples:
  authsignal tenant update --name "My App"
  authsignal tenant update --token-duration 30
  authsignal tenant update --disable-recovery-codes true`,
    )
    .action(
      withErrorHandler(async (_opts: unknown) => {
        const opts = _opts as Record<string, string | undefined>;
        const globals = getGlobalOptions(tenant);
        const client = createManagementClient(globals);

        const body: Record<string, unknown> = {};
        if (opts.name) body.name = opts.name;
        if (opts.disableRecoveryCodes !== undefined)
          body.disableRecoveryCodes = opts.disableRecoveryCodes === "true";
        if (opts.tokenDuration)
          body.tokenDurationInMinutes = parseInt(opts.tokenDuration, 10);

        const s = spin("Updating tenant...", globals);
        const data = await client.patch("/tenant", body);
        s.stop();

        printData(data, globals);
        printSuccess("Tenant updated.", globals);
      }),
    );
}
