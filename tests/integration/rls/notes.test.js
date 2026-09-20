import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { setupRlsFixture, insertRow, insertOwnRow } from './fixtures.js';

// notes'un kendi user_id kolonu YOK - sahiplik bagli books.user_id uzerinden
// belirleniyor (bkz. supabase/migrations/001_initial_schema.sql "Users
// manage own notes" policy'si: exists(select 1 from books b where
// b.id = book_id and b.user_id = auth.uid())). Bu yuzden insertOwnRow burada
// KULLANILMAZ (spec/fixtures.js notu): once insertOwnRow ile her fixture
// kullanicinin kendi books satiri olusturulur, sonra o book_id'yle
// insertRow(client, 'notes', { book_id, text }) cagrilir.
describe('notes RLS izolasyonu', () => {
  let fixture;
  let bookA;
  let bookB;
  let noteA;
  let noteB;

  beforeAll(async () => {
    fixture = await setupRlsFixture();
    const { userA, userB } = fixture;

    const [{ data: insertedBookA, error: bookAError }, { data: insertedBookB, error: bookBError }] =
      await Promise.all([
        insertOwnRow(userA, 'books', { title: 'User A Kitabi', author: 'Yazar A' }),
        insertOwnRow(userB, 'books', { title: 'User B Kitabi', author: 'Yazar B' }),
      ]);
    if (bookAError) throw bookAError;
    if (bookBError) throw bookBError;
    bookA = insertedBookA;
    bookB = insertedBookB;

    const [{ data: insertedNoteA, error: noteAError }, { data: insertedNoteB, error: noteBError }] =
      await Promise.all([
        insertRow(userA.client, 'notes', { book_id: bookA.id, text: 'User A notu' }),
        insertRow(userB.client, 'notes', { book_id: bookB.id, text: 'User B notu' }),
      ]);
    if (noteAError) throw noteAError;
    if (noteBError) throw noteBError;
    noteA = insertedNoteA;
    noteB = insertedNoteB;
  });

  afterAll(async () => {
    if (fixture) {
      await fixture.cleanup();
    }
  });

  it('lets User A select notes on her own book (positive control)', async () => {
    const { userA } = fixture;

    const { data, error } = await userA.client.from('notes').select('*').eq('book_id', bookA.id);

    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data[0]).toMatchObject({ id: noteA.id, book_id: bookA.id, text: 'User A notu' });
  });

  it("returns empty when User A selects notes on User B's book", async () => {
    const { userA } = fixture;

    const { data, error } = await userA.client.from('notes').select('*').eq('book_id', bookB.id);

    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it("has no effect when User A updates User B's note", async () => {
    const { userA, adminClient } = fixture;

    const { data, error } = await userA.client
      .from('notes')
      .update({ text: 'ele gecirildi' })
      .eq('id', noteB.id)
      .select();

    expect(error).toBeNull();
    expect(data).toEqual([]);

    const { data: stillIntact, error: adminError } = await adminClient
      .from('notes')
      .select('*')
      .eq('id', noteB.id)
      .single();

    expect(adminError).toBeNull();
    expect(stillIntact).toMatchObject({ id: noteB.id, text: 'User B notu' });
  });

  it("does not delete User B's note when User A attempts it", async () => {
    const { userA, adminClient } = fixture;

    const { data, error } = await userA.client.from('notes').delete().eq('id', noteB.id).select();

    expect(error).toBeNull();
    expect(data).toEqual([]);

    const { data: stillExists, error: adminError } = await adminClient
      .from('notes')
      .select('*')
      .eq('id', noteB.id)
      .single();

    expect(adminError).toBeNull();
    expect(stillExists).toMatchObject({ id: noteB.id });
  });

  it('denies anon client SELECT/INSERT/UPDATE/DELETE on notes', async () => {
    const { anonClient } = fixture;

    const { data: selectData, error: selectError } = await anonClient.from('notes').select('*');
    expect(selectError).toBeNull();
    expect(selectData).toEqual([]);

    const { data: insertData, error: insertError } = await insertRow(anonClient, 'notes', {
      book_id: bookA.id,
      text: 'anon notu',
    });
    expect(insertData).toBeNull();
    expect(insertError).not.toBeNull();

    const { data: updateData, error: updateError } = await anonClient
      .from('notes')
      .update({ text: 'anon guncellemesi' })
      .eq('id', noteA.id)
      .select();
    expect(updateError).toBeNull();
    expect(updateData).toEqual([]);

    const { data: deleteData, error: deleteError } = await anonClient
      .from('notes')
      .delete()
      .eq('id', noteA.id)
      .select();
    expect(deleteError).toBeNull();
    expect(deleteData).toEqual([]);
  });
});
