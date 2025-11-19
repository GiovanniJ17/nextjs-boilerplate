import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-lg font-medium transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background",
  {
    variants: {
      variant: {
        default: "bg-orange-500 text-white hover:bg-orange-600 shadow-sm hover:shadow-md",
        outline: "border-2 border-slate-300 bg-transparent hover:bg-slate-50 hover:border-slate-400 text-slate-700",
        ghost: "hover:bg-slate-100 text-slate-700",
        success: "bg-green-500 text-white hover:bg-green-600 shadow-sm",
        danger: "bg-red-500 text-white hover:bg-red-600 shadow-sm",
      },
      size: {
        default: "h-11 min-h-[44px] px-5 py-2.5 text-base",
        sm: "h-9 min-h-[36px] px-3.5 py-2 text-sm",
        lg: "h-12 min-h-[48px] px-6 py-3 text-base",
        icon: "h-11 w-11 min-h-[44px] min-w-[44px]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button ref={ref} className={cn(buttonVariants({ variant, size, className }))} {...props} />
  )
);
Button.displayName = "Button";

export { Button, buttonVariants };
