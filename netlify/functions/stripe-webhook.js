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

async function upgradeFamilyPlan(
  supabase,
  familyId,
  { subscriptionInterval, stripeCustomerId, stripeSubscriptionId, payerUserId }
) {
  if (!familyId) return;

  const { error: familyError } = await supabase
    .from('profiles')
    .update({
      plan: 'premium',
      subscription_interval: subscriptionInterval,
    })
    .eq('family_id', familyId);

  if (familyError) {
    console.error('Family premium upgrade error:', familyError);
    return;
  }

  if (payerUserId && (stripeCustomerId || stripeSubscriptionId)) {
    const { error: payerError } = await supabase
      .from('profiles')
      .update({
        stripe_customer_id: stripeCustomerId,
        stripe_subscription_id: stripeSubscriptionId,
      })
      .eq('id', payerUserId);

    if (payerError) console.error('Billing admin stripe fields update error:', payerError);
  }

  console.log('Family upgraded to premium, family_id:', familyId);
}

async function downgradeFamilyPlan(supabase, familyId, payerUserId) {
  if (!familyId) return;

  const { error: familyError } = await supabase
    .from('profiles')
    .update({
      plan: 'free',
      subscription_interval: null,
    })
    .eq('family_id', familyId);

  if (familyError) {
    console.error('Family premium downgrade error:', familyError);
    return;
  }

  if (payerUserId) {
    const { error: payerError } = await supabase
      .from('profiles')
      .update({
        stripe_customer_id: null,
        stripe_subscription_id: null,
      })
      .eq('id', payerUserId);

    if (payerError) console.error('Billing admin stripe fields clear error:', payerError);
  }

  console.log('Family downgraded to free, family_id:', familyId);
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

      const stripeCustomerId = normalizeStripeId(session.customer);
      const { data: payer, error: payerError } = await supabase
        .from('profiles')
        .select('family_id')
        .eq('id', userId)
        .maybeSingle();

      if (payerError) {
        console.error('Payer profile lookup error:', payerError);
      } else if (payer?.family_id) {
        await upgradeFamilyPlan(supabase, payer.family_id, {
          subscriptionInterval,
          stripeCustomerId,
          stripeSubscriptionId: subscriptionId,
          payerUserId: userId,
        });
      } else {
        const { error } = await supabase
          .from('profiles')
          .update({
            plan: 'premium',
            stripe_customer_id: stripeCustomerId,
            stripe_subscription_id: subscriptionId,
            subscription_interval: subscriptionInterval,
          })
          .eq('id', userId);

        if (error) console.error('Supabase update error:', error);
        else console.log('Profile upgraded to premium for userId:', userId, subscriptionInterval);
      }
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

    const { data: payer, error: payerError } = await supabase
      .from('profiles')
      .select('id, family_id')
      .eq('stripe_customer_id', customerId)
      .maybeSingle();

    if (payerError) {
      console.error('Billing admin lookup error:', payerError);
    } else if (payer?.family_id) {
      await upgradeFamilyPlan(supabase, payer.family_id, {
        subscriptionInterval,
        stripeSubscriptionId: subscription.id,
        payerUserId: payer.id,
      });
    } else if (payer) {
      const { error } = await supabase
        .from('profiles')
        .update({
          plan: 'premium',
          stripe_subscription_id: subscription.id,
          subscription_interval: subscriptionInterval,
        })
        .eq('id', payer.id);

      if (error) console.error('Supabase update error:', error);
      else console.log('Profile subscription synced via', stripeEvent.type);
    }
  }

  if (stripeEvent.type === 'customer.subscription.deleted') {
    const subscription = stripeEvent.data.object;
    console.log('Subscription deleted:', subscription.id);

    const { data: payer, error: payerError } = await supabase
      .from('profiles')
      .select('id, family_id')
      .eq('stripe_subscription_id', subscription.id)
      .maybeSingle();

    if (payerError) {
      console.error('Billing admin lookup error:', payerError);
    } else if (payer?.family_id) {
      await downgradeFamilyPlan(supabase, payer.family_id, payer.id);
    } else {
      const { error } = await supabase
        .from('profiles')
        .update({
          plan: 'free',
          subscription_interval: null,
          stripe_customer_id: null,
          stripe_subscription_id: null,
        })
        .eq('stripe_subscription_id', subscription.id);

      if (error) console.error('Supabase update error:', error);
      else console.log('Profile downgraded to free');
    }
  }

  return { statusCode: 200, body: JSON.stringify({ received: true }) };
};
