import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-08-16',
});

const BASE_URL = process.env.SERVER_BASE_URL || 'https://localhost:3000';

export async function createStripeCustomer(email: string) {
  try {
    const customer = await stripe.customers.create({ email });
    console.log('Stripe Operation: Create Customer', customer);
    return customer;
  } catch (error) {
    console.error('Error creating Stripe customer:', error);
    throw error;
  }
}

export async function createCheckoutSession(customerId: string) {
  try {
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      mode: 'setup',
      success_url: `${BASE_URL}/account?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${BASE_URL}/account`,
    });
    console.log('Stripe Operation: Create Checkout Session', session);
    return session;
  } catch (error) {
    console.error('Error creating Stripe checkout session:', error);
    throw error;
  }
}

export async function hasValidPaymentMethod(customerId: string) {
    try {
      const paymentMethods = await stripe.paymentMethods.list({
        customer: customerId,
        type: 'card',
      });
      return paymentMethods.data.length > 0;
    } catch (error) {
      console.error('Error checking for valid payment method:', error);
      return false;
    }
  }
  