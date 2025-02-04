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
  console.log('Received webhook request');  // Add this line

  if (req.method === 'POST') {
    const buf = await buffer(req);
    const sig = req.headers['stripe-signature'] as string;

    console.log('Webhook signature:', sig);  // Add this line

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(buf, sig, process.env.STRIPE_WEBHOOK_SECRET!);
      console.log('Webhook verified');  // Add this line
    } catch (err: any) {
      console.error(`Webhook Error: ${err.message}`);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    console.log('Webhook event type:', event.type);  // Add this line

    // Handle the event
    switch (event.type) {
      case 'payment_method.attached':
        const paymentMethod = event.data.object as Stripe.PaymentMethod;
        await handlePaymentMethodAttached(paymentMethod);
        break;
      case 'payment_method.detached':
        const detachedPaymentMethod = event.data.object as Stripe.PaymentMethod;
        await handlePaymentMethodDetached(detachedPaymentMethod);
        break;
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted':
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionChange(db, subscription);
        break;
    case 'invoice.paid':
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaid(db, invoice);
        break;
    case 'invoice.payment_failed':
        const failedInvoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaymentFailed(db, failedInvoice);
        break;
    case 'customer.updated':
        const customer = event.data.object as Stripe.Customer;
        await handleCustomerUpdated(db, customer);
        break;
      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    // Return a response to acknowledge receipt of the event
    res.json({ received: true });
  } else {
    res.setHeader('Allow', 'POST');
    res.status(405).end('Method Not Allowed');
  }
}

async function handlePaymentMethodAttached(paymentMethod: Stripe.PaymentMethod) {
  const db = await getDb();
  await db.run('UPDATE users SET hasPaymentMethod = ? WHERE stripeCustomerId = ?', [true, paymentMethod.customer]);
  console.log(`Payment method attached for customer: ${paymentMethod.customer}`);
}

async function handlePaymentMethodDetached(paymentMethod: Stripe.PaymentMethod) {
  const db = await getDb();
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
    const user = await db.get('SELECT * FROM users WHERE stripe_customer_id = ?', [subscription.customer]);
    if (!user) return;
  
    if (subscription.status === 'active') {
      await db.run('UPDATE users SET hasPaymentMethod = ?, stripe_subscription_id = ? WHERE id = ?', [true, subscription.id, user.id]);
    } else if (subscription.status === 'canceled') {
      await db.run('UPDATE users SET hasPaymentMethod = ?, stripe_subscription_id = NULL WHERE id = ?', [false, user.id]);
      // Note: We're not removing access to premium content here. 
      // You may want to implement a grace period or immediate removal based on your business logic.
    }
  }
  
  async function handleInvoicePaid(db: any, invoice: Stripe.Invoice) {
    const user = await db.get('SELECT * FROM users WHERE stripe_customer_id = ?', [invoice.customer]);
    if (!user) return;
  
    // Update user's payment status or add purchased items to their account
    // This depends on your specific implementation and data model
    console.log(`Invoice paid for user ${user.id}`);
  }
  
  async function handleInvoicePaymentFailed(db: any, invoice: Stripe.Invoice) {
    const user = await db.get('SELECT * FROM users WHERE stripe_customer_id = ?', [invoice.customer]);
    if (!user) return;
  
    // Handle failed payment (e.g., notify user, restrict access)
    console.log(`Invoice payment failed for user ${user.id}`);
  }
  
  async function handleCustomerUpdated(db: any, customer: Stripe.Customer) {
    const user = await db.get('SELECT * FROM users WHERE stripe_customer_id = ?', [customer.id]);
    if (!user) return;
  
    // Update user's payment method status
    const hasPaymentMethod = customer.invoice_settings.default_payment_method !== null;
    await db.run('UPDATE users SET hasPaymentMethod = ? WHERE id = ?', [hasPaymentMethod, user.id]);
  }
  