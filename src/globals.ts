import { Command } from "commander";

export interface GlobalOptions {
  output?: "json" | "table" | "plain";
  region?: string;
  apiKey?: string;
  managementKey?: string;
  quiet?: boolean;
  yes?: boolean;
  verbose?: boolean;
  dryRun?: boolean;
}

export function getGlobalOptions(cmd: Command): GlobalOptions {
  const root = cmd.optsWithGlobals();
  return {
    output: root.output,
    region: root.region,
    apiKey: root.apiKey,
    managementKey: root.managementKey,
    quiet: root.quiet,
    yes: root.yes,
    verbose: root.verbose,
    dryRun: root.dryRun,
  };
}

/** True when running in CI or non-interactive environment. */
export function isCI(): boolean {
  return !!(
    process.env.CI ||
    process.env.GITHUB_ACTIONS ||
    process.env.GITLAB_CI ||
    process.env.CIRCLECI ||
    process.env.BUILDKITE ||
    process.env.CODESPACES ||
    process.env.TF_BUILD
  );
}

/** True when color should be suppressed per no-color.org standard. */
export function isNoColor(): boolean {
  return process.env.NO_COLOR !== undefined || process.env.TERM === "dumb";
}

/** True when stdout is a TTY and not in CI. */
export function isInteractive(): boolean {
  return !!process.stdout.isTTY && !isCI();
}
