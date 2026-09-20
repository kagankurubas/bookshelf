// İçe aktarma icin dosya boyutu / satir sayisi ust siniri - client-side (tarayicida)
// islendigi icin cok buyuk bir dosya tarayiciyi kilitleyebilir. Bu kontrol,
// Papa.parse ile tam ayristirmadan ONCE, ucuz bir on-kontrol olarak calisir.
// (bkz. spec: "5 MB dosya boyutu VEYA 5000 satirdan buyuk dosyalar parse
// edilmeden reddedilir")
export const MAX_IMPORT_FILE_SIZE_BYTES = 5 * 1024 * 1024;
export const MAX_IMPORT_ROW_COUNT = 5000;

// csvText: dosyanin ham metni, fileSizeBytes: File.size (ayri verilir ki bu
// fonksiyon DOM/File API'sine bagimli olmadan, duz string + sayi ile test
// edilebilsin).
export function checkImportFileLimits(csvText, fileSizeBytes) {
  if (fileSizeBytes > MAX_IMPORT_FILE_SIZE_BYTES) {
    return { ok: false, reason: 'file-too-large' };
  }

  // Tam bir CSV parse'i yapmadan, satir sonlarini sayarak kaba bir ust sinir
  // kontrolu - tirnak icinde gecen newline'lar bu sayimi hafifce sisirebilir
  // ama bu sadece "gercekten cok buyuk mu" sorusuna hizli cevap vermek icin,
  // kesin bir satir sayisi degil.
  const lineCount = csvText.split(/\r\n|\r|\n/).filter((line) => line.trim().length > 0).length;
  const dataRowCount = Math.max(0, lineCount - 1);
  if (dataRowCount > MAX_IMPORT_ROW_COUNT) {
    return { ok: false, reason: 'too-many-rows' };
  }

  return { ok: true };
}
