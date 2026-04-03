import { Command } from "commander";
import { createServerClient, spin } from "../client.js";
import { getGlobalOptions } from "../globals.js";
import { printData } from "../output.js";
import { withErrorHandler } from "../utils.js";

export function registerChallengeCommands(parent: Command): void {
  const challenges = parent
    .command("challenges")
    .description("Create and verify authentication challenges");

  challenges
    .command("create")
    .description("Initiate a challenge for a user")
    .requiredOption("--token <token>", "Action token from track response")
    .requiredOption(
      "--method <method>",
      "Verification method (EMAIL_OTP, SMS, WHATSAPP)",
    )
    .addHelpText(
      "after",
      `
Examples:
  authsignal challenges create --token eyJhbG... --method SMS
  authsignal challenges create --token eyJhbG... --method EMAIL_OTP
  authsignal challenges create --token eyJhbG... --method WHATSAPP --output json`,
    )
    .action(
      withErrorHandler(async (_opts: unknown) => {
        const opts = _opts as { token: string; method: string };
        const globals = getGlobalOptions(challenges);
        const client = createServerClient(globals);

        const s = spin("Creating challenge...", globals);
        const data = await client.post("/challenge", {
          token: opts.token,
          verificationMethod: opts.method,
        });
        s.stop();

        printData(data, globals);
      }),
    );

  challenges
    .command("get")
    .description("Get challenge status")
    .requiredOption("--token <token>", "Action token")
    .requiredOption("--challenge-id <id>", "Challenge ID")
    .addHelpText(
      "after",
      `
Examples:
  authsignal challenges get --token eyJhbG... --challenge-id ch_abc123
  authsignal challenges get --token eyJhbG... --challenge-id ch_abc123 --output json`,
    )
    .action(
      withErrorHandler(async (_opts: unknown) => {
        const opts = _opts as { token: string; challengeId: string };
        const globals = getGlobalOptions(challenges);
        const client = createServerClient(globals);

        const s = spin("Fetching challenge...", globals);
        const data = await client.get(
          `/challenges?token=${encodeURIComponent(opts.token)}&challengeId=${encodeURIComponent(opts.challengeId)}`,
        );
        s.stop();

        printData(data, globals);
      }),
    );

  challenges
    .command("verify")
    .description("Verify a challenge with a code")
    .requiredOption("--token <token>", "Action token")
    .requiredOption("--challenge-id <id>", "Challenge ID")
    .requiredOption("--code <code>", "Verification code (e.g. OTP)")
    .addHelpText(
      "after",
      `
Examples:
  authsignal challenges verify --token eyJhbG... --challenge-id ch_abc123 --code 123456`,
    )
    .action(
      withErrorHandler(async (_opts: unknown) => {
        const opts = _opts as { token: string; challengeId: string; code: string };
        const globals = getGlobalOptions(challenges);
        const client = createServerClient(globals);

        const s = spin("Verifying challenge...", globals);
        const data = await client.post("/verify", {
          token: opts.token,
          challengeId: opts.challengeId,
          verificationCode: opts.code,
        });
        s.stop();

        printData(data, globals);
      }),
    );

  challenges
    .command("claim")
    .description("Claim a challenge for a user")
    .requiredOption("--token <token>", "Action token")
    .requiredOption("--challenge-id <id>", "Challenge ID")
    .addHelpText(
      "after",
      `
Examples:
  authsignal challenges claim --token eyJhbG... --challenge-id ch_abc123`,
    )
    .action(
      withErrorHandler(async (_opts: unknown) => {
        const opts = _opts as { token: string; challengeId: string };
        const globals = getGlobalOptions(challenges);
        const client = createServerClient(globals);

        const s = spin("Claiming challenge...", globals);
        const data = await client.post("/claim", {
          token: opts.token,
          challengeId: opts.challengeId,
        });
        s.stop();

        printData(data, globals);
      }),
    );
}
