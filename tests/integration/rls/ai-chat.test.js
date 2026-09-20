import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { setupRlsFixture, insertRow, insertOwnRow } from './fixtures.js';

// ai_conversations + ai_messages RLS izolasyon testleri (ticket 05).
//
// ai_conversations'in DOGRUDAN bir user_id kolonu var -> insertOwnRow
// pozitif kontrol icin kullanilabilir. ai_messages'in kendi user_id kolonu
// YOK (sahiplik bagli ai_conversations.user_id uzerinden) -> insertOwnRow
// bu tabloda KULLANILAMAZ, cikilmaz insertRow(client, 'ai_messages', {...})
// kullanilir (bkz. spec.md "Implementation Decisions" ve bu ticket'in
// basindaki "Not:" satiri).
describe('RLS: ai_conversations + ai_messages izolasyonu', () => {
  let fixture;

  beforeAll(async () => {
    fixture = await setupRlsFixture();
  });

  afterAll(async () => {
    if (fixture) {
      await fixture.cleanup();
    }
  });

  describe('ai_conversations', () => {
    it('User A kendi ai_conversations satirini SELECT ile gorebiliyor (pozitif kontrol)', async () => {
      const { userA } = fixture;

      const { data: inserted, error: insertError } = await insertOwnRow(userA, 'ai_conversations', {
        title: 'User A Sohbeti',
      });

      expect(insertError).toBeNull();
      expect(inserted).toMatchObject({ title: 'User A Sohbeti', user_id: userA.id });

      const { data: fetched, error: selectError } = await userA.client
        .from('ai_conversations')
        .select('*')
        .eq('id', inserted.id)
        .single();

      expect(selectError).toBeNull();
      expect(fetched).toMatchObject({ id: inserted.id, title: 'User A Sohbeti' });
    });

    it("User A, User B'nin ai_conversations satirlarini SELECT ettiginde bos donuyor", async () => {
      const { userA, userB } = fixture;

      const { data: bConversation, error: insertError } = await insertOwnRow(userB, 'ai_conversations', {
        title: 'User B Sohbeti',
      });
      expect(insertError).toBeNull();

      const { data, error } = await userA.client
        .from('ai_conversations')
        .select('*')
        .eq('id', bConversation.id);

      expect(error).toBeNull();
      expect(data).toEqual([]);
    });

    it("User A, User B'ye ait ai_conversations satirini UPDATE/DELETE etmeye calistiginda etkisiz kaliyor", async () => {
      const { userA, userB } = fixture;

      const { data: bConversation, error: insertError } = await insertOwnRow(userB, 'ai_conversations', {
        title: 'User B Sohbeti - Degistirilemez',
      });
      expect(insertError).toBeNull();

      const { data: updateData, error: updateError } = await userA.client
        .from('ai_conversations')
        .update({ title: 'Ele Gecirildi' })
        .eq('id', bConversation.id)
        .select();

      expect(updateError).toBeNull();
      expect(updateData).toEqual([]);

      const { data: deleteData, error: deleteError } = await userA.client
        .from('ai_conversations')
        .delete()
        .eq('id', bConversation.id)
        .select();

      expect(deleteError).toBeNull();
      expect(deleteData).toEqual([]);

      // Satirin gercekten hala var oldugunu (silinmedigini) sahibinin
      // gozunden dogrula.
      const { data: stillThere, error: verifyError } = await userB.client
        .from('ai_conversations')
        .select('*')
        .eq('id', bConversation.id)
        .single();

      expect(verifyError).toBeNull();
      expect(stillThere).toMatchObject({ id: bConversation.id, title: 'User B Sohbeti - Degistirilemez' });
    });
  });

  describe('ai_messages', () => {
    it('User A kendi konusmasina bagli ai_messages satirlarini SELECT/INSERT edebiliyor (pozitif kontrol)', async () => {
      const { userA } = fixture;

      const { data: conversation, error: conversationError } = await insertOwnRow(
        userA,
        'ai_conversations',
        { title: 'User A Mesajli Sohbet' },
      );
      expect(conversationError).toBeNull();

      const { data: inserted, error: insertError } = await insertRow(userA.client, 'ai_messages', {
        conversation_id: conversation.id,
        role: 'user',
        content: 'Merhaba, bu bir test mesaji.',
      });

      expect(insertError).toBeNull();
      expect(inserted).toMatchObject({
        conversation_id: conversation.id,
        role: 'user',
        content: 'Merhaba, bu bir test mesaji.',
      });

      const { data: fetched, error: selectError } = await userA.client
        .from('ai_messages')
        .select('*')
        .eq('conversation_id', conversation.id);

      expect(selectError).toBeNull();
      expect(fetched).toHaveLength(1);
      expect(fetched[0]).toMatchObject({ id: inserted.id, content: 'Merhaba, bu bir test mesaji.' });
    });

    it("User A, User B'nin konusmasina bagli ai_messages satirlarini SELECT ettiginde bos donuyor; ayni konusmaya INSERT denendiginde reddediliyor", async () => {
      const { userA, userB } = fixture;

      const { data: bConversation, error: conversationError } = await insertOwnRow(
        userB,
        'ai_conversations',
        { title: 'User B Mesajli Sohbet' },
      );
      expect(conversationError).toBeNull();

      const { data: bMessage, error: bInsertError } = await insertRow(userB.client, 'ai_messages', {
        conversation_id: bConversation.id,
        role: 'user',
        content: "User B'nin gizli mesaji.",
      });
      expect(bInsertError).toBeNull();

      const { data: selectData, error: selectError } = await userA.client
        .from('ai_messages')
        .select('*')
        .eq('conversation_id', bConversation.id);

      expect(selectError).toBeNull();
      expect(selectData).toEqual([]);

      const { data: insertData, error: insertError } = await insertRow(userA.client, 'ai_messages', {
        conversation_id: bConversation.id,
        role: 'user',
        content: "User A'nin izinsiz INSERT denemesi.",
      });

      expect(insertData).toBeNull();
      expect(insertError).not.toBeNull();

      // Mesajin gercekten sizmadigini/degismedigini sahibinin gozunden
      // dogrula: sadece User B'nin kendi mesaji orada.
      const { data: stillOnlyB, error: verifyError } = await userB.client
        .from('ai_messages')
        .select('*')
        .eq('conversation_id', bConversation.id);

      expect(verifyError).toBeNull();
      expect(stillOnlyB).toHaveLength(1);
      expect(stillOnlyB[0]).toMatchObject({ id: bMessage.id });
    });
  });

  describe('anon (oturumsuz) client', () => {
    it('ai_conversations tablosunda SELECT/INSERT/UPDATE/DELETE hepsi reddediliyor/bos donuyor', async () => {
      const { anonClient, userA } = fixture;

      const { data: aConversation, error: setupError } = await insertOwnRow(userA, 'ai_conversations', {
        title: 'Anon Testi Icin Sohbet',
      });
      expect(setupError).toBeNull();

      const { data: selectData, error: selectError } = await anonClient
        .from('ai_conversations')
        .select('*')
        .eq('id', aConversation.id);
      expect(selectError).toBeNull();
      expect(selectData).toEqual([]);

      const { data: insertData, error: insertError } = await insertRow(anonClient, 'ai_conversations', {
        title: 'Anon Sohbeti',
        user_id: userA.id,
      });
      expect(insertData).toBeNull();
      expect(insertError).not.toBeNull();

      const { data: updateData, error: updateError } = await anonClient
        .from('ai_conversations')
        .update({ title: 'Anon Degistirdi' })
        .eq('id', aConversation.id)
        .select();
      expect(updateError).toBeNull();
      expect(updateData).toEqual([]);

      const { data: deleteData, error: deleteError } = await anonClient
        .from('ai_conversations')
        .delete()
        .eq('id', aConversation.id)
        .select();
      expect(deleteError).toBeNull();
      expect(deleteData).toEqual([]);
    });

    it('ai_messages tablosunda SELECT/INSERT/UPDATE/DELETE hepsi reddediliyor/bos donuyor', async () => {
      const { anonClient, userA } = fixture;

      const { data: aConversation, error: conversationError } = await insertOwnRow(
        userA,
        'ai_conversations',
        { title: 'Anon Mesaj Testi Icin Sohbet' },
      );
      expect(conversationError).toBeNull();

      const { data: aMessage, error: messageSetupError } = await insertRow(userA.client, 'ai_messages', {
        conversation_id: aConversation.id,
        role: 'user',
        content: 'Anon erisemesin diye eklenen mesaj.',
      });
      expect(messageSetupError).toBeNull();

      const { data: selectData, error: selectError } = await anonClient
        .from('ai_messages')
        .select('*')
        .eq('conversation_id', aConversation.id);
      expect(selectError).toBeNull();
      expect(selectData).toEqual([]);

      const { data: insertData, error: insertError } = await insertRow(anonClient, 'ai_messages', {
        conversation_id: aConversation.id,
        role: 'user',
        content: 'Anon INSERT denemesi.',
      });
      expect(insertData).toBeNull();
      expect(insertError).not.toBeNull();

      const { data: updateData, error: updateError } = await anonClient
        .from('ai_messages')
        .update({ content: 'Anon degistirdi' })
        .eq('id', aMessage.id)
        .select();
      expect(updateError).toBeNull();
      expect(updateData).toEqual([]);

      const { data: deleteData, error: deleteError } = await anonClient
        .from('ai_messages')
        .delete()
        .eq('id', aMessage.id)
        .select();
      expect(deleteError).toBeNull();
      expect(deleteData).toEqual([]);
    });
  });
});
