import type { DefaultSession } from "next-auth";

// Ensure session.user.id is typed (populated by the Prisma adapter / db sessions).
declare module "next-auth" {
  interface Session {
    user: { id: string } & DefaultSession["user"];
  }
}
