import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
// Serverless Node runs in native ESM mode, where extensionless relative
// imports are not resolved. Keep the `.js` specifier: TypeScript maps it to
// mediaUtils.ts locally and Vercel resolves the emitted mediaUtils.js module.
import { getNormalizedGallery, getOptimizedMediaUrl, parseVideoUrl } from "./mediaUtils.js";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function parseJsonArray(val: string | null | undefined): string[] {
  if (!val) return [];
  try {
    const parsed = JSON.parse(val);
    if (Array.isArray(parsed)) {
      return parsed.map((item) => String(item).trim()).filter(Boolean);
    }
  } catch {
    return val.split("\n").map((s) => s.trim()).filter(Boolean);
  }
  return [];
}

export function getParsedImages(jsonStr: string | null | undefined): any[] {
  try {
    return JSON.parse(jsonStr || "[]");
  } catch (e) {
    return [];
  }
}

export function getFirstImageUrl(jsonStr: string | null | undefined): string | null {
  const items = getNormalizedGallery(jsonStr);
  if (items.length === 0) return null;
  const first = items[0];
  const optimized = getOptimizedMediaUrl(first);
  if (optimized) return optimized;
  if (first.thumbnail_url && first.thumbnail_url.trim()) return first.thumbnail_url.trim();
  if (first.type === "image" && first.url) return first.url;
  if (first.type === "video") {
    const parsed = parseVideoUrl(first.url);
    if (parsed.thumbnailUrl) return parsed.thumbnailUrl;
    return first.thumbnail_url || null;
  }
  return first.url || null;
}

export function calculateFeeRuleCost(
  rule: {
    fee_type: "fixed" | "percentage" | "distance" | "distance_tiered" | string;
    amount: number;
    min_distance?: number | null;
    min_fee?: number | null;
    max_distance?: number | null;
    min_order_amount?: number | null;
    max_order_amount?: number | null;
    tiers?: string | null;
  },
  distance = 0,
  orderTotal = 0
): { fee: number; explanation: string } {
  // Check order amount conditions if applicable
  if (rule.min_order_amount !== undefined && rule.min_order_amount !== null && rule.min_order_amount > 0) {
    if (orderTotal < rule.min_order_amount) {
      return { fee: 0, explanation: `Order total below minimum threshold (${rule.min_order_amount})` };
    }
  }
  if (rule.max_order_amount !== undefined && rule.max_order_amount !== null && rule.max_order_amount > 0) {
    if (orderTotal > rule.max_order_amount) {
      return { fee: 0, explanation: `Order total above maximum threshold (${rule.max_order_amount})` };
    }
  }

  if (rule.fee_type === "fixed") {
    return { fee: rule.amount || 0, explanation: "Fixed fee" };
  }

  if (rule.fee_type === "percentage") {
    const pct = Number(rule.amount) || 0;
    const computed = (orderTotal * pct) / 100;
    const minFee = Number(rule.min_fee) || 0;
    if (minFee > 0 && computed < minFee) {
      return {
        fee: minFee,
        explanation: `${pct}% on ${orderTotal} (min fee applied: ${minFee})`
      };
    }
    return {
      fee: computed,
      explanation: `${pct}% of subtotal (${orderTotal > 0 ? `${orderTotal}` : 'base'})`
    };
  }

  const dist = Math.max(0, Number(distance) || 0);
  const minDistance = Number(rule.min_distance) || 0;
  const minFee = Number(rule.min_fee) || 0;

  if (dist === 0) {
    return { fee: 0, explanation: "0 distance travelled" };
  }

  if (rule.fee_type === "distance") {
    if (dist <= minDistance) {
      return { fee: 0, explanation: `Within free distance allowance (≤ ${minDistance} km)` };
    }
    const chargeableKm = dist - minDistance;
    let computed = chargeableKm * (rule.amount || 0);
    if (minFee > 0 && computed < minFee) {
      computed = minFee;
      return {
        fee: computed,
        explanation: `${chargeableKm.toFixed(1)} km chargeable @ rate, minimum fee of ${minFee} applied`
      };
    }
    return {
      fee: computed,
      explanation: `${chargeableKm.toFixed(1)} km @ ${rule.amount}/km (after ${minDistance} km free)`
    };
  }

  if (rule.fee_type === "distance_tiered") {
    let tiers: Array<{ from_km: number; to_km: number | null; rate_per_km: number }> = [];
    try {
      tiers = typeof rule.tiers === "string" ? JSON.parse(rule.tiers || "[]") : (rule.tiers || []);
    } catch {
      tiers = [];
    }

    if (!Array.isArray(tiers) || tiers.length === 0) {
      const chargeableKm = Math.max(0, dist - minDistance);
      const computed = Math.max(minFee, chargeableKm * (rule.amount || 0));
      return { fee: computed, explanation: `${chargeableKm.toFixed(1)} km (fallback default rate)` };
    }

    // Sort tiers by from_km
    const sortedTiers = [...tiers].sort((a, b) => (a.from_km || 0) - (b.from_km || 0));
    let totalFee = 0;
    const parts: string[] = [];

    let remainingDist = Math.max(0, dist - minDistance);
    if (remainingDist <= 0) {
      return { fee: 0, explanation: `Within free distance allowance (≤ ${minDistance} km)` };
    }

    for (const tier of sortedTiers) {
      const tierFrom = tier.from_km || 0;
      const tierTo = tier.to_km !== null && tier.to_km !== undefined ? tier.to_km : Infinity;
      const tierCapacity = tierTo - tierFrom;

      if (dist > tierFrom) {
        const kmInThisTier = Math.min(dist, tierTo) - tierFrom;
        if (kmInThisTier > 0) {
          const tierCost = kmInThisTier * (tier.rate_per_km || 0);
          totalFee += tierCost;
          parts.push(`${kmInThisTier.toFixed(1)}km @ ${tier.rate_per_km}`);
        }
      }
    }

    if (minFee > 0 && totalFee < minFee) {
      totalFee = minFee;
      parts.push(`(min fee applied: ${minFee})`);
    }

    return {
      fee: totalFee,
      explanation: parts.join(" + ") || "Tiered rate calculation"
    };
  }

  return { fee: rule.amount || 0, explanation: "Standard fee" };
}

export function interpolatePricingMessageTemplate(
  template: string,
  params: {
    plan_name?: string;
    price?: string;
    billing_period?: string;
    customer_name?: string;
  }
): string {
  if (!template) return "";
  let result = template;
  if (params.plan_name !== undefined) {
    result = result.replace(/\{plan_name\}/gi, params.plan_name)
                   .replace(/\{plan_title\}/gi, params.plan_name)
                   .replace(/\{csomag_neve\}/gi, params.plan_name);
  }
  if (params.price !== undefined) {
    result = result.replace(/\{price\}/gi, params.price)
                   .replace(/\{ár\}/gi, params.price);
  }
  if (params.billing_period !== undefined) {
    result = result.replace(/\{billing_period\}/gi, params.billing_period)
                   .replace(/\{időszak\}/gi, params.billing_period);
  }
  if (params.customer_name !== undefined) {
    result = result.replace(/\{customer_name\}/gi, params.customer_name)
                   .replace(/\{client_name\}/gi, params.customer_name)
                   .replace(/\{ügyfél_neve\}/gi, params.customer_name);
  }
  return result;
}
