import React from 'react';

interface InfominerLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'dark' | 'light';
  showTagline?: boolean;
  withBackground?: boolean;
}

export const InfominerLogo: React.FC<InfominerLogoProps> = ({
  className = '',
  size = 'md',
  variant = 'dark',
  showTagline = false,
  withBackground = false,
}) => {
  const sizeMap = {
    sm: { height: 26, textClass: 'text-lg tracking-tight', tagClass: 'text-[9px]' },
    md: { height: 36, textClass: 'text-2xl tracking-tight', tagClass: 'text-[10px]' },
    lg: { height: 48, textClass: 'text-3xl tracking-tight', tagClass: 'text-xs' },
    xl: { height: 60, textClass: 'text-4xl tracking-tight', tagClass: 'text-sm' },
  };

  const { height, textClass, tagClass } = sizeMap[size];
  const textColor = variant === 'light' ? 'text-white' : 'text-[#2d3e50]';
  const subTextColor = variant === 'light' ? 'text-slate-300' : 'text-slate-500';

  return (
    <div
      className={`inline-flex items-center gap-3 select-none ${
        withBackground
          ? variant === 'light'
            ? 'bg-[#1e293b] p-2.5 rounded-xl border border-slate-700'
            : 'bg-white p-2.5 rounded-xl shadow-sm border border-slate-200'
          : ''
      } ${className}`}
      id="infominer-brand-logo"
    >
      {/* Precision Brand Icon: Three Cascading Rhombuses */}
      <svg
        style={{ height: `${height}px`, width: 'auto' }}
        viewBox="0 0 100 80"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="flex-shrink-0 drop-shadow-sm transition-transform hover:scale-105 duration-200"
      >
        {/* Layer 1: Leftmost / Back - Yellow-Orange (#e8a020) */}
        <polygon
          points="6,26 30,12 36,44 12,58"
          fill="#e8a020"
          className="transition-all"
        />
        {/* Layer 2: Center - Primary Brand Orange (#eb8a23) */}
        <polygon
          points="20,36 44,22 50,56 26,70"
          fill="#eb8a23"
          className="transition-all"
        />
        {/* Layer 3: Rightmost / Front - Primary Dark Blue/Slate (#2d3e50) */}
        <polygon
          points="38,44 68,26 74,64 44,82"
          fill={variant === 'light' ? '#3b82f6' : '#2d3e50'}
          className="transition-all"
        />
      </svg>

      {/* Brand Wordmark & Optional Subtitle */}
      <div className="flex flex-col">
        <div className={`font-black font-sans leading-none flex items-center ${textClass} ${textColor}`}>
          <span>Infominer</span>
          <span className="w-1.5 h-1.5 rounded-full bg-[#eb8a23] ml-1 self-baseline mt-1"></span>
        </div>
        {showTagline && (
          <span className={`font-medium tracking-wide uppercase mt-0.5 ${tagClass} ${subTextColor}`}>
            PD Verification &amp; Billing
          </span>
        )}
      </div>
    </div>
  );
};
