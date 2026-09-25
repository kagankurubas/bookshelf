import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { setupRlsFixture } from './fixtures.js';

// try_consume_ai_quota must only be callable with service_role (as ai-chat
// does); signed-in and anonymous clients must not reach the shared counter.
const DAILY_LIMIT = 15;

// Same day boundary as the function: Google resets the quota at midnight
// Pacific time.
function todayInPacific() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Los_Angeles',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

describe('try_consume_ai_quota access', () => {
  let fixture;

  async function resetTodayUsage() {
    const { error } = await fixture.adminClient.from('ai_daily_usage').delete().eq('usage_date', todayInPacific());
    expect(error).toBeNull();
  }

  async function todayCount() {
    const { data, error } = await fixture.adminClient
      .from('ai_daily_usage')
      .select('request_count')
      .eq('usage_date', todayInPacific())
      .maybeSingle();
    expect(error).toBeNull();
    return data?.request_count ?? 0;
  }

  beforeAll(async () => {
    fixture = await setupRlsFixture();
    await resetTodayUsage();
  });

  afterAll(async () => {
    if (fixture) {
      await resetTodayUsage();
      await fixture.cleanup();
    }
  });

  it('denies a signed-in user', async () => {
    const { data, error } = await fixture.userA.client.rpc('try_consume_ai_quota');
    expect(data).toBeNull();
    expect(error).toMatchObject({ code: '42501' });
    expect(await todayCount()).toBe(0);
  });

  it('denies an anonymous client', async () => {
    const { data, error } = await fixture.anonClient.rpc('try_consume_ai_quota');
    expect(data).toBeNull();
    expect(error).toMatchObject({ code: '42501' });
    expect(await todayCount()).toBe(0);
  });

  it('no longer accepts a caller-supplied limit', async () => {
    const { data, error } = await fixture.userA.client.rpc('try_consume_ai_quota', {
      p_usage_date: todayInPacific(),
      p_max_requests: 1000,
    });
    expect(data).toBeNull();
    expect(error).not.toBeNull();
    expect(await todayCount()).toBe(0);
  });

  it('lets service_role consume up to the fixed daily limit and no further', async () => {
    for (let i = 0; i < DAILY_LIMIT; i++) {
      const { data, error } = await fixture.adminClient.rpc('try_consume_ai_quota');
      expect(error).toBeNull();
      expect(data).toBe(true);
    }

    const { data, error } = await fixture.adminClient.rpc('try_consume_ai_quota');
    expect(error).toBeNull();
    expect(data).toBe(false);
    expect(await todayCount()).toBe(DAILY_LIMIT);
  });

  it('denies refund_ai_quota to signed-in and anonymous clients', async () => {
    await resetTodayUsage();
    await fixture.adminClient.rpc('try_consume_ai_quota');

    for (const client of [fixture.userA.client, fixture.anonClient]) {
      const { error } = await client.rpc('refund_ai_quota');
      expect(error).toMatchObject({ code: '42501' });
    }
    expect(await todayCount()).toBe(1);
  });

  it('lets service_role give one slot back, never going below zero', async () => {
    await resetTodayUsage();
    await fixture.adminClient.rpc('try_consume_ai_quota');
    await fixture.adminClient.rpc('try_consume_ai_quota');

    expect((await fixture.adminClient.rpc('refund_ai_quota')).error).toBeNull();
    expect(await todayCount()).toBe(1);

    await fixture.adminClient.rpc('refund_ai_quota');
    await fixture.adminClient.rpc('refund_ai_quota');
    expect(await todayCount()).toBe(0);
  });

  it('reopens exactly one request once the limit is reached and a slot is refunded', async () => {
    await resetTodayUsage();
    for (let i = 0; i < DAILY_LIMIT; i++) await fixture.adminClient.rpc('try_consume_ai_quota');
    expect((await fixture.adminClient.rpc('try_consume_ai_quota')).data).toBe(false);

    await fixture.adminClient.rpc('refund_ai_quota');
    expect((await fixture.adminClient.rpc('try_consume_ai_quota')).data).toBe(true);
    expect((await fixture.adminClient.rpc('try_consume_ai_quota')).data).toBe(false);
  });
});
