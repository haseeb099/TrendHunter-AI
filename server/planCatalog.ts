import {
  PLAN_DEFINITIONS,
  TRIAL_DAYS,
  formatPriceLabel,
  type FeatureId,
  type PlanDefinition,
  type PlanId,
  type PlanLimits,
} from "@shared/plans";
import { eq } from "drizzle-orm";
import { planConfigs, platformSettings } from "../drizzle/schema";
import { getDb } from "./db";

let cachedCatalog: Record<PlanId, PlanDefinition> | null = null;
let cachedTrialDays: number | null = null;
let cachedSettings: Record<string, unknown> | null = null;

function rowToPlan(row: typeof planConfigs.$inferSelect): PlanDefinition {
  return {
    id: row.planId as PlanId,
    name: row.name,
    tagline: row.tagline ?? "",
    priceMonthly: row.priceMonthly,
    priceLabel: row.priceLabel,
    billingPeriod: row.billingPeriod,
    highlight: row.highlight,
    features: (row.features as string[]) ?? [],
    featureIds: (row.featureIds as FeatureId[]) ?? [],
    limits: {
      ...PLAN_DEFINITIONS[row.planId as PlanId].limits,
      ...(row.limits as PlanLimits),
    },
    sortOrder: row.sortOrder,
  };
}

export function invalidatePlanCache(): void {
  cachedCatalog = null;
  cachedTrialDays = null;
  cachedSettings = null;
}

export async function seedPlanConfigsIfEmpty(): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const existing = await db.select().from(planConfigs).limit(1);
  if (existing.length > 0) return;

  for (const plan of Object.values(PLAN_DEFINITIONS)) {
    await db.insert(planConfigs).values({
      planId: plan.id,
      name: plan.name,
      tagline: plan.tagline,
      priceMonthly: plan.priceMonthly,
      priceLabel: plan.priceLabel,
      billingPeriod: plan.billingPeriod,
      highlight: plan.highlight ?? false,
      isActive: true,
      sortOrder: plan.sortOrder,
      trialDays: plan.id === "trial" ? TRIAL_DAYS : null,
      features: plan.features,
      featureIds: plan.featureIds,
      limits: plan.limits,
    });
  }

  await db
    .insert(platformSettings)
    .values({
      key: "trial_days",
      value: TRIAL_DAYS,
    })
    .onDuplicateKeyUpdate({ set: { value: TRIAL_DAYS } });

  await db
    .insert(platformSettings)
    .values({
      key: "registration_enabled",
      value: true,
    })
    .onDuplicateKeyUpdate({ set: { value: true } });
}

export async function getPlanCatalog(): Promise<Record<PlanId, PlanDefinition>> {
  if (cachedCatalog) return cachedCatalog;

  const db = await getDb();
  if (!db) {
    cachedCatalog = { ...PLAN_DEFINITIONS };
    return cachedCatalog;
  }

  await seedPlanConfigsIfEmpty();
  const rows = await db.select().from(planConfigs);
  const catalog = { ...PLAN_DEFINITIONS };

  for (const row of rows) {
    if (!row.isActive) continue;
    catalog[row.planId as PlanId] = rowToPlan(row);
  }

  cachedCatalog = catalog;
  return catalog;
}

export async function getAllPlanConfigs(): Promise<
  Array<PlanDefinition & { isActive: boolean; trialDays: number | null }>
> {
  const db = await getDb();
  if (!db) {
    return Object.values(PLAN_DEFINITIONS).map((p) => ({
      ...p,
      isActive: true,
      trialDays: p.id === "trial" ? TRIAL_DAYS : null,
    }));
  }

  await seedPlanConfigsIfEmpty();
  const rows = await db.select().from(planConfigs);
  return rows
    .map((row) => ({
      ...rowToPlan(row),
      isActive: row.isActive,
      trialDays: row.trialDays,
    }))
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export async function getPublicPlans(): Promise<PlanDefinition[]> {
  const db = await getDb();
  const catalog = await getPlanCatalog();
  if (!db) return Object.values(catalog).sort((a, b) => a.sortOrder - b.sortOrder);

  const rows = await db.select().from(planConfigs).where(eq(planConfigs.isActive, true));
  return rows.map(rowToPlan).sort((a, b) => a.sortOrder - b.sortOrder);
}

export async function getTrialDays(): Promise<number> {
  if (cachedTrialDays !== null) return cachedTrialDays;

  const db = await getDb();
  if (!db) return TRIAL_DAYS;

  const rows = await db
    .select()
    .from(platformSettings)
    .where(eq(platformSettings.key, "trial_days"))
    .limit(1);

  const days = Number(rows[0]?.value ?? TRIAL_DAYS);
  cachedTrialDays = Number.isFinite(days) && days > 0 ? days : TRIAL_DAYS;
  return cachedTrialDays;
}

export async function getPlatformSettings(): Promise<Record<string, unknown>> {
  if (cachedSettings) return cachedSettings;

  const db = await getDb();
  if (!db) {
    cachedSettings = {
      trial_days: TRIAL_DAYS,
      registration_enabled: true,
      self_serve_billing: false,
    };
    return cachedSettings;
  }

  await seedPlanConfigsIfEmpty();
  const rows = await db.select().from(platformSettings);
  const settings: Record<string, unknown> = {
    trial_days: TRIAL_DAYS,
    registration_enabled: true,
    self_serve_billing: false,
  };
  for (const row of rows) {
    settings[row.key] = row.value;
  }
  cachedSettings = settings;
  return cachedSettings;
}

export async function updatePlanConfig(
  planId: PlanId,
  data: Partial<{
    name: string;
    tagline: string;
    priceMonthly: number;
    billingPeriod: string;
    highlight: boolean;
    isActive: boolean;
    sortOrder: number;
    trialDays: number;
    features: string[];
    featureIds: FeatureId[];
    limits: PlanLimits;
  }>
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const priceLabel =
    data.priceMonthly !== undefined
      ? formatPriceLabel(data.priceMonthly)
      : undefined;

  await db
    .update(planConfigs)
    .set({
      ...data,
      ...(priceLabel !== undefined ? { priceLabel } : {}),
    })
    .where(eq(planConfigs.planId, planId));

  invalidatePlanCache();
}

export async function upsertPlatformSetting(key: string, value: unknown): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .insert(platformSettings)
    .values({ key, value })
    .onDuplicateKeyUpdate({ set: { value } });

  invalidatePlanCache();
}
