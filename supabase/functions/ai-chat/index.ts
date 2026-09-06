// Kitap Asistani - Gemini API proxy'si.
//
// Bu dosya Supabase Dashboard > Edge Functions bolumunden "ai-chat" adiyla
// olusturulan fonksiyona AYNEN yapistirilir. API anahtarini tarayicida
// tutmamak icin tum Gemini cagrisi burada, sunucu tarafinda yapiliyor.
//
// Gerekli secret: GEMINI_API_KEY (Dashboard > Edge Functions > Secrets)
// SUPABASE_URL ve SUPABASE_ANON_KEY Supabase tarafindan otomatik saglanir.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
const GEMINI_MODEL = 'gemini-3.6-flash';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');

// Gemini ucretsiz katmaninda bu modelin gunluk istek kotasi (RPD) 20 - ve
// bu, TUM kullanicilar arasinda PAYLASILAN tek bir sinir, kullanici basina
// degil. O gercek sinira carpip Google'dan beklenmedik hatalar almamak
// icin kendi ic kotamizi kasten daha dusuk tutuyoruz; asagida
// try_consume_ai_quota RPC'siyle (bkz. migrations/012_ai_daily_quota.sql)
// bu sayiya ulasilinca Gemini'yi hic cagirmadan nazik bir hata donuyoruz.
const DAILY_QUOTA_LIMIT = 15;

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

    // Kullanicinin kendi oturumuyla bir Supabase client - boylece tum
    // sorgular RLS'e tabi olur, service-role anahtarina gerek kalmaz.
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
    // birikmesin. Google'in kotasi Pasifik saatiyle gece yarisi
    // sifirlandigi icin gun sinirini da ayni saat dilimine gore hesapliyoruz.
    const usageDate = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Los_Angeles',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());

    const { data: quotaOk, error: quotaError } = await supabase.rpc('try_consume_ai_quota', {
      p_usage_date: usageDate,
      p_max_requests: DAILY_QUOTA_LIMIT,
    });
    if (quotaError) throw quotaError;
    if (!quotaOk) {
      // 200 doneriz ki supabase-js data.error yolunu kullansin - boylece
      // istemci bu makine-okunabilir kodu (DAILY_LIMIT_REACHED) guvenilir
      // sekilde yakalayip kullaniciya cevirili, nazik bir mesaj gosterebilir.
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
