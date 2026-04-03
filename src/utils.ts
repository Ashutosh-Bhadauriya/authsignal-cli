import { createInterface } from "node:readline";
import { GlobalOptions, isCI } from "./globals.js";

export async function confirm(
  message: string,
  opts: GlobalOptions,
): Promise<boolean> {
  if (opts.yes) return true;
  if (!process.stdin.isTTY || isCI()) return true; // non-interactive / CI = auto-confirm

  const rl = createInterface({
    input: process.stdin,
    output: process.stderr,
  });

  return new Promise((resolve) => {
    rl.question(`${message} [y/N] `, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === "y" || answer.toLowerCase() === "yes");
    });
  });
}

export async function readStdin(): Promise<string> {
  if (process.stdin.isTTY) {
    throw new Error("No data on stdin. Pipe data or use --file.");
  }

  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("utf-8");
}

export function withErrorHandler(fn: (...args: unknown[]) => Promise<void>) {
  return async (...args: unknown[]) => {
    try {
      await fn(...args);
    } catch (err) {
      const { printError } = await import("./output.js");
      printError(err);
      process.exit(1);
    }
  };
}
