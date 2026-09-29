"use server";

import { GENRES, NETWORKS, slug, type Filters } from "./browse";
import { visitorRegion } from "./region";
import { discoverTitles, regionServices } from "./tmdb";

/** A page of Browse's results for these filters, in the visitor's country
    (for where to watch). */
export async function browseResults(f: Filters, page = 1) {
  const region = await visitorRegion();
  const services = f.on?.length ? await regionServices(region, 120) : [];
  const genre = GENRES[f.kind].find(([, n]) => slug(n) === f.genre)?.[0];
  const network = NETWORKS.find(([, n]) => slug(n) === f.network)?.[0];
  const providers = (f.on ?? []).map((s) => services.find((x) => slug(x.name) === s)?.id).filter((x): x is number => !!x);
  return discoverTitles({ kind: f.kind, genre, decade: f.decade, providers, network, status: f.status, sort: f.sort, region, page });
}
