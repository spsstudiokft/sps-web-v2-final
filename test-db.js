import { createClient } from "@libsql/client";
const db = createClient({ 
  url: process.env.TURSO_DATABASE_URL, 
  authToken: process.env.TURSO_AUTH_TOKEN 
});
async function test() {
  const result = await db.execute(`
    SELECT u.id, u.email, u.role, u.is_active, u.created_at,
           (SELECT COUNT(*) FROM projects p WHERE p.client_id = u.id) as project_count,
           (SELECT json_group_array(json_object('id', p.id, 'name', p.name)) FROM projects p WHERE p.client_id = u.id) as projects_json
    FROM users u 
    WHERE u.role = 'client'
  `);
  console.log(result.rows);
}
test();
