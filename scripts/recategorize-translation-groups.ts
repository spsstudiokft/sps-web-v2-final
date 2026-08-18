import "dotenv/config";

import type { InStatement } from "@libsql/client";
import { getDb, setupDatabase } from "../src/db.js";
import { getTranslationGroup } from "../src/lib/translationGroups.js";

async function main() {
  await setupDatabase();
  const client = getDb();
  const result = await client.execute("SELECT DISTINCT key, group_name FROM translations ORDER BY key");
  const updates: InStatement[] = [];

  for (const row of result.rows) {
    const key = String(row.key);
    const currentGroup = String(row.group_name);
    const expectedGroup = getTranslationGroup(key);
    if (currentGroup !== expectedGroup) {
      updates.push({
        sql: "UPDATE translations SET group_name = ?, updated_at = CURRENT_TIMESTAMP WHERE key = ?",
        args: [expectedGroup, key],
      });
    }
  }

  for (let index = 0; index < updates.length; index += 100) {
    await client.batch(updates.slice(index, index + 100), "write");
  }

  const groups = await client.execute(`
    SELECT group_name, COUNT(DISTINCT key) AS key_count
    FROM translations
    GROUP BY group_name
    ORDER BY group_name
  `);

  console.log(`Recategorized ${updates.length} unique translation keys.`);
  console.table(groups.rows);
}

main().catch((error) => {
  console.error("Translation group recategorization failed:", error);
  process.exitCode = 1;
});
