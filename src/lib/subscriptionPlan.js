/** Human-readable plan label for profile/settings. */
export function getPlanDisplayLabel(user, isPremium) {
  if (!isPremium) return 'Free plan';
  const interval = user?.subscription_interval;
  if (interval === 'month') return 'Premium Monthly';
  if (interval === 'year') return 'Premium Annual';
  return 'Premium';
}
