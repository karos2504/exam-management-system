import React from 'react';

const Modal = ({ open, onClose, title, children, footer, className = '' }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className={`bg-white rounded shadow-lg w-full max-w-md p-6 relative ${className}`}
        onClick={e => e.stopPropagation()}>
        <button className="absolute top-2 right-2 text-gray-400 hover:text-gray-700" onClick={onClose}>&times;</button>
        {title && <h3 className="font-bold text-lg mb-2">{title}</h3>}
        <div>{children}</div>
        {footer && <div className="mt-4">{footer}</div>}
      </div>
      <div className="fixed inset-0" onClick={onClose} />
    </div>
  );
};

export default Modal; 