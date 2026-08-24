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
