// lib/stripe.ts
import Stripe from 'stripe';
import { getDb } from './db';

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

export async function createCheckoutSession(customerId: string, returnUrl: string) {
    return stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      mode: 'setup',
      success_url: `${returnUrl}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${returnUrl}`,
    });
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

  export async function createOrRetrieveSubscription(customerId: string) {
    const subscriptions = await stripe.subscriptions.list({ customer: customerId });
    if (subscriptions.data.length > 0) {
      return subscriptions.data[0];
    }
  
    // Set the billing cycle anchor to the last day of the current month
    const now = new Date();
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  
    return stripe.subscriptions.create({
      customer: customerId,
      items: [],
      billing_cycle_anchor: Math.floor(lastDayOfMonth.getTime() / 1000),
      proration_behavior: 'create_prorations',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice.payment_intent'],
    });
  }
  
  export async function addItemToSubscription(subscriptionId: string, priceId: string) {
    return stripe.subscriptionItems.create({
      subscription: subscriptionId,
      price: priceId,
      quantity: 1,
      proration_behavior: 'create_prorations',
    });
  }
  
  export async function retrieveSubscription(subscriptionId: string) {
    return stripe.subscriptions.retrieve(subscriptionId);
  }

  export async function getOrCreateFreeSubscription(db: any) {
    console.log('Entering getOrCreateFreeSubscription');
    try {
      // Check if the free subscription module already exists
      let freeModule = await db.get('SELECT stripe_product_id, stripe_price_id FROM modules WHERE name = ?', ['TVNZ Premium Free Subscription']);
      console.log('Free module query result:', freeModule);
  
      if (freeModule) {
        console.log('Existing free subscription found:', freeModule);
        return { productId: freeModule.stripe_product_id, priceId: freeModule.stripe_price_id };
      }
  
      console.log('No free subscription found, creating it');
  
      // Create Stripe product and price
      const product = await stripe.products.create({
        name: 'TVNZ Premium',
        description: 'Free access to premium content',
      });
      console.log('Stripe product created:', product.id);
  
      const price = await stripe.prices.create({
        product: product.id,
        unit_amount: 0,
        currency: 'nzd',
        recurring: { interval: 'month' },
      });
      console.log('Stripe price created:', price.id);
  
      // Save the free subscription module
      await db.run(
        'INSERT INTO modules (name, stripe_product_id, stripe_price_id) VALUES (?, ?, ?)',
        ['TVNZ Premium Free Subscription', product.id, price.id]
      );
  
      console.log('New free subscription created:', { productId: product.id, priceId: price.id });
      return { productId: product.id, priceId: price.id };
    } catch (error) {
      console.error('Error in getOrCreateFreeSubscription:', error);
      throw error;
    }
  }
  
  async function getFreeSubscriptionModule(db: any): Promise<{ stripe_product_id: string, stripe_price_id: string } | null> {
    console.log('Entering getFreeSubscriptionModule');
    const query = 'SELECT stripe_product_id, stripe_price_id FROM modules WHERE name = ?';
    const params = ['TVNZ Premium Free Subscription'];
    
    return new Promise((resolve, reject) => {
      db.get(query, params, (err, row) => {
        if (err) {
          console.error('Error in getFreeSubscriptionModule:', err);
          reject(err);
        } else {
          console.log('Query result:', row);
          resolve(row || null);
        }
      });
    });
  }
  