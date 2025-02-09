import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import csv from 'csv-parser';
import Stripe from 'stripe';
import dotenv from 'dotenv';
import '../lib/config.ts';
import { getDb } from '../lib/db.ts';
import { getOrCreateFreeSubscription } from '../lib/stripe.ts';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define paths for CSV files
const freeContentPath = path.resolve(__dirname, '../data/free_content.csv');
const premiumContentPath = path.resolve(__dirname, '../data/premium_content.csv');

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-08-16',
});

// Add these environment variables
const SERIES_PRICE = parseInt(process.env.SERIES_PRICE || '5000', 10); // Default to $50 if not set
const MODULE_PRICE = parseInt(process.env.MODULE_PRICE || '2000', 10); // Default to $20 if not set

// Function to extract YouTube ID from URL
function extractYouTubeId(url: string): string {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : '';
}

// Function to parse tier information
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

async function createStripeProduct(content: any, videoId: number) {
  const product = await stripe.products.create({
    name: content.title,
    metadata: {
      videoId: videoId.toString(),
      type: content.type,
      series: content.series || '',
    },
  });

  const tierPrice = parseTier(content.tier);
  const price = await stripe.prices.create({
    product: product.id,
    unit_amount: tierPrice.amount,
    currency: 'nzd',
    metadata: {
      type: 'one_time',
      duration: tierPrice.duration ? tierPrice.duration.toString() : '',
    },
  });

  return { product, price };
}

async function getOrCreateSeriesProduct(db: any, series: string, type: string) {
  let seriesProduct = await db.get('SELECT * FROM series WHERE name = ?', [series]);
  
  if (!seriesProduct) {
    const product = await stripe.products.create({
      name: `${series} (${type})`,
      metadata: { series: series, type: type },
    });

    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: SERIES_PRICE,
      currency: 'nzd',
      metadata: { type: 'season' },
    });

    const { lastID } = await db.run(
      'INSERT INTO series (name, stripe_product_id, stripe_price_id) VALUES (?, ?, ?)',
      [series, product.id, price.id]
    );

    seriesProduct = { id: lastID, name: series, stripe_product_id: product.id, stripe_price_id: price.id };
  }

  return seriesProduct;
}

async function getOrCreateModuleProduct(db: any, type: string) {
  let moduleProduct = await db.get('SELECT * FROM modules WHERE name = ?', [type]);
  
  if (!moduleProduct) {
    const product = await stripe.products.create({
      name: `${type.charAt(0).toUpperCase() + type.slice(1)} Module`,
      metadata: { type: type, isModule: 'true' },
    });

    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: MODULE_PRICE,
      currency: 'nzd',
      recurring: { interval: 'month' },
      metadata: { type: 'module' },
    });

    const { lastID } = await db.run(
      'INSERT INTO modules (name, stripe_product_id, stripe_price_id) VALUES (?, ?, ?)',
      [type, product.id, price.id]
    );

    moduleProduct = { id: lastID, name: type, stripe_product_id: product.id, stripe_price_id: price.id };
  }

  return moduleProduct;
}

async function populateDatabase() {
  if (!process.env.STRIPE_SECRET_KEY) {
    console.error('STRIPE_SECRET_KEY is not set in .env.local file');
    return;
  }

  try {
    const db = await getDb();

    await getOrCreateFreeSubscription(db);

    // Read and populate free content
    await new Promise<void>((resolve, reject) => {
      fs.createReadStream(freeContentPath)
        .on('error', (error) => {
          console.error('Error reading free_content.csv:', error);
          reject(error);
        })
        .pipe(csv())
        .on('data', async (row) => {
          try {
            await db.run(`
              INSERT OR REPLACE INTO videos (title, youtube_id, is_premium) 
              VALUES (?, ?, ?)
            `, [row.title, extractYouTubeId(row.link), false]);
          } catch (error) {
            console.error('Error inserting free content row:', error);
            console.error('Row data:', row);
          }
        })
        .on('end', () => {
          console.log('Free content ingestion complete');
          resolve();
        });
    });

    // Read and populate premium content
    const premiumContent: any[] = [];
    await new Promise<void>((resolve, reject) => {
      fs.createReadStream(premiumContentPath)
        .on('error', (error) => {
          console.error('Error reading premium_content.csv:', error);
          reject(error);
        })
        .pipe(csv())
        .on('data', (row) => {
          premiumContent.push(row);
        })
        .on('end', async () => {
          for (const content of premiumContent) {
            try {
              const { lastID: videoId } = await db.run(`
                INSERT OR REPLACE INTO videos (title, youtube_id, is_premium, type, series) 
                VALUES (?, ?, ?, ?, ?)
              `, [content.title, extractYouTubeId(content.link), true, content.type, content.series]);
              
              const { product, price } = await createStripeProduct(content, videoId);
              await db.run('UPDATE videos SET stripe_product_id = ?, stripe_price_id = ? WHERE id = ?', [product.id, price.id, videoId]);

              if (content.series) {
                const seriesProduct = await getOrCreateSeriesProduct(db, content.series, content.type);
                await db.run(
                  'INSERT OR REPLACE INTO series (id, name, stripe_product_id, stripe_price_id) VALUES (?, ?, ?, ?)',
                  [seriesProduct.id, seriesProduct.name, seriesProduct.stripe_product_id, seriesProduct.stripe_price_id]
                );
              }

              const moduleProduct = await getOrCreateModuleProduct(db, content.type);
              await db.run(
                'INSERT OR REPLACE INTO modules (id, name, stripe_product_id, stripe_price_id) VALUES (?, ?, ?, ?)',
                [moduleProduct.id, moduleProduct.name, moduleProduct.stripe_product_id, moduleProduct.stripe_price_id]
              );
            } catch (error) {
              console.error('Error processing premium content row:', error);
              console.error('Content data:', content);
            }
          }
          console.log('Premium content ingestion complete');
          resolve();
        });
    });

    console.log('Database population complete');
  } catch (error) {
    console.error('Error in populateDatabase:', error);
  }
}

populateDatabase().catch(console.error);
