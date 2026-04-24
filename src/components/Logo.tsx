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
      <circle cx="50" cy="50" r="42" className="fill-primary" />
      <circle cx="50" cy="50" r="31" className="stroke-background/90" strokeWidth="5" />

      <path
        d="M50 24c-10.5 0-19 8.4-19 18.8 0 13.3 19 32.2 19 32.2s19-18.9 19-32.2C69 32.4 60.5 24 50 24Z"
        className="fill-background"
      />
      <circle cx="50" cy="42" r="7.5" className="fill-primary" />

      <path
        d="M30 34 50 42 70 34M31 66 50 42 69 66"
        className="stroke-background"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="30" cy="34" r="6.5" className="fill-background" />
      <circle cx="70" cy="34" r="6.5" className="fill-background" />
      <circle cx="31" cy="66" r="6.5" className="fill-background" />
      <circle cx="69" cy="66" r="6.5" className="fill-background" />
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
