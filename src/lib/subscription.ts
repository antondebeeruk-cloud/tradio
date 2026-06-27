type ProfileSubscription = {
  plan?: string | null;
  subscription_status?: string | null;
  trial_expires_at?: string | null;
};

export function hasActiveSubscription(profile: ProfileSubscription | null) {
  if (!profile?.plan || profile.subscription_status !== "active") {
    return false;
  }

  if (profile.plan === "trial") {
    if (!profile.trial_expires_at) {
      return false;
    }

    return new Date(profile.trial_expires_at).getTime() > Date.now();
  }

  return profile.plan === "lite" || profile.plan === "elite";
}

export function hasEliteAccess(profile: ProfileSubscription | null) {
  return hasActiveSubscription(profile);
}

export function trialExpiryDate() {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 10);
  return expiresAt;
}
