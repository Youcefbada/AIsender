import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      "flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm outline-none placeholder:text-[var(--muted-foreground)] focus:ring-2 focus:ring-[var(--primary)] disabled:opacity-50",
      className,
    )}
    style={{ borderColor: "var(--border)" }}
    {...props}
  />
));
Input.displayName = "Input";
