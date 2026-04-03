# Authsignal CLI

Command-line interface for [Authsignal](https://authsignal.com) — manage users, actions, rules, and authentication configuration from the terminal.

Built to be agent-friendly: non-interactive, predictable `resource verb` structure, JSON output, `--yes`/`--dry-run` flags, actionable errors, and stdin/pipe support.

## Install

```bash
npm install -g authsignal-cli
```

Requires Node.js 18+.

## Quick Start

```bash
# Configure credentials (opens dashboard to get API keys)
authsignal login

# Or set keys directly
authsignal login --api-key <server-key> --management-key <management-key> --region us

# Verify setup
authsignal status

# Start using
authsignal users list --email user@example.com
authsignal action-configs list
authsignal tenant get
```

## Authentication

Three ways to authenticate, in order of precedence:

| Method | Usage |
|---|---|
| **Flags** | `--api-key <key>` per command |
| **Env vars** | `AUTHSIGNAL_API_KEY`, `AUTHSIGNAL_MANAGEMENT_KEY`, `AUTHSIGNAL_REGION` |
| **Config file** | `authsignal login` saves to `~/.config/authsignal/config.json` |

```bash
# Interactive setup
authsignal login

# Non-interactive (CI/scripts)
authsignal login --api-key sk_... --region us

# Env vars (pipelines)
AUTHSIGNAL_API_KEY=sk_... authsignal users list --email user@example.com

# Remove credentials
authsignal logout
```

## Commands

### Server API

```bash
# Users
authsignal users list --email user@example.com
authsignal users get <userId>
authsignal users update <userId> --email new@email.com --custom '{"tier":"premium"}'
authsignal users delete <userId>

# Authenticators
authsignal authenticators list <userId>
authsignal authenticators add <userId> --method SMS --phone +1234567890
authsignal authenticators delete <userId> <authenticatorId>

# Actions
authsignal actions track <userId> signIn
authsignal actions track <userId> transfer --custom '{"amount":5000}'
authsignal actions get <userId> <action> <idempotencyKey>
authsignal actions list <userId> --from-date 2024-01-01
authsignal actions update <userId> <action> <key> --state REVIEW_SUCCEEDED
authsignal actions validate --token eyJhbG...

# Challenges
authsignal challenges create --token <token> --method SMS
authsignal challenges get --token <token> --challenge-id <id>
authsignal challenges verify --token <token> --challenge-id <id> --code 123456
authsignal challenges claim --token <token> --challenge-id <id>

# Sessions
authsignal sessions create --token <token> --client-id <publishableKey>
authsignal sessions validate --access-token <token>
authsignal sessions refresh --refresh-token <token>
authsignal sessions revoke --access-token <token>
authsignal sessions revoke-all <userId>

# Devices
authsignal devices list <userId>
authsignal devices invalidate <userId> <deviceId>
```

### Management API

```bash
# Action Configs
authsignal action-configs list
authsignal action-configs create signIn --default-result CHALLENGE --methods SMS,PASSKEY
authsignal action-configs get signIn
authsignal action-configs update signIn --default-result BLOCK
authsignal action-configs delete signIn

# Rules (conditions use JsonLogic format)
authsignal rules list signIn
authsignal rules create signIn --name "Block anonymous" --type BLOCK \
  --conditions '{"==":[{"var":"ip.isAnonymous"},true]}'
authsignal rules create signIn --name "Risky login" --type CHALLENGE --priority 5 \
  --conditions '{"or":[{"==":[{"var":"ip.impossibleTravel"},true]},{"==":[{"var":"device.isNew"},true]}]}'
authsignal rules get signIn <ruleId>
authsignal rules update signIn <ruleId> --active false
authsignal rules delete signIn <ruleId>

# Tenant
authsignal tenant get
authsignal tenant update --name "My App" --token-duration 30

# Theme
authsignal theme get
authsignal theme get --output json > theme.json
authsignal theme update --file theme.json
cat theme.json | authsignal theme update --stdin

# Value Lists
authsignal value-lists list
authsignal value-lists create --name "Blocked IPs" --type string --items 1.2.3.4,5.6.7.8
authsignal value-lists get blocked-ips
authsignal value-lists update blocked-ips --items 1.2.3.4,9.10.11.12
authsignal value-lists delete blocked-ips

# Authenticator Configs
authsignal authenticator-configs list
authsignal authenticator-configs update <id> --active true

# Custom Data Points
authsignal custom-data-points list
authsignal custom-data-points create --name "risk_score" --data-type number --model-type action
authsignal custom-data-points get <id>
authsignal custom-data-points delete <id>
```

### Utility Commands

```bash
# Raw API escape hatch
authsignal api GET /v1/users/testuser123
authsignal api POST /v1/users/user123/actions/signIn -d '{"custom":{}}'
authsignal api GET /v1/management/tenant --management

# Open pages in browser
authsignal open              # dashboard
authsignal open docs         # documentation
authsignal open api-docs     # API reference

# Shell completions
authsignal completion bash >> ~/.bashrc
authsignal completion zsh > ~/.zsh/completions/_authsignal
authsignal completion fish > ~/.config/fish/completions/authsignal.fish

# Config management
authsignal config set api-key <key>
authsignal config set region us
authsignal config get
authsignal config regions
```

## Rule Conditions (JsonLogic)

Rules use [JsonLogic](https://jsonlogic.com/) format for conditions. Available variables:

| Category | Variables |
|---|---|
| **IP/Network** | `ip.isAnonymous`, `ip.countryCode`, `ip.countryCodeInOfacList`, `ip.impossibleTravel`, `ip.atypicalTravel` |
| **Device** | `device.isNew`, `device.isBot` |
| **User** | `user.hasPreviouslyVerified` |
| **Custom** | `custom.<dataPointName>` (e.g. `custom.actionAmount`) |

```bash
# Single condition
--conditions '{"==":[{"var":"ip.isAnonymous"},true]}'

# AND
--conditions '{"and":[{"==":[{"var":"ip.isAnonymous"},true]},{"==":[{"var":"device.isNew"},true]}]}'

# OR
--conditions '{"or":[{"==":[{"var":"ip.impossibleTravel"},true]},{">":[{"var":"custom.actionAmount"},1000]}]}'

# Nested
--conditions '{"or":[{"and":[{">":[{"var":"custom.actionAmount"},1000]},{"==":[{"var":"device.isNew"},true]}]},{"==":[{"var":"device.isBot"},true]}]}'
```

## Global Flags

```
-o, --output <format>    json | table | plain (auto-detects TTY)
-v, --verbose            Show HTTP request/response details
--dry-run                Preview destructive operations
-y, --yes                Skip confirmation prompts
-q, --quiet              Suppress non-essential output
--region <region>        Override region (us, au, eu, ca)
--api-key <key>          Override server API key
--management-key <key>   Override management API key
```

## Piping & Scripting

```bash
# JSON output for jq
authsignal users list --email test@example.com -o json | jq '.users[].userId'

# Chain commands
authsignal users list --email test@example.com -o json \
  | jq -r '.users[0].userId' \
  | xargs -I{} authsignal actions track {} signIn -o json

# Export/modify/import theme
authsignal theme get -o json | jq '.colors.primary = "#ff0000"' | authsignal theme update --stdin

# Verbose mode for debugging
authsignal --verbose actions track testuser123 signIn

# Dry-run for safety
authsignal users delete testuser123 --dry-run
```

## CI/CD

The CLI auto-detects CI environments and disables colors, spinners, and interactive prompts.

```bash
# No login needed — just env vars
AUTHSIGNAL_API_KEY=sk_... authsignal actions track user123 signIn --output json

# Respects NO_COLOR standard
NO_COLOR=1 authsignal users list --email user@example.com
```

## Development

```bash
git clone <repo>
cd cli
npm install
npm run build
npm test            # 121 tests (unit + live API integration)

# Run locally
node dist/index.js --help

# Link globally
npm link
authsignal --help
```

Integration tests require valid API credentials configured via `authsignal login`. They auto-skip if no credentials are found.

## Docs

- [Authsignal Documentation](https://docs.authsignal.com/)
- [Server API Reference](https://docs.authsignal.com/api/server-api)
- [Management API Reference](https://docs.authsignal.com/api/management-api)
- [Rules & Conditions](https://docs.authsignal.com/actions-rules/rules/getting-started)
- [JsonLogic](https://jsonlogic.com/)
