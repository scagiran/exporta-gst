import React from 'react';

interface ExPortaLogoProps {
  variant?: 'dark' | 'light';
  size?: 'sm' | 'md' | 'lg';
  showSubtitle?: boolean;
  isCollapsedMark?: boolean;
  className?: string;
}

export const ExPortaLogo: React.FC<ExPortaLogoProps> = ({
  variant = 'dark',
  size = 'md',
  showSubtitle = false,
  isCollapsedMark = false,
  className = '',
}) => {
  const textColor = variant === 'light' ? '#FFFFFF' : '#0F2B48';
  const arcColor = variant === 'light' ? '#2DD4BF' : '#0D9488';

  const textSizes = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-3xl',
  };

  // If collapsed icon mode requested (for collapsed sidebar header)
  if (isCollapsedMark) {
    return (
      <div className={`relative inline-flex items-center justify-center w-9 h-9 rounded-xl bg-slate-900 border border-slate-700/80 shadow-sm ${className}`} title="ExPorta B2B">
        <span className="font-extrabold text-white text-base tracking-tight font-sans">
          Ex
        </span>
        <svg
          className="absolute -top-1 right-0 w-6 h-3 pointer-events-none overflow-visible"
          viewBox="0 0 30 15"
          fill="none"
        >
          <path d="M 2 12 Q 15 2 28 10" stroke={arcColor} strokeWidth="2.5" strokeLinecap="round" fill="none" />
          <circle cx="28" cy="10" r="1.5" fill={arcColor} />
        </svg>
      </div>
    );
  }

  return (
    <div className={`inline-flex items-start gap-2 font-sans select-none ${className}`}>
      <div className="relative flex flex-col items-start">
        {/* Brand Name & Arc Container */}
        <div className="relative inline-flex items-center tracking-tight font-extrabold">
          {/* Text: ExPorta */}
          <div className={`font-black ${textSizes[size]} flex items-center leading-none`} style={{ color: textColor }}>
            <span>Ex</span>
            {/* Porta wrapper so the arc is 100% locked specifically over 'Porta' */}
            <span className="relative inline-block font-black ml-0.5">
              Porta
              {/* Brand Teal Arc specifically positioned over 'Porta' */}
              <svg
                className="absolute -top-3 left-0 w-full h-[16px] pointer-events-none overflow-visible"
                viewBox="0 0 80 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M 2 20 Q 40 2 76 18"
                  stroke={arcColor}
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  fill="none"
                />
                <circle cx="76" cy="18" r="3" fill={arcColor} />
              </svg>
            </span>
          </div>
        </div>

        {showSubtitle && (
          <span
            className={`text-[8px] font-mono tracking-widest uppercase font-bold mt-1 ${
              variant === 'light' ? 'text-teal-400' : 'text-teal-700'
            }`}
          >
            B2B Dış Ticaret Platformu
          </span>
        )}
      </div>
    </div>
  );
};
