import NextAuth, { type NextAuthConfig } from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { prisma } from "./db";
import { config } from "./config";

// NextAuth / Auth.js v5.
// Primary login = username + password (Credentials). Credentials requires the
// JWT session strategy, so we use JWT and rehydrate user.id via callbacks.
// Google OAuth stays optional (registered only when env vars exist).

const providers: NextAuthConfig["providers"] = [
  Credentials({
    name: "Username & password",
    credentials: {
      username: { label: "Username", type: "text" },
      password: { label: "Password", type: "password" },
    },
    async authorize(creds) {
      const username = String(creds?.username ?? "").trim().toLowerCase();
      const password = String(creds?.password ?? "");
      if (!username || !password) return null;

      const user = await prisma.user.findUnique({ where: { username } });
      if (!user?.passwordHash) return null;

      const ok = await bcrypt.compare(password, user.passwordHash);
      if (!ok) return null;

      return {
        id: user.id,
        name: user.name ?? user.username,
        email: user.email ?? undefined,
      };
    },
  }),
];

if (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET) {
  providers.push(
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  secret: config.authSecret,
  // No domain needed: trust the deploy host (works on any Hostinger URL).
  trustHost: true,
  providers,
  pages: { signIn: "/login" },
  callbacks: {
    // With JWT sessions, propagate the DB user id onto the session.
    async jwt({ token, user }) {
      if (user?.id) token.sub = user.id;
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) session.user.id = token.sub;
      return session;
    },
  },
});

/** Throw-on-missing helper for API routes. Returns the authenticated user id. */
export async function requireUserId(): Promise<string> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) throw new Response("Unauthorized", { status: 401 });
  return userId;
}
