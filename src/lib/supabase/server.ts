import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function createBaseClient() {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing Supabase environment variables.");
  }

  if (
    supabaseUrl.includes("your-project-ref") ||
    supabaseUrl.includes("abcxyz") ||
    supabaseAnonKey === "your-anon-public-key" ||
    supabaseAnonKey === "eyJ..."
  ) {
    throw new Error("Supabase environment variables still contain example values.");
  }

  const cookieStore = await cookies();

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value, ...options });
        } catch {
          // Server Components cannot set cookies, but middleware and actions can.
        }
      },
      remove(name: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value: "", ...options });
        } catch {
          // Server Components cannot set cookies, but middleware and actions can.
        }
      },
    },
  });
}

export async function createPersonalClient() {
  return createBaseClient();
}

export async function createClient() {
  const client = await createBaseClient();
  const getPersonalUser = client.auth.getUser.bind(client.auth);

  client.auth.getUser = async (...args) => {
    const result = await getPersonalUser(...args);
    const personalUser = result.data.user;

    if (!personalUser || result.error) {
      return result;
    }

    const { data: membership, error } = await client
      .from("workspace_members")
      .select("owner_user_id")
      .eq("user_id", personalUser.id)
      .eq("status", "active")
      .maybeSingle();

    if (error || !membership?.owner_user_id) {
      return result;
    }

    return {
      ...result,
      data: {
        user: {
          ...personalUser,
          id: membership.owner_user_id,
        },
      },
    };
  };

  return client;
}
