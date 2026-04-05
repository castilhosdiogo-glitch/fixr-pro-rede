import React from 'react';

export const Logo = ({ className = "w-10 h-10" }: { className?: string }) => {
  return (
    <svg
      className={className}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* 
        Fixr Modern Industrial Logo
        Precision cut geometric design
      */}

      {/* Main Base Block - Sharp, No Curves */}
      <polygon 
        points="10,25 50,5 90,25 90,75 50,95 10,75" 
        className="fill-primary" 
      />

      {/* Industrial framing */}
      <polygon 
        points="10,25 50,5 90,25 90,75 50,95 10,75" 
        className="stroke-background scale-90 origin-center" 
        strokeWidth="2"
      />

      {/* Abstract 'F' / 'X' Tool Combination */}
      {/* Central Spindle */}
      <path 
        d="M 50 20 L 50 80" 
        className="stroke-background" 
        strokeWidth="6" 
        strokeLinecap="square"
      />

      {/* F Crossbars / Wrench jaws */}
      <path 
        d="M 50 35 L 75 25 M 50 65 L 75 55" 
        className="stroke-background" 
        strokeWidth="6" 
        strokeLinecap="square"
      />

      {/* Counter-cross representing modern repair/X */}
      <path 
        d="M 25 25 L 50 35 M 25 55 L 50 65" 
        className="stroke-background" 
        strokeWidth="4" 
        strokeLinecap="square"
      />

      {/* Precision rivet point */}
      <rect 
        x="25" y="70" width="8" height="8" 
        className="fill-background"
      />
    </svg>
  );
};
