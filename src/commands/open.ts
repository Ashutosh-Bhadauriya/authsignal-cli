import { Command } from "commander";
import { exec } from "node:child_process";
import { platform } from "node:os";
import { resolveRegion, REGIONS } from "../config.js";
import { getGlobalOptions } from "../globals.js";
import { withErrorHandler } from "../utils.js";

const PAGES: Record<string, string | ((region: string) => string)> = {
  dashboard: () => "https://portal.authsignal.com",
  docs: "https://docs.authsignal.com",
  "api-docs": "https://docs.authsignal.com/api/server-api",
  "server-api": "https://docs.authsignal.com/api/server-api",
  "management-api": "https://docs.authsignal.com/api/management-api",
  "client-api": "https://docs.authsignal.com/api/client-api",
  sdks: "https://docs.authsignal.com/sdks",
  actions: "https://docs.authsignal.com/categories/actions",
  rules: "https://docs.authsignal.com/categories/rules",
};

function openUrl(url: string): void {
  const os = platform();
  const cmd =
    os === "darwin"
      ? "open"
      : os === "win32"
        ? "start"
        : "xdg-open";
  exec(`${cmd} "${url}"`);
}

export function registerOpenCommand(parent: Command): void {
  parent
    .command("open")
    .description("Open Authsignal pages in browser")
    .argument("[page]", "Page to open (see list below)", "dashboard")
    .option("-n, --print-url", "Print URL instead of opening browser")
    .addHelpText(
      "after",
      `
Pages:
  dashboard       Authsignal dashboard
  docs            Documentation home
  api-docs        Server API reference
  server-api      Server API reference
  management-api  Management API reference
  client-api      Client API reference
  sdks            SDK documentation
  actions         Actions documentation
  rules           Rules documentation

Examples:
  authsignal open
  authsignal open docs
  authsignal open api-docs
  authsignal open dashboard --print-url`,
    )
    .action(
      withErrorHandler(async (page: unknown, _opts: unknown) => {
        const opts = _opts as { printUrl?: boolean };
        const globals = getGlobalOptions(parent);
        const p = String(page || "dashboard");
        const region = resolveRegion(globals.region);

        const entry = PAGES[p];
        if (!entry) {
          const valid = Object.keys(PAGES).join(", ");
          throw new Error(
            `Unknown page "${p}".\n  Available: ${valid}\n  Example: authsignal open docs`,
          );
        }

        const url = typeof entry === "function" ? entry(region) : entry;

        if (opts.printUrl) {
          console.log(url);
        } else {
          openUrl(url);
          console.error(`Opened ${url}`);
        }
      }),
    );
}
