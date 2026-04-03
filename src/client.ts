import { getBaseUrl, resolveApiKey, resolveManagementKey, resolveRegion } from "./config.js";
import { GlobalOptions, isInteractive } from "./globals.js";
import ora, { type Ora } from "ora";

const DOCS_AUTH = "https://docs.authsignal.com/api/server-api#authentication";
const DOCS_MGMT = "https://docs.authsignal.com/api/management-api";

export class ApiError extends Error {
  public hint?: string;

  constructor(
    public statusCode: number,
    public body: unknown,
    public method: string,
    public path: string,
  ) {
    const msg =
      typeof body === "object" && body !== null && "error" in body
        ? (body as { error: string }).error
        : typeof body === "string"
          ? body
          : JSON.stringify(body);
    super(`${method} ${path} failed (${statusCode}): ${msg}`);
    this.name = "ApiError";

    // Add contextual hints based on status code and path
    if (statusCode === 401) {
      const isSessionEndpoint = path.includes("/sessions");
      if (isSessionEndpoint) {
        this.hint =
          "The session token is invalid or expired.\n" +
          "  Tokens have a limited TTL. Ensure the token is fresh and hasn't been used.\n" +
          "  Docs: https://docs.authsignal.com/api/server-api#sessions";
      } else {
        this.hint =
          "Your API key may be invalid or expired.\n" +
          "  Run:  authsignal config set api-key <your-key>\n" +
          "  Docs: " + DOCS_AUTH;
      }
    } else if (statusCode === 400) {
      const errDesc =
        typeof body === "object" && body !== null && "errorDescription" in body
          ? (body as { errorDescription: string }).errorDescription
          : "";
      if (errDesc.includes("priority")) {
        this.hint = "Each rule must have a unique priority (0-99) within its action.";
      } else if (errDesc.includes("verification method") || errDesc.includes("not an enabled")) {
        this.hint =
          "Check enabled methods: authsignal authenticator-configs list\n" +
          "  Docs: https://docs.authsignal.com/api/management-api";
      }
    } else if (statusCode === 403) {
      this.hint =
        "You don't have permission for this operation.\n" +
        "  Check that you're using the correct key (server vs management).\n" +
        "  Docs: " + DOCS_MGMT;
    } else if (statusCode === 404) {
      this.hint = "The requested resource was not found. Verify the ID or action code exists.";
    } else if (statusCode === 429) {
      this.hint = "Rate limit exceeded. Wait a moment and try again.";
    }
  }
}

function basicAuth(key: string): string {
  return "Basic " + Buffer.from(`${key}:`).toString("base64");
}

async function request(
  baseUrl: string,
  authHeader: string,
  method: string,
  path: string,
  opts: GlobalOptions,
  body?: unknown,
): Promise<unknown> {
  const url = `${baseUrl}${path}`;
  const headers: Record<string, string> = {
    Authorization: authHeader,
    Accept: "application/json",
  };
  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  if (opts.verbose) {
    const maskedAuth = authHeader.slice(0, 10) + "...";
    console.error(`--> ${method} ${url}`);
    console.error(`    Authorization: ${maskedAuth}`);
    if (body !== undefined) {
      console.error(`    Body: ${JSON.stringify(body)}`);
    }
  }

  const start = Date.now();
  const res = await fetch(url, {
    method,
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

  if (opts.verbose) {
    console.error(`<-- ${res.status} ${res.statusText} (${elapsed}ms)`);
    if (typeof parsed === "object") {
      console.error(`    ${JSON.stringify(parsed).slice(0, 500)}`);
    }
  }

  if (!res.ok) {
    throw new ApiError(res.status, parsed, method, path);
  }

  return parsed;
}

/** Create a spinner that respects quiet mode and non-TTY environments. */
export function spin(text: string, opts: GlobalOptions): Ora {
  const spinner = ora({
    text,
    stream: process.stderr,
    isSilent: opts.quiet || false,
    isEnabled: isInteractive() && !opts.quiet,
  });
  return spinner.start();
}

export function createServerClient(opts: GlobalOptions) {
  const region = resolveRegion(opts.region);
  const apiKey = resolveApiKey(opts.apiKey);
  if (!apiKey) {
    throw new Error(
      "No API key configured.\n" +
        "  Set it with: authsignal config set api-key <key>\n" +
        "  Or pass:     --api-key <key>\n" +
        "  Or set:      AUTHSIGNAL_API_KEY=<key>\n" +
        "  Docs:        " + DOCS_AUTH,
    );
  }
  const baseUrl = getBaseUrl(region) + "/v1";
  const auth = basicAuth(apiKey);
  return {
    get: (path: string) => request(baseUrl, auth, "GET", path, opts),
    post: (path: string, body?: unknown) => request(baseUrl, auth, "POST", path, opts, body),
    patch: (path: string, body?: unknown) => request(baseUrl, auth, "PATCH", path, opts, body),
    delete: (path: string) => request(baseUrl, auth, "DELETE", path, opts),
  };
}

export function createManagementClient(opts: GlobalOptions) {
  const region = resolveRegion(opts.region);
  const key = resolveManagementKey(opts.managementKey);
  if (!key) {
    throw new Error(
      "No management API key configured.\n" +
        "  Set it with: authsignal config set management-key <key>\n" +
        "  Or pass:     --management-key <key>\n" +
        "  Or set:      AUTHSIGNAL_MANAGEMENT_KEY=<key>\n" +
        "  Docs:        " + DOCS_MGMT,
    );
  }
  const baseUrl = getBaseUrl(region) + "/v1/management";
  const auth = basicAuth(key);
  return {
    get: (path: string) => request(baseUrl, auth, "GET", path, opts),
    post: (path: string, body?: unknown) => request(baseUrl, auth, "POST", path, opts, body),
    patch: (path: string, body?: unknown) => request(baseUrl, auth, "PATCH", path, opts, body),
    delete: (path: string) => request(baseUrl, auth, "DELETE", path, opts),
  };
}
