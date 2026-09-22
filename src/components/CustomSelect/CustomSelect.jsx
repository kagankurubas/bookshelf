import { useEffect, useId, useRef, useState } from 'react';
import { useEscapeKey } from '../../hooks/useEscapeKey';
import './CustomSelect.css';

// A native <select> opens the browser's/OS's own popup, which clashed with
// the app's design. This is a shared drop-in replacement that implements the
// WAI-ARIA "Collapsible Dropdown Listbox" (select-only combobox) pattern,
// matches the app's design, and is fully keyboard-operable - replaces the two
// native selects in LibraryToolbar and DashboardPage.
//
// options: [{ value, label }] - value can be any type (string, number,
// null...), compared with ===; the caller keeps its own state type (see
// DashboardPage's null | number year value).
function CustomSelect({ value, onChange, options, ariaLabel, className = '' }) {
  const [open, setOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const rootRef = useRef(null);
  const listRef = useRef(null);
  const baseId = useId();
  const listboxId = `${baseId}-listbox`;

  const selectedIndex = options.findIndex((o) => o.value === value);
  const selectedOption = selectedIndex !== -1 ? options[selectedIndex] : null;

  useEscapeKey(() => {
    if (open) setOpen(false);
  });

  useEffect(() => {
    if (!open) return undefined;
    const handleClickOutside = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const openDropdown = () => {
    setHighlightedIndex(selectedIndex !== -1 ? selectedIndex : 0);
    setOpen(true);
  };

  useEffect(() => {
    if (!open || !listRef.current) return;
    listRef.current
      .querySelector(`[data-index="${highlightedIndex}"]`)
      ?.scrollIntoView({ block: 'nearest' });
  }, [open, highlightedIndex]);

  const commitSelection = (index) => {
    const option = options[index];
    if (option) onChange(option.value);
    setOpen(false);
    rootRef.current?.querySelector('[role="combobox"]')?.focus();
  };

  const handleTriggerKeyDown = (e) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (!open) openDropdown();
        else setHighlightedIndex((i) => Math.min(i + 1, options.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (!open) openDropdown();
        else setHighlightedIndex((i) => Math.max(i - 1, 0));
        break;
      case 'Home':
        if (open) {
          e.preventDefault();
          setHighlightedIndex(0);
        }
        break;
      case 'End':
        if (open) {
          e.preventDefault();
          setHighlightedIndex(options.length - 1);
        }
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (!open) openDropdown();
        else commitSelection(highlightedIndex);
        break;
      default:
        break;
    }
  };

  return (
    <div className="custom-select" ref={rootRef}>
      <button
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-label={ariaLabel}
        aria-activedescendant={open ? `${baseId}-option-${highlightedIndex}` : undefined}
        className={`custom-select-trigger ${className}`}
        onClick={() => (open ? setOpen(false) : openDropdown())}
        onKeyDown={handleTriggerKeyDown}
      >
        {selectedOption ? selectedOption.label : ''}
      </button>

      {open && (
        <ul className="custom-select-list" role="listbox" id={listboxId} ref={listRef}>
          {options.map((option, index) => (
            <li
              key={option.value ?? 'null'}
              id={`${baseId}-option-${index}`}
              role="option"
              aria-selected={option.value === value}
              data-index={index}
              className={`custom-select-option ${index === highlightedIndex ? 'highlighted' : ''} ${option.value === value ? 'selected' : ''}`}
              onMouseEnter={() => setHighlightedIndex(index)}
              onClick={() => commitSelection(index)}
            >
              {option.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default CustomSelect;
