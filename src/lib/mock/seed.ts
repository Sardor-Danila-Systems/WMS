import { FOREMEN_SEED, SUPPLIERS_SEED, WORKERS_SEED } from "./people";
import { generateSeedData } from "./operations";

const { materials, operations } = generateSeedData();

export const SEED_MATERIALS = materials;
export const SEED_OPERATIONS = operations;
export const SEED_SUPPLIERS = SUPPLIERS_SEED;
export const SEED_WORKERS = WORKERS_SEED;
export const SEED_FOREMEN = FOREMEN_SEED;
