import React from 'react';

const colors = {
  success: 'bg-green-100 text-green-800',
  error: 'bg-red-100 text-red-800',
  info: 'bg-blue-100 text-blue-800',
  warning: 'bg-yellow-100 text-yellow-800',
  default: 'bg-gray-100 text-gray-800',
};

const Badge = ({ text, type = 'default', className = '' }) => (
  <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${colors[type] || colors.default} ${className}`}>{text}</span>
);

export default Badge; 