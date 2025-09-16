import { useAuth } from "@/contexts/AuthContext";
import SettingsLayout from "@/components/layout/settings/SettingsLayout";
import { useEffect } from "react";
import { useRouter } from "next/router";

export default function AdminSettings() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push("/login");
      } else if (user.role !== "admin") {
        router.push("/dashboard");
      }
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-ilaw-gold mx-auto mb-4"></div>
          <p className="text-ilaw-gray">Loading settings...</p>
        </div>
      </div>
    );
  }

  if (!user || user.role !== "admin") {
    return null;
  }

  return <SettingsLayout userRole="admin" />;
}