import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import './BarcodeScanner.css';

const SCANNER_ELEMENT_ID = 'barcode-scanner-region';

const HeaderBarcodeIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M4 5v14M8 5v14M12 5v14M13.5 5v14M17 5v14M20 5v14" />
  </svg>
);

function isCameraSupported() {
  return typeof navigator !== 'undefined' && !!navigator.mediaDevices && !!navigator.mediaDevices.getUserMedia;
}

function BarcodeScanner({ onScan, onClose, continuous = false, onFinish = null, title = null }) {
  const { t } = useTranslation();
  const hasScannedRef = useRef(false);
  // onScan, ebeveyn her render olduğunda yeni bir referans olabilir; efektin
  // sadece mount'ta bir kez çalışıp kamerayı yeniden başlatmaması için ref'te tutuyoruz.
  const onScanRef = useRef(onScan);
  const [status, setStatus] = useState(() => (isCameraSupported() ? 'starting' : 'unsupported'));
  const [errorMessage, setErrorMessage] = useState(() =>
    isCameraSupported() ? '' : t('barcodeScanner.unsupported')
  );

  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  useEffect(() => {
    // html5-qrcode kutuphanesi video.play()'i kendi ic'inde .catch() olmadan
    // cagiriyor; bilesen kapanirken video DOM'dan kaldirilirsa taraysici bu
    // play() sozunu "AbortError: ... removed from the document" ile reddediyor
    // ve bu, yakalanmamis (unhandled) rejection olarak konsola dusuyor. Kutuphanenin
    // kendi ic cagrisina .catch() ekleyemedigimiz icin, bilesen ac,kkenken
    // play()'in dondurdugu her promise'e sessiz bir .catch() ekleyip reddi
    // "yakalanmis" hale getiriyoruz - donen promise ve davranisi degismiyor.
    const originalPlay = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function patchedPlay(...args) {
      const result = originalPlay.apply(this, args);
      if (result && typeof result.catch === 'function') {
        result.catch(() => {});
      }
      return result;
    };
    return () => {
      HTMLMediaElement.prototype.play = originalPlay;
    };
  }, []);

  useEffect(() => {
    if (!isCameraSupported()) {
      return undefined;
    }

    hasScannedRef.current = false;
    // React 18 StrictMode gelistirme modunda bu efekti mount->cleanup->mount
    // olarak iki kez calistirir. start() cozulmeden cleanup tetiklenirse bu
    // bayrak sayesinde yarim kalan instance, cozuldugu an hemen kapatilir -
    // aksi halde DOM'da iki <video> birikip qrbox hesabini bozuyordu.
    let cancelled = false;

    const html5Qrcode = new Html5Qrcode(SCANNER_ELEMENT_ID, {
      formatsToSupport: [
        Html5QrcodeSupportedFormats.EAN_13,
        Html5QrcodeSupportedFormats.EAN_8,
        Html5QrcodeSupportedFormats.UPC_A,
        Html5QrcodeSupportedFormats.UPC_E,
      ],
      // Destekleyen tarayıcılarda (Chrome/Android) native BarcodeDetector API'si
      // kullanılır - 1D barkodlarda kütüphanenin kendi decoder'ından daha güvenilir.
      experimentalFeatures: {
        useBarCodeDetectorIfSupported: true,
      },
      verbose: false,
    });

    const config = {
      fps: 12,
      // qrbox kasıtlı olarak verilmiyor: kütüphane taranacak bölgeyi CSS
      // boyutu ile kamera çözünürlüğü arasında kırpmasız bir oran varsayarak
      // hesaplıyor, object-fit:cover ile bu varsayım bozulup görünenle
      // taranan bölge birbirini tutmuyordu. qrbox'sız bırakmak tüm kareyi
      // tarıyor - kırpma matematiğinden bağımsız, daha isabetli.
      videoConstraints: {
        facingMode: 'environment',
        width: { ideal: 1920 },
        height: { ideal: 1080 },
        advanced: [{ focusMode: 'continuous' }],
      },
    };

    html5Qrcode
      .start(
        { facingMode: 'environment' },
        config,
        (decodedText) => {
          if (continuous) {
            // Toplu modda kamera kapanmaz; hangi ISBN'in tekrar islenip
            // islenmeyecegine (kisa süreli tekrarlari eleme) ust bilesen karar verir.
            onScanRef.current(decodedText);
            return;
          }
          if (hasScannedRef.current) return;
          hasScannedRef.current = true;
          onScanRef.current(decodedText);
        },
        () => {
          // Her karede barkod bulunamaması normaldir, sessizce yoksay.
        }
      )
      .then(() => {
        if (cancelled) {
          // Bu efekt zaten temizlenmek istenmis (ör. StrictMode'un ikinci
          // gecisi) - kamerayi hemen kapat, taranıyor durumuna hic gecme.
          html5Qrcode.stop().then(() => html5Qrcode.clear()).catch(() => {});
          return;
        }
        setStatus('scanning');
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
      if (html5Qrcode.isScanning) {
        html5Qrcode.stop().then(() => html5Qrcode.clear()).catch(() => {});
      }
      // isScanning henuz false ise start() hala devam ediyordur; yukaridaki
      // .then() icindeki 'cancelled' kontrolu cozuldugunde kamerayi kapatir.
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
        <div id={SCANNER_ELEMENT_ID} className="barcode-scanner-viewport" />
        {(status === 'starting' || status === 'scanning') && (
          <div className="barcode-scanner-frame-guide" aria-hidden="true" />
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
