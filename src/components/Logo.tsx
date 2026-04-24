import React from "react";

export const Logo = ({ className = "w-10 h-10" }: { className?: string }) => {
  return (
    <svg
      className={className}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Fixr"
    >
      <rect x="3" y="3" width="94" height="94" rx="26" className="fill-white" />
      <circle cx="50" cy="50" r="39" className="fill-primary" />
      <circle cx="50" cy="50" r="28" className="stroke-white" strokeWidth="5" />

      <path
        d="M50 25c-10.2 0-18.5 8.2-18.5 18.3C31.5 56.2 50 74.7 50 74.7s18.5-18.5 18.5-31.4C68.5 33.2 60.2 25 50 25Z"
        className="fill-white"
      />
      <circle cx="50" cy="42" r="7.5" className="fill-primary" />

      <path
        d="M28 33.5 50 42 72 33.5M29.5 67 50 42 70.5 67"
        className="stroke-white"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="28" cy="33.5" r="6.8" className="fill-white" />
      <circle cx="72" cy="33.5" r="6.8" className="fill-white" />
      <circle cx="29.5" cy="67" r="6.8" className="fill-white" />
      <circle cx="70.5" cy="67" r="6.8" className="fill-white" />
    </svg>
  );
};

export const LogoWordmark = ({ className = "h-10" }: { className?: string }) => {
  return (
    <svg
      className={className}
      viewBox="0 0 238 72"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Fixr"
    >
      <Logo className="h-[72px] w-[72px]" />
      <text
        x="88"
        y="50"
        className="fill-foreground"
        fontFamily="Outfit, Arial, sans-serif"
        fontSize="42"
        fontWeight="900"
        letterSpacing="-1"
      >
        Fixr
      </text>
    </svg>
  );
};
