import { describe, it, expect } from 'vitest';
import {
  checkImportFileLimits,
  MAX_IMPORT_FILE_SIZE_BYTES,
  MAX_IMPORT_ROW_COUNT,
} from './importLimits';

function csvWithDataRows(count) {
  const header = 'Title,Author,Exclusive Shelf';
  const rows = Array.from({ length: count }, (_, i) => `Book ${i},Author ${i},read`);
  return [header, ...rows].join('\n');
}

describe('checkImportFileLimits', () => {
  it('accepts a small file well under both limits', () => {
    const csv = csvWithDataRows(10);
    expect(checkImportFileLimits(csv, 1000)).toEqual({ ok: true });
  });

  it('rejects a file over the byte size limit before counting rows', () => {
    const csv = csvWithDataRows(1);
    const result = checkImportFileLimits(csv, MAX_IMPORT_FILE_SIZE_BYTES + 1);
    expect(result).toEqual({ ok: false, reason: 'file-too-large' });
  });

  it('rejects a file with more data rows than the row limit, even if small in bytes', () => {
    const csv = csvWithDataRows(MAX_IMPORT_ROW_COUNT + 1);
    const result = checkImportFileLimits(csv, 1000);
    expect(result).toEqual({ ok: false, reason: 'too-many-rows' });
  });

  it('accepts a file exactly at the row limit', () => {
    const csv = csvWithDataRows(MAX_IMPORT_ROW_COUNT);
    expect(checkImportFileLimits(csv, 1000)).toEqual({ ok: true });
  });
});
