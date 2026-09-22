-- Serbest etiketleme (tags): kullanicinin kendi tanimladigi, sayisi
-- sinirsiz, kitaba birden fazla iliştirilebilen etiketler. Mevcut
-- `category` (tekli, sabit liste) alanindan tamamen bagimsiz bir boyut.
--
-- Ayri bir tags + book_tags junction tablosu yerine duz bir text[] kolonu
-- tercih edildi: uygulama zaten kullanicinin tum kitaplarini tek seferde
-- belleğe cekip client-side filtreliyor, etiket bazli istatistik/agregasyon
-- kapsam disi, bu olcekte normalize bir model gereksiz karmasiklik olurdu.
alter table books add column if not exists tags text[] not null default '{}';

-- Ayri bir RLS policy'ye gerek yok - tags sadece books'ta duz bir kolon,
-- mevcut "Users manage own books" policy'si (auth.uid() = user_id) zaten
-- tum kolonlari kapsiyor.
