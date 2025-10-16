/**
 * Subscription utility functions
 * Centralized logic to avoid duplication
 */

interface SubscriptionLike {
  subscription_tier?: string | null;
  subscription_type?: string | null;
  subscribed?: boolean;
  status?: string;
}

/**
 * Check if user has developer access
 */
export const isDeveloperTier = (subscription: SubscriptionLike | null | undefined): boolean => {
  if (!subscription) return false;
  
  // Check for developer tier in different formats
  const isDeveloper = 
    (subscription.subscription_tier === 'developer' && subscription.subscribed === true) ||
    (subscription.subscription_type === 'developer' && subscription.status === 'active');
    
  return isDeveloper;
};

/**
 * Check if subscription is expired
 */
export const isSubscriptionExpired = (subscriptionEnd: string | null | undefined): boolean => {
  if (!subscriptionEnd) return false;
  return new Date(subscriptionEnd) < new Date();
};

/**
 * Get days until expiration
 */
export const getDaysUntilExpiration = (subscriptionEnd: string | null | undefined): number | null => {
  if (!subscriptionEnd) return null;
  
  const expirationDate = new Date(subscriptionEnd);
  const today = new Date();
  const diffTime = expirationDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays;
};
