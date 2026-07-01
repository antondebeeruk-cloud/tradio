import type { SupabaseClient, User } from "@supabase/supabase-js";

export type WorkspaceContext = {
  isOwner: boolean;
  ownerUserId: string;
  personalUser: User;
  role: "member" | "owner";
};

export async function getWorkspaceContext(
  supabase: SupabaseClient,
  personalUser: User,
): Promise<WorkspaceContext> {
  const { data: membership } = await supabase
    .from("workspace_members")
    .select("owner_user_id, role")
    .eq("user_id", personalUser.id)
    .eq("status", "active")
    .maybeSingle();

  if (!membership?.owner_user_id) {
    return {
      isOwner: true,
      ownerUserId: personalUser.id,
      personalUser,
      role: "owner",
    };
  }

  return {
    isOwner: false,
    ownerUserId: membership.owner_user_id,
    personalUser,
    role: membership.role === "owner" ? "owner" : "member",
  };
}
