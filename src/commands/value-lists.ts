import { Command } from "commander";
import { createManagementClient, spin } from "../client.js";
import { getGlobalOptions } from "../globals.js";
import { printData, printSuccess, printDryRun } from "../output.js";
import { confirm, withErrorHandler } from "../utils.js";

export function registerValueListCommands(parent: Command): void {
  const vl = parent
    .command("value-lists")
    .description("Manage value lists for rules (Management API)");

  vl.command("list")
    .description("List all value lists")
    .addHelpText(
      "after",
      `
Examples:
  authsignal value-lists list
  authsignal value-lists list --output json`,
    )
    .action(
      withErrorHandler(async () => {
        const globals = getGlobalOptions(vl);
        const client = createManagementClient(globals);

        const s = spin("Fetching value lists...", globals);
        const data = await client.get("/value-lists");
        s.stop();

        printData(data, globals, [
          { key: "name", header: "Name" },
          { key: "alias", header: "Alias" },
          { key: "itemType", header: "Type" },
          { key: "isActive", header: "Active" },
        ]);
      }),
    );

  vl.command("create")
    .description("Create a value list")
    .requiredOption("--name <name>", "Value list name")
    .option("--type <type>", "Item type (string, number)", "string")
    .option("--items <items>", "Comma-separated initial items")
    .addHelpText(
      "after",
      `
Examples:
  authsignal value-lists create --name "Blocked IPs" --type string
  authsignal value-lists create --name "VIP Users" --items user1,user2,user3
  authsignal value-lists create --name "High Risk Amounts" --type number --items 1000,5000,10000`,
    )
    .action(
      withErrorHandler(async (_opts: unknown) => {
        const opts = _opts as Record<string, string | undefined>;
        const globals = getGlobalOptions(vl);
        const client = createManagementClient(globals);

        const body: Record<string, unknown> = {
          name: opts.name,
          itemType: opts.type || "string",
          isActive: true,
        };
        if (opts.items) {
          body.valueListItems = opts.items.split(",").map((item: string) => item.trim());
        }

        const s = spin(`Creating value list "${opts.name}"...`, globals);
        const data = await client.post("/value-lists", body);
        s.stop();

        printData(data, globals);
        printSuccess(`Value list "${opts.name}" created.`, globals);
      }),
    );

  vl.command("get")
    .description("Get a value list by alias")
    .argument("<alias>", "Value list alias")
    .addHelpText(
      "after",
      `
Examples:
  authsignal value-lists get blocked-ips
  authsignal value-lists get blocked-ips --output json`,
    )
    .action(
      withErrorHandler(async (alias: unknown) => {
        const globals = getGlobalOptions(vl);
        const client = createManagementClient(globals);

        const s = spin("Fetching value list...", globals);
        const data = await client.get(
          `/value-lists/${encodeURIComponent(String(alias))}`,
        );
        s.stop();

        printData(data, globals);
      }),
    );

  vl.command("update")
    .description("Update a value list")
    .argument("<alias>", "Value list alias")
    .option("--name <name>", "New name")
    .option("--active <bool>", "Whether list is active")
    .option("--items <items>", "Replace items (comma-separated)")
    .addHelpText(
      "after",
      `
Examples:
  authsignal value-lists update blocked-ips --items 1.2.3.4,5.6.7.8
  authsignal value-lists update blocked-ips --active false
  authsignal value-lists update vip-users --name "Premium Users"`,
    )
    .action(
      withErrorHandler(async (alias: unknown, _opts: unknown) => {
        const opts = _opts as Record<string, string | undefined>;
        const globals = getGlobalOptions(vl);
        const client = createManagementClient(globals);

        const body: Record<string, unknown> = {};
        if (opts.name) body.name = opts.name;
        if (opts.active !== undefined) body.isActive = opts.active !== "false";
        if (opts.items) {
          body.valueListItems = opts.items.split(",").map((item: string) => item.trim());
        }

        const s = spin(`Updating value list "${alias}"...`, globals);
        const data = await client.patch(
          `/value-lists/${encodeURIComponent(String(alias))}`,
          body,
        );
        s.stop();

        printData(data, globals);
        printSuccess(`Value list "${alias}" updated.`, globals);
      }),
    );

  vl.command("delete")
    .description("Delete a value list")
    .argument("<alias>", "Value list alias")
    .addHelpText(
      "after",
      `
Examples:
  authsignal value-lists delete blocked-ips
  authsignal value-lists delete blocked-ips --yes
  authsignal value-lists delete blocked-ips --dry-run`,
    )
    .action(
      withErrorHandler(async (alias: unknown) => {
        const globals = getGlobalOptions(vl);

        if (globals.dryRun) {
          printDryRun("delete value list", { alias: String(alias) });
          return;
        }

        const ok = await confirm(`Delete value list "${alias}"?`, globals);
        if (!ok) {
          console.error("Aborted.");
          return;
        }

        const client = createManagementClient(globals);
        const s = spin(`Deleting value list "${alias}"...`, globals);
        await client.delete(
          `/value-lists/${encodeURIComponent(String(alias))}`,
        );
        s.stop();

        printSuccess(`Deleted value list "${alias}".`, globals);
      }),
    );
}
