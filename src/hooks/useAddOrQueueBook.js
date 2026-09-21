// App.jsx'e gomulu, test edilemeyen bir closure olarak birakilmasin diye
// "online'sa direkt ekle, degilse kuyruga yaz" kararini izole bir yardimciya
// cikarir. Karar, bir yazmayi deneyip hata tipini yorumlamak yerine
// TIKLAMA ANINDAKI `isOnline` bayragina bakarak veriliyor ("hata durumlari"
// ticket'indaki ayni ilke: network hatasi ayrimini throw'a degil isOnline
// sinyaline dayandirma).
//
// `addBook` ve `enqueueBook` disaridan enjekte ediliyor (useLibrary'nin
// kendi mutator'larini disaridan almasiyla ayni desen) - boylece gercek
// IndexedDB'ye veya Supabase'e dokunmadan saf birim testi yazilabiliyor.
export function useAddOrQueueBook({ isOnline, addBook, enqueueBook }) {
  return async (fields) => {
    if (isOnline) {
      return addBook(fields);
    }
    await enqueueBook(fields);
    return { queued: true };
  };
}
