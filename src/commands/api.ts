import { Command } from "commander";
import { getBaseUrl, resolveApiKey, resolveManagementKey, resolveRegion } from "../config.js";
import { getGlobalOptions } from "../globals.js";
import { spin } from "../client.js";
import { printData } from "../output.js";
import { readStdin, withErrorHandler } from "../utils.js";

export function registerApiCommand(parent: Command): void {
  parent
    .command("api")
    .description("Make raw API requests to Authsignal")
    .argument("<method>", "HTTP method: GET, POST, PATCH, DELETE")
    .argument("<path>", "API path (e.g. /v1/users)")
    .option("-d, --data <json>", "Request body as JSON string")
    .option("--stdin", "Read request body from stdin")
    .option("--management", "Use Management API key instead of Server API key")
    .addHelpText(
      "after",
      `
The api command lets you make raw HTTP requests to any Authsignal endpoint.
Authentication is handled automatically using your configured keys.

Examples:
  authsignal api GET /v1/users
  authsignal api POST /v1/users/user123/actions/signIn -d '{"custom":{"ip":"1.2.3.4"}}'
  authsignal api GET /v1/management/tenant --management
  authsignal api DELETE /v1/users/user123 --yes
  authsignal api PATCH /v1/management/theme --management --stdin < theme.json
  authsignal api GET /v1/users --output json | jq '.[] | .userId'

Docs:
  Server API:     https://docs.authsignal.com/api/server-api
  Management API: https://docs.authsignal.com/api/management-api`,
    )
    .action(
      withErrorHandler(async (method: unknown, path: unknown, _opts: unknown) => {
        const opts = _opts as { data?: string; stdin?: boolean; management?: boolean };
        const globals = getGlobalOptions(parent);
        const region = resolveRegion(globals.region);
        const baseUrl = getBaseUrl(region);
        const m = String(method).toUpperCase();

        if (!["GET", "POST", "PATCH", "PUT", "DELETE"].includes(m)) {
          throw new Error(
            `Invalid HTTP method "${method}".\n  Supported: GET, POST, PATCH, PUT, DELETE`,
          );
        }

        // Resolve API key
        const key = opts.management
          ? resolveManagementKey(globals.managementKey)
          : resolveApiKey(globals.apiKey);

        if (!key) {
          const keyType = opts.management ? "management" : "server API";
          throw new Error(
            `No ${keyType} key configured.\n` +
              `  Run: authsignal config set ${opts.management ? "management-key" : "api-key"} <key>`,
          );
        }

        // Build body
        let body: unknown;
        if (opts.data) {
          body = JSON.parse(opts.data);
        } else if (opts.stdin) {
          const raw = await readStdin();
          body = JSON.parse(raw);
        }

        // Build URL
        const p = String(path).startsWith("/") ? String(path) : `/${path}`;
        const url = `${baseUrl}${p}`;

        if (globals.verbose) {
          const maskedKey = key.slice(0, 6) + "..." + key.slice(-4);
          console.error(`--> ${m} ${url}`);
          console.error(`    Key: ${maskedKey}`);
          if (body) console.error(`    Body: ${JSON.stringify(body)}`);
        }

        const s = spin(`${m} ${p}...`, globals);
        const start = Date.now();

        const headers: Record<string, string> = {
          Authorization: "Basic " + Buffer.from(`${key}:`).toString("base64"),
          Accept: "application/json",
        };
        if (body !== undefined) {
          headers["Content-Type"] = "application/json";
        }

        const res = await fetch(url, {
          method: m,
          headers,
          body: body !== undefined ? JSON.stringify(body) : undefined,
        });

        const elapsed = Date.now() - start;
        const text = await res.text();
        let parsed: unknown;
        try {
          parsed = JSON.parse(text);
        } catch {
          parsed = text;
        }

        s.stop();

        if (globals.verbose) {
          console.error(`<-- ${res.status} ${res.statusText} (${elapsed}ms)`);
        }

        if (!res.ok) {
          // Still print the response body for debugging
          printData(parsed, globals);
          process.exit(1);
        }

        printData(parsed, globals);
      }),
    );
}
