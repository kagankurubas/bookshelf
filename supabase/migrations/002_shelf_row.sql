-- Raf sistemini "sabit kapasiteli slot" modelinden "kitap sayisi kadar
-- uzayan raf" modeline geciriyoruz. Bunun icin her kitabin hangi raf
-- katinda oldugunu tutan yeni bir kolon ekliyoruz; slot_index artik o
-- rafin ICINDEKI sirayi ifade ediyor (once oldugu gibi global bir
-- slot degil).
--
-- libraries.capacity kolonu artik kullanilmiyor ama veri kaybini
-- onlemek icin silinmiyor, sadece uygulama bir daha okumuyor/yazmiyor.

alter table books add column if not exists shelf_row integer not null default 0;
