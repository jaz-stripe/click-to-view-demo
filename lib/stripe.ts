// lib/stripe.ts
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
  
export async function createOrUpdateStripeProducts(content: any, videoId: number) {
    // Create or update the main product for the video
    const product = await stripe.products.create({
      name: content.title,
      metadata: {
        videoId: videoId.toString(),
        type: content.type,
        series: content.series || '',
      },
    });
  
    // Create price for one-time purchase
    const tierPrice = parseTier(content.tier);
    await stripe.prices.create({
      product: product.id,
      unit_amount: tierPrice.amount,
      currency: 'nzd',
      metadata: {
        type: 'one_time',
        duration: tierPrice.duration ? tierPrice.duration.toString() : '',
      },
    });
  
    return product;
  }

export async function getOrCreateSeriesProduct(series: string, type: string) {
  const existingProducts = await stripe.products.list({ 
    active: true,
    metadata: { series: series }
  });

  if (existingProducts.data.length > 0) {
    return existingProducts.data[0];
  }

  const product = await stripe.products.create({
    name: `${series} (${type})`,
    metadata: { series: series, type: type },
  });

  await stripe.prices.create({
    product: product.id,
    unit_amount: 5000, // Example: $50 for a season
    currency: 'nzd',
    metadata: { type: 'season' },
  });

  return product;
}

export async function getOrCreateModuleProduct(type: string) {
  const existingProducts = await stripe.products.list({ 
    active: true,
    metadata: { type: type, isModule: 'true' }
  });

  if (existingProducts.data.length > 0) {
    return existingProducts.data[0];
  }

  const product = await stripe.products.create({
    name: `${type.charAt(0).toUpperCase() + type.slice(1)} Module`,
    metadata: { type: type, isModule: 'true' },
  });

  await stripe.prices.create({
    product: product.id,
    unit_amount: 2000, // Example: $20 per month for a module
    currency: 'nzd',
    recurring: { interval: 'month' },
    metadata: { type: 'module' },
  });

  return product;
}

function parseTier(tier: string): { amount: number, duration: number | null } {
    if (tier.endsWith('s')) {
      const [price, seconds] = tier.slice(0, -1).split('_');
      return { 
        amount: Math.round(parseFloat(price) * 100), 
        duration: parseInt(seconds) 
      };
    }
    return { amount: Math.round(parseFloat(tier) * 100), duration: null };
  }
