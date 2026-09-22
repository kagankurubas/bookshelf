import { parseGoodreadsCsv } from './goodreadsImport';
import { parseStoryGraphCsv } from './storygraphImport';

// Platform -> parser function mapping. The import UI (see
// ImportPreviewModal) derives which platform options to show and which
// parse function to call for the selected platform from this map. Every
// parser shares the same signature: (csvText) => { bookFields, skippedRows,
// roundedRatingsCount? } | { error }.
export const IMPORT_PARSERS = {
  goodreads: parseGoodreadsCsv,
  storygraph: parseStoryGraphCsv,
};
