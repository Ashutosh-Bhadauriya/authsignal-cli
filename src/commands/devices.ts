import { Command } from "commander";
import { createServerClient, spin } from "../client.js";
import { getGlobalOptions } from "../globals.js";
import { printData, printSuccess, printDryRun } from "../output.js";
import { confirm, withErrorHandler } from "../utils.js";

export function registerDeviceCommands(parent: Command): void {
  const devices = parent
    .command("devices")
    .description("Manage user devices");

  devices
    .command("list")
    .description("List devices for a user")
    .argument("<userId>", "User ID")
    .addHelpText(
      "after",
      `
Examples:
  authsignal devices list user_abc123
  authsignal devices list user_abc123 --output json`,
    )
    .action(
      withErrorHandler(async (userId: unknown) => {
        const globals = getGlobalOptions(devices);
        const client = createServerClient(globals);

        const s = spin("Fetching devices...", globals);
        const data = await client.get(
          `/users/${encodeURIComponent(String(userId))}/devices`,
        );
        s.stop();

        printData(data, globals, [
          { key: "deviceId", header: "Device ID" },
          { key: "authenticatedAt", header: "Authenticated" },
          { key: "invalidatedAt", header: "Invalidated" },
        ]);
      }),
    );

  devices
    .command("invalidate")
    .description("Invalidate a device")
    .argument("<userId>", "User ID")
    .argument("<deviceId>", "Device ID")
    .addHelpText(
      "after",
      `
Examples:
  authsignal devices invalidate user_abc123 dev_xyz789
  authsignal devices invalidate user_abc123 dev_xyz789 --yes
  authsignal devices invalidate user_abc123 dev_xyz789 --dry-run`,
    )
    .action(
      withErrorHandler(async (userId: unknown, deviceId: unknown) => {
        const globals = getGlobalOptions(devices);

        if (globals.dryRun) {
          printDryRun("invalidate device", {
            userId: String(userId),
            deviceId: String(deviceId),
          });
          return;
        }

        const ok = await confirm(
          `Invalidate device ${deviceId} for user ${userId}?`,
          globals,
        );
        if (!ok) {
          console.error("Aborted.");
          return;
        }

        const client = createServerClient(globals);
        const s = spin("Invalidating device...", globals);
        const data = await client.post(
          `/users/${encodeURIComponent(String(userId))}/devices/${encodeURIComponent(String(deviceId))}/invalidate`,
        );
        s.stop();

        printData(data, globals);
        printSuccess(`Device ${deviceId} invalidated.`, globals);
      }),
    );
}
