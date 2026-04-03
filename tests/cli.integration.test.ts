import { describe, it, expect, beforeAll } from "vitest";
import { execSync } from "node:child_process";

const CLI = "node dist/index.js";

function run(args: string): string {
  return execSync(`${CLI} ${args}`, {
    encoding: "utf-8",
    env: { ...process.env, NO_COLOR: "1" },
    timeout: 30_000,
  }).trim();
}

function runWithStderr(args: string): { stdout: string; stderr: string; exitCode: number } {
  try {
    const result = execSync(`${CLI} ${args} 2>&1`, {
      encoding: "utf-8",
      env: { ...process.env, NO_COLOR: "1" },
      timeout: 30_000,
    }).trim();
    return { stdout: result, stderr: result, exitCode: 0 };
  } catch (err: any) {
    const output = (err.stdout || "").trim() + "\n" + (err.stderr || "").trim();
    return {
      stdout: (err.stdout || "").trim(),
      stderr: output.trim(),
      exitCode: err.status || 1,
    };
  }
}

// Requires: authsignal login has been run with valid credentials
const hasCredentials = (() => {
  try {
    const out = run("status --output json");
    const status = JSON.parse(out);
    return status.apiKeyConfigured;
  } catch {
    return false;
  }
})();

describe("CLI help and structure", () => {
  it("shows version", () => {
    const out = run("--version");
    expect(out).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it("shows help with all command groups", () => {
    const out = run("--help");
    const commands = [
      "config", "users", "authenticators", "actions", "action-configs",
      "rules", "tenant", "theme", "value-lists", "challenges", "sessions",
      "devices", "authenticator-configs", "custom-data-points",
      "login", "logout", "status", "completion", "open", "api",
    ];
    for (const cmd of commands) {
      expect(out).toContain(cmd);
    }
  });

  it("shows global flags", () => {
    const out = run("--help");
    expect(out).toContain("--output");
    expect(out).toContain("--region");
    expect(out).toContain("--api-key");
    expect(out).toContain("--management-key");
    expect(out).toContain("--verbose");
    expect(out).toContain("--dry-run");
    expect(out).toContain("--yes");
    expect(out).toContain("--quiet");
  });

  it("shows environment variables in help", () => {
    const out = run("--help");
    expect(out).toContain("AUTHSIGNAL_API_KEY");
    expect(out).toContain("AUTHSIGNAL_MANAGEMENT_KEY");
    expect(out).toContain("AUTHSIGNAL_REGION");
    expect(out).toContain("NO_COLOR");
  });
});

describe("CLI subcommand help", () => {
  const subcommands = [
    { cmd: "users", subs: ["list", "get", "update", "delete"] },
    { cmd: "authenticators", subs: ["list", "add", "delete"] },
    { cmd: "actions", subs: ["track", "get", "list", "update", "validate"] },
    { cmd: "action-configs", subs: ["list", "create", "get", "update", "delete"] },
    { cmd: "rules", subs: ["list", "create", "get", "update", "delete"] },
    { cmd: "tenant", subs: ["get", "update"] },
    { cmd: "theme", subs: ["get", "update"] },
    { cmd: "value-lists", subs: ["list", "create", "get", "update", "delete"] },
    { cmd: "challenges", subs: ["create", "get", "verify", "claim"] },
    { cmd: "sessions", subs: ["create", "validate", "refresh", "revoke", "revoke-all"] },
    { cmd: "devices", subs: ["list", "invalidate"] },
    { cmd: "authenticator-configs", subs: ["list", "update"] },
    { cmd: "custom-data-points", subs: ["list", "create", "get", "delete"] },
    { cmd: "config", subs: ["set", "get", "regions"] },
  ];

  for (const { cmd, subs } of subcommands) {
    it(`${cmd} --help lists all subcommands`, () => {
      const out = run(`${cmd} --help`);
      for (const sub of subs) {
        expect(out).toContain(sub);
      }
    });
  }
});

describe("CLI subcommand examples", () => {
  const commandsWithExamples = [
    "users list", "users get", "users update", "users delete",
    "authenticators list", "authenticators add", "authenticators delete",
    "actions track", "actions get", "actions list", "actions update", "actions validate",
    "action-configs create", "action-configs get",
    "rules create", "rules get", "rules update", "rules delete",
    "tenant get", "tenant update",
    "theme get", "theme update",
    "value-lists create", "value-lists get", "value-lists delete",
    "config set", "config get", "config regions",
  ];

  for (const cmd of commandsWithExamples) {
    it(`${cmd} --help includes examples`, () => {
      const out = run(`${cmd} --help`);
      expect(out).toContain("Examples:");
      expect(out).toContain("authsignal");
    });
  }
});

describe("rules create help has JsonLogic format", () => {
  it("mentions JsonLogic", () => {
    const out = run("rules create --help");
    expect(out).toContain("JsonLogic");
  });

  it("lists available variables", () => {
    const out = run("rules create --help");
    expect(out).toContain("ip.isAnonymous");
    expect(out).toContain("device.isNew");
    expect(out).toContain("device.isBot");
    expect(out).toContain("ip.impossibleTravel");
    expect(out).toContain("custom.<dataPointName>");
  });

  it("shows correct condition syntax in examples", () => {
    const out = run("rules create --help");
    expect(out).toContain('{"var":"ip.isAnonymous"}');
    expect(out).toContain('"and"');
    expect(out).toContain('"or"');
  });
});

describe("completion", () => {
  it("generates bash completion", () => {
    const out = run("completion bash");
    expect(out).toContain("_authsignal_completions");
    expect(out).toContain("complete -F");
  });

  it("generates zsh completion", () => {
    const out = run("completion zsh");
    expect(out).toContain("#compdef authsignal");
    expect(out).toContain("_authsignal");
  });

  it("generates fish completion", () => {
    const out = run("completion fish");
    expect(out).toContain("complete -c authsignal");
  });
});

describe("config regions", () => {
  it("lists all regions as JSON", () => {
    const out = run("config regions --output json");
    const regions = JSON.parse(out);
    expect(regions).toHaveLength(4);
    expect(regions.map((r: any) => r.region)).toEqual(["us", "au", "eu", "ca"]);
  });
});

describe("open --print-url", () => {
  it("prints dashboard URL", () => {
    const out = run("open dashboard --print-url");
    expect(out).toContain("https://portal.authsignal.com");
  });

  it("prints docs URL", () => {
    const out = run("open docs --print-url");
    expect(out).toContain("https://docs.authsignal.com");
  });

  it("prints api-docs URL", () => {
    const out = run("open api-docs --print-url");
    expect(out).toContain("https://docs.authsignal.com/api/server-api");
  });

  it("errors on invalid page", () => {
    const { stderr } = runWithStderr("open invalid-page --print-url");
    expect(stderr).toContain('Unknown page "invalid-page"');
    expect(stderr).toContain("Available:");
  });
});

describe("dry-run", () => {
  it("users delete --dry-run shows preview", () => {
    const { stderr } = runWithStderr("users delete testuser123 --dry-run");
    expect(stderr).toContain("[dry-run]");
    expect(stderr).toContain("delete user");
    expect(stderr).toContain("testuser123");
    expect(stderr).toContain("No changes made");
  });

  it("action-configs delete --dry-run shows preview", () => {
    const { stderr } = runWithStderr("action-configs delete fakeAction --dry-run");
    expect(stderr).toContain("[dry-run]");
    expect(stderr).toContain("delete action config");
  });

  it("rules delete --dry-run shows preview", () => {
    const { stderr } = runWithStderr("rules delete fakeAction fakeRule --dry-run");
    expect(stderr).toContain("[dry-run]");
    expect(stderr).toContain("delete rule");
  });

  it("authenticators delete --dry-run shows preview", () => {
    const { stderr } = runWithStderr("authenticators delete user1 auth1 --dry-run");
    expect(stderr).toContain("[dry-run]");
    expect(stderr).toContain("delete authenticator");
  });

  it("devices invalidate --dry-run shows preview", () => {
    const { stderr } = runWithStderr("devices invalidate user1 dev1 --dry-run");
    expect(stderr).toContain("[dry-run]");
    expect(stderr).toContain("invalidate device");
  });

  it("value-lists delete --dry-run shows preview", () => {
    const { stderr } = runWithStderr("value-lists delete fake-list --dry-run");
    expect(stderr).toContain("[dry-run]");
    expect(stderr).toContain("delete value list");
  });
});

describe("error handling", () => {
  it("users list without filter shows actionable error", () => {
    const { stderr } = runWithStderr("users list");
    expect(stderr).toContain("At least one filter is required");
    expect(stderr).toContain("--email");
  });

  it("config set with invalid key shows error", () => {
    const { stderr } = runWithStderr("config set invalid-key value");
    expect(stderr).toContain("Unknown config key");
    expect(stderr).toContain("api-key, management-key, region");
  });

  it("config set region with invalid region shows error", () => {
    const { stderr } = runWithStderr("config set region invalid");
    expect(stderr).toContain("Invalid region");
    expect(stderr).toContain("us, au, eu, ca");
  });

  it("actions update without --state shows error", () => {
    const { stderr } = runWithStderr("actions update user1 action1 key1");
    expect(stderr).toContain("--state");
  });
});

// ============================================================
// Live API integration tests (require valid credentials)
// ============================================================
describe.skipIf(!hasCredentials)("Live API: status", () => {
  it("returns JSON with all fields", () => {
    const out = run("status --output json");
    const status = JSON.parse(out);
    expect(status).toHaveProperty("version");
    expect(status).toHaveProperty("region");
    expect(status).toHaveProperty("baseUrl");
    expect(status).toHaveProperty("configPath");
    expect(status).toHaveProperty("apiKeyConfigured", true);
    expect(status).toHaveProperty("ci");
  });
});

describe.skipIf(!hasCredentials)("Live API: users", () => {
  it("lists users by email", () => {
    const out = run("users list --email test@example.com --output json");
    const data = JSON.parse(out);
    expect(data).toHaveProperty("users");
    expect(data.users.length).toBeGreaterThan(0);
    expect(data.users[0]).toHaveProperty("userId");
  });

  it("gets a specific user", () => {
    const out = run("users get testuser123 --output json");
    const data = JSON.parse(out);
    expect(data).toHaveProperty("email", "test@example.com");
    expect(data).toHaveProperty("isEnrolled");
    expect(data).toHaveProperty("enrolledVerificationMethods");
  });
});

describe.skipIf(!hasCredentials)("Live API: authenticators", () => {
  it("lists authenticators for a user", () => {
    const out = run("authenticators list testuser123 --output json");
    const data = JSON.parse(out);
    expect(Array.isArray(data)).toBe(true);
    if (data.length > 0) {
      expect(data[0]).toHaveProperty("verificationMethod");
      expect(data[0]).toHaveProperty("userAuthenticatorId");
    }
  });
});

describe.skipIf(!hasCredentials)("Live API: actions", () => {
  it("tracks an action and returns state", () => {
    const out = run("actions track testuser123 cli-demo --output json");
    const data = JSON.parse(out);
    expect(data).toHaveProperty("state");
    expect(data).toHaveProperty("idempotencyKey");
    expect(["ALLOW", "BLOCK", "CHALLENGE_REQUIRED", "REVIEW_REQUIRED"]).toContain(data.state);
  });

  it("gets an action by idempotency key", () => {
    // First track to get a key
    const trackOut = run("actions track testuser123 cli-demo --output json");
    const { idempotencyKey } = JSON.parse(trackOut);

    const out = run(`actions get testuser123 cli-demo ${idempotencyKey} --output json`);
    const data = JSON.parse(out);
    expect(data).toHaveProperty("state");
  });

  it("lists actions for a user", () => {
    const out = run("actions list testuser123 --output json");
    const data = JSON.parse(out);
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);
    expect(data[0]).toHaveProperty("actionCode");
    expect(data[0]).toHaveProperty("state");
  });

  it("validates a token (invalid token returns isValid=false)", () => {
    const out = run("actions validate --token invalid-token --output json");
    const data = JSON.parse(out);
    expect(data).toHaveProperty("isValid", false);
  });
});

describe.skipIf(!hasCredentials)("Live API: tenant", () => {
  it("gets tenant info", () => {
    const out = run("tenant get --output json");
    const data = JSON.parse(out);
    expect(data).toHaveProperty("tenantId");
    expect(data).toHaveProperty("name");
  });
});

describe.skipIf(!hasCredentials)("Live API: action-configs", () => {
  it("lists action configs", () => {
    const out = run("action-configs list --output json");
    const data = JSON.parse(out);
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);
  });

  it("gets a specific action config", () => {
    const out = run("action-configs get cli-demo --output json");
    const data = JSON.parse(out);
    expect(data).toHaveProperty("actionCode", "cli-demo");
    expect(data).toHaveProperty("defaultUserActionResult");
  });
});

describe.skipIf(!hasCredentials)("Live API: rules CRUD", () => {
  let ruleId: string;

  it("creates a rule with JsonLogic conditions", () => {
    const out = run(
      `rules create cli-demo --name "integration-test-rule" --type CHALLENGE --priority 98 --conditions '{"==":[{"var":"ip.isAnonymous"},true]}' --output json`,
    );
    const data = JSON.parse(out);
    expect(data).toHaveProperty("ruleId");
    expect(data).toHaveProperty("name", "integration-test-rule");
    expect(data).toHaveProperty("type", "CHALLENGE");
    expect(data).toHaveProperty("conditions");
    expect(data.conditions).toHaveProperty("==");
    ruleId = data.ruleId;
  });

  it("gets the created rule", () => {
    const out = run(`rules get cli-demo ${ruleId} --output json`);
    const data = JSON.parse(out);
    expect(data).toHaveProperty("ruleId", ruleId);
    expect(data).toHaveProperty("conditions");
  });

  it("updates the rule", () => {
    const out = run(`rules update cli-demo ${ruleId} --name "updated-test-rule" --output json`);
    const data = JSON.parse(out);
    expect(data).toHaveProperty("name", "updated-test-rule");
  });

  it("deletes the rule", () => {
    const result = runWithStderr(`rules delete cli-demo ${ruleId} --yes`);
    expect(result.stderr).toContain("Deleted rule");

    // Verify it's no longer in the list
    const out = run("rules list cli-demo --output json");
    const rules = JSON.parse(out);
    const found = rules.find((r: any) => r.ruleId === ruleId);
    expect(found).toBeUndefined();
  });
});

describe.skipIf(!hasCredentials)("Live API: value-lists CRUD", () => {
  const listName = "integration-test-list";
  let alias: string;

  it("creates a value list with items", () => {
    const out = run(
      `value-lists create --name "${listName}" --type string --items "a,b,c" --output json`,
    );
    const data = JSON.parse(out);
    expect(data).toHaveProperty("name", listName);
    expect(data).toHaveProperty("alias");
    expect(data).toHaveProperty("valueListItems");
    expect(data.valueListItems).toEqual(["a", "b", "c"]);
    alias = data.alias;
  });

  it("gets the value list", () => {
    const out = run(`value-lists get ${alias} --output json`);
    const data = JSON.parse(out);
    expect(data).toHaveProperty("name", listName);
    expect(data.valueListItems).toEqual(["a", "b", "c"]);
  });

  it("updates the value list items", () => {
    const out = run(`value-lists update ${alias} --items "a,b,c,d" --output json`);
    const data = JSON.parse(out);
    expect(data.valueListItems).toEqual(["a", "b", "c", "d"]);
  });

  it("deletes the value list", () => {
    runWithStderr(`value-lists delete ${alias} --yes`);

    const result = runWithStderr(`value-lists get ${alias} --output json`);
    expect(result.exitCode).not.toBe(0);
    expect(result.stderr).toContain("404");
  });
});

describe.skipIf(!hasCredentials)("Live API: authenticator-configs", () => {
  it("lists authenticator configs", () => {
    const out = run("authenticator-configs list --output json");
    const data = JSON.parse(out);
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);
    expect(data[0]).toHaveProperty("verificationMethod");
    expect(data[0]).toHaveProperty("isActive");
  });
});

describe.skipIf(!hasCredentials)("Live API: custom-data-points", () => {
  it("lists custom data points", () => {
    const out = run("custom-data-points list --output json");
    const data = JSON.parse(out);
    expect(Array.isArray(data)).toBe(true);
    if (data.length > 0) {
      expect(data[0]).toHaveProperty("name");
      expect(data[0]).toHaveProperty("dataType");
    }
  });
});

describe.skipIf(!hasCredentials)("Live API: devices", () => {
  it("lists devices for a user", () => {
    const out = run("devices list testuser123 --output json");
    const data = JSON.parse(out);
    expect(Array.isArray(data)).toBe(true);
  });
});

describe.skipIf(!hasCredentials)("Live API: theme", () => {
  it("gets theme as JSON", () => {
    const out = run("theme get --output json");
    const data = JSON.parse(out);
    expect(data).toHaveProperty("name");
  });
});

describe.skipIf(!hasCredentials)("Live API: raw api command", () => {
  it("makes a GET request", () => {
    const out = run("api GET /v1/users/testuser123 --output json");
    const data = JSON.parse(out);
    expect(data).toHaveProperty("email", "test@example.com");
  });

  it("makes a GET to management API", () => {
    const out = run("api GET /v1/management/tenant --management --output json");
    const data = JSON.parse(out);
    expect(data).toHaveProperty("tenantId");
  });
});
