import { useTranslation } from 'react-i18next';
import { BarcodeChoiceIcon, SearchChoiceIcon, StackChoiceIcon, PencilChoiceIcon } from '../icons/Icons';

function AddChoiceModal({ onClose, onBarcodeAdd, onSearchAdd, onBatchAdd, onManualAdd }) {
  const { t } = useTranslation();

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '360px', padding: '30px 24px', textAlign: 'center' }}>
        <h3 style={{ fontFamily: 'var(--font-heading)', color: 'var(--text)', marginTop: 0, marginBottom: '20px' }}>{t('addChoice.title')}</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button type="button" onClick={onBarcodeAdd} className="choice-btn choice-btn-accent">
            <BarcodeChoiceIcon /> {t('addChoice.barcode')}
          </button>
          <button type="button" onClick={onSearchAdd} className="choice-btn choice-btn-accent-2">
            <SearchChoiceIcon /> {t('addChoice.search')}
          </button>
          <button type="button" onClick={onBatchAdd} className="choice-btn choice-btn-accent-2">
            <StackChoiceIcon /> {t('addChoice.batch')}
          </button>
          <button type="button" onClick={onManualAdd} className="choice-btn choice-btn-neutral">
            <PencilChoiceIcon /> {t('addChoice.manual')}
          </button>
        </div>
        <button
          type="button"
          onClick={onClose}
          style={{ marginTop: '16px', background: 'none', border: 'none', color: 'var(--text-muted)', fontFamily: 'var(--font-body)', fontSize: '13px', cursor: 'pointer' }}
        >
          {t('addChoice.cancel')}
        </button>
      </div>
    </div>
  );
}

export default AddChoiceModal;
