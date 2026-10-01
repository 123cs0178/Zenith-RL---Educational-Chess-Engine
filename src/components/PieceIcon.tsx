import React from 'react';

interface PieceIconProps {
  color: 'w' | 'b';
  type: 'p' | 'n' | 'b' | 'r' | 'q' | 'k';
  className?: string;
}

/**
 * 100% Reliable Inline SVG Vector Piece Renderers
 * Eliminates all external image fetching, hotlinking blocks, and missing icon glitches.
 */
export const PieceIcon: React.FC<PieceIconProps> = ({ color, type, className = 'w-10 h-10' }) => {
  const isWhite = color === 'w';

  // Crisp, standardized vector SVG piece paths
  const renderPath = () => {
    switch (type) {
      case 'p':
        return (
          <path
            d="M 22,9 C 20,9 18.5,10.5 18.5,12.5 C 18.5,13.8 19.2,14.8 20.3,15.5 C 18,17 16,22 16.5,29 C 14.5,29.5 13,31 13,33 C 13,35.5 15,36 15,36 L 30,36 C 30,36 32,35.5 32,33 C 32,31 30.5,29.5 28.5,29 C 29,22 27,17 24.7,15.5 C 25.8,14.8 26.5,13.8 26.5,12.5 C 26.5,10.5 25,9 23,9 L 22,9 z"
          />
        );
      case 'n':
        return (
          <path
            d="M 22,10 C 18,10 14,12.5 14,18 C 14,20 15,22.5 16,24 C 14.5,24.5 12,26 12,29 C 12,31.5 14,33 16,33 C 17.5,33 21,32.5 22,31 C 23,32.5 26.5,33 28,33 C 30,33 32,31.5 32,29 C 32,26 29.5,24.5 28,24 C 29,22.5 30,20 30,18 C 30,12.5 26,10 22,10 z M 22,12 C 24,12 26,13 26,16 C 26,18 24.5,19 23,19 L 21,19 C 19.5,19 18,18 18,16 C 18,13 20,12 22,12 z"
          />
        );
      case 'b':
        return (
          <g>
            <path d="M 22,9 C 20,9 18,11 18,14 C 18,16 19,18 20,19 C 17,21 15,25 15,30 L 30,30 C 30,25 28,21 25,19 C 26,18 27,16 27,14 C 27,11 25,9 23,9 L 22,9 z" />
            <circle cx="22.5" cy="12" r="1.5" />
            <path d="M 14,32 L 31,32 C 32,32 33,33 33,34.5 C 33,36 32,37 31,37 L 14,37 C 13,37 12,36 12,34.5 C 12,33 13,32 14,32 z" />
          </g>
        );
      case 'r':
        return (
          <path
            d="M 12,36 L 12,32 L 14,32 L 14,23 L 12,21 L 12,17 L 15,17 L 15,13 L 18,13 L 18,17 L 21,17 L 21,13 L 24,13 L 24,17 L 27,17 L 27,13 L 30,13 L 30,17 L 33,17 L 33,21 L 31,23 L 31,32 L 33,32 L 33,36 L 12,36 z"
          />
        );
      case 'q':
        return (
          <g>
            <circle cx="12" cy="12" r="2" />
            <circle cx="17" cy="9" r="2" />
            <circle cx="22.5" cy="8" r="2" />
            <circle cx="28" cy="9" r="2" />
            <circle cx="33" cy="12" r="2" />
            <path d="M 12,15 L 33,15 L 31,28 L 14,28 Z" />
            <path d="M 12,31 L 33,31 L 34,36 L 11,36 Z" />
          </g>
        );
      case 'k':
        return (
          <g>
            <path d="M 22.5,6 L 22.5,10 M 20.5,8 L 24.5,8" stroke={isWhite ? '#1e293b' : '#f8fafc'} strokeWidth="2.5" />
            <path d="M 22.5,11 C 18,11 14,14 14,19 C 14,22 16,25 18,27 L 14,30 L 14,32 L 31,32 L 31,30 L 27,27 C 29,25 31,22 31,19 C 31,14 27,11 22.5,11 Z" />
            <path d="M 12,34 L 33,34 L 33,37 L 12,37 Z" />
          </g>
        );
    }
  };

  return (
    <svg
      viewBox="0 0 45 45"
      className={`${className} inline-block select-none drop-shadow`}
      fill={isWhite ? '#ffffff' : '#1e293b'}
      stroke={isWhite ? '#1e293b' : '#f8fafc'}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {renderPath()}
    </svg>
  );
};
