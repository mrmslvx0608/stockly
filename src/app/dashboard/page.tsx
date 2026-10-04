import { redirect } from "next/navigation";
import { signOut } from "@/app/auth/actions";
import { createClient } from "@/utils/supabase/server";

export default async function DashboardPage({
  searchParams,
}: PageProps<"/dashboard">) {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/login");
  }

  const params = await searchParams;

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6 sm:py-12">
      <header className="mb-12 flex items-center justify-between gap-4">
        <p className="text-lg font-semibold tracking-tight text-emerald-400">
          Stockly
        </p>
        <form action={signOut}>
          <button
            type="submit"
            className="cursor-pointer rounded-lg border border-zinc-700 px-4 py-2 text-sm font-medium transition-colors hover:bg-zinc-800 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-400"
          >
            Log out
          </button>
        </form>
      </header>
      <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 sm:p-8">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Welcome to Stockly
        </h1>
        <p className="mt-3 break-all text-sm text-zinc-400">
          Signed in as <span className="text-zinc-200">{user.email}</span>
        </p>
        {params.error === "signout" && (
          <p role="alert" className="mt-4 text-sm text-red-400">
            Unable to log out. Please try again.
          </p>
        )}
      </section>
    </main>
  );
}
