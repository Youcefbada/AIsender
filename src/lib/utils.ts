import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Normalize a website/URL to a bare registrable-ish domain for dedup. */
export function normalizeDomain(input: string): string | null {
  if (!input) return null;
  try {
    const url = input.includes("://") ? input : `https://${input}`;
    const host = new URL(url).hostname.toLowerCase();
    return host.replace(/^www\./, "");
  } catch {
    return null;
  }
}
