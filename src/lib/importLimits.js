// File size / row count upper limits for import - since it's processed
// client-side (in the browser), a huge file could lock up the browser.
// These checks run as a cheap pre-check BEFORE full Papa.parse parsing.
// (spec: "files over 5 MB OR over 5000 rows are rejected before parsing")
export const MAX_IMPORT_FILE_SIZE_BYTES = 5 * 1024 * 1024;
export const MAX_IMPORT_ROW_COUNT = 5000;

// A cheap, synchronous pre-check working only from File.size. Deliberately
// takes no csvText: the caller (see ImportPreviewModal.handleFileChange)
// must run this BEFORE calling file.text(), so an oversized file is never
// read into browser memory as full text - that's the whole point of this
// guard (see spec.md).
export function checkFileSizeLimit(fileSizeBytes) {
  if (fileSizeBytes > MAX_IMPORT_FILE_SIZE_BYTES) {
    return { ok: false, reason: 'file-too-large' };
  }
  return { ok: true };
}

// csvText: the file's raw text - this check should only be called once the
// file has already been read and has passed checkFileSizeLimit.
//
// A rough upper-limit check by counting line breaks, without doing a full
// CSV parse - newlines inside quotes can slightly inflate this count, but
// this is only meant to quickly answer "is this really too big", not to
// give an exact row count.
export function checkRowCountLimit(csvText) {
  const lineCount = csvText.split(/\r\n|\r|\n/).filter((line) => line.trim().length > 0).length;
  const dataRowCount = Math.max(0, lineCount - 1);
  if (dataRowCount > MAX_IMPORT_ROW_COUNT) {
    return { ok: false, reason: 'too-many-rows' };
  }
  return { ok: true };
}
