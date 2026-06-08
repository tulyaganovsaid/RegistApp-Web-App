import React from 'react';

interface BrandLogoProps {
  id?: string;
  className?: string;
  iconOnly?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function BrandLogo({ id = 'brand-logo', className = '', iconOnly = false, size = 'md' }: BrandLogoProps) {
  const iconSize = size === 'sm' ? 'h-8 w-8' : size === 'lg' ? 'h-12 w-12' : 'h-10 w-10';
  const textSize = size === 'sm' ? 'text-lg' : size === 'lg' ? 'text-2xl' : 'text-xl';

  return (
    <div id={`${id}-container`} className={`flex items-center space-x-3 select-none ${className}`}>
      {/* Dynamic inline SVG reflecting the exact new logo mark */}
      <div id={`${id}-icon-wrapper`} className={`${iconSize} flex-shrink-0 flex items-center justify-center`}>
        <svg
          viewBox="0 0 100 100"
          className="h-full w-full"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          id={`${id}-svg`}
        >
          {/* Olive-green rounded square border matching the logo style */}
          <rect
            id={`${id}-rect-border`}
            x="8"
            y="8"
            width="84"
            height="84"
            rx="24"
            stroke="#7A9A3C"
            strokeWidth="10"
          />
          {/* Letter R inside the rounded square border */}
          <path
            id={`${id}-path-r`}
            d="M 36 30 V 70 M 36 30 H 52 C 60 30 64 35 64 42.5 C 64 50 60 55 52 55 H 36 M 51 55 L 65 70"
            stroke="#7A9A3C"
            strokeWidth="10"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      {!iconOnly && (
        <span id={`${id}-text`} className={`${textSize} font-logo font-bold tracking-tight text-white`}>
          Regist<span className="text-[#7A9A3C]">App</span>
        </span>
      )}
    </div>
  );
}
