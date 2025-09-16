// == IMPORTS & DEPENDENCIES ==
import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { Logo } from "@/components/ui/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Loader2 } from "lucide-react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

// == VALIDATION SCHEMA ==
const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
  rememberMe: z.boolean().optional().default(false),
});

// == TYPE DEFINITIONS ==
type LoginFormValues = z.infer<typeof loginSchema>;

// == LOGIN COMPONENT ==
export default function Login() {
  
  // == HOOKS & STATE ==
  const { login } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  // == FORM SETUP ==
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
      rememberMe: false,
    },
  });
  
  // == EVENT HANDLERS ==
  const onSubmit = async (data: LoginFormValues) => {
    setIsLoading(true);
    try {
      const result = await login(data.email, data.password);
      
      console.log("Login successful, user:", result.user);
      console.log("User role:", result.user.role);
      
      // Add delay to ensure AuthContext updates
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // == SUCCESS TOAST ==
      toast({
        title: "Login successful!",
        description: `Welcome back, ${result.user.firstName}!`,
      });
      
      // == ROLE-BASED REDIRECT ==
      const userRole = result.user.role.toLowerCase();
      
      if (userRole === "admin") {
        console.log("Redirecting to admin dashboard");
        navigate("/admin");
      } else if (userRole === "teacher") {
        console.log("Redirecting to teacher dashboard");
        navigate("/teacher");
      } else if (userRole === "student") {
        console.log("Redirecting to student dashboard");
        navigate("/student");
      } else {
        console.log("Unknown role, redirecting to home");
        navigate("/"); // Default fallback
      }
      
    } catch (error) {
      // == ERROR HANDLING ==
      console.error("Login error:", error);
      toast({
        variant: "destructive",
        title: "Login failed",
        description: error instanceof Error ? error.message : "Please check your credentials and try again",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // == RENDER COMPONENT ==
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-lg shadow-md">
        
        {/* == Header Section == */}
        <div className="text-center">
          <Logo className="mx-auto" />
          <h2 className="mt-6 text-3xl font-bold font-serif text-gray-900">Sign in to your account</h2>
          <p className="mt-2 text-gray-600">
            Or <Link href="/register" className="text-primary hover:underline font-medium">create a new account</Link>
          </p>
        </div>
        
        {/* == Login Form == */}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="mt-8 space-y-6">
            
            {/* == Form Fields == */}
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email address</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="email"
                        placeholder="your@email.com"
                        autoComplete="email"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="password"
                        placeholder="••••••••"
                        autoComplete="current-password"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* == Form Options == */}
            <div className="flex items-center justify-between">
              <FormField
                control={form.control}
                name="rememberMe"
                render={({ field }) => (
                  <FormItem className="flex items-center space-x-2">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        id="remember-me"
                      />
                    </FormControl>
                    <label
                      htmlFor="remember-me"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      Remember me
                    </label>
                  </FormItem>
                )}
              />
              <Link to="/auth/forgot-password" className="text-sm text-primary hover:underline">
                 Forgot your password?
              </Link>
            </div>

            {/* == Submit Button == */}
            <Button
              type="submit"
              className="w-full bg-primary hover:bg-primary/90"
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Sign In
            </Button>
          </form>
        </Form>
        
        {/* == Navigation Section == */}
        <div className="mt-6">
          <Link href="/">
            <Button
              variant="outline"
              className="w-full flex items-center justify-center"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Website
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}