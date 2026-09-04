// Kullanicinin kendi hesabini ve tum verisini (kitaplik, kitap, sohbet
// gecmisi) kalici olarak silmesini saglar.
//
// Bu dosya Supabase Dashboard > Edge Functions bolumunden "delete-account"
// adiyla olusturulan fonksiyona AYNEN yapistirilir. auth.admin.deleteUser
// service-role anahtari gerektirir ve bu anahtar client'a asla sizmamali -
// bu yuzden silme islemi client'tan direkt yapilamaz, burada sunucu
// tarafinda yapiliyor. Istegi yapan kullanicinin JWT'si once kendi
// oturumuyla dogrulanir, service-role client'i sadece ondan SONRA ve
// sadece o kullanicinin kendi id'siyle kullanilir.
//
// Ekstra secret eklemeye GEREK YOK: SUPABASE_URL, SUPABASE_ANON_KEY ve
// SUPABASE_SERVICE_ROLE_KEY, her Edge Function'a Supabase tarafindan
// otomatik enjekte edilir. Dashboard'da bu isimlerle (SUPABASE_ on-eki ile
// baslayan) manuel bir secret olusturmaya calisirsan zaten "Name must not
// start with the SUPABASE_ prefix" hatasi alirsin - bu beklenen davranis.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

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

    // Kullanicinin kendi oturumuyla bir client - sadece "bu istek gercekten
    // kim tarafindan yapiliyor" sorusunu cevaplamak icin, RLS'e tabi.
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData.user) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }
    const userId = userData.user.id;

    // Sadece bu fonksiyonun icinde, sadece dogrulanmis kullanicinin kendi
    // id'siyle kullanilan service-role client - RLS'i atlar, anahtar hicbir
    // zaman client'a donmez.
    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // libraries/books/ai_conversations tablolarindaki user_id kolonlari
    // auth.users(id)'e ON DELETE CASCADE ile bagli (bkz. supabase/schema.sql,
    // migrations/003 ve 006); book_libraries, notes ve ai_messages de kendi
    // ebeveynlerinden (books/libraries/ai_conversations) cascade ile
    // siliniyor. Bu yuzden kullaniciyi silmek butun kitaplik/kitap/sohbet
    // verisini de otomatik temizler - burada ayrica manuel silme yapmaya
    // gerek yok.
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId);
    if (deleteError) throw deleteError;

    return jsonResponse({ success: true });
  } catch (err) {
    console.error(err);
    const message = err instanceof Error ? err.message : String(err);
    return jsonResponse({ error: message || 'Internal error' }, 500);
  }
});
