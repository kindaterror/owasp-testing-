import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const cardVariants = cva(
  "rounded-lg border bg-card text-card-foreground shadow-sm transition-all duration-300",
  {
    variants: {
      variant: {
        default: "bg-ilaw-white border-brand-gold-200 shadow-sm hover:shadow-md",
        elevated: "bg-ilaw-white border-brand-gold-200 shadow-lg hover:shadow-xl",
        outlined: "bg-ilaw-white border-2 border-ilaw-gold shadow-sm hover:shadow-ilaw",
        gradient: "bg-gradient-to-br from-brand-gold-50 to-ilaw-white border-brand-gold-200 shadow-md hover:shadow-lg",
        navy: "bg-ilaw-navy text-ilaw-white border-brand-navy-700 shadow-navy hover:shadow-lg",
        gold: "bg-ilaw-gold text-ilaw-navy border-brand-amber shadow-ilaw hover:shadow-xl",
        glass: "bg-ilaw-white/80 backdrop-blur-sm border-brand-gold-200/50 shadow-lg hover:shadow-xl",
        minimal: "bg-transparent border-none shadow-none hover:bg-brand-gold-50",
        featured: "bg-gradient-to-br from-ilaw-gold via-brand-amber to-ilaw-gold text-ilaw-navy border-brand-amber shadow-ilaw hover:shadow-2xl",
      },
      size: {
        sm: "max-w-sm",
        default: "max-w-md",
        lg: "max-w-lg",
        xl: "max-w-xl",
        full: "w-full",
      },
      interactive: {
        true: "cursor-pointer hover:scale-[1.02] active:scale-[0.98]",
        false: "",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      interactive: false,
    },
  }
)

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {
  interactive?: boolean
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, size, interactive, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(cardVariants({ variant, size, interactive, className }))}
      {...props}
    />
  )
)
Card.displayName = "Card"

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { accent?: boolean }
>(({ className, accent = false, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "flex flex-col space-y-1.5 p-6",
      accent && "border-b border-brand-gold-200 bg-gradient-to-r from-brand-gold-50 to-transparent",
      className
    )}
    {...props}
  />
))
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement> & {
    level?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6"
    gradient?: boolean
  }
>(({ className, level = "h3", gradient = false, ...props }, ref) => {
  const Component = level
  return (
    <Component
      ref={ref}
      className={cn(
        "font-heading font-semibold leading-none tracking-tight",
        level === "h1" && "text-4xl",
        level === "h2" && "text-3xl",
        level === "h3" && "text-2xl",
        level === "h4" && "text-xl",
        level === "h5" && "text-lg",
        level === "h6" && "text-base",
        gradient && "bg-gradient-to-r from-ilaw-gold to-brand-amber bg-clip-text text-transparent",
        className
      )}
      {...props}
    />
  )
})
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement> & { muted?: boolean }
>(({ className, muted = true, ...props }, ref) => (
  <p
    ref={ref}
    className={cn(
      "text-sm leading-relaxed",
      muted ? "text-muted-foreground" : "text-foreground",
      className
    )}
    {...props}
  />
))
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { spacing?: "none" | "sm" | "default" | "lg" }
>(({ className, spacing = "default", ...props }, ref) => (
  <div 
    ref={ref} 
    className={cn(
      spacing === "none" && "p-0",
      spacing === "sm" && "p-4 pt-0",
      spacing === "default" && "p-6 pt-0",
      spacing === "lg" && "p-8 pt-0",
      className
    )} 
    {...props} 
  />
))
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { 
    justify?: "start" | "center" | "end" | "between" | "around"
    accent?: boolean
  }
>(({ className, justify = "start", accent = false, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "flex items-center p-6 pt-0",
      justify === "start" && "justify-start",
      justify === "center" && "justify-center",
      justify === "end" && "justify-end",
      justify === "between" && "justify-between",
      justify === "around" && "justify-around",
      accent && "border-t border-brand-gold-200 bg-gradient-to-r from-transparent to-brand-gold-50",
      className
    )}
    {...props}
  />
))
CardFooter.displayName = "CardFooter"

// Special Ilaw ng Bayan Card Components
const FeatureCard = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, ...props }, ref) => (
    <Card
      ref={ref}
      variant="gradient"
      interactive
      className={cn("hover:shadow-ilaw transition-all duration-300", className)}
      {...props}
    />
  )
)
FeatureCard.displayName = "FeatureCard"

const AnnouncementCard = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, ...props }, ref) => (
    <Card
      ref={ref}
      variant="featured"
      className={cn("border-2 border-ilaw-gold", className)}
      {...props}
    />
  )
)
AnnouncementCard.displayName = "AnnouncementCard"

const StudentCard = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, ...props }, ref) => (
    <Card
      ref={ref}
      variant="outlined"
      interactive
      className={cn("hover:border-brand-amber", className)}
      {...props}
    />
  )
)
StudentCard.displayName = "StudentCard"

export { 
  Card, 
  CardHeader, 
  CardFooter, 
  CardTitle, 
  CardDescription, 
  CardContent,
  FeatureCard,
  AnnouncementCard,
  StudentCard,
  cardVariants
}