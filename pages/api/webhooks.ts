import { buffer } from 'micro';
import Stripe from 'stripe';
import { NextApiRequest, NextApiResponse } from 'next';
import { getDb } from '../../lib/db';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-08-16',
});

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log('Received webhook request');

  if (req.method === 'POST') {
    const buf = await buffer(req);
    const sig = req.headers['stripe-signature'] as string;

    console.log('Webhook signature:', sig);

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(buf, sig, process.env.STRIPE_WEBHOOK_SECRET!);
      console.log('Webhook verified');
    } catch (err: any) {
      console.error(`Webhook Error: ${err.message}`);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    console.log('Webhook event type:', event.type);

    const db = await getDb();

    // Handle the event
    try {
      switch (event.type) {
        case 'payment_method.attached':
          await handlePaymentMethodAttached(db, event.data.object as Stripe.PaymentMethod);
          break;
        case 'payment_method.detached':
          await handlePaymentMethodDetached(db, event.data.object as Stripe.PaymentMethod);
          break;
        // case 'customer.subscription.created':
        // case 'customer.subscription.updated':
        case 'customer.subscription.deleted':
          await handleSubscriptionChange(db, event.data.object as Stripe.Subscription);
          break;
        case 'invoice.paid':
          await handleInvoicePaid(db, event.data.object as Stripe.Invoice);
          break;
        case 'invoice.payment_failed':
          await handleInvoicePaymentFailed(db, event.data.object as Stripe.Invoice);
          break;
        case 'customer.updated':
          await handleCustomerUpdated(db, event.data.object as Stripe.Customer);
          break;
        default:
          console.log(`Unhandled event type ${event.type}`);
      }
    } catch (error) {
      console.error(`Error processing webhook event ${event.type}:`, error);
      return res.status(500).json({ error: 'Error processing webhook event' });
    }

    // Return a response to acknowledge receipt of the event
    res.json({ received: true });
  } else {
    res.setHeader('Allow', 'POST');
    res.status(405).end('Method Not Allowed');
  }
}

async function handlePaymentMethodAttached(db: any, paymentMethod: Stripe.PaymentMethod) {
  await db.run('UPDATE users SET hasPaymentMethod = ? WHERE stripeCustomerId = ?', [true, paymentMethod.customer]);
  console.log(`Payment method attached for customer: ${paymentMethod.customer}`);
}

async function handlePaymentMethodDetached(db: any, paymentMethod: Stripe.PaymentMethod) {
  // Check if the customer has any remaining payment methods
  const remainingPaymentMethods = await stripe.paymentMethods.list({
    customer: paymentMethod.customer as string,
    type: 'card',
  });

  if (remainingPaymentMethods.data.length === 0) {
    await db.run('UPDATE users SET hasPaymentMethod = ? WHERE stripeCustomerId = ?', [false, paymentMethod.customer]);
    console.log(`All payment methods removed for customer: ${paymentMethod.customer}`);
  }
}

async function handleSubscriptionChange(db: any, subscription: Stripe.Subscription) {
  const user = await db.get('SELECT * FROM users WHERE stripeCustomerId = ?', [subscription.customer]);
  if (!user) {
    console.log(`No user found for customer: ${subscription.customer}`);
    return;
  }

  // TODO: FIX THIS LOGIC - remove the relevant subscription
  // We are just hard removing the access
  if (subscription.status === 'canceled') {
    await db.run('DELETE FROM user_subscriptions WHERE subscription_id =?', [subscription.id]);
    console.log(`Subscription canceled for user: ${user.id}. Removed from DB`);
  }

//   if (subscription.status === 'active') {
//     await db.run('UPDATE users SET hasPaymentMethod = ?, stripeSubscriptionId = ? WHERE id = ?', [true, subscription.id, user.id]);
//     console.log(`Subscription activated for user: ${user.id}`);
//   } else if (subscription.status === 'canceled') {
//     await db.run('UPDATE users SET stripeSubscriptionId = NULL WHERE id = ?', [user.id]);
//     console.log(`Subscription canceled for user: ${user.id}`);
//     // Note: We're not removing access to premium content here. 
//     // You may want to implement a grace period or immediate removal based on your business logic.
//   }
}

async function handleInvoicePaid(db: any, invoice: Stripe.Invoice) {
  const user = await db.get('SELECT * FROM users WHERE stripeCustomerId = ?', [invoice.customer]);
  if (!user) {
    console.log(`No user found for customer: ${invoice.customer}`);
    return;
  }

  // Update user's payment status or add purchased items to their account
  // This depends on your specific implementation and data model
  console.log(`Invoice paid for user ${user.id}`);
  // You might want to add logic here to update the user's access to content based on what they've paid for
}

async function handleInvoicePaymentFailed(db: any, invoice: Stripe.Invoice) {
  const user = await db.get('SELECT * FROM users WHERE stripeCustomerId = ?', [invoice.customer]);
  if (!user) {
    console.log(`No user found for customer: ${invoice.customer}`);
    return;
  }

  // Handle failed payment (e.g., notify user, restrict access)
  console.log(`Invoice payment failed for user ${user.id}`);
  // You might want to add logic here to restrict the user's access to content due to failed payment
}

async function handleCustomerUpdated(db: any, customer: Stripe.Customer) {
  const user = await db.get('SELECT * FROM users WHERE stripeCustomerId = ?', [customer.id]);
  if (!user) {
    console.log(`No user found for customer: ${customer.id}`);
    return;
  }

  // Update user's payment method status
  const hasPaymentMethod = customer.invoice_settings.default_payment_method !== null;
  await db.run('UPDATE users SET hasPaymentMethod = ? WHERE id = ?', [hasPaymentMethod, user.id]);
  console.log(`Updated payment method status for user ${user.id}: ${hasPaymentMethod}`);
}
