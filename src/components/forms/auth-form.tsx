"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/components/i18n-provider";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const { t } = useI18n();
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
        setError((await res.json()).error ?? t.auth.couldNotRegister);
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
      setError(t.auth.invalid);
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <Input name="username" placeholder={t.auth.username} aria-label={t.auth.username} autoComplete="username" required />
      {mode === "register" && (
        <>
          <Input name="email" type="email" placeholder={t.auth.emailOptional} aria-label={t.auth.emailOptional} autoComplete="email" />
          <Input name="name" placeholder={t.auth.displayName} aria-label={t.auth.displayName} />
        </>
      )}
      <Input
        name="password"
        type="password"
        placeholder={t.auth.password}
        aria-label={t.auth.password}
        autoComplete={mode === "login" ? "current-password" : "new-password"}
        minLength={8}
        required
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit" disabled={loading} className="w-full">
        {loading ? t.common.pleaseWait : mode === "login" ? t.auth.signInBtn : t.auth.createBtn}
      </Button>
      <p className="text-center text-sm text-[var(--muted-foreground)]">
        {mode === "login" ? (
          <>{t.auth.noAccount} <Link href="/signup" className="underline">{t.auth.signUp}</Link></>
        ) : (
          <>{t.auth.haveAccount} <Link href="/login" className="underline">{t.auth.signInBtn}</Link></>
        )}
      </p>
    </form>
  );
}
