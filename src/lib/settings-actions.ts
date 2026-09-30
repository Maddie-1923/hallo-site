"use server";

import { regionServices } from "./tmdb";

/** A country's streaming services, for the settings page when the country
    changes. */
export async function loadServices(region: string) {
  return /^[A-Z]{2}$/.test(region) ? regionServices(region) : [];
}
