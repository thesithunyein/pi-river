import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

type BaseProps = {
  children: ReactNode;
  className?: string;
  icon?: ReactNode;
  variant?: "primary" | "secondary" | "ghost";
};

type ButtonProps = BaseProps &
  ButtonHTMLAttributes<HTMLButtonElement> & {
    href?: never;
  };

type LinkProps = BaseProps & {
  href: string;
};

const baseClassName =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-extrabold transition-transform duration-150 active:translate-y-px";

const variantClassName = {
  primary:
    "bg-mi-cta text-slate-950 shadow-mi-glow hover:brightness-105",
  secondary:
    "border border-river-line/20 bg-river-bg1/80 text-river-white shadow-mi-panel hover:border-river-violet/30 hover:bg-river-bg2/80",
  ghost:
    "text-river-grey hover:bg-river-bg1/70 hover:text-river-white",
};

export function GradientButton({
  children,
  className,
  icon,
  variant = "primary",
  ...props
}: ButtonProps | LinkProps) {
  const content = (
    <>
      {icon ? <span className="-mt-px flex h-5 w-5 items-center justify-center">{icon}</span> : null}
      <span>{children}</span>
    </>
  );

  const classes = cn(baseClassName, variantClassName[variant], className);

  if ("href" in props && props.href) {
    return (
      <Link href={props.href} className={classes}>
        {content}
      </Link>
    );
  }

  return (
    <button type="button" className={classes} {...props}>
      {content}
    </button>
  );
}
