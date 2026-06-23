export function isConfiguredAdminEmail(email?: string | null) {
  if (!email) {
    return false;
  }

  const adminEmails = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

  return adminEmails.includes(email.toLowerCase());
}

export function hasAdminAccess(profileRole?: string | null, email?: string | null) {
  return profileRole === "admin" || isConfiguredAdminEmail(email);
}
