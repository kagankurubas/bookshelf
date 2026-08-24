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

    const { conversationId, message } = await req.json();
    if (!message || typeof message !== 'string') {
      return jsonResponse({ error: 'message is required' }, 400);
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
        if (b.category) parts.push(`kategori: ${b.category}`);
        parts.push(`durum: ${b.status}`);
        if (b.rating) parts.push(`puan: ${b.rating}/5`);
        return parts.join(', ');
      })
      .join('\n');

    // Kullanicinin mesajini kaydet.
    const { error: insertUserMsgError } = await supabase
      .from('ai_messages')
      .insert({ conversation_id: convoId, role: 'user', content: message });
    if (insertUserMsgError) throw insertUserMsgError;

    const systemPrompt = `Sen BookShelf uygulamasinda "Kitap Asistani" adinda yardimsever bir kitap asistanisin. Kullanicinin kitapligindaki kitaplara gore kisisellestirilmis kitap onerileri yap ve okudugu/okumak istedigi kitaplar hakkinda sohbet et. Kisa, samimi ve dogal bir dille (Turkce) yanit ver.

Kullanicinin kitapligi:
${bookContext || '(henuz kitap eklenmemis)'}`;

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
      'Uzgunum, bir yanit olusturamadim.';

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
