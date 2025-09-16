// == IMPORTS & DEPENDENCIES ==
import { useState } from "react";
import { Link } from "wouter";
import { Logo } from "@/components/ui/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Loader2, Mail, HelpCircle } from "lucide-react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// == VALIDATION SCHEMAS ==
const emailResetSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

const usernameSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
});

const securityAnswerSchema = z.object({
  securityAnswer: z.string().min(1, "Answer is required"),
});

const resetPasswordSchema = z.object({
  newPassword: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().min(6, "Confirm password is required"),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

// == TYPE DEFINITIONS ==
type EmailResetFormValues = z.infer<typeof emailResetSchema>;
type UsernameFormValues = z.infer<typeof usernameSchema>;
type SecurityAnswerFormValues = z.infer<typeof securityAnswerSchema>;
type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

export default function ForgotPassword() {
  const { toast } = useToast();
  
  // == EMAIL RESET STATE ==
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [sentEmail, setSentEmail] = useState('');
  
  // == SECURITY QUESTION STATE ==
  const [securityStep, setSecurityStep] = useState<'username' | 'security' | 'reset'>('username');
  const [username, setUsername] = useState('');
  const [securityQuestion, setSecurityQuestion] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [securityLoading, setSecurityLoading] = useState(false);

  // == FORM SETUP ==
  const emailForm = useForm<EmailResetFormValues>({
    resolver: zodResolver(emailResetSchema),
    defaultValues: { email: "" },
  });

  const usernameForm = useForm<UsernameFormValues>({
    resolver: zodResolver(usernameSchema),
    defaultValues: { username: '' },
  });

  const securityForm = useForm<SecurityAnswerFormValues>({
    resolver: zodResolver(securityAnswerSchema),
    defaultValues: { securityAnswer: '' },
  });

  const resetForm = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { newPassword: '', confirmPassword: '' },
  });

  // == EMAIL RESET HANDLER ==
  const onEmailSubmit = async (data: EmailResetFormValues) => {
    setEmailLoading(true);
    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: data.email }),
      });

      if (response.ok) {
        setEmailSent(true);
        setSentEmail(data.email);
        toast({
          title: "Reset email sent!",
          description: "If that email exists in our system, we've sent you a password reset link.",
        });
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send reset email');
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Failed to send reset email",
        description: error instanceof Error ? error.message : "Please try again later",
      });
    } finally {
      setEmailLoading(false);
    }
  };

  // == SECURITY QUESTION HANDLERS ==
  const onUsernameSubmit = async (data: UsernameFormValues) => {
    setSecurityLoading(true);
    try {
      const response = await fetch('/api/auth/forgot-password/check-username', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: data.username })
      });
      
      const result = await response.json();
      
      if (response.ok && result.success) {
        setUsername(data.username);
        setSecurityQuestion(result.securityQuestion);
        setSecurityStep('security');
        toast({
          title: "Security Question Found",
          description: "Please answer your security question to continue",
        });
      } else {
        throw new Error(result.message || "Username not found or no security question set");
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Username not found or no security question set",
      });
    } finally {
      setSecurityLoading(false);
    }
  };

  const onSecuritySubmit = async (data: SecurityAnswerFormValues) => {
    setSecurityLoading(true);
    try {
      const response = await fetch('/api/auth/forgot-password/verify-security', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          securityAnswer: data.securityAnswer
        })
      });
      
      const result = await response.json();
      
      if (response.ok && result.success) {
        setResetToken(result.resetToken);
        setSecurityStep('reset');
        toast({
          title: "Verification Successful",
          description: "You can now reset your password",
        });
      } else {
        throw new Error(result.message || "Incorrect security answer");
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Incorrect security answer",
      });
    } finally {
      setSecurityLoading(false);
    }
  };

  const onResetSubmit = async (data: ResetPasswordFormValues) => {
    setSecurityLoading(true);
    try {
      const response = await fetch('/api/auth/forgot-password/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          newPassword: data.newPassword,
          confirmPassword: data.confirmPassword,
          resetToken
        })
      });
      
      const result = await response.json();
      
      if (response.ok && result.success) {
        toast({
          title: "Password Reset Successful",
          description: "Your password has been reset. You can now log in with your new password.",
        });
        window.location.href = "/login";
      } else {
        throw new Error(result.message || "Failed to reset password");
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to reset password",
      });
    } finally {
      setSecurityLoading(false);
    }
  };

  // == RENDER ==
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
            Choose your preferred method to reset your password
          </p>
        </div>

        {/* == EMAIL SUCCESS MESSAGE == */}
        {emailSent ? (
          <div className="space-y-6">
            <Alert className="border-green-200 bg-green-50">
              <Mail className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                <div className="space-y-2">
                  <p className="font-medium">Reset email sent!</p>
                  <p className="text-sm">
                    We've sent a password reset link to <strong>{sentEmail}</strong>. 
                    Please check your email and click the link to reset your password.
                  </p>
                  <p className="text-xs text-green-700">
                    The reset link will expire in 1 hour for security reasons.
                  </p>
                </div>
              </AlertDescription>
            </Alert>

            <div className="space-y-3">
              <Button
                onClick={() => {
                  setEmailSent(false);
                  setSentEmail('');
                  emailForm.reset();
                }}
                variant="outline"
                className="w-full"
              >
                Send another reset email
              </Button>
              
              <Link href="/login">
                <Button className="w-full">
                  Back to Login
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          /* == RESET OPTIONS TABS == */
          <Tabs defaultValue="email" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="email" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email Reset
              </TabsTrigger>
              <TabsTrigger value="security" className="flex items-center gap-2">
                <HelpCircle className="h-4 w-4" />
                Security Question
              </TabsTrigger>
            </TabsList>
            
            {/* == EMAIL RESET TAB == */}
            <TabsContent value="email" className="space-y-6">
              <div className="text-center">
                <p className="text-sm text-gray-600">
                  Enter your email address and we'll send you a reset link
                </p>
              </div>
              
              <Form {...emailForm}>
                <form onSubmit={emailForm.handleSubmit(onEmailSubmit)} className="space-y-4">
                  <FormField
                    control={emailForm.control}
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

                  <Button
                    type="submit"
                    className="w-full bg-primary hover:bg-primary/90"
                    disabled={emailLoading}
                  >
                    {emailLoading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Mail className="mr-2 h-4 w-4" />
                    )}
                    Send Reset Link
                  </Button>
                </form>
              </Form>
            </TabsContent>

            {/* == SECURITY QUESTION TAB == */}
            <TabsContent value="security" className="space-y-6">
              
              {/* Username Step */}
              {securityStep === 'username' && (
                <>
                  <div className="text-center">
                    <p className="text-sm text-gray-600">
                      Enter your username to retrieve your security question
                    </p>
                  </div>
                  
                  <Form {...usernameForm}>
                    <form onSubmit={usernameForm.handleSubmit(onUsernameSubmit)} className="space-y-4">
                      <FormField
                        control={usernameForm.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Username</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                placeholder="Enter your username"
                                autoComplete="username"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <Button
                        type="submit"
                        className="w-full bg-primary hover:bg-primary/90"
                        disabled={securityLoading}
                      >
                        {securityLoading ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : null}
                        Continue
                      </Button>
                    </form>
                  </Form>
                </>
              )}

              {/* Security Question Step */}
              {securityStep === 'security' && (
                <>
                  <div className="space-y-2">
                    <h3 className="font-medium text-sm">Your Security Question:</h3>
                    <p className="text-gray-700 bg-gray-50 p-3 rounded-md">{securityQuestion}</p>
                  </div>
                  
                  <Form {...securityForm}>
                    <form onSubmit={securityForm.handleSubmit(onSecuritySubmit)} className="space-y-4">
                      <FormField
                        control={securityForm.control}
                        name="securityAnswer"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Your Answer</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                placeholder="Enter your answer"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="space-y-2">
                        <Button
                          type="submit"
                          className="w-full bg-primary hover:bg-primary/90"
                          disabled={securityLoading}
                        >
                          {securityLoading ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : null}
                          Verify Answer
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full"
                          onClick={() => setSecurityStep('username')}
                        >
                          Back
                        </Button>
                      </div>
                    </form>
                  </Form>
                </>
              )}

              {/* Password Reset Step */}
              {securityStep === 'reset' && (
                <>
                  <div className="text-center">
                    <p className="text-sm text-gray-600">
                      Create a new secure password for your account
                    </p>
                  </div>
                  
                  <Form {...resetForm}>
                    <form onSubmit={resetForm.handleSubmit(onResetSubmit)} className="space-y-4">
                      <FormField
                        control={resetForm.control}
                        name="newPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>New Password</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                type="password"
                                placeholder="Enter new password"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={resetForm.control}
                        name="confirmPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Confirm Password</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                type="password"
                                placeholder="Confirm your password"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="space-y-2">
                        <Button
                          type="submit"
                          className="w-full bg-primary hover:bg-primary/90"
                          disabled={securityLoading}
                        >
                          {securityLoading ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : null}
                          Reset Password
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full"
                          onClick={() => setSecurityStep('security')}
                        >
                          Back
                        </Button>
                      </div>
                    </form>
                  </Form>
                </>
              )}
            </TabsContent>
          </Tabs>
        )}
        
        {/* == Navigation Section == */}
        <div className="mt-6 space-y-3">
          <Link href="/login">
            <Button variant="outline" className="w-full flex items-center justify-center">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Login
            </Button>
          </Link>
          
          <p className="text-center text-sm text-gray-600">
            Remember your password?{" "}
            <Link href="/login" className="text-primary hover:underline font-medium">
              Sign in here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}