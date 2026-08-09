import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

type BaseProps = {
  children: ReactNode;
  className?: string;
  icon?: ReactNode;
  variant?: "primary" | "secondary" | "ghost" | "danger" | "success";
  size?: "sm" | "md" | "lg";
};

type ButtonProps = BaseProps &
  ButtonHTMLAttributes<HTMLButtonElement> & {
    href?: never;
  };

type LinkProps = BaseProps & {
  href: string;
};

const baseClassName =
  "inline-flex items-center justify-center gap-2 rounded-2xl font-extrabold tracking-tight transition duration-150 active:translate-y-px disabled:pointer-events-none disabled:opacity-45";

const sizeClassName = {
  sm: "min-h-10 px-3.5 text-[13px]",
  md: "min-h-11 px-5 py-3 text-sm",
  lg: "min-h-14 px-6 text-[15px]",
};

const variantClassName = {
  primary:
    "border border-[#F5C518]/40 bg-[linear-gradient(180deg,#FFE56A_0%,#F5C518_42%,#E8940A_100%)] text-[#1a1208] shadow-[0_10px_28px_rgba(245,197,24,0.28),inset_0_1px_0_rgba(255,255,255,0.45)] hover:brightness-[1.04]",
  secondary:
    "border border-white/14 bg-[linear-gradient(180deg,rgba(255,255,255,0.1),rgba(255,255,255,0.04))] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] hover:border-white/22 hover:bg-white/[0.08]",
  ghost: "border border-transparent bg-transparent text-[#9AA0B4] hover:bg-white/5 hover:text-white",
  danger:
    "border border-rose-400/35 bg-[linear-gradient(180deg,#fb7185,#e11d48)] text-white shadow-[0_10px_24px_rgba(225,29,72,0.28)]",
  success:
    "border border-emerald-400/35 bg-[linear-gradient(180deg,#34d399,#059669)] text-white shadow-[0_10px_24px_rgba(16,185,129,0.28)]",
};

export function GradientButton({
  children,
  className,
  icon,
  variant = "primary",
  size = "md",
  ...props
}: ButtonProps | LinkProps) {
  const content = (
    <>
      {icon ? <span className="flex h-5 w-5 items-center justify-center">{icon}</span> : null}
      <span>{children}</span>
    </>
  );

  const classes = cn(baseClassName, sizeClassName[size], variantClassName[variant], className);

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
