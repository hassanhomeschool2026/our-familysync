const Stripe = require('stripe');
const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event) => {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
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
    return { statusCode: 400, body: `Webhook Error: ${err.message}` };
  }

  if (stripeEvent.type === 'checkout.session.completed') {
    const session = stripeEvent.data.object;
    const userId = session.metadata.userId;

    await supabase
      .from('profiles')
      .update({ 
        plan: 'premium',
        stripe_customer_id: session.customer,
        stripe_subscription_id: session.subscription,
      })
      .eq('id', userId);
  }

  if (stripeEvent.type === 'customer.subscription.deleted') {
    const subscription = stripeEvent.data.object;
    await supabase
      .from('profiles')
      .update({ plan: 'free' })
      .eq('stripe_subscription_id', subscription.id);
  }

  return { statusCode: 200, body: JSON.stringify({ received: true }) };
};
