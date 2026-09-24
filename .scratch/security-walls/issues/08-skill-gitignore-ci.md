# 08: security-walls skill'i, git takibi, restore adımı ve CI

**What to build:** Geliştirici `/security-walls` ile skill'i çağırabilir; skill script'i çalıştırıp sonucu yorumlar ve yeni duvar eklemeyi anlatır. Skill klasörü git'te takip edilir ve restore prosedüründen sonra da erişilebilir. CI'daki `build` job'ı her PR'da `check:security`'yi bloklayıcı olarak çalıştırır.

**Blocked by:** 02, 03, 04, 05, 06, 07

**Status:** ready-for-agent

**Not:** Spec'teki "Skill konumu ve takibi", "Invocation", "SKILL.md içeriği" ve "CI" kararları. SKILL.md'yi yazmadan önce `writing-for-agents` skill'ini ve `SKILL-MECHANICS.md`'yi oku; mevcut skill'lerin frontmatter yapısını örnek al. Skill kontrol mantığını tekrar etmez, script tek doğruluk kaynağıdır. Skill, commit mesajları ve yorumlar İngilizce.

- [ ] `.agents/skills/security-walls/SKILL.md` oluşturuldu: `disable-model-invocation: true`, insan için tek satırlık description
- [ ] SKILL.md adımları: script'i çalıştır; her FAIL'i duvar adı + `dosya:satır` + olası nedenle raporla; bulguları otomatik düzeltmek yerine ayrı ticket/spec öner; `--linked`'in ne zaman/nasıl kullanılacağını (salt-okunur, production kimlik bilgisi gerektirir) anlat
- [ ] SKILL.md'de "Yeni duvar ekleme" bölümü: modül şekli, registry satırı, istisnalar config'i, zorunlu kötü örnek testi
- [ ] `.gitignore`'daki `.agents/skills/` kuralı `.agents/skills/*` + `!.agents/skills/security-walls/` olarak değiştirildi; `git check-ignore` ile upstream bir skill'in hâlâ ignore edildiği, `security-walls`'ın ise takip edildiği doğrulandı
- [ ] `AGENTS.md`'deki `.agents/skills` restore bölümüne bu proje skill'inin `.claude/skills` bağlantısının nasıl oluşturulacağı eklendi; adım gerçekten denendi
- [ ] `.github/workflows/ci.yml`'deki `build` job'ına `npm run check:security` adımı eklendi (`--linked` olmadan)
- [ ] Draft PR'da CI'daki `build` job'ı bu adımla yeşil
