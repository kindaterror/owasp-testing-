import { useState, useEffect } from "react";
import { Link, useLocation, useSearch } from "wouter";
import { Logo } from "@/components/ui/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, XCircle, Loader2, ArrowLeft, Eye, EyeOff } from "lucide-react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

// == VALIDATION SCHEMA ==
const resetPasswordSchema = z.object({
  newPassword: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().min(6, "Confirm password is required"),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

export default function ResetPassword() {
  const [, navigate] = useLocation();
  const searchParams = useSearch();
  const { toast } = useToast();
  
  const [token, setToken] = useState<string | null>(null);
  const [isValidToken, setIsValidToken] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  // == FORM SETUP ==
  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      newPassword: "",
      confirmPassword: "",
    },
  });

  // == VALIDATE TOKEN ON LOAD ==
  useEffect(() => {
    const urlParams = new URLSearchParams(searchParams);
    const tokenFromUrl = urlParams.get('token');

    if (!tokenFromUrl) {
      setIsValidToken(false);
      return;
    }

    setToken(tokenFromUrl);
    setIsValidToken(true);
  }, [searchParams]);

  // == SUBMIT HANDLER ==
  const onSubmit = async (data: ResetPasswordFormValues) => {
    if (!token) {
      toast({
        variant: "destructive",
        title: "Invalid reset link",
        description: "Please use the link from your email.",
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: token,
          newPassword: data.newPassword,
        }),
      });

      if (response.ok) {
        setResetSuccess(true);
        toast({
          title: "Password reset successful!",
          description: "You can now sign in with your new password.",
        });

        // Redirect to login after 3 seconds
        setTimeout(() => {
          navigate('/login?reset=success');
        }, 3000);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to reset password');
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Reset failed",
        description: error instanceof Error ? error.message : "Please try again or request a new reset link.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // == LOADING STATE ==
  if (isValidToken === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
          <p className="mt-2 text-gray-600">Validating reset link...</p>
        </div>
      </div>
    );
  }

  // == INVALID TOKEN STATE ==
  if (!isValidToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
        <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-lg shadow-md text-center">
          <div>
            <Logo className="mx-auto" />
            <h2 className="mt-6 text-3xl font-bold font-serif text-gray-900">
              Invalid Reset Link
            </h2>
          </div>

          <div className="space-y-4">
            <XCircle className="mx-auto h-16 w-16 text-red-500" />
            <div className="space-y-2">
              <p className="text-lg font-medium text-red-700">Reset link is invalid or expired</p>
              <p className="text-sm text-gray-600">
                Please request a new password reset link to continue.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <Link href="/forgot-password">
              <Button className="w-full">
                Request New Reset Link
              </Button>
            </Link>
            <Link href="/login">
              <Button variant="outline" className="w-full">
                Back to Login
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // == SUCCESS STATE ==
  if (resetSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
        <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-lg shadow-md text-center">
          <div>
            <Logo className="mx-auto" />
            <h2 className="mt-6 text-3xl font-bold font-serif text-gray-900">
              Password Reset Successful!
            </h2>
          </div>

          <div className="space-y-4">
            <CheckCircle className="mx-auto h-16 w-16 text-green-500" />
            <div className="space-y-2">
              <p className="text-lg font-medium text-green-700">Your password has been updated</p>
              <p className="text-sm text-gray-600">
                Redirecting to login page in a few seconds...
              </p>
            </div>
          </div>

          <Link href="/login?reset=success">
            <Button className="w-full">
              Continue to Login
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // == RESET FORM ==
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-lg shadow-md">
        
        {/* == Header Section == */}
        <div className="text-center">
          <Logo className="mx-auto" />
          <h2 className="mt-6 text-3xl font-bold font-serif text-gray-900">
            Reset Your Password
          </h2>
          <p className="mt-2 text-gray-600">
            Enter your new password below
          </p>
        </div>

        {/* == Reset Form == */}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            
            <FormField
              control={form.control}
              name="newPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>New Password</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        {...field}
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your new password"
                        autoComplete="new-password"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4 text-gray-400" />
                        ) : (
                          <Eye className="h-4 w-4 text-gray-400" />
                        )}
                      </Button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm New Password</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        {...field}
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="Confirm your new password"
                        autoComplete="new-password"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="h-4 w-4 text-gray-400" />
                        ) : (
                          <Eye className="h-4 w-4 text-gray-400" />
                        )}
                      </Button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              className="w-full bg-primary hover:bg-primary/90"
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Reset Password
            </Button>
          </form>
        </Form>
        
        {/* == Navigation Section == */}
        <div className="mt-6">
          <Link href="/login">
            <Button variant="outline" className="w-full flex items-center justify-center">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Login
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}