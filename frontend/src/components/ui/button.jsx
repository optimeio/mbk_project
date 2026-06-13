import * as React from "react"
import { Slot } from "@radix-ui/react-slot"

import CTAButton from "@/components/common/CTAButton"
import { cn } from "@/lib/utils"

const VARIANT_MAP = {
  default: "primary",
  destructive: "danger",
  outline: "outline",
  secondary: "secondary",
  ghost: "ghost",
  link: "ghost",
}

const SIZE_MAP = {
  default: "md",
  sm: "sm",
  lg: "lg",
  icon: "sm",
}

const Button = React.forwardRef(({ className, variant = "default", size = "default", asChild = false, ...props }, ref) => {
  if (asChild) {
    return (
      <Slot
        className={cn("inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium", className)}
        ref={ref}
        {...props}
      />
    )
  }

  return (
    <CTAButton
      ref={ref}
      variant={VARIANT_MAP[variant] || "primary"}
      size={SIZE_MAP[size] || "md"}
      className={["instant-press", className].filter(Boolean).join(" ")}
      debounceMs={0}
      {...props}
    />
  )
})
Button.displayName = "Button"

export { Button }
