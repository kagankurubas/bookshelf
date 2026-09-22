// Yeni bir etiket eklenirken, kullanicinin yazdigi deger baska bir kitapta
// zaten kullanilan bir etikete case-insensitive eslesiyorsa, o mevcut
// etiketin yazimini (casing'ini) kullanir - boylece ayni kavram ("Favori"
// vs "favori") farkli kitaplarda hep ayni string olarak birikir. Hicbir
// eslesme yoksa kullanicinin yazdigi deger oldugu gibi doner.
export function resolveTagCasing(value, existingTags) {
  const match = existingTags.find((tag) => tag.toLowerCase() === value.toLowerCase());
  return match || value;
}
