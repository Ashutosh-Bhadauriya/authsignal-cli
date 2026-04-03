import chalk from "chalk";
import Table from "cli-table3";
import { GlobalOptions, isNoColor } from "./globals.js";
import { ApiError } from "./client.js";

type OutputFormat = "json" | "table" | "plain";

// Respect NO_COLOR standard
if (isNoColor()) {
  chalk.level = 0;
}

function detectFormat(opts: GlobalOptions): OutputFormat {
  if (opts.output) return opts.output;
  return process.stdout.isTTY ? "table" : "json";
}

export function printData(
  data: unknown,
  opts: GlobalOptions,
  columns?: { key: string; header: string }[],
): void {
  const format = detectFormat(opts);

  if (format === "json") {
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  if (format === "plain") {
    printPlain(data);
    return;
  }

  // table format
  if (Array.isArray(data)) {
    printTable(data, columns);
  } else if (typeof data === "object" && data !== null) {
    printObject(data as Record<string, unknown>);
  } else {
    console.log(String(data));
  }
}

function printPlain(data: unknown, prefix = ""): void {
  if (Array.isArray(data)) {
    data.forEach((item, i) => printPlain(item, `[${i}].`));
    return;
  }
  if (typeof data === "object" && data !== null) {
    for (const [key, value] of Object.entries(data)) {
      if (typeof value === "object" && value !== null) {
        printPlain(value, `${prefix}${key}.`);
      } else {
        console.log(`${prefix}${key}=${value}`);
      }
    }
    return;
  }
  console.log(String(data));
}

function printTable(
  rows: Record<string, unknown>[],
  columns?: { key: string; header: string }[],
): void {
  if (rows.length === 0) {
    console.log(chalk.dim("No results."));
    return;
  }

  const cols =
    columns ||
    Object.keys(rows[0]).map((k) => ({ key: k, header: k }));

  const table = new Table({
    head: cols.map((c) => chalk.bold(c.header)),
    style: { head: [], border: [] },
  });

  for (const row of rows) {
    table.push(cols.map((c) => formatCell(row[c.key])));
  }

  console.log(table.toString());
}

function printObject(obj: Record<string, unknown>): void {
  const table = new Table({
    style: { head: [], border: [] },
  });

  for (const [key, value] of Object.entries(obj)) {
    table.push({ [chalk.bold(key)]: formatCell(value) });
  }

  console.log(table.toString());
}

function formatCell(value: unknown): string {
  if (value === null || value === undefined) return chalk.dim("-");
  if (typeof value === "boolean") return value ? chalk.green("true") : chalk.red("false");
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

export function printSuccess(message: string, opts: GlobalOptions): void {
  if (opts.quiet) return;
  console.error(chalk.green(message));
}

export function printError(error: unknown): void {
  if (error instanceof ApiError) {
    console.error(chalk.red(`Error: ${error.message}`));
    if (error.hint) {
      console.error(chalk.dim(error.hint));
    }
  } else if (error instanceof Error) {
    console.error(chalk.red(`Error: ${error.message}`));
  } else {
    console.error(chalk.red(`Error: ${String(error)}`));
  }
}

export function printWarning(message: string): void {
  console.error(chalk.yellow(`Warning: ${message}`));
}

export function printDryRun(action: string, details: Record<string, unknown>): void {
  console.error(chalk.yellow(`[dry-run] Would ${action}:`));
  for (const [key, value] of Object.entries(details)) {
    console.error(chalk.dim(`  ${key}: ${typeof value === "object" ? JSON.stringify(value) : value}`));
  }
  console.error(chalk.yellow("No changes made."));
}
