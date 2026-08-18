import crypto from "crypto";
import fs from "fs";
import path from "path";
import { db } from "../../db.js";
import { defaultLocales, enTranslations } from "../../lib/translations.js";
import { TranslationItem, TranslationStats } from "../../lib/types.js";
import { getTranslationGroup } from "../../lib/translationGroups.js";

export interface TranslationFilter {
  locale?: string;
  group?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

// In-memory per-locale cache to prevent repeated database queries
let memoryCache: {
  dictionaries: Record<string, Record<string, string>> | null;
  lastUpdated: number;
} = {
  dictionaries: null,
  lastUpdated: 0,
};

const CACHE_TTL_MS = 60 * 1000; // 1 minute TTL or until explicitly invalidated

export function invalidateTranslationsCache() {
  memoryCache.dictionaries = null;
  memoryCache.lastUpdated = 0;
}

/**
 * Extracts a group name from a translation key.
 * e.g., 'nav.home' -> 'nav', 'admin.dashboard.title' -> 'admin', 'auth.login' -> 'auth'
 */
export function extractGroupFromKey(key: string): string {
  return getTranslationGroup(key);
}

/**
 * Translation Service & Repository Layer
 */
export const translationService = {
  /**
   * Clears the in-memory cache
   */
  clearCache() {
    invalidateTranslationsCache();
  },

  /**
   * Retrieves translation dictionary for a single locale
   */
  async getDictionary(locale: string): Promise<Record<string, string>> {
    const allDicts = await this.getAllDictionaries();
    return allDicts[locale] || {};
  },

  /**
   * Retrieves all translation dictionaries grouped by locale with memory caching
   */
  async getAllDictionaries(forceFresh = false): Promise<Record<string, Record<string, string>>> {
    const now = Date.now();
    if (
      !forceFresh &&
      memoryCache.dictionaries !== null &&
      now - memoryCache.lastUpdated < CACHE_TTL_MS
    ) {
      return memoryCache.dictionaries;
    }

    try {
      const result = await db.execute(`
        SELECT locale, key, value 
        FROM translations 
        ORDER BY locale ASC, key ASC
      `);

      const dicts: Record<string, Record<string, string>> = {};

      for (const row of result.rows) {
        const loc = String(row.locale);
        const k = String(row.key);
        const v = String(row.value);

        if (!dicts[loc]) {
          dicts[loc] = {};
        }
        dicts[loc][k] = v;
      }

      memoryCache.dictionaries = dicts;
      memoryCache.lastUpdated = now;
      return dicts;
    } catch (error) {
      console.error("[TranslationService] Failed to load dictionaries from DB:", error);
      // Fallback to in-memory defaults if database query fails
      return defaultLocales;
    }
  },

  /**
   * Query translations with filters (locale, group, search query, pagination)
   */
  async getList(filter: TranslationFilter = {}): Promise<{
    items: TranslationItem[];
    total: number;
    locales: string[];
    groups: string[];
  }> {
    const { locale, group, search, limit = 100, offset = 0 } = filter;

    const conditions: string[] = [];
    const args: any[] = [];

    if (locale && locale !== "all") {
      conditions.push("locale = ?");
      args.push(locale);
    }

    if (group && group !== "all") {
      conditions.push("group_name = ?");
      args.push(group);
    }

    if (search && search.trim() !== "") {
      const term = `%${search.trim().toLowerCase()}%`;
      conditions.push("(LOWER(key) LIKE ? OR LOWER(value) LIKE ?)");
      args.push(term, term);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const countQuery = `SELECT COUNT(*) as count FROM translations ${whereClause}`;
    const countResult = await db.execute({ sql: countQuery, args });
    const total = Number(countResult.rows[0]?.count || 0);

    const itemsQuery = `
      SELECT id, locale, key, group_name, value, created_at, updated_at
      FROM translations
      ${whereClause}
      ORDER BY group_name ASC, key ASC, locale ASC
      LIMIT ? OFFSET ?
    `;
    const itemsResult = await db.execute({
      sql: itemsQuery,
      args: [...args, limit, offset],
    });

    const items: TranslationItem[] = itemsResult.rows.map((r: any) => ({
      id: String(r.id),
      locale: String(r.locale),
      key: String(r.key),
      group_name: String(r.group_name),
      value: String(r.value),
      created_at: r.created_at ? String(r.created_at) : undefined,
      updated_at: r.updated_at ? String(r.updated_at) : undefined,
    }));

    // Get distinct locales & groups for UI dropdowns
    const localesRes = await db.execute("SELECT DISTINCT locale FROM translations ORDER BY locale ASC");
    const groupsRes = await db.execute("SELECT DISTINCT group_name FROM translations ORDER BY group_name ASC");

    return {
      items,
      total,
      locales: localesRes.rows.map((r: any) => String(r.locale)),
      groups: groupsRes.rows.map((r: any) => String(r.group_name)),
    };
  },

  /**
   * Upserts a single translation item
   */
  async upsert(
    locale: string,
    key: string,
    value: string,
    group_name?: string
  ): Promise<TranslationItem> {
    const loc = locale.trim().toLowerCase();
    const k = key.trim();
    const val = value !== undefined && value !== null ? String(value) : "";
    const grp = group_name?.trim() || extractGroupFromKey(k);
    const id = `${loc}:${k}`;

    await db.execute({
      sql: `
        INSERT INTO translations (id, locale, key, group_name, value, updated_at)
        VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(locale, key) DO UPDATE SET
          value = excluded.value,
          group_name = excluded.group_name,
          updated_at = CURRENT_TIMESTAMP
      `,
      args: [id, loc, k, grp, val],
    });

    invalidateTranslationsCache();

    return {
      id,
      locale: loc,
      key: k,
      group_name: grp,
      value: val,
    };
  },

  /**
   * Batch upserts multiple translation records using chunked multi-row transactions
   */
  async batchUpsert(
    items: Array<{ locale: string; key: string; value: string; group_name?: string }>
  ): Promise<number> {
    if (!items || items.length === 0) return 0;

    const validItems: Array<{ id: string; locale: string; key: string; group_name: string; value: string }> = [];
    for (const item of items) {
      if (!item.locale || !item.key) continue;
      const loc = item.locale.trim().toLowerCase();
      const k = item.key.trim();
      const val = item.value !== undefined && item.value !== null ? String(item.value) : "";
      const grp = item.group_name?.trim() || extractGroupFromKey(k);
      validItems.push({
        id: `${loc}:${k}`,
        locale: loc,
        key: k,
        group_name: grp,
        value: val,
      });
    }

    if (validItems.length === 0) return 0;

    // Process in batches of 40
    const CHUNK_SIZE = 40;
    for (let i = 0; i < validItems.length; i += CHUNK_SIZE) {
      const chunk = validItems.slice(i, i + CHUNK_SIZE);
      const valueClauses: string[] = [];
      const args: any[] = [];

      for (const row of chunk) {
        valueClauses.push("(?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)");
        args.push(row.id, row.locale, row.key, row.group_name, row.value);
      }

      const sql = `
        INSERT INTO translations (id, locale, key, group_name, value, created_at, updated_at)
        VALUES ${valueClauses.join(", ")}
        ON CONFLICT(locale, key) DO UPDATE SET
          value = excluded.value,
          group_name = excluded.group_name,
          updated_at = CURRENT_TIMESTAMP
      `;

      await db.execute({ sql, args });
    }

    invalidateTranslationsCache();
    return validItems.length;
  },

  /**
   * Deletes a specific translation
   */
  async delete(locale: string, key: string): Promise<boolean> {
    const loc = locale.trim().toLowerCase();
    const k = key.trim();

    await db.execute({
      sql: "DELETE FROM translations WHERE locale = ? AND key = ?",
      args: [loc, k],
    });

    invalidateTranslationsCache();
    return true;
  },

  /**
   * Deletes a key across all locales
   */
  async deleteKeyAllLocales(key: string): Promise<boolean> {
    const k = key.trim();
    await db.execute({
      sql: "DELETE FROM translations WHERE key = ?",
      args: [k],
    });

    invalidateTranslationsCache();
    return true;
  },

  /**
   * Retrieves translation health statistics
   */
  async getStats(): Promise<TranslationStats> {
    try {
      const allKeysRes = await db.execute("SELECT DISTINCT key FROM translations");
      const totalKeys = allKeysRes.rows.length;

      const totalTransRes = await db.execute("SELECT COUNT(*) as count FROM translations");
      const totalTranslations = Number(totalTransRes.rows[0]?.count || 0);

      const localeCountsRes = await db.execute(`
        SELECT locale, COUNT(*) as count 
        FROM translations 
        GROUP BY locale
      `);
      const locales: Record<string, number> = {};
      localeCountsRes.rows.forEach((r: any) => {
        locales[String(r.locale)] = Number(r.count);
      });

      const groupCountsRes = await db.execute(`
        SELECT group_name, COUNT(*) as count 
        FROM translations 
        GROUP BY group_name
      `);
      const groups: Record<string, number> = {};
      groupCountsRes.rows.forEach((r: any) => {
        groups[String(r.group_name)] = Number(r.count);
      });

      // Calculate missing counts per locale compared to total distinct keys
      const missingCounts: Record<string, number> = {};
      for (const loc of Object.keys(locales)) {
        missingCounts[loc] = Math.max(0, totalKeys - (locales[loc] || 0));
      }

      return {
        totalKeys,
        totalTranslations,
        locales,
        missingCounts,
        groups,
      };
    } catch (e) {
      console.error("[TranslationService] Failed to calculate stats:", e);
      return {
        totalKeys: 0,
        totalTranslations: 0,
        locales: {},
        missingCounts: {},
        groups: {},
      };
    }
  },

  /**
   * Migrates/synchronizes all hardcoded translations from src/lib/translations.ts into the translations table.
   * If force is false, it selectively checks for and inserts only missing keys across all supported locales,
   * leaving all existing customizations intact.
   * If force is true, it upserts all keys across all locales.
   */
  async importFromHardcoded(force = false): Promise<{
    importedCount: number;
    keysCount: number;
    locales: string[];
    insertedMissing?: number;
  }> {
    const targetLocales = Object.keys(defaultLocales); // ['en', 'hu', 'de', 'es', 'fr']
    const baseDict = defaultLocales["en"] || enTranslations;

    // Collect all unique keys across all default locale dictionaries
    const allUniqueKeys = new Set<string>();
    for (const loc of targetLocales) {
      const dict = defaultLocales[loc] || {};
      for (const k of Object.keys(dict)) {
        allUniqueKeys.add(k);
      }
    }
    for (const k of Object.keys(baseDict)) {
      allUniqueKeys.add(k);
    }

    if (force) {
      // Full force upsert of all keys across all locales
      const rowsToInsert: Array<{ locale: string; key: string; value: string; group_name: string }> = [];

      for (const loc of targetLocales) {
        const locDict = defaultLocales[loc] || {};

        for (const key of allUniqueKeys) {
          const value = locDict[key] !== undefined ? locDict[key] : (baseDict[key] || "");
          const group_name = extractGroupFromKey(key);
          rowsToInsert.push({
            locale: loc,
            key,
            value,
            group_name,
          });
        }
      }

      const importedCount = await this.batchUpsert(rowsToInsert);
      invalidateTranslationsCache();

      return {
        importedCount,
        keysCount: allUniqueKeys.size,
        locales: targetLocales,
      };
    }

    // Non-force mode: find only missing keys per locale in DB and insert them
    const existingRecordsRes = await db.execute("SELECT locale, key FROM translations");
    const existingSet = new Set<string>();
    for (const row of existingRecordsRes.rows) {
      existingSet.add(`${String(row.locale).toLowerCase()}:${String(row.key)}`);
    }

    const missingRowsToInsert: Array<{ locale: string; key: string; value: string; group_name: string }> = [];

    for (const loc of targetLocales) {
      const locDict = defaultLocales[loc] || {};

      for (const key of allUniqueKeys) {
        const lookup = `${loc.toLowerCase()}:${key}`;
        if (!existingSet.has(lookup)) {
          const value = locDict[key] !== undefined ? locDict[key] : (baseDict[key] || "");
          const group_name = extractGroupFromKey(key);
          missingRowsToInsert.push({
            locale: loc,
            key,
            value,
            group_name,
          });
        }
      }
    }

    let insertedCount = 0;
    if (missingRowsToInsert.length > 0) {
      insertedCount = await this.batchUpsert(missingRowsToInsert);
      invalidateTranslationsCache();
      console.log(`[TranslationService] Successfully synchronized ${insertedCount} missing translation key(s) into database.`);
    }

    return {
      importedCount: insertedCount,
      insertedMissing: insertedCount,
      keysCount: allUniqueKeys.size,
      locales: targetLocales,
    };
  },

  /**
   * Scans the codebase for translation keys used in frontend/backend components
   */
  async scanCodebaseForKeys(): Promise<{
    keys: string[];
    occurrences: Record<string, string[]>;
  }> {
    const rootDir = process.cwd();
    const srcDir = path.join(rootDir, "src");
    const foundKeys = new Set<string>();
    const occurrences: Record<string, string[]> = {};

    function walk(dir: string, fileList: string[] = []): string[] {
      if (!fs.existsSync(dir)) return fileList;
      try {
        const stat = fs.statSync(dir);
        if (!stat.isDirectory()) {
          fileList.push(dir);
          return fileList;
        }
        const entries = fs.readdirSync(dir);
        for (const entry of entries) {
          const fullPath = path.join(dir, entry);
          if (fs.statSync(fullPath).isDirectory()) {
            if (entry !== "node_modules" && entry !== ".git" && entry !== "dist" && entry !== "build") {
              walk(fullPath, fileList);
            }
          } else if (/\.(tsx?|jsx?|vue|html)$/.test(entry)) {
            fileList.push(fullPath);
          }
        }
      } catch (err) {
        console.error("[TranslationService] Error walking directory:", err);
      }
      return fileList;
    }

    const files = walk(srcDir);
    const serverFile = path.join(rootDir, "server.ts");
    if (fs.existsSync(serverFile)) files.push(serverFile);

    const patterns = [
      /\btUi\s*\(\s*(['"`])([^'"`\n\r]+)\1/g,
      /\b__\s*\(\s*(['"`])([^'"`\n\r]+)\1/g,
      /\b\$t\s*\(\s*(['"`])([^'"`\n\r]+)\1/g,
      /\bt\s*\(\s*(['"`])([a-zA-Z0-9_.-]+(?:\.[a-zA-Z0-9_.-]+)+)\1/g,
    ];

    for (const file of files) {
      if (file.includes("translations.ts") || file.includes("i18n.ts")) continue;
      try {
        const content = fs.readFileSync(file, "utf8");
        const relPath = path.relative(rootDir, file);
        for (const pattern of patterns) {
          let match;
          while ((match = pattern.exec(content)) !== null) {
            const key = match[2].trim();
            if (key && !key.includes("${") && key.length < 200) {
              foundKeys.add(key);
              if (!occurrences[key]) occurrences[key] = [];
              if (!occurrences[key].includes(relPath)) {
                occurrences[key].push(relPath);
              }
            }
          }
        }
      } catch (err) {
        // Ignore read errors
      }
    }

    return {
      keys: Array.from(foundKeys).sort(),
      occurrences,
    };
  },

  /**
   * Generates a comprehensive missing keys and health report
   */
  async getMissingReport(): Promise<{
    totalCodebaseKeys: number;
    totalDbKeys: number;
    missingInDb: string[];
    missingByLocale: Record<string, string[]>;
    codebaseOccurrences: Record<string, string[]>;
  }> {
    const scan = await this.scanCodebaseForKeys();
    const dbDicts = await this.getAllDictionaries(true);
    const targetLocales = ["en", "hu", "de", "es", "fr"];

    // Collect all distinct DB keys
    const allDbKeys = new Set<string>();
    Object.values(dbDicts).forEach((dict) => {
      Object.keys(dict).forEach((k) => allDbKeys.add(k));
    });

    const missingInDb = scan.keys.filter((k) => !allDbKeys.has(k));

    const missingByLocale: Record<string, string[]> = {};
    for (const loc of targetLocales) {
      const locDict = dbDicts[loc] || {};
      const missingForLocale: string[] = [];

      // Check all DB keys + scanned keys
      const combinedKeys = new Set([...allDbKeys, ...scan.keys]);
      combinedKeys.forEach((key) => {
        if (!locDict[key] || locDict[key].trim() === "") {
          missingForLocale.push(key);
        }
      });
      missingByLocale[loc] = missingForLocale;
    }

    return {
      totalCodebaseKeys: scan.keys.length,
      totalDbKeys: allDbKeys.size,
      missingInDb,
      missingByLocale,
      codebaseOccurrences: scan.occurrences,
    };
  },

  /**
   * Alias helper to ensure all codebase translations are synced into DB
   */
  async syncMissingTranslations(force = false) {
    return this.importFromHardcoded(force);
  },
};
