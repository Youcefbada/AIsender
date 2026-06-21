import { promises as dns } from "node:dns";

// Email validation before send (STEP 4). Two cheap, no-cost checks:
//   1. RFC-ish syntax
//   2. Domain has MX records (deliverable mailbox host exists)
// We intentionally avoid paid verification APIs for the free tier. Role-based
// addresses (info@, support@) are flagged RISKY, not invalid.

const SYNTAX =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

const ROLE_PREFIXES = [
  "info",
  "support",
  "contact",
  "admin",
  "sales",
  "hello",
  "office",
  "team",
  "help",
  "no-reply",
  "noreply",
];

export type EmailVerdict = "VALID" | "RISKY" | "INVALID";

export interface ValidationResult {
  verdict: EmailVerdict;
  reason: string;
}

export async function validateEmail(email: string): Promise<ValidationResult> {
  const value = email.trim().toLowerCase();
  if (!SYNTAX.test(value)) return { verdict: "INVALID", reason: "bad syntax" };

  const [local, domain] = value.split("@");

  try {
    const mx = await dns.resolveMx(domain);
    if (!mx || mx.length === 0) {
      return { verdict: "INVALID", reason: "no MX records" };
    }
  } catch {
    return { verdict: "INVALID", reason: "domain not resolvable" };
  }

  if (ROLE_PREFIXES.includes(local)) {
    return { verdict: "RISKY", reason: "role-based address" };
  }

  return { verdict: "VALID", reason: "syntax + MX ok" };
}
