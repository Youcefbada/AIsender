import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/forms/auth-form";

export default async function SignupPage() {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6">
      <h1 className="text-2xl font-semibold">Create your account</h1>
      <p className="mt-2 mb-6 text-sm text-[var(--muted-foreground)]">
        Sign up, then add your own free API keys in Settings to start finding leads.
      </p>
      <AuthForm mode="register" />
    </main>
  );
}
