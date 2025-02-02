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
Setup and run as:
1. Ensure your (test) Stripe keys are in the file `.env.local`
2. Install the components as `npm install`
3. Generate the SSL certs as `npm run generate-cert`
4. Run the Stripe CLI to forward all webhooks as `stripe listen --forward-to localhost:3000/api/webhooks`
3. Run the demo locally as `npm run dev`
