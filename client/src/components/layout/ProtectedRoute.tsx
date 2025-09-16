// == IMPORTS & DEPENDENCIES ==
import { ReactNode, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

// == TYPE DEFINITIONS ==
interface ProtectedRouteProps {
  children: ReactNode;
  role?: "admin" | "student" | "teacher";
}

// == PROTECTED ROUTE COMPONENT ==
export default function ProtectedRoute({ children, role }: ProtectedRouteProps) {
  
  // == Hooks & Context ==
  const { user, loading } = useAuth();
  const [, navigate] = useLocation();

  // == Authentication & Role-Based Redirection ==
  useEffect(() => {
    console.log("ProtectedRoute - User:", user);
    console.log("ProtectedRoute - Required Role:", role);
    console.log("ProtectedRoute - Loading:", loading);
    
    if (!loading && !user) {
      console.log("ProtectedRoute - No user, redirecting to login");
      navigate("/login");
    } else if (!loading && user && role && user.role !== role) {
      console.log(`ProtectedRoute - User role (${user.role}) doesn't match required role (${role})`);
      
      if (user.role === "admin") {
        console.log("ProtectedRoute - Redirecting to admin dashboard");
        navigate("/admin");
      } else if (user.role === "teacher") {
        console.log("ProtectedRoute - Redirecting to teacher dashboard");
        navigate("/teacher");
      } else if (user.role === "student") {
        console.log("ProtectedRoute - Redirecting to student dashboard");
        navigate("/student");
      } else {
        console.log("ProtectedRoute - Redirecting to home");
        navigate("/");
      }
    } else if (!loading && user && role && user.role === role) {
      console.log(`ProtectedRoute - User role matches required role: ${role}`);
    }
  }, [user, loading, navigate, role]);

  // == Loading State ==
  if (loading) {
    console.log("ProtectedRoute - Rendering loading state");
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  // == Access Control ==
  if (!user) {
    console.log("ProtectedRoute - No user, rendering null");
    return null;
  }

  if (role && user.role !== role) {
    console.log(`ProtectedRoute - User role (${user.role}) doesn't match required role (${role}), rendering null`);
    return null;
  }

  // == Render Protected Content ==
  console.log("ProtectedRoute - Rendering protected content");
  return <>{children}</>;
}