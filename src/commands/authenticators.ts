import { Command } from "commander";
import { createServerClient, spin } from "../client.js";
import { getGlobalOptions } from "../globals.js";
import { printData, printSuccess, printDryRun } from "../output.js";
import { confirm, withErrorHandler } from "../utils.js";

const METHODS = [
  "EMAIL_MAGIC_LINK",
  "EMAIL_OTP",
  "SMS",
  "AUTHENTICATOR_APP",
  "PASSKEY",
  "WHATSAPP",
];

export function registerAuthenticatorCommands(parent: Command): void {
  const auth = parent
    .command("authenticators")
    .description("Manage user authenticators");

  auth
    .command("list")
    .description("List authenticators for a user")
    .argument("<userId>", "User ID")
    .addHelpText(
      "after",
      `
Examples:
  authsignal authenticators list user_abc123
  authsignal authenticators list user_abc123 --output json`,
    )
    .action(
      withErrorHandler(async (userId: unknown) => {
        const globals = getGlobalOptions(auth);
        const client = createServerClient(globals);

        const s = spin("Fetching authenticators...", globals);
        const data = await client.get(
          `/users/${encodeURIComponent(String(userId))}/authenticators`,
        );
        s.stop();

        printData(data, globals, [
          { key: "userAuthenticatorId", header: "ID" },
          { key: "verificationMethod", header: "Method" },
          { key: "email", header: "Email" },
          { key: "phoneNumber", header: "Phone" },
          { key: "createdAt", header: "Created" },
          { key: "verifiedAt", header: "Verified" },
        ]);
      }),
    );

  auth
    .command("add")
    .description("Enroll a verified authenticator for a user")
    .argument("<userId>", "User ID")
    .requiredOption(
      "--method <method>",
      `Verification method (${METHODS.join(", ")})`,
    )
    .option("--email <email>", "Email (for EMAIL_MAGIC_LINK or EMAIL_OTP)")
    .option("--phone <phone>", "Phone number (for SMS or WHATSAPP)")
    .addHelpText(
      "after",
      `
Examples:
  authsignal authenticators add user_abc123 --method SMS --phone +1234567890
  authsignal authenticators add user_abc123 --method EMAIL_OTP --email user@example.com
  authsignal authenticators add user_abc123 --method AUTHENTICATOR_APP`,
    )
    .action(
      withErrorHandler(async (userId: unknown, _opts: unknown) => {
        const opts = _opts as Record<string, string | undefined>;
        const globals = getGlobalOptions(auth);
        const client = createServerClient(globals);

        const body: Record<string, unknown> = {
          verificationMethod: opts.method,
        };
        if (opts.email) body.email = opts.email;
        if (opts.phone) body.phoneNumber = opts.phone;

        const s = spin("Enrolling authenticator...", globals);
        const data = await client.post(
          `/users/${encodeURIComponent(String(userId))}/authenticators`,
          body,
        );
        s.stop();

        printData(data, globals);
        printSuccess("Authenticator enrolled.", globals);
      }),
    );

  auth
    .command("delete")
    .description("Remove an authenticator from a user")
    .argument("<userId>", "User ID")
    .argument("<authenticatorId>", "Authenticator ID")
    .addHelpText(
      "after",
      `
Examples:
  authsignal authenticators delete user_abc123 auth_xyz789
  authsignal authenticators delete user_abc123 auth_xyz789 --yes
  authsignal authenticators delete user_abc123 auth_xyz789 --dry-run`,
    )
    .action(
      withErrorHandler(async (userId: unknown, authenticatorId: unknown) => {
        const globals = getGlobalOptions(auth);

        if (globals.dryRun) {
          printDryRun("delete authenticator", {
            userId: String(userId),
            authenticatorId: String(authenticatorId),
          });
          return;
        }

        const ok = await confirm(
          `Delete authenticator ${authenticatorId} from user ${userId}?`,
          globals,
        );
        if (!ok) {
          console.error("Aborted.");
          return;
        }

        const client = createServerClient(globals);
        const s = spin("Deleting authenticator...", globals);
        await client.delete(
          `/users/${encodeURIComponent(String(userId))}/authenticators/${encodeURIComponent(String(authenticatorId))}`,
        );
        s.stop();

        printSuccess(`Deleted authenticator ${authenticatorId}.`, globals);
      }),
    );
}
