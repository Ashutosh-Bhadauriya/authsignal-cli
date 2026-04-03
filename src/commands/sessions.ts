import { Command } from "commander";
import { createServerClient, spin } from "../client.js";
import { getGlobalOptions } from "../globals.js";
import { printData, printSuccess } from "../output.js";
import { withErrorHandler } from "../utils.js";

export function registerSessionCommands(parent: Command): void {
  const sessions = parent
    .command("sessions")
    .description("Manage authentication sessions");

  sessions
    .command("create")
    .description("Create a session (exchange token for access/refresh tokens)")
    .requiredOption("--token <token>", "Action token")
    .requiredOption("--client-id <id>", "Client ID (publishable key)")
    .addHelpText(
      "after",
      `
Examples:
  authsignal sessions create --token eyJhbG... --client-id 88b07e7ae7c21b1e
  authsignal sessions create --token eyJhbG... --client-id 88b07e7ae7c21b1e --output json`,
    )
    .action(
      withErrorHandler(async (_opts: unknown) => {
        const opts = _opts as { token: string; clientId: string };
        const globals = getGlobalOptions(sessions);
        const client = createServerClient(globals);

        const s = spin("Creating session...", globals);
        const data = await client.post("/sessions", {
          token: opts.token,
          clientId: opts.clientId,
        });
        s.stop();

        printData(data, globals);
      }),
    );

  sessions
    .command("validate")
    .description("Validate a session access token")
    .requiredOption("--access-token <token>", "Session access token")
    .addHelpText(
      "after",
      `
Examples:
  authsignal sessions validate --access-token eyJhbG...
  authsignal sessions validate --access-token eyJhbG... --output json`,
    )
    .action(
      withErrorHandler(async (_opts: unknown) => {
        const opts = _opts as { accessToken: string };
        const globals = getGlobalOptions(sessions);
        const client = createServerClient(globals);

        const s = spin("Validating session...", globals);
        const data = await client.post("/sessions/validate", {
          accessToken: opts.accessToken,
        });
        s.stop();

        printData(data, globals);
      }),
    );

  sessions
    .command("refresh")
    .description("Refresh a session using a refresh token")
    .requiredOption("--refresh-token <token>", "Session refresh token")
    .addHelpText(
      "after",
      `
Examples:
  authsignal sessions refresh --refresh-token eyJhbG...`,
    )
    .action(
      withErrorHandler(async (_opts: unknown) => {
        const opts = _opts as { refreshToken: string };
        const globals = getGlobalOptions(sessions);
        const client = createServerClient(globals);

        const s = spin("Refreshing session...", globals);
        const data = await client.post("/sessions/refresh", {
          refreshToken: opts.refreshToken,
        });
        s.stop();

        printData(data, globals);
      }),
    );

  sessions
    .command("revoke")
    .description("Revoke a session")
    .requiredOption("--access-token <token>", "Session access token to revoke")
    .addHelpText(
      "after",
      `
Examples:
  authsignal sessions revoke --access-token eyJhbG...
  authsignal sessions revoke --access-token eyJhbG... --yes`,
    )
    .action(
      withErrorHandler(async (_opts: unknown) => {
        const opts = _opts as { accessToken: string };
        const globals = getGlobalOptions(sessions);
        const client = createServerClient(globals);

        const s = spin("Revoking session...", globals);
        const data = await client.post("/sessions/revoke", {
          accessToken: opts.accessToken,
        });
        s.stop();

        printData(data, globals);
        printSuccess("Session revoked.", globals);
      }),
    );

  sessions
    .command("revoke-all")
    .description("Revoke all sessions for a user")
    .argument("<userId>", "User ID")
    .addHelpText(
      "after",
      `
Examples:
  authsignal sessions revoke-all user_abc123
  authsignal sessions revoke-all user_abc123 --yes`,
    )
    .action(
      withErrorHandler(async (userId: unknown) => {
        const globals = getGlobalOptions(sessions);
        const client = createServerClient(globals);

        const s = spin("Revoking all sessions...", globals);
        const data = await client.post("/sessions/user/revoke", {
          userId: String(userId),
        });
        s.stop();

        printData(data, globals);
        printSuccess(`All sessions revoked for ${userId}.`, globals);
      }),
    );
}
