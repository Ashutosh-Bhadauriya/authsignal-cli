import { Command } from "commander";
import { registerConfigCommands } from "./commands/config.js";
import { registerUserCommands } from "./commands/users.js";
import { registerAuthenticatorCommands } from "./commands/authenticators.js";
import { registerActionCommands } from "./commands/actions.js";
import { registerActionConfigCommands } from "./commands/action-configs.js";
import { registerRuleCommands } from "./commands/rules.js";
import { registerTenantCommands } from "./commands/tenant.js";
import { registerThemeCommands } from "./commands/theme.js";
import { registerValueListCommands } from "./commands/value-lists.js";
import { registerChallengeCommands } from "./commands/challenges.js";
import { registerSessionCommands } from "./commands/sessions.js";
import { registerDeviceCommands } from "./commands/devices.js";
import { registerAuthenticatorConfigCommands } from "./commands/authenticator-configs.js";
import { registerCustomDataPointCommands } from "./commands/custom-data-points.js";
import { registerStatusCommand } from "./commands/status.js";
import { registerCompletionCommand } from "./commands/completion.js";
import { registerOpenCommand } from "./commands/open.js";
import { registerApiCommand } from "./commands/api.js";
import { registerLoginCommand } from "./commands/login.js";

const program = new Command();

program
  .name("authsignal")
  .description("CLI for Authsignal - manage users, actions, rules, and authentication")
  .version("0.1.0")
  .option("-o, --output <format>", "Output format: json, table, plain")
  .option("--region <region>", "API region: us, au, eu, ca")
  .option("--api-key <key>", "Server API key (overrides config)")
  .option("--management-key <key>", "Management API key (overrides config)")
  .option("-q, --quiet", "Suppress non-essential output")
  .option("-y, --yes", "Skip confirmation prompts")
  .option("-v, --verbose", "Show HTTP request details for debugging")
  .option("--dry-run", "Preview destructive operations without executing")
  .addHelpText(
    "after",
    `
Environment Variables:
  AUTHSIGNAL_API_KEY          Server API secret key
  AUTHSIGNAL_MANAGEMENT_KEY   Management API secret key
  AUTHSIGNAL_REGION           Default region (us, au, eu, ca)
  NO_COLOR                    Disable colored output (no-color.org)

Getting Started:
  authsignal login                  Interactive setup (opens dashboard)
  authsignal status                 Verify configuration
  authsignal users list             Start using the API

Documentation:
  https://docs.authsignal.com/`,
  );

// Core resource commands
registerConfigCommands(program);
registerUserCommands(program);
registerAuthenticatorCommands(program);
registerActionCommands(program);
registerActionConfigCommands(program);
registerRuleCommands(program);
registerTenantCommands(program);
registerThemeCommands(program);
registerValueListCommands(program);
registerChallengeCommands(program);
registerSessionCommands(program);
registerDeviceCommands(program);
registerAuthenticatorConfigCommands(program);
registerCustomDataPointCommands(program);

// Auth commands
registerLoginCommand(program);

// Utility commands
registerStatusCommand(program);
registerCompletionCommand(program);
registerOpenCommand(program);
registerApiCommand(program);

program.parse();
