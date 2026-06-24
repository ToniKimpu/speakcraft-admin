"use server";

import { createAuthClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { loginFormSchema } from "@/lib/validations/auth";

export async function loginAction(formData: { email: string; password: string }) {
  const parsed = loginFormSchema.safeParse(formData);
  if (!parsed.success) {
    return { error: "Invalid email or password" };
  }

  const supabase = await createAuthClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    return { error: error.message };
  }

  redirect("/days");
}

export async function logoutAction() {
  const supabase = await createAuthClient();
  await supabase.auth.signOut();
  redirect("/login");
}
