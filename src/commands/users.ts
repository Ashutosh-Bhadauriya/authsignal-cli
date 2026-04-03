import { Command } from "commander";
import { createServerClient, spin } from "../client.js";
import { getGlobalOptions } from "../globals.js";
import { printData, printSuccess, printDryRun } from "../output.js";
import { confirm, withErrorHandler } from "../utils.js";

export function registerUserCommands(parent: Command): void {
  const users = parent.command("users").description("Manage users");

  users
    .command("list")
    .description("Query users")
    .option("--email <email>", "Filter by email")
    .option("--phone <phone>", "Filter by phone number")
    .option("--username <username>", "Filter by username")
    .option("--cursor <cursor>", "Pagination cursor (lastEvaluatedUserId)")
    .addHelpText(
      "after",
      `
Examples:
  authsignal users list
  authsignal users list --email user@example.com
  authsignal users list --phone +1234567890
  authsignal users list --output json | jq '.[].userId'`,
    )
    .action(
      withErrorHandler(async (_opts: unknown) => {
        const opts = _opts as Record<string, string | undefined>;
        const globals = getGlobalOptions(users);
        const client = createServerClient(globals);

        const params = new URLSearchParams();
        if (opts.email) params.set("email", opts.email);
        if (opts.phone) params.set("phoneNumber", opts.phone);
        if (opts.username) params.set("username", opts.username);
        if (opts.cursor) params.set("lastEvaluatedUserId", opts.cursor);

        const query = params.toString();
        if (!query) {
          throw new Error(
            "At least one filter is required: --email, --phone, or --username\n" +
              "  Example: authsignal users list --email user@example.com",
          );
        }
        const path = `/users?${query}`;

        const s = spin("Fetching users...", globals);
        const data = await client.get(path);
        s.stop();

        printData(data, globals, [
          { key: "userId", header: "User ID" },
          { key: "email", header: "Email" },
          { key: "phoneNumber", header: "Phone" },
          { key: "isEnrolled", header: "Enrolled" },
          { key: "enrolledVerificationMethods", header: "Methods" },
        ]);
      }),
    );

  users
    .command("get")
    .description("Get a user by ID")
    .argument("<userId>", "User ID")
    .addHelpText(
      "after",
      `
Examples:
  authsignal users get user_abc123
  authsignal users get user_abc123 --output json`,
    )
    .action(
      withErrorHandler(async (userId: unknown) => {
        const globals = getGlobalOptions(users);
        const client = createServerClient(globals);

        const s = spin("Fetching user...", globals);
        const data = await client.get(`/users/${encodeURIComponent(String(userId))}`);
        s.stop();

        printData(data, globals);
      }),
    );

  users
    .command("update")
    .description("Update a user")
    .argument("<userId>", "User ID")
    .option("--email <email>", "Email address")
    .option("--phone <phone>", "Phone number")
    .option("--display-name <name>", "Display name")
    .option("--username <username>", "Username")
    .option("--custom <json>", "Custom data as JSON string")
    .addHelpText(
      "after",
      `
Examples:
  authsignal users update user_abc123 --email new@example.com
  authsignal users update user_abc123 --display-name "John Doe"
  authsignal users update user_abc123 --custom '{"tier":"premium"}'`,
    )
    .action(
      withErrorHandler(async (userId: unknown, _opts: unknown) => {
        const opts = _opts as Record<string, string | undefined>;
        const globals = getGlobalOptions(users);

        const body: Record<string, unknown> = {};
        if (opts.email) body.email = opts.email;
        if (opts.phone) body.phoneNumber = opts.phone;
        if (opts.displayName) body.displayName = opts.displayName;
        if (opts.username) body.username = opts.username;
        if (opts.custom) body.custom = JSON.parse(opts.custom);

        const client = createServerClient(globals);
        const s = spin("Updating user...", globals);
        const data = await client.patch(
          `/users/${encodeURIComponent(String(userId))}`,
          body,
        );
        s.stop();

        printData(data, globals);
        printSuccess("User updated.", globals);
      }),
    );

  users
    .command("delete")
    .description("Delete a user and all associated data")
    .argument("<userId>", "User ID")
    .addHelpText(
      "after",
      `
Examples:
  authsignal users delete user_abc123
  authsignal users delete user_abc123 --yes
  authsignal users delete user_abc123 --dry-run`,
    )
    .action(
      withErrorHandler(async (userId: unknown) => {
        const globals = getGlobalOptions(users);

        if (globals.dryRun) {
          printDryRun("delete user", { userId: String(userId) });
          return;
        }

        const ok = await confirm(
          `Delete user ${userId} and all associated data?`,
          globals,
        );
        if (!ok) {
          console.error("Aborted.");
          return;
        }

        const client = createServerClient(globals);
        const s = spin("Deleting user...", globals);
        await client.delete(`/users/${encodeURIComponent(String(userId))}`);
        s.stop();

        printSuccess(`Deleted user ${userId}.`, globals);
      }),
    );
}
