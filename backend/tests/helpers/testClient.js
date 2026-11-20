import request from 'supertest';
import * as appModule from '../../src/app.js';

export const app =
  appModule.app ??
  appModule.default ??
  (typeof appModule.createApp === 'function' ? appModule.createApp() : null);

if (!app) {
  throw new Error('Could not resolve Express app export from src/app.js');
}

export function extractCsrfToken(setCookieHeaders = []) {
  for (const raw of setCookieHeaders) {
    const [pair] = raw.split(';');
    const eqIdx = pair.indexOf('=');
    if (eqIdx === -1) continue;
    const name = pair.slice(0, eqIdx).trim();
    const value = pair.slice(eqIdx + 1).trim();
    if (/csrf|xsrf/i.test(name)) {
      return decodeURIComponent(value);
    }
  }
  return null;
}

export async function loginAs(email, password) {
  const agent = request.agent(app);
  const res = await agent.post('/api/auth/login').send({ email, password });

  if (res.status !== 200) {
    throw new Error(`Login failed for ${email} (status ${res.status}): ${JSON.stringify(res.body)}`);
  }

  const cookies = res.headers['set-cookie'] || [];
  const csrfToken = extractCsrfToken(cookies);

  return { agent, csrfToken, user: res.body.user, rawCookies: cookies };
}

export function withCsrf(reqBuilder, csrfToken) {
  return csrfToken ? reqBuilder.set('x-csrf-token', csrfToken) : reqBuilder;
}
