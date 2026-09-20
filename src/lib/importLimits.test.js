import { describe, it, expect } from 'vitest';
import {
  checkFileSizeLimit,
  checkRowCountLimit,
  MAX_IMPORT_FILE_SIZE_BYTES,
  MAX_IMPORT_ROW_COUNT,
} from './importLimits';

function csvWithDataRows(count) {
  const header = 'Title,Author,Exclusive Shelf';
  const rows = Array.from({ length: count }, (_, i) => `Book ${i},Author ${i},read`);
  return [header, ...rows].join('\n');
}

describe('checkFileSizeLimit', () => {
  it('accepts a file well under the byte size limit', () => {
    expect(checkFileSizeLimit(1000)).toEqual({ ok: true });
  });

  it('accepts a file exactly at the byte size limit', () => {
    expect(checkFileSizeLimit(MAX_IMPORT_FILE_SIZE_BYTES)).toEqual({ ok: true });
  });

  it('rejects a file over the byte size limit', () => {
    const result = checkFileSizeLimit(MAX_IMPORT_FILE_SIZE_BYTES + 1);
    expect(result).toEqual({ ok: false, reason: 'file-too-large' });
  });

  it('rejects a huge file using only its byte size, proving the check never needs the file text', () => {
    // checkFileSizeLimit does not take csvText as a parameter at all - this
    // is the ordering fix: the caller can call this with just File.size,
    // before ever calling file.text(), so an oversized file is rejected
    // without the "browser locks up" scenario the guard exists to prevent.
    const hugeFileSizeBytes = 500 * 1024 * 1024; // 500 MB, never actually read
    const result = checkFileSizeLimit(hugeFileSizeBytes);
    expect(result).toEqual({ ok: false, reason: 'file-too-large' });
  });
});

describe('checkRowCountLimit', () => {
  it('accepts a small csv well under the row limit', () => {
    const csv = csvWithDataRows(10);
    expect(checkRowCountLimit(csv)).toEqual({ ok: true });
  });

  it('rejects a csv with more data rows than the row limit', () => {
    const csv = csvWithDataRows(MAX_IMPORT_ROW_COUNT + 1);
    const result = checkRowCountLimit(csv);
    expect(result).toEqual({ ok: false, reason: 'too-many-rows' });
  });

  it('accepts a csv exactly at the row limit', () => {
    const csv = csvWithDataRows(MAX_IMPORT_ROW_COUNT);
    expect(checkRowCountLimit(csv)).toEqual({ ok: true });
  });
});
