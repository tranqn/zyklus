import * as React from "react"
import { cn } from "@/lib/utils"

/** zyklus: frosted field look, shared by Input, Textarea and native selects */
const fieldClass =
  "w-full min-w-0 rounded-[var(--radius-sm)] border border-input bg-[color-mix(in_srgb,var(--glass-tint)_42%,transparent)] px-3.5 text-base outline-none transition-[color,box-shadow] placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/40 aria-invalid:border-destructive"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        fieldClass,
        "h-12 file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium",
        className
      )}
      {...props}
    />
  )
}

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return <textarea data-slot="textarea" className={cn(fieldClass, "min-h-22 resize-y py-3", className)} {...props} />
}

function NativeSelect({ className, ...props }: React.ComponentProps<"select">) {
  return <select data-slot="select" className={cn(fieldClass, "h-12", className)} {...props} />
}

export { Input, Textarea, NativeSelect, fieldClass }
