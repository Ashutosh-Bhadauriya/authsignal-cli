import { Command } from "commander";
import { createManagementClient, spin } from "../client.js";
import { getGlobalOptions } from "../globals.js";
import { printData, printSuccess } from "../output.js";
import { withErrorHandler } from "../utils.js";

export function registerAuthenticatorConfigCommands(parent: Command): void {
  const ac = parent
    .command("authenticator-configs")
    .description("Manage tenant authenticator configurations (Management API)");

  ac.command("list")
    .description("List all authenticator configurations")
    .addHelpText(
      "after",
      `
Examples:
  authsignal authenticator-configs list
  authsignal authenticator-configs list --output json`,
    )
    .action(
      withErrorHandler(async () => {
        const globals = getGlobalOptions(ac);
        const client = createManagementClient(globals);

        const s = spin("Fetching authenticator configs...", globals);
        const data = await client.get("/authenticator-configurations");
        s.stop();

        printData(data, globals, [
          { key: "authenticatorId", header: "ID" },
          { key: "verificationMethod", header: "Method" },
          { key: "isActive", header: "Active" },
        ]);
      }),
    );

  ac.command("update")
    .description("Update an authenticator configuration")
    .argument("<authenticatorId>", "Authenticator config ID")
    .option("--active <bool>", "Enable or disable this authenticator")
    .option("--config <json>", "Configuration as JSON string")
    .addHelpText(
      "after",
      `
Examples:
  authsignal authenticator-configs update sms --active true
  authsignal authenticator-configs update email_otp --active false
  authsignal authenticator-configs update sms --config '{"providers":["twilio"]}'`,
    )
    .action(
      withErrorHandler(async (authenticatorId: unknown, _opts: unknown) => {
        const opts = _opts as Record<string, string | undefined>;
        const globals = getGlobalOptions(ac);
        const client = createManagementClient(globals);

        const body: Record<string, unknown> = {};
        if (opts.active !== undefined) body.isActive = opts.active !== "false";
        if (opts.config) Object.assign(body, JSON.parse(opts.config));

        const s = spin("Updating authenticator config...", globals);
        const data = await client.patch(
          `/authenticator-configurations/${encodeURIComponent(String(authenticatorId))}`,
          body,
        );
        s.stop();

        printData(data, globals);
        printSuccess(`Authenticator config "${authenticatorId}" updated.`, globals);
      }),
    );
}
