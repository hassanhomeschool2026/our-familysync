/** True if any member of the family (or the current user while loading) has premium. */
export function familyHasPremium(members = [], currentUser = null) {
  if (members.length > 0) {
    return members.some((m) => m.plan === 'premium');
  }
  return currentUser?.plan === 'premium';
}

/** Profile that owns the Stripe subscription for the family. */
export function getFamilyBillingMember(members = [], currentUser = null) {
  const pool = members.length > 0 ? members : currentUser ? [currentUser] : [];
  return (
    pool.find((m) => m.stripe_customer_id || m.stripe_subscription_id) ||
    pool.find((m) => m.subscription_interval) ||
    null
  );
}

export function isFamilyBillingAdmin(user) {
  return Boolean(user?.stripe_customer_id);
}

/** Human-readable plan label for profile/settings. */
export function getPlanDisplayLabel(user, isPremium, members = []) {
  if (!isPremium) return 'Free plan';
  const billingMember = getFamilyBillingMember(members, user);
  const interval = billingMember?.subscription_interval || user?.subscription_interval;
  if (interval === 'month') return 'Premium Monthly';
  if (interval === 'year') return 'Premium Annual';
  return 'Premium';
}
