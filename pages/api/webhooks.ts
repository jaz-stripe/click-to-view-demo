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
      // ... handle other event types
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
