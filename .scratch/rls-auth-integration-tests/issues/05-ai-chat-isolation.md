# 05: ai_conversations + ai_messages RLS izolasyon testleri

**What to build:** Geliştirici, Kitap Asistanı sohbet listesinin (`ai_conversations`) ve mesaj geçmişinin (`ai_messages`) kullanıcılar arasında sızmadığını kanıtlayan otomatik testlere sahip olur.

**Blocked by:** 01 (local Supabase + entegrasyon test harness'i)

**Status:** ready-for-agent

- [ ] User A, kendi `ai_conversations` satırlarını SELECT ile görebiliyor (pozitif kontrol)
- [ ] User A, User B'nin `ai_conversations` satırlarını SELECT ettiğinde sonuç boş dönüyor
- [ ] User A, User B'ye ait bir `ai_conversations` satırını UPDATE/DELETE etmeye çalıştığında işlem etkisiz kalıyor
- [ ] User A, kendi konuşmasına bağlı `ai_messages` satırlarını SELECT/INSERT edebiliyor (pozitif kontrol)
- [ ] User A, User B'nin konuşmasına bağlı `ai_messages` satırlarını SELECT ettiğinde sonuç boş dönüyor; aynı konuşmaya INSERT denediğinde işlem reddediliyor
- [ ] Oturum açmamış (anon) bir client, `ai_conversations` ve `ai_messages` tablolarının hiçbirinde veri göremiyor/değiştiremiyor
