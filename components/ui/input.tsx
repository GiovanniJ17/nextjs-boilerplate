import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, type, ...props }, ref) => (
  <input
    type={type}
    className={cn(
      "flex h-11 min-h-[44px] w-full rounded-lg border-2 border-slate-300 bg-white px-4 py-2.5 text-base text-slate-900 shadow-sm placeholder:text-slate-400 focus-visible:outline-none focus-visible:border-orange-500 focus-visible:ring-2 focus-visible:ring-orange-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500 transition-colors",
      className
    )}
    ref={ref}
    {...props}
  />
));
Input.displayName = "Input";

export { Input };
