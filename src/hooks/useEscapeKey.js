import { useEffect } from 'react';

// Modal/overlay bilesenlerinin Escape tusuyla kapanabilmesini saglar -
// erisilebilirlik icin standart bir beklenti (WAI-ARIA dialog pattern).
export function useEscapeKey(onClose) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);
}
