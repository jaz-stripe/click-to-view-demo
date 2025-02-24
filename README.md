# Click to view demo
This is a simple themed Click To View demo for video content provider use case.
This demo aims to showcase using Stripe for:
* Adding a payment to an existing user
* Purchasing content on the fly
* Having the rights for premium content managed
* A dashboard for the user to show the user their
    * Purchases
    * Upcoming invoices
    * Previous invoices
    * Change payment methods

# Project structure
This project is a React+Next.js+TS+Stripe demo. The code is not production perfect as it has grown organically and agily as the demo preparation progressed. It demonstates the use of Stripe methods for capturing payment methods, creating custoemrs, products and subscriptions, and adding subscriptions, purchases to customers. This also demonstrates how webhooks can be handled, all in a fun interactive website. Enjoy.


# Operate the demo
## Preliminaries
In your Stripe (test) account you need to configure the customer dashboard, and get the keys for the application.
To create a Customer Portal configuration in Stripe:
 1. Go to your Stripe Dashboard
 2. Navigate to Settings > Billing (enable if you haven't) > Customer Portal (could be hidden under the More menu)
 3. Configure the settings according to your needs (e.g., which features to enable, branding, etc.)
 4. Save the configuration

## Setup and run
1. Copy `.env.local` to `.env` and update the details to include your Stripe (test) keys and webhook secret (see below).
2. Install the components as `npm install`
3. Generate the SSL certs as `npm run generate-cert`
4. Auth to your test account with the Stripe CLI as `stripe login`
5. Run the Stripe CLI to forward all webhooks as `stripe listen --skip-verify --forward-to https://localhost:3000/api/webhooks`
6. Ensure you update `.env` to include the webhook signing secret.
7. Populate the DB with videos and create Stripe objects required as `npx ts-node scripts/populate_database.ts`
8. Run the demo locally as `npm run dev`

## Operate the demo
1. Browse to https://localhost:3000
2. Click on _Sign up now_ and click _Create Account_. The password is always `password`.
3. Play with video and video purchases
4. Payment methds can be added either with a video purchase, through the account menu available from the top right icon then account, or via the _Add Payment Method_ button at the bottom of the page
5. The customer portal is available from the Account menu under _Manage Payments_. Have a play with removing payment methods, cancelling optional subscriptions, and the items added to the monthly billing subscription
6. Retry the user onboarding and purchase flow in _simple_ mode for a newly created user. The _Simple_ mode is available by clicking the logo on the left hand top.


## Delete and start again
1. In the Stripe dahsboard select all users and delete https://dashboard.stripe.com/test/customers
2. Archive all Stripe products created as: `npx ts-node scripts/delete_stripe_products.ts`
3. Remove the local SQLite database as: `rm mydb.sqlite`

## Modifying the content
The `populate_database.ts` script reads the two files `data/free_content.csv` and `data/premium_content.csv` to populate the local SQLite database and add a product for each premium video as well as create the free monthly placeholder subscription product. A product is created for every unique _series_ (or season), and a subscription is created for every unique _type_ (i.e movie, sport). Have fun!
