import React from 'react';

export const Card: React.FC<{ 
  children: React.ReactNode; 
  className?: string; 
  noPadding?: boolean;
  decorated?: boolean;
}> = ({ children, className = '', noPadding = false, decorated = false }) => {
  return (
    <div className={`relative bg-black border border-white/20 ${noPadding ? '' : 'p-6'} ${className}`}>
      {/* Decorative corners for specific cards */}
      {decorated && (
        <>
          <div className="absolute -top-[1px] -left-[1px] w-2 h-2 border-t-2 border-l-2 border-primary"></div>
          <div className="absolute -top-[1px] -right-[1px] w-2 h-2 border-t-2 border-r-2 border-primary"></div>
          <div className="absolute -bottom-[1px] -left-[1px] w-2 h-2 border-b-2 border-l-2 border-primary"></div>
          <div className="absolute -bottom-[1px] -right-[1px] w-2 h-2 border-b-2 border-r-2 border-primary"></div>
        </>
      )}
      {children}
    </div>
  );
};

export const Button: React.FC<{
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  onClick?: () => void;
  fullWidth?: boolean;
}> = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  className = '', 
  onClick,
  fullWidth = false
}) => {
  const baseStyles = "inline-flex items-center justify-center font-bold tracking-wider uppercase transition-all duration-100 disabled:opacity-50 disabled:pointer-events-none active:translate-y-[1px]";
  
  const variants = {
    primary: "bg-primary text-black border-2 border-primary hover:bg-black hover:text-primary",
    secondary: "bg-white text-black border-2 border-white hover:bg-black hover:text-white",
    outline: "bg-transparent border-2 border-white/20 text-white hover:border-primary hover:text-primary",
    ghost: "bg-transparent text-textMuted hover:text-white hover:bg-white/5",
    danger: "bg-red-600 text-black border-2 border-red-600 hover:bg-black hover:text-red-500"
  };

  const sizes = {
    sm: "text-xs px-3 py-1.5",
    md: "text-sm px-6 py-3",
    lg: "text-base px-8 py-4",
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
      onClick={onClick}
    >
      {children}
    </button>
  );
};

export const Badge: React.FC<{ children: React.ReactNode; color?: 'green' | 'blue' | 'purple' | 'yellow' }> = ({ children, color = 'green' }) => {
  const styles = {
    green: "bg-primary/10 text-primary border-primary",
    blue: "bg-blue-500/10 text-blue-400 border-blue-400",
    purple: "bg-purple-500/10 text-purple-400 border-purple-400",
    yellow: "bg-yellow-500/10 text-yellow-400 border-yellow-400",
  };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-[10px] uppercase font-bold tracking-widest border ${styles[color]}`}>
      {children}
    </span>
  );
};

export const StatBox: React.FC<{ label: string; value: string; subtext?: string; trend?: number }> = ({ label, value, subtext, trend }) => (
  <div className="flex flex-col border-l-2 border-white/10 pl-4">
    <span className="text-textMuted text-[10px] uppercase tracking-widest mb-1">{label}</span>
    <span className="text-2xl font-mono text-white tracking-tighter">{value}</span>
    <div className="flex items-center gap-2 mt-1">
      {subtext && <span className="text-[10px] text-textMuted uppercase">{subtext}</span>}
      {trend !== undefined && (
        <span className={`text-[10px] font-bold ${trend >= 0 ? 'text-primary' : 'text-red-500'}`}>
          {trend >= 0 ? '▲' : '▼'} {Math.abs(trend)}%
        </span>
      )}
    </div>
  </div>
);

export const SectionTitle: React.FC<{ title: string; subtitle?: string }> = ({ title, subtitle }) => (
  <div className="mb-12">
    <h2 className="text-4xl font-display uppercase text-white mb-2 tracking-wide">
      <span className="text-primary mr-2">{'>'}</span>{title}
    </h2>
    {subtitle && <p className="text-textMuted font-mono text-sm max-w-2xl border-l border-primary/30 pl-4">{subtitle}</p>}
  </div>
);