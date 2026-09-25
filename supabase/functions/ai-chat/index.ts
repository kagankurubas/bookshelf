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

    // Sohbeti bul, yoksa olustur.
    let convoId = conversationId;
    if (!convoId) {
      const title = message.slice(0, 60);
      const { data: newConvo, error: convoError } = await supabase
        .from('ai_conversations')
        .insert({ user_id: userId, title })
        .select()
        .single();
      if (convoError) throw convoError;
      convoId = newConvo.id;
    }

    // Onceki mesajlari (baglam icin) cek.
    const { data: history, error: historyError } = await supabase
      .from('ai_messages')
      .select('role, content')
      .eq('conversation_id', convoId)
      .order('created_at', { ascending: true });
    if (historyError) throw historyError;

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

    // Kullanicinin mesajini kaydet.
    const { error: insertUserMsgError } = await supabase
      .from('ai_messages')
      .insert({ conversation_id: convoId, role: 'user', content: message });
    if (insertUserMsgError) throw insertUserMsgError;

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

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents,
          systemInstruction: { parts: [{ text: systemPrompt }] },
        }),
      }
    );

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      throw new Error(`Gemini API error: ${geminiRes.status} ${errText}`);
    }

    const geminiData = await geminiRes.json();
    const replyText =
      geminiData?.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') ||
      (lang === 'en' ? "Sorry, I couldn't generate a reply." : 'Üzgünüm, bir yanıt oluşturamadım.');

    const { error: insertAiMsgError } = await supabase
      .from('ai_messages')
      .insert({ conversation_id: convoId, role: 'assistant', content: replyText });
    if (insertAiMsgError) throw insertAiMsgError;

    return jsonResponse({ conversationId: convoId, reply: replyText });
  } catch (err) {
    console.error(err);
    const message = err instanceof Error ? err.message : String(err);
    return jsonResponse({ error: message || 'Internal error' }, 500);
  }
});
