// Kitap sırtlarının gerçek bir kitaplıktaki gibi biraz farklı en/boyda
// görünmesi için, kitabın id'sinden deterministik (her renderda aynı)
// bir boyut türetiyoruz - rastgele state tutmaya gerek kalmıyor.
export function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

export function getSpineSize(id) {
  const hash = hashString(String(id));
  const width = 46 + (hash % 17); // 46-62px
  const height = 138 + ((hash >> 4) % 35); // 138-172px
  return { width, height };
}

// Renk kategoriye göre belirleniyor, ama aynı kategorideki tüm kitaplar
// birebir aynı tonda olunca raf tek renk bir duvar gibi görünüyor. Kitabın
// id'sinden türetilen küçük, deterministik bir ton/doygunluk/parlaklık
// sapması ekleyip gerçek bir kitaplıktaki gibi aile içinde çeşitlilik
// katıyoruz - kategori hâlâ tanınabilir, ama her sırt biraz farklı.
export function getSpineFilter(id) {
  const hash = hashString(`spine-${id}`);
  const hueShift = ((hash % 41) - 20); // -20..20 derece
  const saturate = 0.85 + (((hash >> 6) % 31) / 100); // 0.85..1.15
  const brightness = 0.92 + (((hash >> 11) % 19) / 100); // 0.92..1.10
  return `hue-rotate(${hueShift}deg) saturate(${saturate}) brightness(${brightness})`;
}
