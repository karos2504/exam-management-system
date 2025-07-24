import React from 'react';

const variants = {
  primary: 'bg-blue-600 text-white hover:bg-blue-700',
  secondary: 'bg-gray-200 text-gray-800 hover:bg-gray-300',
  danger: 'bg-red-500 text-white hover:bg-red-600',
  ghost: 'bg-transparent text-gray-700 hover:bg-gray-100',
};
const sizes = {
  md: 'px-4 py-2 text-base',
  sm: 'px-3 py-1 text-sm',
};

const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  className = '',
  ...props
}) => (
  <button
    className={`rounded transition font-medium ${variants[variant]} ${sizes[size]} ${className}`}
    disabled={disabled || loading}
    {...props}
  >
    {loading ? <span className="animate-spin mr-2">⏳</span> : null}
    {children}
  </button>
);

export default Button; 