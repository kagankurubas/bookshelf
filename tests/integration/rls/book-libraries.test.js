import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  setupRlsFixture,
  insertRow,
  insertOwnRow,
  expectSelectEmpty,
  expectWriteDenied,
  expectInsertRejected,
} from './fixtures.js';

// book_libraries junction tablosunun RLS izolasyonu + migration 011
// regresyon senaryolari.
//
// book_libraries'in kendi user_id kolonu YOK: sahiplik book_id ->
// books.user_id ve library_id -> libraries.user_id join'i uzerinden
// belirleniyor. Bu yuzden insertOwnRow() burada KULLANILMAZ (sadece
// dogrudan user_id kolonu olan tablolar icindir) - butun senaryolarda
// ciplak insertRow(client, 'book_libraries', { book_id, library_id })
// kullanilir, book_id/library_id degerleri elle verilir.
//
// Migration 011 oncesi policy sadece book_id'nin cagiran kullaniciya ait
// oldugunu kontrol ediyordu, library_id'yi hic kontrol etmiyordu. Asagidaki
// iki negatif senaryo (yon 1: kendi book_id + baskasinin library_id, yon 2:
// baskasinin book_id + kendi library_id) bu regresyonun geri gelmedigini
// dogrudan kanitlar.
describe('RLS: book_libraries izolasyonu (migration 011 regresyon testleri)', () => {
  let fixture;
  let bookA;
  let libraryA;
  let bookB;
  let libraryB;

  beforeAll(async () => {
    fixture = await setupRlsFixture();
    const { userA, userB } = fixture;

    const [insertedBookA, insertedLibraryA, insertedBookB, insertedLibraryB] = await Promise.all([
      insertOwnRow(userA, 'books', { title: 'A Kitabi', author: 'A Yazar' }),
      insertOwnRow(userA, 'libraries', { name: 'A Kitapligi' }),
      insertOwnRow(userB, 'books', { title: 'B Kitabi', author: 'B Yazar' }),
      insertOwnRow(userB, 'libraries', { name: 'B Kitapligi' }),
    ]);

    for (const { error } of [insertedBookA, insertedLibraryA, insertedBookB, insertedLibraryB]) {
      if (error) {
        throw new Error(`Fixture book/library olusturulamadi: ${error.message}`);
      }
    }

    bookA = insertedBookA.data;
    libraryA = insertedLibraryA.data;
    bookB = insertedBookB.data;
    libraryB = insertedLibraryB.data;

    // User B kendi book_id + kendi library_id'siyle bir book_libraries
    // satiri ekler - bu satir asagidaki SELECT/DELETE/anon negatif
    // senaryolarinin "erisilemez ama var olan" hedefi olarak kullanilir.
    // Burada beforeAll'da olusturmamizin nedeni: bu satirin varligi
    // testlerin birbirinin CALISMA SIRASINA bagimli olmadan (her "it"
    // bagimsiz calisabilir sekilde) kesin var olmasini garanti etmek.
    const { error: ownRowError } = await insertRow(userB.client, 'book_libraries', {
      book_id: bookB.id,
      library_id: libraryB.id,
    });
    if (ownRowError) {
      throw new Error(`Fixture book_libraries satiri olusturulamadi: ${ownRowError.message}`);
    }
  });

  afterAll(async () => {
    if (fixture) {
      await fixture.cleanup();
    }
  });

  it('User A kendi book_id + kendi library_id ile ekleyebiliyor (pozitif kontrol)', async () => {
    const { userA } = fixture;

    const { data, error } = await insertRow(userA.client, 'book_libraries', {
      book_id: bookA.id,
      library_id: libraryA.id,
    });

    expect(error).toBeNull();
    expect(data).toMatchObject({ book_id: bookA.id, library_id: libraryA.id });
  });

  it('User A kendi book_id + User B nin library_id ile INSERT denedigende reddediliyor (yon 1)', async () => {
    const { userA } = fixture;

    const { data, error } = await insertRow(userA.client, 'book_libraries', {
      book_id: bookA.id,
      library_id: libraryB.id,
    });

    expectInsertRejected({ data, error });
  });

  it('User A, User B nin book_id + kendi library_id ile INSERT denedigende reddediliyor (yon 2)', async () => {
    const { userA } = fixture;

    const { data, error } = await insertRow(userA.client, 'book_libraries', {
      book_id: bookB.id,
      library_id: libraryA.id,
    });

    expectInsertRejected({ data, error });
  });

  it('User A, User B ye ait book_libraries satirini SELECT ettiginde bos donuyor', async () => {
    const { userA } = fixture;

    const { data, error } = await userA.client
      .from('book_libraries')
      .select('*')
      .eq('book_id', bookB.id)
      .eq('library_id', libraryB.id);

    expectSelectEmpty({ data, error });
  });

  it('User A, User B ye ait book_libraries satirini DELETE etmeye calistiginda satir silinmiyor', async () => {
    const { userA, userB } = fixture;

    const { data: deleted, error: deleteError } = await userA.client
      .from('book_libraries')
      .delete()
      .eq('book_id', bookB.id)
      .eq('library_id', libraryB.id)
      .select();

    expectWriteDenied({ data: deleted, error: deleteError });

    const { data: stillThere, error: verifyError } = await userB.client
      .from('book_libraries')
      .select('*')
      .eq('book_id', bookB.id)
      .eq('library_id', libraryB.id)
      .single();

    expect(verifyError).toBeNull();
    expect(stillThere).toMatchObject({ book_id: bookB.id, library_id: libraryB.id });
  });

  it('Oturum acmamis (anon) client, book_libraries uzerinde SELECT/INSERT/DELETE yapamiyor', async () => {
    const { anonClient } = fixture;

    // beforeAll'da olusturulan, User B'ye ait (kesinlikle var olan) satir
    // hedef alinir - boylece "bos/reddedilen sonuc" gercekten RLS'ten
    // geliyor, satirin hic var olmamasindan degil.
    const { data: selectData, error: selectError } = await anonClient
      .from('book_libraries')
      .select('*')
      .eq('book_id', bookB.id)
      .eq('library_id', libraryB.id);
    expectSelectEmpty({ data: selectData, error: selectError });

    const { data: insertData, error: insertError } = await insertRow(anonClient, 'book_libraries', {
      book_id: bookA.id,
      library_id: libraryA.id,
    });
    expectInsertRejected({ data: insertData, error: insertError });

    const { data: deleteData, error: deleteError } = await anonClient
      .from('book_libraries')
      .delete()
      .eq('book_id', bookB.id)
      .eq('library_id', libraryB.id)
      .select();
    expectWriteDenied({ data: deleteData, error: deleteError });
  });
});
