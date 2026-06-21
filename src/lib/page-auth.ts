import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

// Server-component guard: returns the userId or redirects to /login.
export async function requirePageUser(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return session.user.id;
}
