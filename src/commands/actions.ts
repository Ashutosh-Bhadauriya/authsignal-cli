import { Command } from "commander";
import { createServerClient, spin } from "../client.js";
import { getGlobalOptions } from "../globals.js";
import { printData } from "../output.js";
import { withErrorHandler } from "../utils.js";

export function registerActionCommands(parent: Command): void {
  const actions = parent.command("actions").description("Track and query actions");

  actions
    .command("track")
    .description("Track an action for a user")
    .argument("<userId>", "User ID")
    .argument("<action>", "Action code (e.g. signIn, transfer)")
    .option("--idempotency-key <key>", "Idempotency key (auto-generated if omitted)")
    .option("--redirect-url <url>", "Redirect URL after challenge")
    .option("--ip <ip>", "IP address for rules evaluation")
    .option("--user-agent <ua>", "User agent for rules evaluation")
    .option("--custom <json>", "Custom data as JSON string")
    .addHelpText(
      "after",
      `
Examples:
  authsignal actions track user_abc123 signIn
  authsignal actions track user_abc123 transfer --custom '{"amount":500}'
  authsignal actions track user_abc123 signIn --redirect-url https://app.example.com/callback
  authsignal actions track user_abc123 signIn --output json`,
    )
    .action(
      withErrorHandler(async (userId: unknown, action: unknown, _opts: unknown) => {
        const opts = _opts as Record<string, string | undefined>;
        const globals = getGlobalOptions(actions);
        const client = createServerClient(globals);

        const body: Record<string, unknown> = {};
        if (opts.idempotencyKey) body.idempotencyKey = opts.idempotencyKey;
        if (opts.redirectUrl) body.redirectUrl = opts.redirectUrl;
        if (opts.ip) body.ipAddress = opts.ip;
        if (opts.userAgent) body.userAgent = opts.userAgent;
        if (opts.custom) body.custom = JSON.parse(opts.custom);

        const s = spin("Tracking action...", globals);
        const data = await client.post(
          `/users/${encodeURIComponent(String(userId))}/actions/${encodeURIComponent(String(action))}`,
          body,
        );
        s.stop();

        printData(data, globals);
      }),
    );

  actions
    .command("get")
    .description("Get an action result")
    .argument("<userId>", "User ID")
    .argument("<action>", "Action code")
    .argument("<idempotencyKey>", "Idempotency key")
    .addHelpText(
      "after",
      `
Examples:
  authsignal actions get user_abc123 signIn idk_xyz789
  authsignal actions get user_abc123 signIn idk_xyz789 --output json`,
    )
    .action(
      withErrorHandler(
        async (userId: unknown, action: unknown, idempotencyKey: unknown) => {
          const globals = getGlobalOptions(actions);
          const client = createServerClient(globals);

          const s = spin("Fetching action...", globals);
          const data = await client.get(
            `/users/${encodeURIComponent(String(userId))}/actions/${encodeURIComponent(String(action))}/${encodeURIComponent(String(idempotencyKey))}`,
          );
          s.stop();

          printData(data, globals);
        },
      ),
    );

  actions
    .command("list")
    .description("List actions for a user")
    .argument("<userId>", "User ID")
    .option("--from-date <date>", "Filter actions from this date (ISO 8601)")
    .addHelpText(
      "after",
      `
Examples:
  authsignal actions list user_abc123
  authsignal actions list user_abc123 --from-date 2024-01-01
  authsignal actions list user_abc123 --output json`,
    )
    .action(
      withErrorHandler(async (userId: unknown, _opts: unknown) => {
        const opts = _opts as Record<string, string | undefined>;
        const globals = getGlobalOptions(actions);
        const client = createServerClient(globals);

        const params = new URLSearchParams();
        if (opts.fromDate) params.set("fromDate", opts.fromDate);

        const query = params.toString();
        const path = `/users/${encodeURIComponent(String(userId))}/actions${query ? `?${query}` : ""}`;

        const s = spin("Fetching actions...", globals);
        const data = await client.get(path);
        s.stop();

        printData(data, globals, [
          { key: "actionCode", header: "Action" },
          { key: "idempotencyKey", header: "Idempotency Key" },
          { key: "state", header: "State" },
          { key: "verificationMethod", header: "Method" },
          { key: "createdAt", header: "Created" },
        ]);
      }),
    );

  actions
    .command("update")
    .description("Update an action (e.g. after review)")
    .argument("<userId>", "User ID")
    .argument("<action>", "Action code")
    .argument("<idempotencyKey>", "Idempotency key")
    .requiredOption("--state <state>", "New state (REVIEW_SUCCEEDED, REVIEW_FAILED)")
    .option("--custom <json>", "Custom data as JSON string")
    .addHelpText(
      "after",
      `
Examples:
  authsignal actions update user_abc123 transfer idk_xyz789 --state REVIEW_SUCCEEDED
  authsignal actions update user_abc123 transfer idk_xyz789 --state REVIEW_FAILED
  authsignal actions update user_abc123 transfer idk_xyz789 --custom '{"reviewedBy":"admin"}'`,
    )
    .action(
      withErrorHandler(
        async (userId: unknown, action: unknown, idempotencyKey: unknown, _opts: unknown) => {
          const opts = _opts as Record<string, string | undefined>;
          const globals = getGlobalOptions(actions);
          const client = createServerClient(globals);

          const body: Record<string, unknown> = {};
          if (opts.state) body.state = opts.state;
          if (opts.custom) body.custom = JSON.parse(opts.custom);

          const s = spin("Updating action...", globals);
          const data = await client.patch(
            `/users/${encodeURIComponent(String(userId))}/actions/${encodeURIComponent(String(action))}/${encodeURIComponent(String(idempotencyKey))}`,
            body,
          );
          s.stop();

          printData(data, globals);
        },
      ),
    );

  actions
    .command("validate")
    .description("Validate an action token")
    .requiredOption("--token <token>", "Action token to validate")
    .addHelpText(
      "after",
      `
Examples:
  authsignal actions validate --token eyJhbGci...
  authsignal actions validate --token eyJhbGci... --output json`,
    )
    .action(
      withErrorHandler(async (_opts: unknown) => {
        const opts = _opts as { token: string };
        const globals = getGlobalOptions(actions);
        const client = createServerClient(globals);

        const s = spin("Validating token...", globals);
        const data = await client.post("/validate", { token: opts.token });
        s.stop();

        printData(data, globals);
      }),
    );
}
