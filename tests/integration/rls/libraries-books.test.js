import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  setupRlsFixture,
  insertRow,
  insertOwnRow,
  expectSelectEmpty,
  expectWriteDenied,
  expectInsertRejected,
} from './fixtures.js';

// `libraries` ve `books` ikisi de dogrudan bir `user_id` kolonuna sahip, bu
// yuzden pozitif kontrol (kendi satirini olusturma) icin `insertOwnRow`
// kullanilir (bkz. fixtures.js ve
// .scratch/rls-auth-integration-tests/issues/02-libraries-books-isolation.md).
//
// Her tablo icin: pozitif kontrol (sahibi kendi verisini gorebiliyor) +
// negatif kontroller (baskasi SELECT/UPDATE/DELETE edemiyor) + anon client
// hicbir CRUD islemini yapamiyor. Testler kara kutu: sadece PostgREST'in
// donen data/error'unu dogrular, RLS politikasinin SQL'ini test etmez.
describe('RLS entegrasyon: libraries + books izolasyonu', () => {
  let fixture;

  beforeAll(async () => {
    fixture = await setupRlsFixture();
  });

  afterAll(async () => {
    if (fixture) {
      await fixture.cleanup();
    }
  });

  describe('libraries', () => {
    it('lets User A select her own libraries row (positive control)', async () => {
      const { userA } = fixture;

      const { data: inserted, error: insertError } = await insertOwnRow(userA, 'libraries', {
        name: 'User A Kitapligi',
      });
      expect(insertError).toBeNull();
      expect(inserted).toMatchObject({ name: 'User A Kitapligi', user_id: userA.id });

      const { data: fetched, error: selectError } = await userA.client
        .from('libraries')
        .select('*')
        .eq('id', inserted.id)
        .single();

      expect(selectError).toBeNull();
      expect(fetched).toMatchObject({ id: inserted.id, name: 'User A Kitapligi' });
    });

    it("returns empty when User B selects User A's libraries row", async () => {
      const { userA, userB } = fixture;

      const { data: inserted, error: insertError } = await insertOwnRow(userA, 'libraries', {
        name: 'User A Ozel Kitapligi',
      });
      expect(insertError).toBeNull();

      const { data, error } = await userB.client
        .from('libraries')
        .select('*')
        .eq('id', inserted.id);

      expectSelectEmpty({ data, error });
    });

    it("rejects User A's libraries INSERT when she spoofs User B's user_id", async () => {
      const { userA, userB } = fixture;

      const { data, error } = await insertRow(userA.client, 'libraries', {
        name: 'Sahte Sahiplik Kitapligi',
        user_id: userB.id,
      });

      expectInsertRejected({ data, error });
    });

    it("leaves User A's libraries row unchanged when User B tries to update it", async () => {
      const { userA, userB } = fixture;

      const { data: inserted, error: insertError } = await insertOwnRow(userA, 'libraries', {
        name: 'Degismemesi Gereken Kitaplik',
      });
      expect(insertError).toBeNull();

      const { data: updateData, error: updateError } = await userB.client
        .from('libraries')
        .update({ name: 'Ele Gecirilmis Isim' })
        .eq('id', inserted.id)
        .select();

      expectWriteDenied({ data: updateData, error: updateError });

      const { data: refetched, error: refetchError } = await userA.client
        .from('libraries')
        .select('*')
        .eq('id', inserted.id)
        .single();

      expect(refetchError).toBeNull();
      expect(refetched).toMatchObject({ name: 'Degismemesi Gereken Kitaplik' });
    });

    it("does not delete User A's libraries row when User B tries to delete it", async () => {
      const { userA, userB } = fixture;

      const { data: inserted, error: insertError } = await insertOwnRow(userA, 'libraries', {
        name: 'Silinmemesi Gereken Kitaplik',
      });
      expect(insertError).toBeNull();

      const { data: deleteData, error: deleteError } = await userB.client
        .from('libraries')
        .delete()
        .eq('id', inserted.id)
        .select();

      expectWriteDenied({ data: deleteData, error: deleteError });

      const { data: stillThere, error: refetchError } = await userA.client
        .from('libraries')
        .select('*')
        .eq('id', inserted.id)
        .single();

      expect(refetchError).toBeNull();
      expect(stillThere).toMatchObject({ id: inserted.id, name: 'Silinmemesi Gereken Kitaplik' });
    });
  });

  describe('books', () => {
    it('lets User A select her own books row (positive control)', async () => {
      const { userA } = fixture;

      const { data: inserted, error: insertError } = await insertOwnRow(userA, 'books', {
        title: 'User A Kitabi',
        author: 'Test Yazar',
      });
      expect(insertError).toBeNull();
      expect(inserted).toMatchObject({
        title: 'User A Kitabi',
        author: 'Test Yazar',
        user_id: userA.id,
      });

      const { data: fetched, error: selectError } = await userA.client
        .from('books')
        .select('*')
        .eq('id', inserted.id)
        .single();

      expect(selectError).toBeNull();
      expect(fetched).toMatchObject({ id: inserted.id, title: 'User A Kitabi' });
    });

    it("returns empty when User B selects User A's books row", async () => {
      const { userA, userB } = fixture;

      const { data: inserted, error: insertError } = await insertOwnRow(userA, 'books', {
        title: 'User A Ozel Kitabi',
        author: 'Test Yazar',
      });
      expect(insertError).toBeNull();

      const { data, error } = await userB.client.from('books').select('*').eq('id', inserted.id);

      expectSelectEmpty({ data, error });
    });

    it("rejects User A's books INSERT when she spoofs User B's user_id", async () => {
      const { userA, userB } = fixture;

      const { data, error } = await insertRow(userA.client, 'books', {
        title: 'Sahte Sahiplik Kitabi',
        author: 'Test Yazar',
        user_id: userB.id,
      });

      expectInsertRejected({ data, error });
    });

    it("leaves User A's books row unchanged when User B tries to update/delete it", async () => {
      const { userA, userB } = fixture;

      const { data: inserted, error: insertError } = await insertOwnRow(userA, 'books', {
        title: 'Degismemesi Gereken Kitap',
        author: 'Test Yazar',
      });
      expect(insertError).toBeNull();

      const { data: updateData, error: updateError } = await userB.client
        .from('books')
        .update({ title: 'Ele Gecirilmis Baslik' })
        .eq('id', inserted.id)
        .select();

      expectWriteDenied({ data: updateData, error: updateError });

      const { data: deleteData, error: deleteError } = await userB.client
        .from('books')
        .delete()
        .eq('id', inserted.id)
        .select();

      expectWriteDenied({ data: deleteData, error: deleteError });

      const { data: stillThere, error: refetchError } = await userA.client
        .from('books')
        .select('*')
        .eq('id', inserted.id)
        .single();

      expect(refetchError).toBeNull();
      expect(stillThere).toMatchObject({ id: inserted.id, title: 'Degismemesi Gereken Kitap' });
    });
  });

  describe('anon (oturumsuz) client', () => {
    it('cannot SELECT libraries or books rows', async () => {
      const { anonClient } = fixture;

      const { data: librariesData, error: librariesError } = await anonClient
        .from('libraries')
        .select('*');
      expectSelectEmpty({ data: librariesData, error: librariesError });

      const { data: booksData, error: booksError } = await anonClient.from('books').select('*');
      expectSelectEmpty({ data: booksData, error: booksError });
    });

    it('cannot INSERT libraries or books rows', async () => {
      const { anonClient, userA } = fixture;

      const { data: libInsert, error: libInsertError } = await anonClient
        .from('libraries')
        .insert({ name: 'Anon Kitaplik', user_id: userA.id })
        .select();
      expectInsertRejected({ data: libInsert, error: libInsertError });

      const { data: bookInsert, error: bookInsertError } = await anonClient
        .from('books')
        .insert({ title: 'Anon Kitap', author: 'Anon', user_id: userA.id })
        .select();
      expectInsertRejected({ data: bookInsert, error: bookInsertError });
    });

    it('cannot UPDATE or DELETE existing libraries or books rows', async () => {
      const { anonClient, userA } = fixture;

      const { data: library, error: libraryInsertError } = await insertOwnRow(
        userA,
        'libraries',
        { name: 'Anon Testi Kitapligi' },
      );
      expect(libraryInsertError).toBeNull();

      const { data: book, error: bookInsertError } = await insertOwnRow(userA, 'books', {
        title: 'Anon Testi Kitabi',
        author: 'Test Yazar',
      });
      expect(bookInsertError).toBeNull();

      const { data: libUpdateData, error: libUpdateError } = await anonClient
        .from('libraries')
        .update({ name: 'Anon Ele Gecirdi' })
        .eq('id', library.id)
        .select();
      expectWriteDenied({ data: libUpdateData, error: libUpdateError });

      const { data: bookUpdateData, error: bookUpdateError } = await anonClient
        .from('books')
        .update({ title: 'Anon Ele Gecirdi' })
        .eq('id', book.id)
        .select();
      expectWriteDenied({ data: bookUpdateData, error: bookUpdateError });

      const { data: libDeleteData, error: libDeleteError } = await anonClient
        .from('libraries')
        .delete()
        .eq('id', library.id)
        .select();
      expectWriteDenied({ data: libDeleteData, error: libDeleteError });

      const { data: bookDeleteData, error: bookDeleteError } = await anonClient
        .from('books')
        .delete()
        .eq('id', book.id)
        .select();
      expectWriteDenied({ data: bookDeleteData, error: bookDeleteError });

      const { data: libraryStillThere, error: libraryRefetchError } = await userA.client
        .from('libraries')
        .select('*')
        .eq('id', library.id)
        .single();
      expect(libraryRefetchError).toBeNull();
      expect(libraryStillThere).toMatchObject({ id: library.id, name: 'Anon Testi Kitapligi' });

      const { data: bookStillThere, error: bookRefetchError } = await userA.client
        .from('books')
        .select('*')
        .eq('id', book.id)
        .single();
      expect(bookRefetchError).toBeNull();
      expect(bookStillThere).toMatchObject({ id: book.id, title: 'Anon Testi Kitabi' });
    });
  });
});
