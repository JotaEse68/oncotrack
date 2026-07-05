"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function updateProfile(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const full_name = String(formData.get("full_name") ?? "").trim();
  const birth_date = String(formData.get("birth_date") ?? "").trim() || null;

  if (!id || !full_name) return;

  const supabase = await createClient();
  // La RLS garantiza que solo el titular del perfil puede modificarlo.
  await supabase
    .from("patient_profiles")
    .update({ full_name, birth_date, updated_at: new Date().toISOString() })
    .eq("id", id);

  revalidatePath("/perfil");
  revalidatePath("/hoy");
}
