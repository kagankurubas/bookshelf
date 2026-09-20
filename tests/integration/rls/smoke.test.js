import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { setupRlsFixture, insertOwnRow } from './fixtures.js';

// Bu dosya harness'in ucdan uca calistigini kanitlayan tek testtir: fixture
// kullanici olusturma -> gercek Auth oturumu -> RLS'den gecen gercek bir
// PostgREST sorgusu. Tablo bazli izolasyon (pozitif + negatif) testleri
// ayri ticket'larda (02-05) bu fixture'i import ederek eklenecek.
describe('RLS entegrasyon harness smoke testi', () => {
  let fixture;

  beforeAll(async () => {
    fixture = await setupRlsFixture();
  });

  afterAll(async () => {
    if (fixture) {
      await fixture.cleanup();
    }
  });

  it('lets User A create a books row with her own session and select it back', async () => {
    const { userA } = fixture;

    const { data: inserted, error: insertError } = await insertOwnRow(userA, 'books', {
      title: 'Entegrasyon Test Kitabi',
      author: 'Test Yazar',
    });

    expect(insertError).toBeNull();
    expect(inserted).toMatchObject({
      title: 'Entegrasyon Test Kitabi',
      author: 'Test Yazar',
      user_id: userA.id,
    });

    const { data: fetched, error: selectError } = await userA.client
      .from('books')
      .select('*')
      .eq('id', inserted.id)
      .single();

    expect(selectError).toBeNull();
    expect(fetched).toMatchObject({ id: inserted.id, title: 'Entegrasyon Test Kitabi' });
  });
});
