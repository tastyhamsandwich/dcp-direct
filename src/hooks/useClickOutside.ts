import { useEffect } from 'react';

const useClickOutside = (ref, onClose) => {
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (ref.current && !ref.current.contains(event.target)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mosuedown', handleClickOutside);
    };
  }, [ref, onClose]);
};

export default useClickOutside;