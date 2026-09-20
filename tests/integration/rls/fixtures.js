import { expect } from 'vitest';
import { createClient } from '@supabase/supabase-js';

// RLS entegrasyon testleri icin paylasilan fixture yardimcisi.
//
// Bu modul, spec'teki "fixture kullanici deseni"ni tek bir yerde toplar ki
// ticket 02-05 (libraries/books, book_libraries, notes, ai_conversations/
// ai_messages izolasyon testleri) ayni deseni tekrar yazmak yerine
// setupRlsFixture()'i import edip kullanabilsin:
//
//   - service-role client -> auth.admin.createUser() ile User A ve User B
//   - her biri icin ayri bir anon-key client'ta signInWithPassword() ile
//     GERCEK bir oturum (JWT) - hook'larin/uygulamanin kullandigi yol ile
//     ayni PostgREST/RLS sinirindan gecerler
//   - hic sign-in yapilmamis ucuncu bir anon-key client (anon/oturumsuz
//     senaryolar icin)
//   - cleanup(): service-role client ile iki fixture kullaniciyi da siler;
//     auth.users -> libraries/books/ai_conversations satirlari
//     "on delete cascade" oldugu icin (supabase/schema.sql), onlara bagli
//     book_libraries/notes/ai_messages satirlari da otomatik silinir.

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `${name} ortam degiskeni eksik. .env.test.local dosyasini kontrol et ` +
        '(bkz. README.md "RLS entegrasyon testleri" bolumu).',
    );
  }
  return value;
}

// Ayni local Supabase orneginde art arda calisan test kosularinin fixture
// e-postalarinin carpismamasi icin zaman damgasi + rastgele ek kullanilir
// (local instance kalici oldugu icin - her kosu temiz bir DB'den baslamiyor).
function uniqueEmail(label) {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return `rls-test-${label}-${suffix}@example.com`;
}

const FIXTURE_PASSWORD = 'Rls-Test-Password-123!';

export function createServiceRoleClient() {
  const supabaseUrl = requireEnv('SUPABASE_URL');
  const serviceRoleKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY');
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export function createAnonClient() {
  const supabaseUrl = requireEnv('SUPABASE_URL');
  const anonKey = requireEnv('SUPABASE_ANON_KEY');
  return createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// Service-role client ile bir fixture kullanici olusturur (email_confirm:
// true, e-posta onayi beklemeden) ve ayri bir anon client'ta o kullanici
// olarak gercek bir oturum acar.
async function createSignedInFixtureUser(adminClient, label) {
  const email = uniqueEmail(label);

  const { data: created, error: createError } = await adminClient.auth.admin.createUser({
    email,
    password: FIXTURE_PASSWORD,
    email_confirm: true,
  });
  if (createError) {
    throw new Error(`Fixture kullanici (${label}) olusturulamadi: ${createError.message}`);
  }

  const client = createAnonClient();
  const { data: signedIn, error: signInError } = await client.auth.signInWithPassword({
    email,
    password: FIXTURE_PASSWORD,
  });
  if (signInError) {
    throw new Error(`Fixture kullanici (${label}) giris yapamadi: ${signInError.message}`);
  }

  return {
    id: created.user.id,
    email,
    client,
    session: signedIn.session,
  };
}

// Cikilmaz (raw) INSERT: verilen alanlari oldugu gibi gonderir, hicbir alani
// otomatik doldurmaz. Negatif senaryolar icin kullanilir - orn. User A'nin
// User B'nin user_id'siyle, ya da baskasinin book_id/library_id/
// conversation_id'siyle INSERT denemesi (RLS'in reddetmesi beklenen
// durumlar). Anon (oturumsuz) client ile de dogrudan bu fonksiyon kullanilir.
export async function insertRow(client, table, fields) {
  return client.from(table).insert(fields).select().single();
}

// SADECE dogrudan bir user_id kolonu olan tablolar icin (libraries, books,
// ai_conversations): fixture kullanicinin (`user`, setupRlsFixture()'in
// userA/userB'si) kendi user_id'sini otomatik enjekte eder. RLS'in
// `with check (auth.uid() = user_id)` kismi satiri KENDI BASINA doldurmaz -
// INSERT eden taraf user_id'yi acikca vermek zorunda; bu helper her pozitif
// kontrol testinin bunu ayri ayri hatirlamasina gerek birakmaz.
//
// notes / book_libraries / ai_messages gibi DOLAYLI sahiplikli tablolarda
// (kendi user_id kolonlari yok, sahiplik bagli satirin - books/libraries/
// ai_conversations'in - user_id'si uzerinden RLS join'iyle belirleniyor) bu
// helper KULLANILAMAZ - boyle tablolarda dogrudan insertRow()'u, ilgili
// book_id/library_id/conversation_id alanlariyla cagir.
export async function insertOwnRow(user, table, fields) {
  return insertRow(user.client, table, { ...fields, user_id: user.id });
}

// Asagidaki uc yardimci, 5 test dosyasinda tekrar tekrar yazilan ayni
// "baskasi/anon SELECT/UPDATE/DELETE/INSERT denedi -> reddedildi/bos donuyor"
// assertion sekillerini tek satira indirir. Ikisi (SELECT-bos ve yazma-
// etkisiz) PostgREST tarafinda ayni gozlemlenebilir sekle sahip (`error`
// null, `data` bos dizi) - `using` filtresi satiri hic dondurmuyor/hic
// eslesmiyor, hata firlatmiyor - ama cagiri yerinde HANGI islemin
// (okuma mi yazma mi) reddedildigini belgeleyebilmek icin ayri isimlerle
// export edilirler.
function expectEmptyResult({ data, error }) {
  expect(error).toBeNull();
  expect(data).toEqual([]);
}

// Baskasinin/anonun bir SELECT ile sahibi olmadigi satiri goremedigini
// dogrular: hata donmez, sadece bos dizi doner (RLS `using` filtresi).
export function expectSelectEmpty(result) {
  expectEmptyResult(result);
}

// Baskasinin/anonun UPDATE/DELETE denemesinin hicbir satiri etkilemedigini
// dogrular: PostgREST bunu hata olarak degil, `using` filtresiyle eslesen 0
// satir - yani bos `data` - olarak doner.
export function expectWriteDenied(result) {
  expectEmptyResult(result);
}

// `with check` ihlalini dogrular (UPDATE/DELETE'ten farkli olarak INSERT
// gercekten bir hata dondurur): `error` dolu, `data` null olmali.
export function expectInsertRejected({ data, error }) {
  expect(error).not.toBeNull();
  expect(data).toBeNull();
}

// Iki oturum acmis fixture kullanici (userA, userB), hic sign-in yapilmamis
// bir anonClient ve ikisini de temizleyen bir cleanup() dondurur.
export async function setupRlsFixture() {
  const adminClient = createServiceRoleClient();

  const [userA, userB] = await Promise.all([
    createSignedInFixtureUser(adminClient, 'user-a'),
    createSignedInFixtureUser(adminClient, 'user-b'),
  ]);

  const anonClient = createAnonClient();

  async function cleanup() {
    // Cascade (auth.users -> libraries/books/ai_conversations -> ...)
    // bagli tum satirlari temizler; asagidaki deleteUser cagrilari yeterli.
    await Promise.all([
      adminClient.auth.admin.deleteUser(userA.id),
      adminClient.auth.admin.deleteUser(userB.id),
    ]);
  }

  return { adminClient, userA, userB, anonClient, cleanup };
}
