// == IMPORTS & DEPENDENCIES ==
import { Link } from "wouter";
import { Logo } from "@/components/ui/logo";
import { Sidebar } from "@/components/layout/Sidebar";

// == TYPE DEFINITIONS ==
type HeaderProps = {
  variant?: "visitor" | "admin" | "student" | "teacher";
};

// == HEADER COMPONENT ==
export function Header({ variant = "visitor" }: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 bg-ilaw-white shadow-navy border-b-2 border-ilaw-gold backdrop-blur-sm bg-opacity-95">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        
        {/* == Logo Section == */}
        <div className="flex items-center space-x-4">
          <Link href={
            variant === "visitor" ? "/" : 
            variant === "admin" ? "/admin" : 
            variant === "teacher" ? "/teacher" :
            "/student"
          }>
            <Logo variant={variant} className="h-12 w-auto hover:animate-torch-glow transition-all duration-300" />
          </Link>
        </div>
        
        {/* == Dashboard Info & Navigation == */}
        <div className="flex items-center space-x-4">
          
          {/* == Dashboard Badge == */}
          {variant !== "visitor" && (
            <div className="hidden md:flex items-center space-x-3">
              <span className="text-ilaw-gray font-medium">
                {variant === "admin" ? "Admin Dashboard" : 
                 variant === "teacher" ? "Teacher Dashboard" : 
                 "Student Portal"}
              </span>
              <div className={`${
                variant === "admin" 
                  ? "bg-brand-gold-100 text-ilaw-navy border border-ilaw-gold" : 
                variant === "teacher"
                  ? "bg-brand-navy-100 text-ilaw-navy border border-brand-navy-300" :
                  "bg-brand-amber text-ilaw-navy border border-brand-amber"
              } px-4 py-2 rounded-full text-sm font-semibold shadow-sm hover:shadow-ilaw transition-all duration-200`}>
                {variant === "admin" ? "Admin" : 
                 variant === "teacher" ? "Teacher" : 
                 "Student"}
              </div>
            </div>
          )}
          
          {/* == Welcome Message == */}
          {variant !== "visitor" && (
            <div className="hidden sm:block text-right">
              <p className="text-ilaw-gray text-sm">
                Welcome to your
              </p>
              <p className="text-ilaw-navy font-semibold text-sm">
                Learning Portal
              </p>
            </div>
          )}
          
          {/* == Sidebar Toggle == */}
          <Sidebar variant={variant} />
        </div>
      </div>
      
      {/* == Decorative Border == */}
      <div className="h-1 bg-gradient-to-r from-ilaw-gold via-brand-amber to-ilaw-gold"></div>
    </header>
  );
}

// == EXPORTS ==
export default Header;