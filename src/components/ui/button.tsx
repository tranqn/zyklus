import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { Slot } from "radix-ui"

// zyklus: liquid glass variants with touch-sized targets (48 px default, 44 px icons)
const buttonVariants = cva(
  "glass-press inline-flex shrink-0 items-center justify-center gap-2 rounded-full font-semibold whitespace-nowrap outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-45 aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "glass-lens text-primary-foreground [--glass-fill:var(--accent-grad)] [--glass-glow:0_10px_26px_-12px_color-mix(in_srgb,var(--accent)_70%,transparent)]",
        secondary: "glass-lens text-foreground",
        destructive: "glass-lens text-destructive",
        outline: "glass-lens text-foreground",
        ghost: "text-foreground hover:bg-accent",
        link: "text-primary underline underline-offset-4",
        /* toggle chip: aria-pressed (or the class "on") fills it with the accent gradient */
        chip: "glass-lens text-foreground aria-pressed:text-primary-foreground aria-pressed:[--glass-fill:var(--accent-grad)] [&.on]:text-primary-foreground [&.on]:[--glass-fill:var(--accent-grad)]",
        /* a large tappable choice row (onboarding, settings) */
        option:
          "glass-lens h-auto w-full justify-start gap-3.5 rounded-[var(--radius)] p-4 text-left font-normal whitespace-normal aria-pressed:[--glass-fill:var(--accent-soft)] aria-pressed:shadow-[var(--rim),inset_0_0_0_1.5px_var(--accent)]",
      },
      size: {
        default: "min-h-12 px-5 text-base",
        sm: "min-h-9 gap-1.5 px-3.5 text-[0.9rem]",
        lg: "min-h-14 px-6 text-base",
        icon: "size-11",
        "icon-sm": "size-9",
      },
    },
    compoundVariants: [
      { variant: "option", class: "min-h-0" },
      { variant: "chip", class: "min-h-10 px-3.5 text-[0.92rem]" },
      { variant: "ghost", size: "sm", class: "-ml-2.5 px-2.5" },
    ],
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
