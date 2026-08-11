import React from 'react';

interface ExPortaLogoProps {
  variant?: 'dark' | 'light';
  size?: 'sm' | 'md' | 'lg';
  showSubtitle?: boolean;
  className?: string;
}

export const ExPortaLogo: React.FC<ExPortaLogoProps> = ({
  variant = 'dark',
  size = 'md',
  showSubtitle = false,
  className = '',
}) => {
  const textColor = variant === 'light' ? '#FFFFFF' : '#0F2B48';
  const arcColor = variant === 'light' ? '#2DD4BF' : '#0D9488';

  const heights = {
    sm: 'h-7',
    md: 'h-9',
    lg: 'h-12',
  };

  const textSizes = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-4xl',
  };

  return (
    <div className={`inline-flex items-center gap-2 font-sans select-none ${className}`}>
      <div className="relative flex flex-col items-start">
        {/* SVG Wordmark with the graceful brand arc */}
        <div className="relative inline-block tracking-tight font-extrabold flex items-center">
          <span className={`font-extrabold ${textSizes[size]}`} style={{ color: textColor }}>
            Ex<span className="font-extrabold">Porta</span>
          </span>
          
          {/* Brand Teal Arc Over 'Porta' */}
          <svg
            className="absolute -top-2.5 right-0.5 w-[60%] h-[18px] pointer-events-none overflow-visible"
            viewBox="0 0 100 30"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M 5 26 Q 45 2 92 24"
              stroke={arcColor}
              strokeWidth="4"
              strokeLinecap="round"
              fill="none"
            />
            <circle cx="92" cy="24" r="3.5" fill={arcColor} />
          </svg>
        </div>

        {showSubtitle && (
          <span
            className={`text-[9px] font-mono tracking-widest uppercase font-bold mt-0.5 ${
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
