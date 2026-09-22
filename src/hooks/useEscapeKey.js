import { useEffect } from 'react';

// Lets modal/overlay components close on the Escape key - a standard
// accessibility expectation (WAI-ARIA dialog pattern).
export function useEscapeKey(onClose) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);
}
