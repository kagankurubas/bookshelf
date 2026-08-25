import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { readBarcodes, setZXingModuleOverrides } from 'zxing-wasm/reader';
import zxingReaderWasmUrl from 'zxing-wasm/reader/zxing_reader.wasm?url';
import './BarcodeScanner.css';

// zxing-wasm varsayılan olarak .wasm dosyasını bir CDN'den çekiyor; bunun
// yerine Vite'ın paketlediği yerel dosyayı kullanması için üzerine yazıyoruz.
// Modül sadece ilk gerçek tarama çağrısında (readBarcodes) indirilip
// başlatılıyor, bu yüzden barkod tarayıcıyı hiç açmayan kullanıcılar için
// bir maliyeti yok.
setZXingModuleOverrides({
  locateFile: (path, prefix) => (path.endsWith('.wasm') ? zxingReaderWasmUrl : prefix + path),
});

const SUPPORTED_FORMATS = ['EAN13', 'EAN8', 'UPCA', 'UPCE'];
// Kamera CPU/pil tüketimini makul tutmak için 1080p yerine bu genişliğe
// indirgenmiş bir karede tarama yapılıyor - barkod çözümü için yeterli.
const DECODE_MAX_WIDTH = 1280;
const DECODE_INTERVAL_MS = 250;

const HeaderBarcodeIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M4 5v14M8 5v14M12 5v14M13.5 5v14M17 5v14M20 5v14" />
  </svg>
);

const TorchIcon = ({ on }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill={on ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8">
    <path d="M13 2 4 14h6l-1 8 9-12h-6z" strokeLinejoin="round" />
  </svg>
);

function isCameraSupported() {
  return typeof navigator !== 'undefined' && !!navigator.mediaDevices && !!navigator.mediaDevices.getUserMedia;
}

function BarcodeScanner({ onScan, onClose, continuous = false, onFinish = null, title = null }) {
  const { t } = useTranslation();
  const videoRef = useRef(null);
  const canvasRef = useRef(document.createElement('canvas'));
  const hasScannedRef = useRef(false);
  const trackRef = useRef(null);
  // onScan, ebeveyn her render olduğunda yeni bir referans olabilir; efektin
  // sadece mount'ta bir kez çalışıp kamerayı yeniden başlatmaması için ref'te tutuyoruz.
  const onScanRef = useRef(onScan);
  const [status, setStatus] = useState(() => (isCameraSupported() ? 'starting' : 'unsupported'));
  const [errorMessage, setErrorMessage] = useState(() =>
    isCameraSupported() ? '' : t('barcodeScanner.unsupported')
  );
  const [torchSupported, setTorchSupported] = useState(false);
  const [torchOn, setTorchOn] = useState(false);

  const toggleTorch = () => {
    const track = trackRef.current;
    if (!track) return;
    const nextOn = !torchOn;
    track
      .applyConstraints({ advanced: [{ torch: nextOn }] })
      .then(() => setTorchOn(nextOn))
      .catch(() => {});
  };

  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  useEffect(() => {
    if (!isCameraSupported()) {
      return undefined;
    }

    hasScannedRef.current = false;
    let cancelled = false;
    let stream = null;
    let intervalId = null;

    navigator.mediaDevices
      .getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          advanced: [{ focusMode: 'continuous' }],
        },
      })
      .then((mediaStream) => {
        if (cancelled) {
          mediaStream.getTracks().forEach((tr) => tr.stop());
          return;
        }
        stream = mediaStream;
        const track = mediaStream.getVideoTracks()[0];
        trackRef.current = track;
        try {
          if (track.getCapabilities?.().torch) {
            setTorchSupported(true);
          }
        } catch {
          // Yetenek bilgisi alınamazsa fener butonu basitçe gösterilmez.
        }

        const video = videoRef.current;
        video.srcObject = mediaStream;
        video.play().catch(() => {});

        setStatus('scanning');

        const canvas = canvasRef.current;
        intervalId = setInterval(() => {
          if (video.readyState < video.HAVE_CURRENT_DATA || video.videoWidth === 0) {
            return;
          }
          const scale = Math.min(1, DECODE_MAX_WIDTH / video.videoWidth);
          const width = Math.round(video.videoWidth * scale);
          const height = Math.round(video.videoHeight * scale);
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          ctx.drawImage(video, 0, 0, width, height);
          const imageData = ctx.getImageData(0, 0, width, height);

          readBarcodes(imageData, { formats: SUPPORTED_FORMATS, tryHarder: true })
            .then((results) => {
              const hit = results.find((r) => r.isValid && r.text);
              if (!hit) return;
              if (continuous) {
                // Toplu modda kamera kapanmaz; hangi ISBN'in tekrar islenip
                // islenmeyecegine (kisa süreli tekrarlari eleme) ust bilesen karar verir.
                onScanRef.current(hit.text);
                return;
              }
              if (hasScannedRef.current) return;
              hasScannedRef.current = true;
              onScanRef.current(hit.text);
            })
            .catch(() => {
              // Bir karede çözümleme başarısız olması normaldir, sessizce yoksay.
            });
        }, DECODE_INTERVAL_MS);
      })
      .catch((err) => {
        if (cancelled) return;
        const message = String(err?.message || err || '').toLowerCase();
        setStatus('error');
        if (message.includes('permission') || message.includes('notallowed')) {
          setErrorMessage(t('barcodeScanner.permissionDenied'));
        } else if (message.includes('notfound') || message.includes('no camera')) {
          setErrorMessage(t('barcodeScanner.noCamera'));
        } else {
          setErrorMessage(t('barcodeScanner.startFailed'));
        }
      });

    return () => {
      cancelled = true;
      if (intervalId) clearInterval(intervalId);
      if (stream) stream.getTracks().forEach((tr) => tr.stop());
      trackRef.current = null;
    };
    // Kamera sadece mount'ta bir kez başlatılır; onScan değişse bile efekt yeniden
    // çalışmaz (güncel değer onScanRef üzerinden okunur). continuous ise bir
    // bilesenin ömrü boyunca sabit kullanılır (parent hep ayni degeri geçer).
    // t'yi bilinçli olarak disa biraktik: dil degisimi kamerayi yeniden
    // baslatmamali, hata mesajlari zaten olay anindaki t() ile yaziliyor.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [continuous]);

  return (
    <div className="barcode-scanner">
      <div className="barcode-scanner-header">
        <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><HeaderBarcodeIcon /> {title || t('barcodeScanner.headerTitle')}</span>
        <button type="button" onClick={onClose} className="barcode-scanner-close" title={t('barcodeScanner.close')}>×</button>
      </div>

      <div className="barcode-scanner-viewport-wrap">
        <video
          ref={videoRef}
          className="barcode-scanner-viewport"
          muted
          playsInline
          style={{ display: status === 'scanning' ? 'block' : 'none' }}
        />
        {(status === 'starting' || status === 'scanning') && (
          <div className="barcode-scanner-frame-guide" aria-hidden="true" />
        )}
        {status === 'scanning' && torchSupported && (
          <button
            type="button"
            onClick={toggleTorch}
            className={`barcode-scanner-torch-btn ${torchOn ? 'on' : ''}`}
            title={t('barcodeScanner.torch')}
          >
            <TorchIcon on={torchOn} />
          </button>
        )}
      </div>

      {status === 'starting' && (
        <p className="barcode-scanner-hint">{t('barcodeScanner.starting')}</p>
      )}
      {status === 'scanning' && (
        <div className="barcode-scanner-hint-row">
          <p className="barcode-scanner-hint">
            {t('barcodeScanner.hint')}
          </p>
          {continuous && (
            <button type="button" onClick={onFinish} className="barcode-scanner-finish-btn">
              ✓ {t('barcodeScanner.finish')}
            </button>
          )}
        </div>
      )}
      {(status === 'error' || status === 'unsupported') && (
        <div className="barcode-scanner-error">
          <p>{errorMessage}</p>
          <button type="button" onClick={onClose} className="barcode-scanner-back-btn">{t('barcodeScanner.back')}</button>
        </div>
      )}
    </div>
  );
}

export default BarcodeScanner;
