// lib/stripe.ts
import Stripe from 'stripe';

import { STRIPE_SECRET_KEY } from './config.ts';

const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: '2023-08-16',
});

const BASE_URL = process.env.SERVER_BASE_URL || 'https://localhost:3000';

function getNextMonthFirstDay() {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() + 1, 1).getTime() / 1000;
}

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

export async function createStripeCustomerSubscription(customerId: string, priceId: string) {
    console.log(`Creating subscription for ${customerId} with price id ${priceId}`);
    try {
        const subscription = await stripe.subscriptions.create({
            customer: customerId,
            items: [{ price: priceId }],
            billing_cycle_anchor: getNextMonthFirstDay(),
            proration_behavior: 'none',
        });
        return subscription;
    } catch (error) {
        console.error('Error creating Stripe subscription:', error);
        throw error;
      }
}

export async function createCheckoutSession(customerId: string, returnUrl: string, cancelUrl: string) {
    console.log(`Creating checkout session for ${customerId} with return url ${returnUrl} and cancel url ${cancelUrl}`);
    try {
        const checkoutSession = await stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ['card'],
        mode: 'setup',
        success_url: returnUrl || `${process.env.NEXT_PUBLIC_BASE_URL}/account`,
        cancel_url: cancelUrl || returnUrl || `${process.env.NEXT_PUBLIC_BASE_URL}/account`,
        });
        return checkoutSession;
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

  export async function createOrRetrieveSubscription(customerId: string) {
    const subscriptions = await stripe.subscriptions.list({ customer: customerId });
    if (subscriptions.data.length > 0) {
      return subscriptions.data[0];
    }
  
    return stripe.subscriptions.create({
      customer: customerId,
      items: [],
      billing_cycle_anchor: getNextMonthFirstDay(),
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
  
  export async function retrievePrice(priceId: string) {
    return stripe.prices.retrieve(priceId);
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
  

// Purchases functions
export async function addVideoToSubscription(subscriptionId: string, priceId: string): Promise<Stripe.InvoiceItem> {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    
    return stripe.invoiceItems.create({
        customer: subscription.customer as string,
        price: priceId,
        quantity: 1,
    });
}

export async function addSeasonToSubscription(subscriptionId: string, priceId: string): Promise<Stripe.InvoiceItem> {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    
    return stripe.invoiceItems.create({
        customer: subscription.customer as string,
        price: priceId,
        quantity: 1,
    });
}

export async function createModuleSubscription(customerId: string, priceId: string, type: string): Promise<Stripe.Subscription> {
    return stripe.subscriptions.create({
        customer: customerId,
        items: [{ price: priceId }],
        billing_cycle_anchor: getNextMonthFirstDay(),
        proration_behavior: 'none',
        metadata: { type: type },
    });
}

// Portal
export async function createPortalSession(customerId: string, returnUrl: string):Promise<Stripe.Response<Stripe.BillingPortal.Session>> {
    return stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: returnUrl,
    });
}