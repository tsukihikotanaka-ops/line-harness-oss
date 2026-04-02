import { Hono } from 'hono';
import {
  getTrafficPools,
  getTrafficPoolById,
  getTrafficPoolBySlug,
  createTrafficPool,
  updateTrafficPool,
  deleteTrafficPool,
} from '@line-crm/db';
import type { TrafficPoolWithAccount } from '@line-crm/db';
import type { Env } from '../index.js';

const trafficPools = new Hono<Env>();

function serialize(pool: TrafficPoolWithAccount) {
  return {
    id: pool.id,
    slug: pool.slug,
    name: pool.name,
    activeAccountId: pool.active_account_id,
    accountName: pool.account_name,
    liffId: pool.liff_id,
    isActive: Boolean(pool.is_active),
    createdAt: pool.created_at,
    updatedAt: pool.updated_at,
  };
}

// ── Public: GET /pool/:slug → 302 redirect to LIFF auth URL ────────────────

trafficPools.get('/pool/:slug', async (c) => {
  const slug = c.req.param('slug');
  const pool = await getTrafficPoolBySlug(c.env.DB, slug);

  if (!pool || !pool.liff_id) {
    return c.json({ success: false, error: 'Pool not found' }, 404);
  }

  const liffUrl = `https://liff.line.me/${pool.liff_id}?liffId=${pool.liff_id}`;
  return c.redirect(liffUrl, 302);
});

// ── Admin API ───────────────────────────────────────────────────────────────

// GET /api/traffic-pools — list all
trafficPools.get('/api/traffic-pools', async (c) => {
  try {
    const pools = await getTrafficPools(c.env.DB);
    return c.json({ success: true, data: pools.map(serialize) });
  } catch (err) {
    console.error('GET /api/traffic-pools error:', err);
    return c.json({ success: false, error: 'Internal server error' }, 500);
  }
});

// POST /api/traffic-pools — create
trafficPools.post('/api/traffic-pools', async (c) => {
  try {
    const body = await c.req.json<{
      slug: string;
      name: string;
      activeAccountId: string;
    }>();

    if (!body.slug || !body.name || !body.activeAccountId) {
      return c.json({ success: false, error: 'slug, name, and activeAccountId are required' }, 400);
    }

    const pool = await createTrafficPool(c.env.DB, {
      slug: body.slug,
      name: body.name,
      activeAccountId: body.activeAccountId,
    });
    return c.json({ success: true, data: serialize(pool) }, 201);
  } catch (err) {
    console.error('POST /api/traffic-pools error:', err);
    return c.json({ success: false, error: 'Internal server error' }, 500);
  }
});

// PUT /api/traffic-pools/:id — update (switch account here)
trafficPools.put('/api/traffic-pools/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json<{
      name?: string;
      activeAccountId?: string;
      isActive?: boolean;
    }>();

    const updated = await updateTrafficPool(c.env.DB, id, {
      name: body.name,
      activeAccountId: body.activeAccountId,
      isActive: body.isActive,
    });

    if (!updated) {
      return c.json({ success: false, error: 'Traffic pool not found' }, 404);
    }
    return c.json({ success: true, data: serialize(updated) });
  } catch (err) {
    console.error('PUT /api/traffic-pools/:id error:', err);
    return c.json({ success: false, error: 'Internal server error' }, 500);
  }
});

// DELETE /api/traffic-pools/:id
trafficPools.delete('/api/traffic-pools/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const existing = await getTrafficPoolById(c.env.DB, id);
    if (!existing) {
      return c.json({ success: false, error: 'Traffic pool not found' }, 404);
    }
    await deleteTrafficPool(c.env.DB, id);
    return c.json({ success: true, data: null });
  } catch (err) {
    console.error('DELETE /api/traffic-pools/:id error:', err);
    return c.json({ success: false, error: 'Internal server error' }, 500);
  }
});

export { trafficPools };
