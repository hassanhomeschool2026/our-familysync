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
    console.error('Webhook signature error:', err.message);
    return { statusCode: 400, body: `Webhook Error: ${err.message}` };
  }

  console.log('Webhook event type:', stripeEvent.type);

  if (stripeEvent.type === 'checkout.session.completed') {
    const session = stripeEvent.data.object;
    const userId = session.metadata?.userId;
    console.log('Checkout completed for userId:', userId);

    if (userId) {
      const { error } = await supabase
        .from('profiles')
        .update({
          plan: 'premium',
          stripe_customer_id: session.customer,
          stripe_subscription_id: session.subscription,
        })
        .eq('id', userId);

      if (error) console.error('Supabase update error:', error);
      else console.log('Profile upgraded to premium for userId:', userId);
    }
  }

  if (stripeEvent.type === 'customer.subscription.created') {
    const subscription = stripeEvent.data.object;
    const customerId = subscription.customer;
    console.log('Subscription created for customer:', customerId);

    const { error } = await supabase
      .from('profiles')
      .update({
        plan: 'premium',
        stripe_subscription_id: subscription.id,
      })
      .eq('stripe_customer_id', customerId);

    if (error) console.error('Supabase update error:', error);
    else console.log('Profile upgraded via subscription.created');
  }

  if (stripeEvent.type === 'customer.subscription.deleted') {
    const subscription = stripeEvent.data.object;
    console.log('Subscription deleted:', subscription.id);

    const { error } = await supabase
      .from('profiles')
      .update({ plan: 'free' })
      .eq('stripe_subscription_id', subscription.id);

    if (error) console.error('Supabase update error:', error);
    else console.log('Profile downgraded to free');
  }

  return { statusCode: 200, body: JSON.stringify({ received: true }) };
};
