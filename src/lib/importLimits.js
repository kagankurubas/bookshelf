// İçe aktarma icin dosya boyutu / satir sayisi ust siniri - client-side (tarayicida)
// islendigi icin cok buyuk bir dosya tarayiciyi kilitleyebilir. Bu kontroller,
// Papa.parse ile tam ayristirmadan ONCE, ucuz bir on-kontrol olarak calisir.
// (bkz. spec: "5 MB dosya boyutu VEYA 5000 satirdan buyuk dosyalar parse
// edilmeden reddedilir")
export const MAX_IMPORT_FILE_SIZE_BYTES = 5 * 1024 * 1024;
export const MAX_IMPORT_ROW_COUNT = 5000;

// Sadece File.size uzerinden calisan senkron, ucuz bir on-kontrol. Bilerek
// csvText almiyor: caller (bkz. ImportPreviewModal.handleFileChange) bu
// kontrolu file.text() cagirmadan ONCE calistirmali, boylece cok buyuk bir
// dosya asla tam metin olarak tarayici bellegine okunmuyor - guard'in var
// olma amaci tam olarak bu (bkz. spec.md).
export function checkFileSizeLimit(fileSizeBytes) {
  if (fileSizeBytes > MAX_IMPORT_FILE_SIZE_BYTES) {
    return { ok: false, reason: 'file-too-large' };
  }
  return { ok: true };
}

// csvText: dosyanin ham metni - bu kontrol ancak dosya zaten okunmus ve
// checkFileSizeLimit'ten gecmisse cagrilmali.
//
// Tam bir CSV parse'i yapmadan, satir sonlarini sayarak kaba bir ust sinir
// kontrolu - tirnak icinde gecen newline'lar bu sayimi hafifce sisirebilir
// ama bu sadece "gercekten cok buyuk mu" sorusuna hizli cevap vermek icin,
// kesin bir satir sayisi degil.
export function checkRowCountLimit(csvText) {
  const lineCount = csvText.split(/\r\n|\r|\n/).filter((line) => line.trim().length > 0).length;
  const dataRowCount = Math.max(0, lineCount - 1);
  if (dataRowCount > MAX_IMPORT_ROW_COUNT) {
    return { ok: false, reason: 'too-many-rows' };
  }
  return { ok: true };
}
