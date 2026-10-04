import "server-only";

import { createClient } from "@/utils/supabase/server";

type HouseholdContext =
  | {
      ok: true;
      supabase: Awaited<ReturnType<typeof createClient>>;
      householdId: string;
    }
  | { ok: false; reason: "authentication" | "membership"; error: string };

export async function resolveHousehold(): Promise<HouseholdContext> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        ok: false,
        reason: "authentication",
        error: "Your session has expired. Please sign in again.",
      };
    }

    // RLS also exposes fellow members' rows: filter by the verified user ID.
    const { data, error } = await supabase
      .from("household_members")
      .select("household_id")
      .eq("user_id", user.id)
      .limit(2);

    if (error || !data) {
      return {
        ok: false,
        reason: "membership",
        error: "Unable to load your household. Please try again.",
      };
    }

    if (data.length !== 1) {
      return {
        ok: false,
        reason: "membership",
        error: data.length === 0
          ? "Your account has no household membership. Contact the household administrator."
          : "Your account belongs to multiple households. Stockly currently requires exactly one household.",
      };
    }

    return { ok: true, supabase, householdId: data[0].household_id };
  } catch {
    return {
      ok: false,
      reason: "membership",
      error: "Unable to connect to your household. Please try again.",
    };
  }
}
