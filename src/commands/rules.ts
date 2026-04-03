import { Command } from "commander";
import { createManagementClient, spin } from "../client.js";
import { getGlobalOptions } from "../globals.js";
import { printData, printSuccess, printDryRun } from "../output.js";
import { confirm, withErrorHandler } from "../utils.js";

const RULE_TYPES = ["ALLOW", "BLOCK", "CHALLENGE", "REVIEW"];

export function registerRuleCommands(parent: Command): void {
  const rules = parent
    .command("rules")
    .description("Manage rules for action configurations (Management API)");

  rules
    .command("list")
    .description("List rules for an action configuration")
    .argument("<actionCode>", "Action code")
    .addHelpText(
      "after",
      `
Examples:
  authsignal rules list signIn
  authsignal rules list signIn --output json`,
    )
    .action(
      withErrorHandler(async (actionCode: unknown) => {
        const globals = getGlobalOptions(rules);
        const client = createManagementClient(globals);

        const s = spin("Fetching rules...", globals);
        const data = await client.get(
          `/action-configurations/${encodeURIComponent(String(actionCode))}/rules`,
        );
        s.stop();

        printData(data, globals, [
          { key: "ruleId", header: "Rule ID" },
          { key: "name", header: "Name" },
          { key: "type", header: "Type" },
          { key: "priority", header: "Priority" },
          { key: "isActive", header: "Active" },
        ]);
      }),
    );

  rules
    .command("create")
    .description("Create a rule for an action configuration")
    .argument("<actionCode>", "Action code")
    .requiredOption("--name <name>", "Rule name")
    .requiredOption("--type <type>", `Rule type (${RULE_TYPES.join(", ")})`)
    .option("--priority <n>", "Priority 0-99 (default: 0)", "0")
    .option("--active <bool>", "Whether rule is active", "true")
    .option("--conditions <json>", "Conditions as JsonLogic (see examples)")
    .addHelpText(
      "after",
      `
Conditions use JsonLogic format (https://jsonlogic.com/).
Available variables: ip.isAnonymous, ip.countryCode, ip.impossibleTravel,
  ip.atypicalTravel, ip.countryCodeInOfacList, device.isNew, device.isBot,
  user.hasPreviouslyVerified, custom.<dataPointName>, and more.

Examples:
  # Simple rule (no conditions - always triggers)
  authsignal rules create signIn --name "Block all" --type BLOCK

  # Single condition
  authsignal rules create signIn --name "Block anonymous" --type BLOCK \\
    --conditions '{"==":[{"var":"ip.isAnonymous"},true]}'

  # AND - multiple conditions
  authsignal rules create signIn --name "Anon + OFAC" --type BLOCK \\
    --conditions '{"and":[{"==":[{"var":"ip.isAnonymous"},true]},{"==":[{"var":"ip.countryCodeInOfacList"},true]}]}'

  # OR - any condition matches
  authsignal rules create signIn --name "Risky login" --type CHALLENGE --priority 5 \\
    --conditions '{"or":[{"==":[{"var":"ip.impossibleTravel"},true]},{"==":[{"var":"device.isNew"},true]}]}'

  # Nested AND/OR with custom data
  authsignal rules create transfer --name "High risk" --type CHALLENGE --priority 10 \\
    --conditions '{"or":[{"and":[{">":[{"var":"custom.actionAmount"},1000]},{"==":[{"var":"device.isNew"},true]}]},{"==":[{"var":"device.isBot"},true]}]}'`,
    )
    .action(
      withErrorHandler(async (actionCode: unknown, _opts: unknown) => {
        const opts = _opts as Record<string, string | undefined>;
        const globals = getGlobalOptions(rules);
        const client = createManagementClient(globals);

        const body: Record<string, unknown> = {
          name: opts.name,
          type: opts.type,
          priority: parseInt(opts.priority || "0", 10),
          isActive: opts.active !== "false",
        };
        if (opts.conditions) body.conditions = JSON.parse(opts.conditions);

        const s = spin("Creating rule...", globals);
        const data = await client.post(
          `/action-configurations/${encodeURIComponent(String(actionCode))}/rules`,
          body,
        );
        s.stop();

        printData(data, globals);
        printSuccess(`Rule created for "${actionCode}".`, globals);
      }),
    );

  rules
    .command("get")
    .description("Get a rule")
    .argument("<actionCode>", "Action code")
    .argument("<ruleId>", "Rule ID")
    .addHelpText(
      "after",
      `
Examples:
  authsignal rules get signIn rule_abc123
  authsignal rules get signIn rule_abc123 --output json`,
    )
    .action(
      withErrorHandler(async (actionCode: unknown, ruleId: unknown) => {
        const globals = getGlobalOptions(rules);
        const client = createManagementClient(globals);

        const s = spin("Fetching rule...", globals);
        const data = await client.get(
          `/action-configurations/${encodeURIComponent(String(actionCode))}/rules/${encodeURIComponent(String(ruleId))}`,
        );
        s.stop();

        printData(data, globals);
      }),
    );

  rules
    .command("update")
    .description("Update a rule")
    .argument("<actionCode>", "Action code")
    .argument("<ruleId>", "Rule ID")
    .option("--name <name>", "Rule name")
    .option("--type <type>", `Rule type (${RULE_TYPES.join(", ")})`)
    .option("--priority <n>", "Priority 0-99")
    .option("--active <bool>", "Whether rule is active")
    .option("--conditions <json>", "Conditions as JsonLogic (see rules create --help)")
    .addHelpText(
      "after",
      `
Examples:
  authsignal rules update signIn rule_abc123 --name "Updated name"
  authsignal rules update signIn rule_abc123 --active false
  authsignal rules update signIn rule_abc123 --priority 50
  authsignal rules update signIn rule_abc123 --conditions '{"==":[{"var":"ip.isAnonymous"},true]}'`,
    )
    .action(
      withErrorHandler(async (actionCode: unknown, ruleId: unknown, _opts: unknown) => {
        const opts = _opts as Record<string, string | undefined>;
        const globals = getGlobalOptions(rules);
        const client = createManagementClient(globals);

        const body: Record<string, unknown> = {};
        if (opts.name) body.name = opts.name;
        if (opts.type) body.type = opts.type;
        if (opts.priority !== undefined) body.priority = parseInt(opts.priority, 10);
        if (opts.active !== undefined) body.isActive = opts.active !== "false";
        if (opts.conditions) body.conditions = JSON.parse(opts.conditions);

        const s = spin("Updating rule...", globals);
        const data = await client.patch(
          `/action-configurations/${encodeURIComponent(String(actionCode))}/rules/${encodeURIComponent(String(ruleId))}`,
          body,
        );
        s.stop();

        printData(data, globals);
        printSuccess(`Rule ${ruleId} updated.`, globals);
      }),
    );

  rules
    .command("delete")
    .description("Delete a rule")
    .argument("<actionCode>", "Action code")
    .argument("<ruleId>", "Rule ID")
    .addHelpText(
      "after",
      `
Examples:
  authsignal rules delete signIn rule_abc123
  authsignal rules delete signIn rule_abc123 --yes
  authsignal rules delete signIn rule_abc123 --dry-run`,
    )
    .action(
      withErrorHandler(async (actionCode: unknown, ruleId: unknown) => {
        const globals = getGlobalOptions(rules);

        if (globals.dryRun) {
          printDryRun("delete rule", {
            actionCode: String(actionCode),
            ruleId: String(ruleId),
          });
          return;
        }

        const ok = await confirm(`Delete rule ${ruleId}?`, globals);
        if (!ok) {
          console.error("Aborted.");
          return;
        }

        const client = createManagementClient(globals);
        const s = spin("Deleting rule...", globals);
        await client.delete(
          `/action-configurations/${encodeURIComponent(String(actionCode))}/rules/${encodeURIComponent(String(ruleId))}`,
        );
        s.stop();

        printSuccess(`Deleted rule ${ruleId}.`, globals);
      }),
    );
}
