"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { generateLeadEmail } from "@/lib/lead-email";
import { createClient } from "@/lib/supabase/server";

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export async function login(formData: FormData) {
  const email = getString(formData, "email");
  const password = getString(formData, "password");
  const redirectedFrom = getString(formData, "redirectedFrom");
  const safeRedirect = redirectedFrom.startsWith("/") && !redirectedFrom.startsWith("//")
    ? redirectedFrom
    : "/dashboard";

  const supabase = createClient();
  const { error } = await supabase.auth
    .signInWithPassword({
      email,
      password,
    })
    .catch((error: Error) => ({ error }));

  if (error) {
    redirect(`/login?message=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/", "layout");
  redirect(safeRedirect);
}

export async function signup(formData: FormData) {
  const email = getString(formData, "email");
  const password = getString(formData, "password");
  const fullName = getString(formData, "fullName");
  const businessName = getString(formData, "businessName");
  const origin = headers().get("origin");

  const supabase = createClient();
  const { data, error } = await supabase.auth
    .signUp({
      email,
      password,
      options: {
        emailRedirectTo: origin
          ? `${origin}/auth/callback?next=/pricing`
          : undefined,
        data: {
          full_name: fullName,
          business_name: businessName,
        },
      },
    })
    .catch((error: Error) => ({ data: { session: null, user: null }, error }));

  if (error) {
    redirect(`/signup?message=${encodeURIComponent(error.message)}`);
  }

  if (data.session && data.user) {
    const leadEmail = generateLeadEmail({
      businessName,
      email,
      fullName,
    });

    await supabase.from("profiles").upsert({
      id: data.user.id,
      full_name: fullName || null,
      business_name: businessName || null,
      ...leadEmail,
    });

    revalidatePath("/", "layout");
    redirect("/pricing");
  }

  redirect(
    `/login?message=${encodeURIComponent(
      "Check your email to confirm your account, then log in.",
    )}`,
  );
}

export async function logout() {
  const supabase = createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
