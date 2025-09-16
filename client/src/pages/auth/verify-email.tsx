import { useState, useEffect } from "react";
import { Link, useLocation, useSearch } from "wouter";
import { Logo } from "@/components/ui/logo";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, XCircle, Loader2, ArrowLeft } from "lucide-react";

export default function VerifyEmail() {
  const [, navigate] = useLocation();
  const searchParams = useSearch();
  const { toast } = useToast();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const verifyEmailToken = async () => {
      const urlParams = new URLSearchParams(searchParams);
      const token = urlParams.get('token');

      if (!token) {
        setStatus('error');
        setMessage('Invalid verification link');
        return;
      }

      try {
        const response = await fetch(`/api/auth/verify-email?token=${token}`);
        
        if (response.ok) {
          setStatus('success');
          setMessage('Your email has been verified successfully!');
          
          toast({
            title: "Email verified!",
            description: "You can now sign in to your account.",
          });

          // Redirect to login after 3 seconds
          setTimeout(() => {
            navigate('/login?verified=true');
          }, 3000);
        } else {
          const errorData = await response.json();
          setStatus('error');
          setMessage(errorData.error || 'Verification failed');
        }
      } catch (error) {
        setStatus('error');
        setMessage('Something went wrong. Please try again.');
      }
    };

    verifyEmailToken();
  }, [searchParams, navigate, toast]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-lg shadow-md text-center">
        
        {/* Header */}
        <div>
          <Logo className="mx-auto" />
          <h2 className="mt-6 text-3xl font-bold font-serif text-gray-900">
            Email Verification
          </h2>
        </div>

        {/* Status Content */}
        <div className="space-y-6">
          {status === 'loading' && (
            <div className="space-y-4">
              <Loader2 className="mx-auto h-16 w-16 animate-spin text-primary" />
              <p className="text-gray-600">Verifying your email address...</p>
            </div>
          )}

          {status === 'success' && (
            <div className="space-y-4">
              <CheckCircle className="mx-auto h-16 w-16 text-green-500" />
              <div className="space-y-2">
                <p className="text-lg font-medium text-green-700">{message}</p>
                <p className="text-sm text-gray-600">
                  Redirecting to login page in a few seconds...
                </p>
              </div>
            </div>
          )}

          {status === 'error' && (
            <div className="space-y-4">
              <XCircle className="mx-auto h-16 w-16 text-red-500" />
              <div className="space-y-2">
                <p className="text-lg font-medium text-red-700">{message}</p>
                <p className="text-sm text-gray-600">
                  Please try registering again or contact support.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="space-y-4">
          {status === 'success' && (
            <Link href="/login?verified=true">
              <Button className="w-full">
                Continue to Login
              </Button>
            </Link>
          )}

          {status === 'error' && (
            <div className="space-y-3">
              <Link href="/register">
                <Button className="w-full">
                  Try Registering Again
                </Button>
              </Link>
              <Link href="/login">
                <Button variant="outline" className="w-full">
                  Back to Login
                </Button>
              </Link>
            </div>
          )}

          <Link href="/">
            <Button variant="outline" className="w-full flex items-center justify-center">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Website
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}