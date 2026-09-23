import { useState } from 'react';
import { coverThumbnailProps, openLibraryCoverUrl } from '../../lib/openLibrary';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';

// Lazy cover <img> that renders `fallback` when there's no URL or it fails to
// load. `thumbnail` picks Open Library's small variants; `children`, if given,
// wraps the <img>. Failures are forgotten when the connection returns.
function CoverImage({ src, thumbnail = false, fallback = null, children, ...imgProps }) {
  const [failedSrc, setFailedSrc] = useState(null);
  useOnlineStatus(() => setFailedSrc(null));

  if (!src || src === failedSrc) return fallback;

  const sources = thumbnail ? coverThumbnailProps(src) : { src: openLibraryCoverUrl(src) };
  const img = <img {...sources} loading="lazy" decoding="async" onError={() => setFailedSrc(src)} {...imgProps} />;
  return children ? children(img) : img;
}

export default CoverImage;
