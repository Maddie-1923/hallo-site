import "server-only";
import Stripe from "stripe";

// Stripe for Kodigo Pro on the web: $1.99 a month or $15.99 a year, in US
// dollars, charged at checkout (the free week is the app's). Every key is
// optional: without them the Pro page says web checkout isn't open, and
// nothing can charge.
const key = process.env.STRIPE_SECRET_KEY;
export const stripe = key ? new Stripe(key) : null;

export const PRICES = {
  monthly: process.env.STRIPE_PRICE_MONTHLY ?? "",
  yearly: process.env.STRIPE_PRICE_YEARLY ?? "",
} as const;
export type Plan = keyof typeof PRICES;

/** Whether web checkout can run at all: the key and both prices set. */
export const checkoutReady = !!(stripe && PRICES.monthly && PRICES.yearly);
