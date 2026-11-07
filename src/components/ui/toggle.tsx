import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { Toggle as TogglePrimitive } from "radix-ui"

// zyklus: chips are glass pills; "on" fills them with the accent gradient
const toggleVariants = cva(
  "glass-press inline-flex items-center justify-center gap-1.5 rounded-full font-semibold whitespace-nowrap outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-45 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "glass-lens text-foreground data-[state=on]:text-primary-foreground data-[state=on]:[--glass-fill:var(--accent-grad)]",
        /* a segment inside a segmented control: no own glass until selected */
        segment:
          "flex-1 text-muted-foreground data-[state=on]:glass-lens data-[state=on]:text-foreground data-[state=on]:[--glass-fill:color-mix(in_srgb,var(--glass-tint)_45%,transparent)]",
      },
      size: {
        default: "min-h-10 px-3.5 text-[0.92rem]",
        sm: "min-h-9 px-3 text-sm",
        lg: "min-h-12 px-4 text-base",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Toggle({
  className,
  variant,
  size,
  ...props
}: React.ComponentProps<typeof TogglePrimitive.Root> &
  VariantProps<typeof toggleVariants>) {
  return (
    <TogglePrimitive.Root
      data-slot="toggle"
      className={cn(toggleVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Toggle, toggleVariants }
