"use client";

import Link from "next/link";

const WORD = "Workteus";

type Props = {
  href?: string | null;
  className?: string;
};

export function BrandLogo({ href = "/dashboard", className = "" }: Props) {
  const letters = (
    <>
      {WORD.split("").map((letter, i) => (
        <span
          key={`${letter}-${i}`}
          className="brand-letter"
          style={{ ["--i" as string]: i }}
          aria-hidden="true"
        >
          {letter}
        </span>
      ))}
      <span className="visually-hidden">{WORD}</span>
    </>
  );

  const classes = `brand brand-assemble ${className}`.trim();

  if (href) {
    return (
      <Link href={href} className={classes} aria-label={WORD}>
        {letters}
      </Link>
    );
  }

  return (
    <div className={classes} aria-label={WORD} role="img">
      {letters}
    </div>
  );
}
