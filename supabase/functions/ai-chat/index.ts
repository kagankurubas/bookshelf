// Kitap Asistani - Gemini API proxy'si.
//
// Bu dosya Supabase Dashboard > Edge Functions bolumunden "ai-chat" adiyla
// olusturulan fonksiyona AYNEN yapistirilir. API anahtarini tarayicida
// tutmamak icin tum Gemini cagrisi burada, sunucu tarafinda yapiliyor.
//
// Gerekli secret: GEMINI_API_KEY (Dashboard > Edge Functions > Secrets)
// SUPABASE_URL, SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY are
// provided by Supabase automatically.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
const GEMINI_MODEL = 'gemini-3.6-flash';
// Only overridden by the integration tests, which point it at a fake Gemini.
const GEMINI_API_BASE_URL = Deno.env.get('GEMINI_API_BASE_URL') ?? 'https://generativelanguage.googleapis.com';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

// Only service_role may execute try_consume_ai_quota, which fixes the daily
// limit and the day itself (see migrations/014_ai_quota_lockdown.sql). This
// client is used for that one call; everything else goes through the
// user's own RLS-bound client.
const quotaClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Gemini's transient errors (503 high demand, 429 rate limit) are retried
// with a short, jittered exponential backoff.
const MAX_GEMINI_ATTEMPTS = 3;
const BACKOFF_MS = [1000, 2000];
const MAX_RETRY_DELAY_MS = 5000;
const BUSY_STATUSES = [429, 503];

const withJitter = (ms) => Math.round(ms * (0.8 + Math.random() * 0.4));

// A Gemini call that produced no reply; `busy` marks Google's transient
// 503/429, which the client is told about as AI_BUSY.
class GeminiError extends Error {
  constructor(status, errText) {
    super(`Gemini API error: ${status} ${errText}`);
    this.busy = BUSY_STATUSES.includes(status);
  }
}

// How long to wait before retrying a failed Gemini call, or null when it
// isn't worth retrying. A 429 for the per-day quota only clears at midnight
// Pacific; otherwise its RetryInfo.retryDelay (e.g. "3s") is honoured.
function retryDelayMs(status, errText, attempt) {
  const backoff = withJitter(BACKOFF_MS[attempt - 1]);
  if (status === 503) return backoff;
  if (status !== 429) return null;
  let details = [];
  try {
    details = JSON.parse(errText)?.error?.details ?? [];
  } catch {
    // Not JSON; fall back to the default backoff.
  }
  const isPerDay = details.some((d) => d.violations?.some((v) => /PerDay/.test(v.quotaId ?? '')));
  if (isPerDay) return null;
  const hinted = parseFloat(details.find((d) => d.retryDelay)?.retryDelay) * 1000;
  if (Number.isNaN(hinted)) return backoff;
  return hinted <= MAX_RETRY_DELAY_MS ? hinted : null;
}

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  let quotaConsumed = false;
  let geminiData = null;
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return jsonResponse({ error: 'Missing Authorization header' }, 401);
    }

    // A client on the user's own session, so every query except the quota
    // call is subject to RLS.
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }
    const userId = userData.user.id;

    const { conversationId, message, language } = await req.json();
    if (!message || typeof message !== 'string') {
      return jsonResponse({ error: 'message is required' }, 400);
    }
    const lang = language === 'en' ? 'en' : 'tr';

    // Gunluk kota kontrolu - herhangi bir konusma/mesaj kaydi olusturmadan
    // ONCE yapiliyor ki kota dolduğunda veritabaninda yarim kalan kayit
    // birikmesin.
    const { data: quotaOk, error: quotaError } = await quotaClient.rpc('try_consume_ai_quota');
    if (quotaError) throw quotaError;
    if (!quotaOk) {
      // 200 doneriz ki supabase-js data.error yolunu kullansin - boylece
      // istemci bu makine-okunabilir kodu (DAILY_LIMIT_REACHED) guvenilir
      // sekilde yakalayip kullaniciya cevirili, nazik bir mesaj gosterebilir.
      // Bu fonksiyon Supabase Dashboard'a manuel yapistirilarak deploy
      // ediliyor (repo icinden import edemiyor), bu yuzden asagidaki string
      // src/lib/aiChatErrors.js'teki AI_CHAT_WIRE_ERRORS.DAILY_LIMIT_REACHED
      // ile elle senkron tutulmali - biri degisirse digeri de degismeli.
      return jsonResponse({ error: 'DAILY_LIMIT_REACHED' }, 200);
    }
    quotaConsumed = true;

    // Nothing is written until Gemini has replied, so a failed attempt
    // leaves no half-saved conversation or message behind.
    let history = [];
    if (conversationId) {
      const { data, error: historyError } = await supabase
        .from('ai_messages')
        .select('role, content')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });
      if (historyError) throw historyError;
      history = data;
    }

    // Kisisel oneri icin kullanicinin kitaplarini baglam olarak ekle.
    const { data: books } = await supabase
      .from('books')
      .select('title, author, category, status, rating')
      .eq('user_id', userId)
      .limit(200);

    const bookContext = (books || [])
      .map((b) => {
        const parts = [`- ${b.title} (${b.author})`];
        if (b.category) parts.push(`category: ${b.category}`);
        parts.push(`status: ${b.status}`);
        if (b.rating) parts.push(`rating: ${b.rating}/5`);
        return parts.join(', ');
      })
      .join('\n');

    // Uygulama TR/EN iki dilli kullaniliyor ve kullanicilar arayuz dilinden
    // bagimsiz olarak istedikleri dilde yazabiliyor - bu yuzden yanit dilini
    // arayuzdeki secili dile (lang) SABITLEMIYORUZ, modelden kullanicinin o
    // mesajda yazdigi dili kendisinin tespit edip onunla cevap vermesini
    // istiyoruz. lang sadece dilin belirsiz oldugu (ör. tek kelimelik/emoji
    // mesaj) nadir durumlar icin bir yedek/varsayilan olarak kullaniliyor.
    const uiLanguageName = lang === 'en' ? 'English' : 'Turkish';
    const systemPrompt = `You are "Kitap Asistanı" (Book Assistant), a helpful reading assistant inside the BookShelf app. Give personalized book recommendations based on the user's library below, and chat with them about books they've read or want to read. Reply briefly and warmly.

IMPORTANT: Always reply in the same language the user's latest message is written in (Turkish, English, or otherwise), regardless of what language earlier messages used. Only if that message's language truly cannot be determined (e.g. it's empty, a single emoji, or an ambiguous word), default to ${uiLanguageName}.

The user's library:
${bookContext || '(no books added yet)'}`;

    const contents = [
      ...history.map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      })),
      { role: 'user', parts: [{ text: message }] },
    ];

    for (let attempt = 1; ; attempt++) {
      let geminiRes;
      try {
        geminiRes = await fetch(
          `${GEMINI_API_BASE_URL}/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents,
              systemInstruction: { parts: [{ text: systemPrompt }] },
            }),
          }
        );
      } catch (err) {
        throw new GeminiError('network error', String(err));
      }
      if (geminiRes.ok) {
        geminiData = await geminiRes.json();
        break;
      }
      const errText = await geminiRes.text();
      const delay = attempt < MAX_GEMINI_ATTEMPTS ? retryDelayMs(geminiRes.status, errText, attempt) : null;
      if (delay === null) throw new GeminiError(geminiRes.status, errText);
      console.warn(`Gemini API ${geminiRes.status}, retrying in ${delay}ms (attempt ${attempt + 1}/${MAX_GEMINI_ATTEMPTS})`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    const replyText =
      geminiData?.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') ||
      (lang === 'en' ? "Sorry, I couldn't generate a reply." : 'Üzgünüm, bir yanıt oluşturamadım.');

    let convoId = conversationId;
    if (!convoId) {
      const { data: newConvo, error: convoError } = await supabase
        .from('ai_conversations')
        .insert({ user_id: userId, title: message.slice(0, 60) })
        .select()
        .single();
      if (convoError) throw convoError;
      convoId = newConvo.id;
    }

    // Separate inserts so the two rows get distinct created_at values and
    // keep their order.
    const { error: insertUserMsgError } = await supabase
      .from('ai_messages')
      .insert({ conversation_id: convoId, role: 'user', content: message });
    if (insertUserMsgError) throw insertUserMsgError;

    const { error: insertAiMsgError } = await supabase
      .from('ai_messages')
      .insert({ conversation_id: convoId, role: 'assistant', content: replyText });
    if (insertAiMsgError) throw insertAiMsgError;

    return jsonResponse({ conversationId: convoId, reply: replyText });
  } catch (err) {
    // Any failure after the quota was spent but before Gemini replied gives
    // the slot back; later failures (saving the reply) keep it spent.
    if (quotaConsumed && !geminiData) {
      const { error: refundError } = await quotaClient.rpc('refund_ai_quota');
      if (refundError) console.error(refundError);
    }
    console.error(err);
    if (err instanceof GeminiError && err.busy) {
      // Like DAILY_LIMIT_REACHED above, 'AI_BUSY' must stay in sync with
      // AI_CHAT_WIRE_ERRORS in src/lib/aiChatErrors.js.
      return jsonResponse({ error: 'AI_BUSY' }, 200);
    }
    const message = err instanceof Error ? err.message : String(err);
    return jsonResponse({ error: message || 'Internal error' }, 500);
  }
});
