import * as React from "react"
import { useState } from "react"
import { Eye, EyeOff, Search, User, Mail, Phone, Calendar, Lock, AlertCircle, CheckCircle2 } from "lucide-react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const inputVariants = cva(
  "flex w-full rounded-md border bg-background text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground transition-all duration-300 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "border-brand-gold-200 focus-visible:ring-2 focus-visible:ring-ilaw-gold focus-visible:ring-offset-2 focus-visible:border-ilaw-gold hover:border-brand-gold-300",
        academic: "border-ilaw-gold bg-brand-gold-50 focus-visible:ring-2 focus-visible:ring-brand-amber focus-visible:ring-offset-2 focus-visible:border-brand-amber hover:bg-ilaw-white",
        navy: "border-brand-navy-300 bg-brand-navy-50 text-ilaw-navy focus-visible:ring-2 focus-visible:ring-ilaw-navy focus-visible:ring-offset-2 focus-visible:border-ilaw-navy",
        outline: "border-2 border-ilaw-gold bg-transparent focus-visible:ring-2 focus-visible:ring-brand-amber focus-visible:ring-offset-2 focus-visible:border-brand-amber",
        ghost: "border-transparent bg-brand-gold-50 hover:bg-brand-gold-100 focus-visible:ring-2 focus-visible:ring-ilaw-gold focus-visible:ring-offset-2 focus-visible:border-brand-gold-200",
        error: "border-red-300 bg-red-50 text-red-900 focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 focus-visible:border-red-500",
        success: "border-green-300 bg-green-50 text-green-900 focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 focus-visible:border-green-500",
      },
      size: {
        sm: "h-8 px-2 py-1 text-xs",
        default: "h-10 px-3 py-2",
        lg: "h-12 px-4 py-3 text-base",
        xl: "h-14 px-5 py-4 text-lg",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement>,
    VariantProps<typeof inputVariants> {
  icon?: React.ReactNode
  iconPosition?: "left" | "right"
  error?: string
  success?: string
  helperText?: string
  label?: string
  required?: boolean
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ 
    className, 
    variant, 
    size, 
    type, 
    icon, 
    iconPosition = "left", 
    error, 
    success, 
    helperText, 
    label, 
    required,
    ...props 
  }, ref) => {
    const [showPassword, setShowPassword] = useState(false)
    const isPasswordField = type === "password"
    const hasLeftIcon = icon && iconPosition === "left"
    const hasRightIcon = (icon && iconPosition === "right") || isPasswordField
    const currentVariant = error ? "error" : success ? "success" : variant

    const getIconForType = (inputType: string) => {
      switch (inputType) {
        case "email":
          return <Mail className="h-4 w-4" />
        case "tel":
          return <Phone className="h-4 w-4" />
        case "search":
          return <Search className="h-4 w-4" />
        case "date":
        case "datetime-local":
          return <Calendar className="h-4 w-4" />
        case "password":
          return <Lock className="h-4 w-4" />
        default:
          return icon || <User className="h-4 w-4" />
      }
    }

    const displayIcon = icon || (type && !isPasswordField ? getIconForType(type) : null)

    return (
      <div className="w-full space-y-2">
        {label && (
          <label className="text-sm font-medium text-ilaw-navy">
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        
        <div className="relative w-full">
          {hasLeftIcon && displayIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-gold-400">
              {displayIcon}
            </div>
          )}
          
          <input
            type={isPasswordField && showPassword ? "text" : type}
            className={cn(
              inputVariants({ variant: currentVariant, size, className }),
              hasLeftIcon && "pl-10",
              hasRightIcon && "pr-10",
              error && "focus-visible:ring-red-500",
              success && "focus-visible:ring-green-500"
            )}
            ref={ref}
            {...props}
          />
          
          {hasRightIcon && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              {isPasswordField ? (
                <button
                  type="button"
                  className="text-brand-gold-400 hover:text-ilaw-gold transition-colors duration-200"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              ) : (
                iconPosition === "right" && displayIcon && (
                  <div className="text-brand-gold-400">
                    {displayIcon}
                  </div>
                )
              )}
            </div>
          )}
          
          {error && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <AlertCircle className="h-4 w-4 text-red-500" />
            </div>
          )}
          
          {success && !isPasswordField && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            </div>
          )}
        </div>
        
        {(error || success || helperText) && (
          <div className="text-xs">
            {error && (
              <p className="text-red-600 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {error}
              </p>
            )}
            {success && !error && (
              <p className="text-green-600 flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" />
                {success}
              </p>
            )}
            {helperText && !error && !success && (
              <p className="text-brand-gold-500">{helperText}</p>
            )}
          </div>
        )}
      </div>
    )
  }
)
Input.displayName = "Input"

// Specialized Input Components for Academic Use
const StudentIdInput = React.forwardRef<HTMLInputElement, Omit<InputProps, 'type' | 'icon'>>(
  ({ placeholder = "Enter Student ID", ...props }, ref) => (
    <Input
      ref={ref}
      type="text"
      variant="academic"
      icon={<User className="h-4 w-4" />}
      placeholder={placeholder}
      {...props}
    />
  )
)
StudentIdInput.displayName = "StudentIdInput"

const GradeInput = React.forwardRef<HTMLInputElement, Omit<InputProps, 'type' | 'min' | 'max'>>(
  ({ placeholder = "Enter grade (0-100)", ...props }, ref) => (
    <Input
      ref={ref}
      type="number"
      min="0"
      max="100"
      variant="academic"
      placeholder={placeholder}
      {...props}
    />
  )
)
GradeInput.displayName = "GradeInput"

const SearchInput = React.forwardRef<HTMLInputElement, Omit<InputProps, 'type' | 'icon'>>(
  ({ placeholder = "Search...", ...props }, ref) => (
    <Input
      ref={ref}
      type="search"
      variant="ghost"
      icon={<Search className="h-4 w-4" />}
      placeholder={placeholder}
      {...props}
    />
  )
)
SearchInput.displayName = "SearchInput"

const EmailInput = React.forwardRef<HTMLInputElement, Omit<InputProps, 'type' | 'icon'>>(
  ({ placeholder = "Enter email address", ...props }, ref) => (
    <Input
      ref={ref}
      type="email"
      icon={<Mail className="h-4 w-4" />}
      placeholder={placeholder}
      {...props}
    />
  )
)
EmailInput.displayName = "EmailInput"

export { 
  Input, 
  inputVariants,
  StudentIdInput,
  GradeInput,
  SearchInput,
  EmailInput
}