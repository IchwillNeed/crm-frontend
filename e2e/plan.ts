import { expect, request as playwrightRequest } from '@playwright/test';

// Exercise the real platform-admin assignment flow in the isolated E2E database.
export async function assignInternalPlan(company: number) {
  const request = await playwrightRequest.newContext();
  const base = 'http://127.0.0.1:8001';
  const csrf = (html: string) => {
    const value = html.match(/name="csrfmiddlewaretoken" value="([^"]+)"/)?.[1];
    if (!value) throw new Error('Missing admin CSRF token');
    return value;
  };
  try {
    const login = await request.get(`${base}/admin/login/`);
    await request.post(`${base}/admin/login/`, { form: {
      csrfmiddlewaretoken: csrf(await login.text()), username: 'e2e-platform', password: 'Isolated-platform-9185!', next: '/admin/',
    } });
    const add = await request.get(`${base}/admin/core/subscription/add/`);
    const html = await add.text();
    const plan = html.match(/value="(\d+)">Interno gratuito<\//)?.[1];
    if (!plan) throw new Error('Missing internal plan');
    const result = await request.post(`${base}/admin/core/subscription/add/`, { maxRedirects: 0, form: {
      csrfmiddlewaretoken: csrf(html), company: String(company), plan,
      start_date_0: '2020-01-01', start_date_1: '00:00:00',
      end_date_0: '', end_date_1: '', status: 'active', _save: 'Save',
    } });
    expect(result.status(), await result.text()).toBe(302);
  } finally {
    await request.dispose();
  }
}
