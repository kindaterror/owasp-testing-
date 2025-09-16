import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { X, AlertTriangle, CheckCircle2, Info, Star, GraduationCap } from "lucide-react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const Dialog = DialogPrimitive.Root

const DialogTrigger = DialogPrimitive.Trigger

const DialogPortal = DialogPrimitive.Portal

const DialogClose = DialogPrimitive.Close

const dialogOverlayVariants = cva(
  "fixed inset-0 z-50 transition-all duration-300 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
  {
    variants: {
      variant: {
        default: "bg-ilaw-navy/80 backdrop-blur-sm",
        academic: "bg-gradient-to-br from-ilaw-navy/90 to-brand-navy-900/90 backdrop-blur-md",
        announcement: "bg-gradient-to-br from-ilaw-gold/20 to-brand-amber/20 backdrop-blur-lg",
        alert: "bg-red-900/80 backdrop-blur-sm",
        success: "bg-green-900/80 backdrop-blur-sm",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

const dialogContentVariants = cva(
  "fixed left-[50%] top-[50%] z-50 grid w-full translate-x-[-50%] translate-y-[-50%] gap-4 border shadow-2xl duration-300 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]",
  {
    variants: {
      variant: {
        default: "bg-ilaw-white border-brand-gold-200 rounded-lg shadow-ilaw",
        academic: "bg-gradient-to-br from-ilaw-white to-brand-gold-50 border-2 border-ilaw-gold rounded-xl shadow-ilaw",
        announcement: "bg-gradient-to-br from-ilaw-gold to-brand-amber border-2 border-brand-amber text-ilaw-navy rounded-xl shadow-2xl",
        navy: "bg-ilaw-navy text-ilaw-white border-brand-navy-600 rounded-lg shadow-navy",
        alert: "bg-red-50 border-2 border-red-300 rounded-lg shadow-lg",
        success: "bg-green-50 border-2 border-green-300 rounded-lg shadow-lg",
        minimal: "bg-ilaw-white border border-brand-gold-200 rounded-md shadow-sm",
      },
      size: {
        sm: "max-w-sm p-4",
        default: "max-w-lg p-6",
        lg: "max-w-2xl p-8",
        xl: "max-w-4xl p-10",
        full: "max-w-[95vw] max-h-[95vh] p-6",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface DialogOverlayProps
  extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>,
    VariantProps<typeof dialogOverlayVariants> {}

export interface DialogContentProps
  extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>,
    VariantProps<typeof dialogContentVariants> {}

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  DialogOverlayProps
>(({ className, variant, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(dialogOverlayVariants({ variant }), className)}
    {...props}
  />
))
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  DialogContentProps
>(({ className, variant, size, children, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay variant={variant} />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(dialogContentVariants({ variant, size }), className)}
      {...props}
    >
      {children}
      <DialogPrimitive.Close className="absolute right-4 top-4 rounded-full p-2 opacity-70 ring-offset-background transition-all duration-200 hover:opacity-100 hover:bg-brand-gold-100 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-ilaw-gold focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
        <X className="h-4 w-4" />
        <span className="sr-only">Close</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPortal>
))
DialogContent.displayName = DialogPrimitive.Content.displayName

const DialogHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    accent?: boolean
    icon?: React.ReactNode
  }
>(({ className, accent = false, icon, children, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "flex flex-col space-y-1.5 text-center sm:text-left",
      accent && "pb-4 border-b border-brand-gold-200 bg-gradient-to-r from-brand-gold-50 to-transparent rounded-t-lg -mx-6 -mt-6 px-6 pt-6",
      className
    )}
    {...props}
  >
    {icon && (
      <div className="flex justify-center sm:justify-start mb-2">
        <div className="p-3 rounded-full bg-ilaw-gold text-ilaw-navy">
          {icon}
        </div>
      </div>
    )}
    {children}
  </div>
))
DialogHeader.displayName = "DialogHeader"

const DialogFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    accent?: boolean
    justify?: "start" | "center" | "end" | "between"
  }
>(({ className, accent = false, justify = "end", ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "flex flex-col-reverse sm:flex-row sm:space-x-2 gap-2",
      justify === "start" && "sm:justify-start",
      justify === "center" && "sm:justify-center",
      justify === "end" && "sm:justify-end",
      justify === "between" && "sm:justify-between",
      accent && "pt-4 border-t border-brand-gold-200 bg-gradient-to-r from-transparent to-brand-gold-50 rounded-b-lg -mx-6 -mb-6 px-6 pb-6",
      className
    )}
    {...props}
  />
))
DialogFooter.displayName = "DialogFooter"

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title> & {
    gradient?: boolean
    level?: "h1" | "h2" | "h3" | "h4"
  }
>(({ className, gradient = false, level = "h3", ...props }, ref) => {
  const Component = level
  return (
    <DialogPrimitive.Title
      ref={ref}
      asChild
    >
      <Component
        className={cn(
          "font-heading font-semibold leading-none tracking-tight",
          level === "h1" && "text-3xl",
          level === "h2" && "text-2xl",
          level === "h3" && "text-xl",
          level === "h4" && "text-lg",
          gradient && "bg-gradient-to-r from-ilaw-gold to-brand-amber bg-clip-text text-transparent",
          className
        )}
        {...props}
      />
    </DialogPrimitive.Title>
  )
})
DialogTitle.displayName = DialogPrimitive.Title.displayName

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description> & {
    muted?: boolean
  }
>(({ className, muted = true, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn(
      "text-sm leading-relaxed",
      muted ? "text-muted-foreground" : "text-foreground",
      className
    )}
    {...props}
  />
))
DialogDescription.displayName = DialogPrimitive.Description.displayName

// Specialized Dialog Components for Academic Use
const AcademicDialog = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  DialogContentProps
>(({ children, ...props }, ref) => (
  <DialogContent ref={ref} variant="academic" {...props}>
    {children}
  </DialogContent>
))
AcademicDialog.displayName = "AcademicDialog"

const AnnouncementDialog = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  DialogContentProps
>(({ children, ...props }, ref) => (
  <DialogContent ref={ref} variant="announcement" {...props}>
    {children}
  </DialogContent>
))
AnnouncementDialog.displayName = "AnnouncementDialog"

const AlertDialog = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  DialogContentProps & { type?: "warning" | "error" | "success" | "info" }
>(({ children, type = "warning", ...props }, ref) => {
  const getIcon = () => {
    switch (type) {
      case "error":
        return <AlertTriangle className="h-6 w-6" />
      case "success":
        return <CheckCircle2 className="h-6 w-6" />
      case "info":
        return <Info className="h-6 w-6" />
      default:
        return <AlertTriangle className="h-6 w-6" />
    }
  }

  const variant = type === "error" ? "alert" : type === "success" ? "success" : "default"

  return (
    <DialogContent ref={ref} variant={variant} {...props}>
      <DialogHeader icon={getIcon()}>
        {children}
      </DialogHeader>
    </DialogContent>
  )
})
AlertDialog.displayName = "AlertDialog"

const GradeDialog = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  DialogContentProps
>(({ children, ...props }, ref) => (
  <AcademicDialog ref={ref} {...props}>
    <DialogHeader icon={<GraduationCap className="h-6 w-6" />} accent>
      {children}
    </DialogHeader>
  </AcademicDialog>
))
GradeDialog.displayName = "GradeDialog"

const AchievementDialog = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  DialogContentProps
>(({ children, ...props }, ref) => (
  <AnnouncementDialog ref={ref} {...props}>
    <DialogHeader icon={<Star className="h-6 w-6" />} accent>
      {children}
    </DialogHeader>
  </AnnouncementDialog>
))
AchievementDialog.displayName = "AchievementDialog"

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  AcademicDialog,
  AnnouncementDialog,
  AlertDialog,
  GradeDialog,
  AchievementDialog,
  dialogContentVariants,
  dialogOverlayVariants,
}