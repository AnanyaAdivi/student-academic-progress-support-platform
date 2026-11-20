import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { runMigrations } from '../../src/db/migrate.js';
import { pool } from '../../src/db/pool.js';

const app = createApp();

describe('Phase 1: Bootstrap & Health', () => {
  beforeAll(async () => {
    await runMigrations();
  });

  afterAll(async () => {
    await pool.end();
  });

  it('GET /api/health returns 200 with DB up and X-Request-Id header', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.headers['x-request-id']).toBeDefined();
    expect(res.body).toEqual({
      status: 'ok',
      db: 'up',
      requestId: res.headers['x-request-id']
    });
  });

  it('Unknown route returns 404 in standard error contract envelope', async () => {
    const res = await request(app).get('/api/does-not-exist');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({
      error: 'NOT_FOUND',
      message: 'The requested resource was not found.',
      requestId: res.headers['x-request-id']
    });
  });
});