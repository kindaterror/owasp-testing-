import React from 'react';
import { GraduationCap } from 'lucide-react';

interface LogoProps {
  variant?: "visitor" | "admin" | "student" | "teacher";
  className?: string;
  showText?: boolean;
  size?: "sm" | "default" | "lg" | "xl";
}

export function Logo({ 
  variant = "visitor", 
  className = "", 
  showText = true, 
  size = "default",
  ...props 
}: LogoProps) {
  
  const getSizeClasses = () => {
    switch (size) {
      case "sm":
        return "h-8";
      case "lg":
        return "h-14";
      case "xl":
        return "h-16";
      default:
        return "h-10";
    }
  };

  const getTextSizeClasses = () => {
    switch (size) {
      case "sm":
        return "text-base";
      case "lg":
        return "text-2xl";
      case "xl":
        return "text-3xl";
      default:
        return "text-lg";
    }
  };

  const getVariantStyles = () => {
    switch (variant) {
      case "visitor":
        return "text-yellow-600 hover:text-yellow-500 transition-colors duration-300";
      case "admin":
        return "text-ilaw-gold hover:text-brand-amber transition-colors duration-300";
      case "teacher":
        return "text-brand-amber hover:text-ilaw-gold transition-colors duration-300";
      case "student":
        return "text-ilaw-navy hover:text-brand-navy-700 transition-colors duration-300";
      default:
        return "text-ilaw-navy";
    }
  };

  return (
    <div className={`flex items-center group cursor-pointer ${className}`} {...props}>
      {/* Logo image with fallback */}
      <div className="relative flex items-center justify-center">
        <img 
          src="/logo1.png"
          alt="Ilaw ng Bayan Learning Institute Logo" 
          className={`${getSizeClasses()} w-auto transition-transform duration-300 group-hover:scale-110`}
          style={{ maxHeight: size === "xl" ? "64px" : size === "lg" ? "56px" : size === "sm" ? "32px" : "40px" }}
          onError={(e) => {
            // Fallback to icon if logo image fails to load
            e.currentTarget.style.display = 'none';
            const fallback = e.currentTarget.nextElementSibling as HTMLElement;
            if (fallback) fallback.style.display = 'flex';
          }}
        />
        {/* Fallback icon */}
        <div 
          className={`hidden items-center justify-center ${getSizeClasses()} w-auto bg-gradient-to-br from-ilaw-gold to-brand-amber rounded-full p-2 shadow-ilaw`}
          style={{ 
            minWidth: size === "xl" ? "64px" : size === "lg" ? "56px" : size === "sm" ? "32px" : "40px",
            minHeight: size === "xl" ? "64px" : size === "lg" ? "56px" : size === "sm" ? "32px" : "40px"
          }}
        >
          <GraduationCap className={`text-ilaw-navy ${size === "xl" ? "h-8 w-8" : size === "lg" ? "h-7 w-7" : size === "sm" ? "h-4 w-4" : "h-6 w-6"}`} />
        </div>
      </div>
      
      {/* School name */}
      {showText && (
        <div className="ml-3 flex flex-col">
          <span className={`font-heading font-bold leading-tight ${getTextSizeClasses()} ${getVariantStyles()}`}>
            Ilaw ng Bayan
          </span>
          <span className={`font-heading font-semibold leading-tight ${
            size === "xl" ? "text-lg" : 
            size === "lg" ? "text-base" : 
            size === "sm" ? "text-xs" : 
            "text-sm"
          } ${getVariantStyles()} opacity-80`}>
            Learning Institute
          </span>
          {/* Optional motto for larger sizes */}
          {(size === "lg" || size === "xl") && (
            <span className={`font-medium italic ${
              size === "xl" ? "text-sm" : "text-xs"
            } ${getVariantStyles()} opacity-60 mt-0.5`}>
              Liwanag, Kaalaman, Paglilingkod
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// Specialized Logo Components
export function VisitorLogo({ className = "", ...props }: Omit<LogoProps, 'variant'>) {
  return <Logo variant="visitor" className={className} {...props} />;
}

export function AdminLogo({ className = "", ...props }: Omit<LogoProps, 'variant'>) {
  return <Logo variant="admin" className={className} {...props} />;
}

export function TeacherLogo({ className = "", ...props }: Omit<LogoProps, 'variant'>) {
  return <Logo variant="teacher" className={className} {...props} />;
}

export function StudentLogo({ className = "", ...props }: Omit<LogoProps, 'variant'>) {
  return <Logo variant="student" className={className} {...props} />;
}

export function CompactLogo({ className = "", ...props }: LogoProps) {
  return <Logo showText={false} size="sm" className={className} {...props} />;
}

export function HeroLogo({ className = "", ...props }: LogoProps) {
  return <Logo size="xl" className={className} {...props} />;
}