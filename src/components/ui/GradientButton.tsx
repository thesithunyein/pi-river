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
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-extrabold transition duration-150 active:translate-y-px disabled:pointer-events-none";

const variantClassName = {
  primary:
    "bg-gradient-to-r from-[#F5C518] via-[#FF9B3D] to-[#E8791A] text-[#1A1400] shadow-[0_10px_28px_rgba(245,197,24,0.28)] hover:brightness-105",
  secondary:
    "border border-white/12 bg-white/5 text-white hover:bg-white/10",
  ghost: "text-[#9AA0B4] hover:bg-white/5 hover:text-white",
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
      {icon ? <span className="flex h-5 w-5 items-center justify-center">{icon}</span> : null}
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
    <button type="button" className={classes} {...(props as ButtonProps)}>
      {content}
    </button>
  );
}
