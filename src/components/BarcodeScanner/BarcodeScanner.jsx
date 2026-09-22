import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { readBarcodes, setZXingModuleOverrides } from 'zxing-wasm/reader';
import zxingReaderWasmUrl from 'zxing-wasm/reader/zxing_reader.wasm?url';
import { useEscapeKey } from '../../hooks/useEscapeKey';
import './BarcodeScanner.css';

// zxing-wasm fetches its .wasm file from a CDN by default; override it to use
// the local file Vite bundles instead. The module is only downloaded and
// initialized on the first real scan call (readBarcodes), so users who never
// open the barcode scanner pay no cost.
setZXingModuleOverrides({
  locateFile: (path, prefix) => (path.endsWith('.wasm') ? zxingReaderWasmUrl : prefix + path),
});

const SUPPORTED_FORMATS = ['EAN13', 'EAN8', 'UPCA', 'UPCE'];
// Decoding runs on a frame downscaled to this width instead of 1080p, to keep
// camera CPU/battery use reasonable - still enough for barcode decoding.
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
  useEscapeKey(onClose);
  const videoRef = useRef(null);
  const canvasRef = useRef(document.createElement('canvas'));
  const hasScannedRef = useRef(false);
  const trackRef = useRef(null);
  // onScan may get a new reference on every parent render; kept in a ref so
  // the effect only runs once on mount and doesn't restart the camera.
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
      // Phone cameras usually support far more than 1920x1080; requesting a
      // low ideal value caused pixelation once zoom cropped and upscaled the
      // frame back to size. Requesting a high ideal value gets the browser
      // close to its max supported resolution - decode already downscales to
      // DECODE_MAX_WIDTH, so CPU cost stays constant.
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

        // "environment" facingMode can land on a secondary lens on phones
        // (ultra-wide/macro, usually lower resolution) instead of the main
        // one. On Android, camera ID 0 is almost always the main back sensor -
        // once permission is granted (enumerateDevices now returns real
        // labels), sort back cameras by the number in their label and try the
        // lowest one.
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
            // Most phones don't allow two physical back cameras open at once
            // (hardware lock) - the old one must be released before opening
            // the new one. If the new camera fails to open (e.g. deviceId
            // rejected even without a concurrency limit on this device), fall
            // back to the original facingMode request.
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
          // If the camera list can't be read/switched, continue with the default stream.
        }

        stream = mediaStream;
        const track = mediaStream.getVideoTracks()[0];
        trackRef.current = track;
        try {
          const capabilities = track.getCapabilities?.();
          if (capabilities?.torch) {
            setTorchSupported(true);
          }
          // On phones the camera captures a wide area, and at zoom=1 the
          // barcode can stay small in frame and cover too few pixels, making
          // 1D decoding harder. If hardware zoom is available (cropped from
          // the sensor, not just digital upscaling), apply a moderate amount
          // to spread the barcode across more pixels.
          if (capabilities?.zoom) {
            const targetZoom = Math.min(2, capabilities.zoom.max);
            track.applyConstraints({ advanced: [{ zoom: targetZoom }] }).catch(() => {});
          }
        } catch {
          // If capability info can't be read, zoom/torch simply stay disabled.
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
            // In batch mode the camera stays open; the parent component
            // decides which ISBNs to reprocess (deduping short-lived repeats).
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
              // Decode failing on a given frame is normal; ignore silently.
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
    // The camera is only started once on mount; the effect doesn't re-run
    // even if onScan changes (the current value is read via onScanRef).
    // continuous is treated as fixed for the component's lifetime (the parent
    // always passes the same value). t is deliberately left out: a language
    // change shouldn't restart the camera, and error messages are already
    // written with the t() from the moment of the event.
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
