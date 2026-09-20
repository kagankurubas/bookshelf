import { parseGoodreadsCsv } from './goodreadsImport';

// Platform -> parser fonksiyonu eslemesi. Ice aktarma UI'i (bkz.
// ImportPreviewModal) bu haritadan hangi platform secimlerinin gosterilecegini
// ve secilen platform icin hangi parse fonksiyonunun cagrilacagini turetir.
// Her parser ayni imzayi paylasir: (csvText) => { bookFields, skippedRows }
// | { error }.
//
// Ticket 04 (StoryGraph), buraya sadece yeni bir `storygraph: parseStoryGraphCsv`
// girdisi eklemek durumunda - UI tarafinda if/else degisikligi gerekmiyor.
export const IMPORT_PARSERS = {
  goodreads: parseGoodreadsCsv,
};
