const Stripe = require('stripe');
const { createClient } = require('@supabase/supabase-js');

function getSubscriptionInterval(subscription) {
  const interval = subscription?.items?.data?.[0]?.price?.recurring?.interval;
  if (interval === 'month' || interval === 'year') return interval;
  return null;
}

function normalizeStripeId(value) {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && value.id) return String(value.id);
  return String(value);
}

exports.handler = async (event) => {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const supabase = createClient(
    process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const sig = event.headers['stripe-signature'];
  let stripeEvent;

  try {
    stripeEvent = stripe.webhooks.constructEvent(
      event.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature error:', err.message);
    return { statusCode: 400, body: `Webhook Error: ${err.message}` };
  }

  console.log('Webhook event type:', stripeEvent.type);

  if (stripeEvent.type === 'checkout.session.completed') {
    const session = stripeEvent.data.object;
    const userId = session.metadata?.userId;
    console.log('Checkout completed for userId:', userId);

    if (userId) {
      let subscriptionInterval = null;
      const subscriptionId = normalizeStripeId(session.subscription);
      if (subscriptionId) {
        try {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          subscriptionInterval = getSubscriptionInterval(subscription);
        } catch (err) {
          console.error('Could not retrieve subscription for checkout session:', err.message);
        }
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          plan: 'premium',
          stripe_customer_id: normalizeStripeId(session.customer),
          stripe_subscription_id: subscriptionId,
          subscription_interval: subscriptionInterval,
        })
        .eq('id', userId);

      if (error) console.error('Supabase update error:', error);
      else console.log('Profile upgraded to premium for userId:', userId, subscriptionInterval);
    }
  }

  if (
    stripeEvent.type === 'customer.subscription.created' ||
    stripeEvent.type === 'customer.subscription.updated'
  ) {
    const subscription = stripeEvent.data.object;
    const customerId = normalizeStripeId(subscription.customer);
    const subscriptionInterval = getSubscriptionInterval(subscription);
    console.log(`${stripeEvent.type} for customer:`, customerId, subscriptionInterval);

    const { error } = await supabase
      .from('profiles')
      .update({
        plan: 'premium',
        stripe_subscription_id: subscription.id,
        subscription_interval: subscriptionInterval,
      })
      .eq('stripe_customer_id', customerId);

    if (error) console.error('Supabase update error:', error);
    else console.log('Profile subscription synced via', stripeEvent.type);
  }

  if (stripeEvent.type === 'customer.subscription.deleted') {
    const subscription = stripeEvent.data.object;
    console.log('Subscription deleted:', subscription.id);

    const { error } = await supabase
      .from('profiles')
      .update({ plan: 'free', subscription_interval: null })
      .eq('stripe_subscription_id', subscription.id);

    if (error) console.error('Supabase update error:', error);
    else console.log('Profile downgraded to free');
  }

  return { statusCode: 200, body: JSON.stringify({ received: true }) };
};
