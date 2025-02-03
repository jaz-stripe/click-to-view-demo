# Click to view demo
This is a simple themed Click To View demo for video content provider use case.
This demo aims to showcase using Stripe for:
* Adding a payment to an existing user
* Purchasing content on the fly
* Having the rights for premium content managed
* A dashboard for the user to show the user their
    * Purchases
    * Upcoming bill
    * Previous bills
    * Change payment methods
    * Dispute charges (if possible)

# Project structure
This project is a React+Next.js+TS+Stripe demo.

## Preliminaries
In your Stripe (test) account you need to configure the customer dashboard, and get the keys for the application.
To create a Customer Portal configuration in Stripe:
 1. Go to your Stripe Dashboard
 2. Navigate to Settings > Billing (enable if you haven't) > Customer Portal (could be hidden under the More menu)
 3. Configure the settings according to your needs (e.g., which features to enable, branding, etc.)
 4. Save the configuration

Setup and run as:
1. Ensure your (test) Stripe keys are in the file `.env.local`
2. Install the components as `npm install`
3. Generate the SSL certs as `npm run generate-cert`
4. Run the Stripe CLI to forward all webhooks as `stripe listen --skip-verify --forward-to https://localhost:3000/api/webhooks`
5. Ensure you update `.env.local` to include the webhook signing secret and your Stripe account details.
5. Run the demo locally as `npm run dev`
