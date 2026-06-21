import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/forms/auth-form";
import { LanguageSwitcher } from "@/components/language-switcher";
import { getI18n } from "@/lib/i18n/server";

export default async function SignupPage() {
  const session = await auth();
  if (session?.user) redirect("/dashboard");
  const { t } = await getI18n();

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6">
      <div className="mb-6 flex justify-end">
        <LanguageSwitcher />
      </div>
      <h1 className="text-2xl font-semibold">{t.auth.createTitle}</h1>
      <p className="mt-2 mb-6 text-sm text-[var(--muted-foreground)]">{t.auth.createSubtitle}</p>
      <AuthForm mode="register" />
    </main>
  );
}
