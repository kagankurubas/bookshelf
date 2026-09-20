import { parseGoodreadsCsv } from './goodreadsImport';
import { parseStoryGraphCsv } from './storygraphImport';

// Platform -> parser fonksiyonu eslemesi. Ice aktarma UI'i (bkz.
// ImportPreviewModal) bu haritadan hangi platform secimlerinin gosterilecegini
// ve secilen platform icin hangi parse fonksiyonunun cagrilacagini turetir.
// Her parser ayni imzayi paylasir: (csvText) => { bookFields, skippedRows,
// roundedRatingsCount? } | { error }.
export const IMPORT_PARSERS = {
  goodreads: parseGoodreadsCsv,
  storygraph: parseStoryGraphCsv,
};
