import { describe, it, expect } from 'vitest';
import Papa from 'papaparse';

// This does not test the actual export/import logic (see ticket 02/03) -
// it's just a smoke test proving papaparse imports and runs correctly
// under this project's ESM/Vite/Vitest setup.
describe('papaparse smoke test', () => {
  it('round-trips a small array of objects through unparse then parse', () => {
    const rows = [
      { title: 'Fahrenheit 451', author: 'Ray Bradbury' },
      { title: 'Dune', author: 'Frank Herbert' },
    ];

    const csv = Papa.unparse(rows);
    const { data, errors } = Papa.parse(csv, { header: true });

    expect(errors).toHaveLength(0);
    expect(data).toEqual(rows);
  });

  it('parses a quoted field containing a comma correctly', () => {
    const csv = 'title,author\n"Kürk Mantolu Madonna, Genişletilmiş Baskı",Sabahattin Ali';
    const { data } = Papa.parse(csv, { header: true });

    expect(data).toEqual([
      { title: 'Kürk Mantolu Madonna, Genişletilmiş Baskı', author: 'Sabahattin Ali' },
    ]);
  });
});
