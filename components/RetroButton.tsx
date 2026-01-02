
import React from 'react';

interface ModernButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'danger' | 'success' | 'secondary' | 'ghost';
  className?: string;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
}

const ModernButton: React.FC<ModernButtonProps> = ({ 
  children, 
  onClick, 
  variant = 'primary',
  className = '',
  disabled = false,
  type = 'button'
}) => {
  const getStyles = () => {
    if (disabled) return 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200';
    switch (variant) {
      case 'danger': return 'bg-rose-600 hover:bg-rose-700 text-white shadow-sm';
      case 'success': return 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm';
      case 'secondary': return 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200';
      case 'ghost': return 'bg-transparent hover:bg-slate-50 text-slate-500';
      default: return 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-100';
    }
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`
        px-4 py-2 rounded-lg font-semibold transition-all duration-150 active:scale-[0.98] text-sm
        ${getStyles()}
        ${className}
      `}
    >
      {children}
    </button>
  );
};

export default ModernButton;
