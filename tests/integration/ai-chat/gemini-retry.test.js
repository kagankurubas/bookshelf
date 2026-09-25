import http from 'node:http';
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { setupRlsFixture } from '../rls/fixtures.js';

// End-to-end tests of ai-chat against a fake Gemini. They need the function
// served locally with functions.env, which points GEMINI_API_BASE_URL at
// this server (see README "RLS integration tests").
const FAKE_GEMINI_PORT = 54399;
const SERVE_COMMAND = 'npx supabase functions serve --env-file tests/integration/ai-chat/functions.env';

const reply = (text) => ({ status: 200, body: { candidates: [{ content: { parts: [{ text }] } }] } });
const unavailable = { status: 503, body: { error: { code: 503, message: 'This model is currently experiencing high demand.', status: 'UNAVAILABLE' } } };
const perDayLimit = {
  status: 429,
  body: {
    error: {
      code: 429,
      status: 'RESOURCE_EXHAUSTED',
      details: [
        { '@type': 'type.googleapis.com/google.rpc.QuotaFailure', violations: [{ quotaId: 'GenerateRequestsPerDayPerProjectPerModel-FreeTier' }] },
        { '@type': 'type.googleapis.com/google.rpc.RetryInfo', retryDelay: '34s' },
      ],
    },
  },
};
const badRequest = { status: 400, body: { error: { code: 400, status: 'INVALID_ARGUMENT' } } };

// Answers each Gemini request with the next scripted response.
function startFakeGemini() {
  const state = { responses: [], hits: 0 };
  const server = http.createServer((req, res) => {
    req.resume();
    req.on('end', () => {
      state.hits++;
      const next = state.responses.shift() ?? reply('fallback');
      res.writeHead(next.status, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(next.body));
    });
  });
  return new Promise((resolve) => {
    server.listen(FAKE_GEMINI_PORT, '0.0.0.0', () => resolve({ server, state }));
  });
}

function todayInPacific() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Los_Angeles',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

describe('ai-chat with a flaky Gemini', () => {
  let fixture;
  let fake;

  async function todayCount() {
    const { data } = await fixture.adminClient
      .from('ai_daily_usage')
      .select('request_count')
      .eq('usage_date', todayInPacific())
      .maybeSingle();
    return data?.request_count ?? 0;
  }

  async function savedRows() {
    const { data: conversations } = await fixture.adminClient
      .from('ai_conversations')
      .select('id')
      .eq('user_id', fixture.userA.id);
    const ids = conversations.map((c) => c.id);
    const { data: messages } = ids.length
      ? await fixture.adminClient.from('ai_messages').select('role, content').in('conversation_id', ids).order('created_at')
      : { data: [] };
    return { conversations: conversations.length, messages };
  }

  const send = (body) => fixture.userA.client.functions.invoke('ai-chat', { body: { language: 'tr', ...body } });

  beforeAll(async () => {
    const probe = await fetch(`${process.env.SUPABASE_URL}/functions/v1/ai-chat`, { method: 'OPTIONS' });
    if (!probe.ok) {
      throw new Error(`ai-chat is not being served locally (OPTIONS returned ${probe.status}). Run: ${SERVE_COMMAND}`);
    }
    fake = await startFakeGemini();
    fixture = await setupRlsFixture();
  });

  afterAll(async () => {
    if (fixture) {
      await fixture.adminClient.from('ai_daily_usage').delete().eq('usage_date', todayInPacific());
      await fixture.cleanup();
    }
    await new Promise((resolve) => fake?.server.close(resolve));
  });

  beforeEach(async () => {
    await fixture.adminClient.from('ai_conversations').delete().eq('user_id', fixture.userA.id);
    await fixture.adminClient.from('ai_daily_usage').delete().eq('usage_date', todayInPacific());
    fake.state.responses = [];
    fake.state.hits = 0;
  });

  it('retries a 503 and then saves the conversation once, counting one request', async () => {
    fake.state.responses = [unavailable, reply('Dune okuyabilirsin.')];

    const { data, error } = await send({ message: 'Bilim kurgu onerir misin?' });

    expect(error).toBeNull();
    expect(data).toMatchObject({ reply: 'Dune okuyabilirsin.', conversationId: expect.any(String) });
    expect(fake.state.hits).toBe(2);
    expect(await savedRows()).toEqual({
      conversations: 1,
      messages: [
        { role: 'user', content: 'Bilim kurgu onerir misin?' },
        { role: 'assistant', content: 'Dune okuyabilirsin.' },
      ],
    });
    expect(await todayCount()).toBe(1);
  });

  it('gives up after three busy attempts with AI_BUSY, saving nothing and refunding the quota', async () => {
    fake.state.responses = [unavailable, unavailable, unavailable];

    const { data, error } = await send({ message: 'Merhaba' });

    expect(error).toBeNull();
    expect(data).toEqual({ error: 'AI_BUSY' });
    expect(fake.state.hits).toBe(3);
    expect(await savedRows()).toEqual({ conversations: 0, messages: [] });
    expect(await todayCount()).toBe(0);
  });

  it('does not retry a per-day 429 and answers AI_BUSY', async () => {
    fake.state.responses = [perDayLimit];

    const { data } = await send({ message: 'Merhaba' });

    expect(data).toEqual({ error: 'AI_BUSY' });
    expect(fake.state.hits).toBe(1);
    expect(await todayCount()).toBe(0);
  });

  it('does not retry a 400, returns a generic error and refunds the quota', async () => {
    fake.state.responses = [badRequest];

    const { error } = await send({ message: 'Merhaba' });

    expect(error).not.toBeNull();
    expect(fake.state.hits).toBe(1);
    expect(await savedRows()).toEqual({ conversations: 0, messages: [] });
    expect(await todayCount()).toBe(0);
  });

  it('does not duplicate the message when a failed send is retried in an existing conversation', async () => {
    fake.state.responses = [reply('Ilk yanit')];
    const { data: first } = await send({ message: 'Ilk soru' });

    fake.state.responses = [unavailable, unavailable, unavailable];
    await send({ conversationId: first.conversationId, message: 'Ikinci soru' });

    fake.state.responses = [reply('Ikinci yanit')];
    await send({ conversationId: first.conversationId, message: 'Ikinci soru' });

    expect((await savedRows()).messages.map((m) => m.content)).toEqual(['Ilk soru', 'Ilk yanit', 'Ikinci soru', 'Ikinci yanit']);
    expect(await todayCount()).toBe(2);
  });
});
