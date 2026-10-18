import React from 'react';
import logoUrl from '../../images/Logo.jpeg';

interface InfominerLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** 'dark' = for light surfaces (the official wordmark); 'light' = for dark surfaces. */
  variant?: 'dark' | 'light';
  showTagline?: boolean;
  withBackground?: boolean;
}

// Logo artwork is 2000×416 (≈4.8:1).
const HEIGHTS = { sm: 22, md: 28, lg: 40, xl: 52 } as const;

/** The three-panel brand mark as vector (used on dark surfaces and as the favicon). */
export const InfominerMark: React.FC<{ className?: string; title?: string; style?: React.CSSProperties }> = ({
  className = '',
  title,
  style,
}) => (
  <svg
    viewBox="0 0 364 416"
    className={className}
    style={{ width: 'auto', ...style }}
    role={title ? 'img' : undefined}
    aria-hidden={title ? undefined : true}
    xmlns="http://www.w3.org/2000/svg"
  >
    {title && <title>{title}</title>}
    <polygon fill="#F2B544" points="0,108 212,0 212,210 0,318" />
    <polygon fill="#E86B2E" points="77,157 289,48 289,257 77,365" />
    <polygon fill="#364C63" points="151,207 363,99 363,306 151,415" />
  </svg>
);

export const InfominerLogo: React.FC<InfominerLogoProps> = ({
  className = '',
  size = 'md',
  variant = 'dark',
  showTagline = false,
  withBackground = false,
}) => {
  const h = HEIGHTS[size];

  return (
    <div
      className={`inline-flex items-center gap-3 select-none ${
        withBackground ? 'bg-white p-2.5 rounded-xl shadow-sm border border-slate-200' : ''
      } ${className}`}
    >
      {variant === 'dark' || withBackground ? (
        // multiply blends the JPEG's white background into tinted light surfaces
        <img
          src={logoUrl}
          alt="Infominer"
          style={{ height: h, width: 'auto' }}
          className="mix-blend-multiply"
          decoding="async"
          draggable={false}
        />
      ) : (
        <span className="inline-flex items-center gap-2.5" aria-label="Infominer">
          <InfominerMark className="shrink-0" style={{ height: h }} />
          <span className="font-bold tracking-tight text-white" style={{ fontSize: h * 0.82, lineHeight: 1 }}>
            Infominer
          </span>
        </span>
      )}
      {showTagline && (
        <span className="hidden sm:block border-l border-slate-200 pl-3 text-[11px] font-semibold uppercase tracking-[0.08em] leading-tight text-slate-500">
          PD Billing
          <br />
          &amp; Audit
        </span>
      )}
    </div>
  );
};
