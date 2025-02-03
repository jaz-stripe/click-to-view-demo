import dotenv from 'dotenv';
import Stripe from 'stripe';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-08-16',
});

async function archiveAllStripePricesAndProducts() {
  if (!process.env.STRIPE_SECRET_KEY) {
    console.error('STRIPE_SECRET_KEY is not set in .env.local file');
    return;
  }

  try {
    // Deactivate all prices first
    let prices;
    do {
      prices = await stripe.prices.list({ limit: 100, active: true });
      for (let price of prices.data) {
        try {
          await stripe.prices.update(price.id, { active: false });
          console.log(`Deactivated price: ${price.id}`);
        } catch (error: any) {
          console.error(`Error deactivating price ${price.id}:`, error.message);
        }
      }
    } while (prices.has_more);

    // Then archive all products
    let products;
    do {
      products = await stripe.products.list({ limit: 100, active: true });
      for (let product of products.data) {
        try {
          await stripe.products.update(product.id, { active: false });
          console.log(`Archived product: ${product.id}`);
        } catch (error: any) {
          console.error(`Error archiving product ${product.id}:`, error.message);
        }
      }
    } while (products.has_more);

    console.log('All Stripe products have been archived and prices have been deactivated.');
  } catch (error: any) {
    console.error('Error archiving Stripe products and deactivating prices:', error.message);
  }
}

archiveAllStripePricesAndProducts().catch(console.error);
