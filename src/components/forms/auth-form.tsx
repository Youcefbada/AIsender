"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const username = String(fd.get("username") || "");
    const password = String(fd.get("password") || "");

    if (mode === "register") {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          password,
          email: fd.get("email") || "",
          name: fd.get("name") || undefined,
        }),
      });
      if (!res.ok) {
        setLoading(false);
        setError((await res.json()).error ?? "Could not register");
        return;
      }
    }

    const result = await signIn("credentials", {
      username,
      password,
      redirect: false,
    });
    setLoading(false);
    if (result?.error) {
      setError("Invalid username or password");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <Input name="username" placeholder="Username" autoComplete="username" required />
      {mode === "register" && (
        <>
          <Input name="email" type="email" placeholder="Email (optional)" autoComplete="email" />
          <Input name="name" placeholder="Display name (optional)" />
        </>
      )}
      <Input
        name="password"
        type="password"
        placeholder="Password"
        autoComplete={mode === "login" ? "current-password" : "new-password"}
        minLength={8}
        required
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit" disabled={loading} className="w-full">
        {loading ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}
      </Button>
      <p className="text-center text-sm text-[var(--muted-foreground)]">
        {mode === "login" ? (
          <>No account? <Link href="/signup" className="underline">Sign up</Link></>
        ) : (
          <>Have an account? <Link href="/login" className="underline">Sign in</Link></>
        )}
      </p>
    </form>
  );
}
