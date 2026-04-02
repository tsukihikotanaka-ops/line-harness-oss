import { jstNow } from './utils.js';
// =============================================================================
// Traffic Pools — instant account switching via /pool/:slug
// =============================================================================

export interface TrafficPool {
  id: string;
  slug: string;
  name: string;
  active_account_id: string;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export interface TrafficPoolWithAccount extends TrafficPool {
  account_name: string;
  liff_id: string | null;
  login_channel_id: string | null;
  login_channel_secret: string | null;
  channel_access_token: string | null;
  channel_id: string | null;
}

// ── Queries ─────────────────────────────────────────────────────────────────

export async function getTrafficPools(db: D1Database): Promise<TrafficPoolWithAccount[]> {
  const result = await db
    .prepare(
      `SELECT tp.*, la.name as account_name, la.liff_id, la.login_channel_id, la.login_channel_secret, la.channel_access_token, la.channel_id
       FROM traffic_pools tp
       JOIN line_accounts la ON la.id = tp.active_account_id
       ORDER BY tp.created_at DESC`,
    )
    .all<TrafficPoolWithAccount>();
  return result.results;
}

export async function getTrafficPoolById(
  db: D1Database,
  id: string,
): Promise<TrafficPoolWithAccount | null> {
  return db
    .prepare(
      `SELECT tp.*, la.name as account_name, la.liff_id, la.login_channel_id, la.login_channel_secret, la.channel_access_token, la.channel_id
       FROM traffic_pools tp
       JOIN line_accounts la ON la.id = tp.active_account_id
       WHERE tp.id = ?`,
    )
    .bind(id)
    .first<TrafficPoolWithAccount>();
}

export async function getTrafficPoolBySlug(
  db: D1Database,
  slug: string,
): Promise<TrafficPoolWithAccount | null> {
  return db
    .prepare(
      `SELECT tp.*, la.name as account_name, la.liff_id, la.login_channel_id, la.login_channel_secret, la.channel_access_token, la.channel_id
       FROM traffic_pools tp
       JOIN line_accounts la ON la.id = tp.active_account_id
       WHERE tp.slug = ? AND tp.is_active = 1`,
    )
    .bind(slug)
    .first<TrafficPoolWithAccount>();
}

// ── Mutations ───────────────────────────────────────────────────────────────

export interface CreateTrafficPoolInput {
  slug: string;
  name: string;
  activeAccountId: string;
}

export async function createTrafficPool(
  db: D1Database,
  input: CreateTrafficPoolInput,
): Promise<TrafficPoolWithAccount> {
  const id = crypto.randomUUID();
  const now = jstNow();

  await db
    .prepare(
      `INSERT INTO traffic_pools (id, slug, name, active_account_id, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, 1, ?, ?)`,
    )
    .bind(id, input.slug, input.name, input.activeAccountId, now, now)
    .run();

  return (await getTrafficPoolById(db, id))!;
}

export interface UpdateTrafficPoolInput {
  name?: string;
  activeAccountId?: string;
  isActive?: boolean;
}

export async function updateTrafficPool(
  db: D1Database,
  id: string,
  updates: UpdateTrafficPoolInput,
): Promise<TrafficPoolWithAccount | null> {
  const fields: string[] = [];
  const values: unknown[] = [];

  if (updates.name !== undefined) {
    fields.push('name = ?');
    values.push(updates.name);
  }
  if (updates.activeAccountId !== undefined) {
    fields.push('active_account_id = ?');
    values.push(updates.activeAccountId);
  }
  if (updates.isActive !== undefined) {
    fields.push('is_active = ?');
    values.push(updates.isActive ? 1 : 0);
  }

  if (fields.length === 0) return getTrafficPoolById(db, id);

  fields.push('updated_at = ?');
  values.push(jstNow());
  values.push(id);

  await db
    .prepare(`UPDATE traffic_pools SET ${fields.join(', ')} WHERE id = ?`)
    .bind(...values)
    .run();

  return getTrafficPoolById(db, id);
}

export async function deleteTrafficPool(db: D1Database, id: string): Promise<void> {
  await db.prepare(`DELETE FROM traffic_pools WHERE id = ?`).bind(id).run();
}
