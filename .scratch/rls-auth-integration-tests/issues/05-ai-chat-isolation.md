# 05: ai_conversations + ai_messages RLS izolasyon testleri

**What to build:** Geliştirici, Kitap Asistanı sohbet listesinin (`ai_conversations`) ve mesaj geçmişinin (`ai_messages`) kullanıcılar arasında sızmadığını kanıtlayan otomatik testlere sahip olur.

**Blocked by:** 01 (local Supabase + entegrasyon test harness'i)

**Status:** ready-for-agent

**Not:** `ai_conversations`'ın **doğrudan** `user_id` kolonu var — pozitif kontrol için `insertOwnRow(user, 'ai_conversations', fields)` kullan, negatif kontrol için çıplak `insertRow` + başkasının `user_id`'si. `ai_messages`'ın ise kendi `user_id` kolonu YOK (sahiplik bağlı `ai_conversations.user_id` üzerinden) — bu tabloda `insertOwnRow` **kullanılamaz**, çıplak `insertRow(client, 'ai_messages', { conversation_id, role, content })`'i kullan.

- [ ] User A, kendi `ai_conversations` satırlarını SELECT ile görebiliyor (pozitif kontrol)
- [ ] User A, User B'nin `ai_conversations` satırlarını SELECT ettiğinde sonuç boş dönüyor
- [ ] User A, User B'ye ait bir `ai_conversations` satırını UPDATE/DELETE etmeye çalıştığında işlem etkisiz kalıyor
- [ ] User A, kendi konuşmasına bağlı `ai_messages` satırlarını SELECT/INSERT edebiliyor (pozitif kontrol)
- [ ] User A, User B'nin konuşmasına bağlı `ai_messages` satırlarını SELECT ettiğinde sonuç boş dönüyor; aynı konuşmaya INSERT denediğinde işlem reddediliyor
- [ ] Oturum açmamış (anon) bir client, `ai_conversations` ve `ai_messages` tablolarının hiçbirinde veri göremiyor/değiştiremiyor
