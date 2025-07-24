import React, { useEffect } from 'react';

const colors = {
  success: 'bg-green-500',
  error: 'bg-red-500',
  info: 'bg-blue-500',
};

const Toast = ({ message, type = 'info', onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);
  return (
    <div className={`fixed top-6 right-6 z-50 px-4 py-2 rounded text-white shadow-lg ${colors[type]}`}>
      {message}
      <button className="ml-4 text-white/80" onClick={onClose}>×</button>
    </div>
  );
};

export default Toast; 