import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 font-semibold active:scale-95",
  {
    variants: {
      variant: {
        // Primary - Ilaw ng Bayan Gold
        default: "bg-ilaw-gold text-ilaw-navy hover:bg-brand-amber hover:shadow-ilaw border border-transparent",
        
        // Secondary - Navy Blue
        secondary: "bg-ilaw-navy text-ilaw-white hover:bg-brand-navy-800 hover:shadow-navy border border-transparent",
        
        // Destructive - Red with gold accents
        destructive: "bg-red-600 text-white hover:bg-red-700 hover:shadow-lg border border-transparent",
        
        // Outline - Gold border with navy text
        outline: "border-2 border-ilaw-gold bg-transparent text-ilaw-navy hover:bg-ilaw-gold hover:text-ilaw-navy hover:shadow-ilaw",
        
        // Ghost - Subtle hover with gold
        ghost: "bg-transparent text-ilaw-navy hover:bg-brand-gold-100 hover:text-ilaw-navy border border-transparent",
        
        // Link - Gold text with underline
        link: "text-ilaw-gold underline-offset-4 hover:underline hover:text-brand-amber bg-transparent border border-transparent",
        
        // Success - Green with gold accents
        success: "bg-green-600 text-white hover:bg-green-700 hover:shadow-lg border border-transparent",
        
        // Warning - Amber variation
        warning: "bg-brand-amber text-ilaw-navy hover:bg-yellow-500 hover:shadow-lg border border-transparent",
        
        // Gradient - Special Ilaw ng Bayan gradient
        gradient: "bg-gradient-to-r from-ilaw-gold to-brand-amber text-ilaw-navy hover:from-brand-amber hover:to-ilaw-gold hover:shadow-ilaw border border-transparent",
        
        // Light - Soft white with navy text
        light: "bg-ilaw-white text-ilaw-navy hover:bg-brand-gold-50 hover:shadow-sm border border-brand-gold-200",
        
        // Dark - Navy with gold hover
        dark: "bg-ilaw-navy text-ilaw-white hover:bg-brand-navy-900 hover:shadow-navy border border-transparent",
      },
      size: {
        xs: "h-7 rounded px-2 text-xs",
        sm: "h-9 rounded-md px-3 text-sm",
        default: "h-10 px-4 py-2",
        lg: "h-12 rounded-lg px-8 text-base",
        xl: "h-14 rounded-lg px-10 text-lg",
        icon: "h-10 w-10",
        "icon-sm": "h-8 w-8",
        "icon-lg": "h-12 w-12",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  loading?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading = false, children, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={loading || props.disabled}
        {...props}
      >
        {loading && (
          <svg
            className="animate-spin -ml-1 mr-2 h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {children}
      </Comp>
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }