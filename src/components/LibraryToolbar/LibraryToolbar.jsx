import { useTranslation } from 'react-i18next';
import { PlusIcon, LibraryChipIcon, ChevronDownIcon } from '../icons/Icons';
import CustomSelect from '../CustomSelect/CustomSelect';

function LibraryToolbar({
  libraries,
  activeLibraryId,
  onChangeActiveLibrary,
  isAddingLibrary,
  onStartAddingLibrary,
  onCancelAddingLibrary,
  newLibraryName,
  onNewLibraryNameChange,
  newLibraryNameError,
  onCreateLibrary,
  onDeleteLibrary,
  onOpenAddBook,
}) {
  const { t } = useTranslation();
  const canDeleteActiveLibrary = libraries.some((l) => l.id === activeLibraryId && !l.isDefault);

  return (
    <div className="toolbar">
      <div className="toolbar-group">
        {isAddingLibrary ? (
          <form onSubmit={onCreateLibrary} className="toolbar-add-library-form">
            <div className="toolbar-add-library-input-wrap">
              <input
                type="text" placeholder={t('toolbar.namePlaceholder')} aria-label={t('toolbar.namePlaceholder')} value={newLibraryName}
                onChange={(e) => onNewLibraryNameChange(e.target.value)} autoFocus
                className={`form-input ${newLibraryNameError ? 'input-error' : ''}`} style={{ width: '160px' }}
                aria-invalid={!!newLibraryNameError}
                aria-describedby={newLibraryNameError ? 'new-library-name-error' : undefined}
              />
              {newLibraryNameError && (
                <span id="new-library-name-error" className="toolbar-add-library-error" role="alert">
                  {newLibraryNameError}
                </span>
              )}
            </div>
            <button type="submit" className="btn-primary" style={{ padding: '8px 14px' }}>{t('toolbar.add')}</button>
            <button type="button" onClick={onCancelAddingLibrary} className="chip-btn">{t('toolbar.cancel')}</button>
          </form>
        ) : (
          <button onClick={onStartAddingLibrary} className="chip-btn">
            <PlusIcon size={13} /> {t('toolbar.newLibrary')}
          </button>
        )}

        <div className="select-wrap">
          <LibraryChipIcon />
          <CustomSelect
            className="select-chip"
            ariaLabel={t('toolbar.activeLibraryLabel')}
            value={activeLibraryId}
            onChange={onChangeActiveLibrary}
            options={libraries.map((lib) => ({
              value: lib.id,
              label: `${lib.name} (${t('toolbar.shelfCountSuffix', { count: lib.shelfCount || 2 })})`,
            }))}
          />
          <ChevronDownIcon />
        </div>

        {canDeleteActiveLibrary && (
          <button onClick={() => onDeleteLibrary(activeLibraryId)} title={t('toolbar.deleteLibraryTitle')} className="btn-danger-outline">{t('toolbar.deleteLibrary')}</button>
        )}
      </div>

      <button onClick={onOpenAddBook} className="fab-add" title={t('toolbar.addBookTitle')} aria-label={t('toolbar.addBookTitle')}>
        <PlusIcon size={20} />
      </button>
    </div>
  );
}

export default LibraryToolbar;
