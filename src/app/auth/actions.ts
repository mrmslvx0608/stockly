"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

export type LoginState = { error: string | null };

export async function signIn(
  _previousState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = formData.get("email");
  const password = formData.get("password");

  if (
    typeof email !== "string" ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ||
    typeof password !== "string" ||
    password.length === 0
  ) {
    return { error: "Enter a valid email address and your password." };
  }

  const supabase = await createClient();

  try {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      if (error.code === "invalid_credentials") {
        return { error: "Incorrect email or password. Please try again." };
      }

      if (error.status === 429) {
        return { error: "Too many sign-in attempts. Please try again later." };
      }

      return { error: "Unable to sign in. Please try again." };
    }
  } catch {
    return { error: "Unable to connect. Please try again." };
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  let failed = false;

  try {
    const { error } = await supabase.auth.signOut({ scope: "local" });
    failed = Boolean(error);
  } catch {
    failed = true;
  }

  if (failed) {
    redirect("/dashboard?error=signout");
  }

  revalidatePath("/", "layout");
  redirect("/login");
}
