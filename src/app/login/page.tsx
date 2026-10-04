import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (!error && user) {
    redirect("/dashboard");
  }

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12 sm:px-6">
      <section
        aria-labelledby="login-heading"
        className="w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-xl sm:p-8"
      >
        <p className="mb-8 text-lg font-semibold tracking-tight text-emerald-400">
          Stockly
        </p>
        <h1 id="login-heading" className="text-2xl font-semibold tracking-tight">
          Welcome back
        </h1>
        <p className="mt-2 mb-8 text-sm text-zinc-400">
          Sign in to your Stockly account.
        </p>
        <LoginForm />
      </section>
    </main>
  );
}
