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

    const idealConstraints = {
      // Telefon kameraları genelde 1920x1080'in çok üzerinde çözünürlük
      // destekliyor; düşük ideal değer istemek, sonradan zoom uygulanınca
      // kırpılan bölgenin aynı boyuta büyütülüp (upscale) pikselleşmesine
      // yol açıyordu. Yüksek bir ideal istemek tarayıcının desteklenen en
      // yüksek çözünürlüğe yakınına çıkmasını sağlıyor - decode zaten
      // DECODE_MAX_WIDTH'e küçültülüyor, bu yüzden CPU maliyeti sabit kalıyor.
      width: { ideal: 3840 },
      height: { ideal: 2160 },
      advanced: [{ focusMode: 'continuous' }],
    };

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'environment', ...idealConstraints } })
      .then(async (mediaStream) => {
        if (cancelled) {
          mediaStream.getTracks().forEach((tr) => tr.stop());
          return;
        }

        // "environment" facingMode telefonlarda ana lens yerine ikincil
        // (ultra geniş/makro gibi, genelde düşük çözünürlüklü) bir lense
        // denk gelebiliyor. Android'de kamera ID 0 neredeyse her zaman ana
        // arka sensördür - izin alındıktan sonra (enumerateDevices artık
        // gerçek label döndürür) arka kameraları etiketteki numaraya göre
        // sıralayıp en düşüğünü deniyoruz.
        try {
          const devices = await navigator.mediaDevices.enumerateDevices();
          const backCams = devices
            .filter((d) => d.kind === 'videoinput' && /back/i.test(d.label))
            .map((d) => {
              const m = d.label.match(/(\d+)/);
              return { deviceId: d.deviceId, label: d.label, index: m ? parseInt(m[1], 10) : null };
            })
            .filter((d) => d.index !== null)
            .sort((a, b) => a.index - b.index);

          const currentDeviceId = mediaStream.getVideoTracks()[0].getSettings().deviceId;
          const preferred = backCams[0];
          if (preferred && preferred.deviceId !== currentDeviceId) {
            // Çoğu telefon aynı anda iki fiziksel arka kamerayı birden açmaya
            // izin vermiyor (donanım kilidi) - yeni kamerayı açmadan önce
            // eskisini bırakmak gerekiyor. Yeni kamera açılamazsa (ör. bu
            // cihazda concurrent kısıtlama yoksa bile deviceId reddedilirse)
            // orijinal facingMode isteğiyle tekrar bağlanılıyor.
            mediaStream.getTracks().forEach((tr) => tr.stop());
            try {
              mediaStream = await navigator.mediaDevices.getUserMedia({
                video: { deviceId: { exact: preferred.deviceId }, ...idealConstraints },
              });
            } catch {
              mediaStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment', ...idealConstraints },
              });
            }
            if (cancelled) {
              mediaStream.getTracks().forEach((tr) => tr.stop());
              return;
            }
          }
        } catch {
          // Kamera listesi alınamazsa/değiştirilemezse varsayılan akışla devam edilir.
        }

        stream = mediaStream;
        const track = mediaStream.getVideoTracks()[0];
        trackRef.current = track;
        try {
          const capabilities = track.getCapabilities?.();
          if (capabilities?.torch) {
            setTorchSupported(true);
          }
          // Telefonlarda kamera geniş bir alanı yakalıyor ve zoom=1 iken
          // barkod karede küçük kalıp az piksel kaplayabiliyor - bu 1D
          // barkod çözümünü zorlaştırıyor. Donanım destekli zoom varsa
          // (crop sensörden alınır, sadece dijital büyütme değildir)
          // barkodu daha fazla piksele yaymak için ölçülü şekilde devreye
          // sokuyoruz.
          if (capabilities?.zoom) {
            const targetZoom = Math.min(2, capabilities.zoom.max);
            track.applyConstraints({ advanced: [{ zoom: targetZoom }] }).catch(() => {});
          }
        } catch {
          // Yetenek bilgisi alınamazsa zoom/fener basitçe devre dışı kalır.
        }

        const video = videoRef.current;
        video.srcObject = mediaStream;
        video.play().catch(() => {});

        setStatus('scanning');

        const canvas = canvasRef.current;

        const handleResults = (results) => {
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
        };

        const decodeFromSource = (source, sourceWidth, sourceHeight) => {
          const scale = Math.min(1, DECODE_MAX_WIDTH / sourceWidth);
          const width = Math.round(sourceWidth * scale);
          const height = Math.round(sourceHeight * scale);
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          ctx.drawImage(source, 0, 0, width, height);
          const imageData = ctx.getImageData(0, 0, width, height);
          return readBarcodes(imageData, { formats: SUPPORTED_FORMATS, tryHarder: true });
        };

        intervalId = setInterval(() => {
          if (video.readyState < video.HAVE_CURRENT_DATA || video.videoWidth === 0) {
            return;
          }
          decodeFromSource(video, video.videoWidth, video.videoHeight)
            .then(handleResults)
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
