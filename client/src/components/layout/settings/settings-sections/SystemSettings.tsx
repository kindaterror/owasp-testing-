import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Settings,
  Save,
  Shield,
  AlertTriangle,
  Crown,
  Loader,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";

type SystemSettingsProps = {
  userRole: "admin" | "teacher" | "student";
  user: any;
};

interface PlatformSettings {
  // Access Controls
  maintenanceMode: boolean;
  allowNewRegistrations: boolean;
  requireEmailVerification: boolean;
  autoApproveTeachers: boolean;
  autoApproveStudents: boolean;

  // Security
  sessionTimeoutMinutes: number;
  maxLoginAttempts: number;
  requireStrongPasswords: boolean;
}

const fadeInUp = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
};

const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

export function SystemSettings({ userRole }: SystemSettingsProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("access");

  const isAdmin = userRole === "admin";

  const styles = isAdmin
    ? {
        headerWrap:
          "bg-gradient-to-r from-ilaw-navy to-ilaw-gold rounded-2xl p-6 text-white shadow-lg border-2 border-brand-gold-200 w-full",
        headerTitle: "text-2xl font-heading font-bold",
        headerSub: "text-blue-100",
        adminBadge: "bg-white/20 text-white font-heading font-bold",
        warnCard: "border-2 border-red-300 bg-red-50 w-full max-w-none",
        baseCard: "border-2 border-brand-gold-200 shadow-lg w-full max-w-none",
        baseHead: "border-b border-brand-gold-200 bg-brand-gold-50",
        baseTitle: "text-ilaw-navy font-heading font-bold",
        tabsList: "grid grid-cols-2 bg-brand-gold-100 rounded-xl w-full",
        tabsTrig:
          "font-heading font-bold data-[state=active]:bg-ilaw-navy data-[state=active]:text-white",
        critCard: "border-2 border-red-200 bg-red-50 w-full max-w-none",
        saveBtn:
          "w-full bg-gradient-to-r from-ilaw-navy to-ilaw-gold hover:from-ilaw-navy/90 hover:to-ilaw-gold/90 text-white font-heading font-bold py-3 text-lg",
      }
    : {
        headerWrap:
          "bg-gray-800 rounded-2xl p-6 text-white shadow w-full border border-gray-700",
        headerTitle: "text-xl font-semibold",
        headerSub: "text-gray-200",
        adminBadge: "hidden",
        warnCard: "border border-red-200 bg-red-50",
        baseCard: "border border-gray-200 shadow-sm",
        baseHead: "bg-gray-50 border-b border-gray-200",
        baseTitle: "text-gray-900 font-semibold",
        tabsList: "grid grid-cols-2 bg-gray-100 rounded-xl",
        tabsTrig:
          "font-medium data-[state=active]:bg-gray-900 data-[state=active]:text-white",
        critCard: "border border-red-200 bg-red-50",
        saveBtn:
          "w-full bg-gray-900 hover:bg-black text-white font-semibold py-3",
      };

  // Default settings state
  const [platformSettings, setPlatformSettings] = useState<PlatformSettings>({
    maintenanceMode: false,
    allowNewRegistrations: true,
    requireEmailVerification: true,
    autoApproveTeachers: false,
    autoApproveStudents: false,

    sessionTimeoutMinutes: 60,
    maxLoginAttempts: 5,
    requireStrongPasswords: true,
  });

  // Load settings from API
  const { data: settingsData, isLoading } = useQuery({
    queryKey: ["system-settings"],
    queryFn: async () => {
      try {
        const response = await fetch("/api/admin/system-settings", {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        if (!response.ok) throw new Error("Failed to fetch system settings");
        return response.json();
      } catch (error) {
        console.error("Failed to load settings:", error);
        return { settings: null };
      }
    },
  });

  // Update settings when data loads
  useEffect(() => {
    if (settingsData?.settings) {
      setPlatformSettings((prev) => ({
        ...prev,
        ...settingsData.settings,
      }));
    }
  }, [settingsData]);

  // Save settings mutation
  const saveSettingsMutation = useMutation({
    mutationFn: async (settings: PlatformSettings) => {
      const response = await fetch("/api/admin/system-settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
        },
        body: JSON.stringify(settings),
      });
      if (!response.ok) throw new Error("Failed to save settings");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["system-settings"] });
      toast({
        title: "Success",
        description: "System settings saved successfully",
      });

      if (platformSettings.maintenanceMode) {
        toast({
          title: "⚠️ Maintenance Mode Active",
          description: "Platform is now disabled for all users except admins",
          variant: "destructive",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save settings",
        variant: "destructive",
      });
    },
  });

  const handleToggle = (key: keyof PlatformSettings) => {
    setPlatformSettings((prev) => ({
      ...prev,
      [key]: !prev[key as keyof PlatformSettings],
    }));
  };

  const handleChange = (key: keyof PlatformSettings, value: any) => {
    setPlatformSettings((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSave = () => {
    saveSettingsMutation.mutate(platformSettings);
  };

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-96">
        <Loader className="w-8 h-8 animate-spin text-ilaw-gold mr-3" />
        <span className="text-ilaw-navy text-lg font-heading font-bold">
          Loading system settings...
        </span>
      </div>
    );
  }

  return (
    <div className="w-full max-w-none space-y-6 p-6">
      {/* Header */}
      <motion.div
        className={styles.headerWrap}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
      >
        <div className="flex items-center justify-between">
          <motion.div
            className="flex items-center"
            variants={fadeInUp}
            initial="hidden"
            animate="visible"
            transition={{ duration: 0.35 }}
          >
            <div className="w-12 h-12 rounded-full bg-white/15 flex items-center justify-center mr-3">
              <Crown className="w-7 h-7" />
            </div>
            <div>
              <h2 className={styles.headerTitle}>🏛️ Platform Control Center</h2>
              <p className={styles.headerSub}>
                Master administrative settings and configuration
              </p>
            </div>
          </motion.div>

          <motion.div
            className="flex items-center gap-2"
            variants={fadeIn}
            initial="hidden"
            animate="visible"
            transition={{ duration: 0.35, delay: 0.05 }}
          >
            <Badge className={styles.adminBadge}>Admin Only</Badge>
            <AnimatePresence>
              {platformSettings.maintenanceMode && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                >
                  <Badge variant="destructive" className="font-heading font-bold animate-pulse">
                    🚨 Maintenance
                  </Badge>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </motion.div>

      {/* Maintenance Warning */}
      <AnimatePresence>
        {platformSettings.maintenanceMode && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
          >
            <Card className={styles.warnCard}>
              <CardContent className="p-4">
                <div className="flex items-center">
                  <AlertTriangle className="w-6 h-6 text-red-600 mr-3" />
                  <div>
                    <p className="text-red-800 font-heading font-bold">
                      ⚠️ MAINTENANCE MODE ACTIVE
                    </p>
                    <p className="text-red-700 text-sm">
                      Platform is currently disabled for all users except admins
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Configuration Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
      >
        <Card className={styles.baseCard}>
          <CardHeader className={styles.baseHead}>
            <CardTitle className={`${styles.baseTitle} flex items-center`}>
              <Settings className="w-6 h-6 text-ilaw-gold mr-2" />
              🛠️ System Configuration
            </CardTitle>
            <CardDescription className="text-brand-gold-600">
              Configure platform access controls and security settings
            </CardDescription>
          </CardHeader>

          <CardContent className="p-6 w-full">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6 w-full">
              <TabsList className={styles.tabsList}>
                <TabsTrigger value="access" className={styles.tabsTrig}>
                  🔐 Access Controls
                </TabsTrigger>
                <TabsTrigger value="security" className={styles.tabsTrig}>
                  🛡️ Security Settings
                </TabsTrigger>
              </TabsList>

              {/* Access Tab */}
              <TabsContent value="access" className="space-y-6 m-0 w-full">
                <motion.div
                  variants={fadeInUp}
                  initial="hidden"
                  animate="visible"
                  transition={{ duration: 0.35 }}
                >
                  <Card className={styles.critCard}>
                    <CardHeader>
                      <CardTitle className="text-red-800 font-heading font-bold flex items-center">
                        <AlertTriangle className="w-5 h-5 mr-2" />
                        🚨 Critical Platform Controls
                      </CardTitle>
                      <CardDescription className="text-red-600">
                        These settings affect platform accessibility. Use with extreme caution.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4 w-full">
                      <div className="flex items-center justify-between p-4 bg-white border-2 border-red-200 rounded-lg w-full">
                        <div className="flex-1">
                          <div className="font-heading font-bold text-red-700 flex items-center">
                            <AlertTriangle className="w-4 h-4 mr-2" />
                            🚨 Maintenance Mode
                          </div>
                          <p className="text-sm text-red-600">
                            Disable platform for all users except admins
                          </p>
                        </div>
                        <Switch
                          checked={platformSettings.maintenanceMode}
                          onCheckedChange={() => handleToggle("maintenanceMode")}
                        />
                      </div>

                      <div className="flex items-center justify-between p-4 bg-white border border-green-200 rounded-lg w-full">
                        <div className="flex-1">
                          <div className="font-heading font-bold text-green-700">
                            Allow New Registrations
                          </div>
                          <p className="text-sm text-green-600">Users can create new accounts</p>
                        </div>
                        <Switch
                          checked={platformSettings.allowNewRegistrations}
                          onCheckedChange={() => handleToggle("allowNewRegistrations")}
                        />
                      </div>

                      <div className="flex items-center justify-between p-4 bg-white border border-blue-200 rounded-lg w-full">
                        <div className="flex-1">
                          <div className="font-heading font-bold text-blue-700">
                            Require Email Verification
                          </div>
                          <p className="text-sm text-blue-600">
                            Users must verify email before access
                          </p>
                        </div>
                        <Switch
                          checked={platformSettings.requireEmailVerification}
                          onCheckedChange={() => handleToggle("requireEmailVerification")}
                        />
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 w-full">
                        <div className="flex items-center justify-between p-4 bg-white border border-blue-200 rounded-lg">
                          <div className="flex-1">
                            <div className="font-heading font-bold text-blue-700">
                              Auto-Approve Teachers
                            </div>
                            <p className="text-sm text-blue-600">Teachers get instant access</p>
                          </div>
                          <Switch
                            checked={platformSettings.autoApproveTeachers}
                            onCheckedChange={() => handleToggle("autoApproveTeachers")}
                          />
                        </div>

                        <div className="flex items-center justify-between p-4 bg-white border border-blue-200 rounded-lg">
                          <div className="flex-1">
                            <div className="font-heading font-bold text-blue-700">
                              Auto-Approve Students
                            </div>
                            <p className="text-sm text-blue-600">Students get instant access</p>
                          </div>
                          <Switch
                            checked={platformSettings.autoApproveStudents}
                            onCheckedChange={() => handleToggle("autoApproveStudents")}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </TabsContent>

              {/* Security Tab */}
              <TabsContent value="security" className="space-y-6 m-0 w-full">
                <motion.div
                  className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full"
                  variants={fadeInUp}
                  initial="hidden"
                  animate="visible"
                  transition={{ duration: 0.35 }}
                >
                  <Card className="border-2 border-red-200 bg-red-50">
                    <CardHeader>
                      <CardTitle className="text-red-800 font-heading font-bold flex items-center">
                        <Clock className="w-5 h-5 mr-2" />
                        ⏱️ Session Settings
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div>
                        <label className="block text-sm font-heading font-bold text-red-700 mb-2">
                          Session Timeout (minutes)
                        </label>
                        <Input
                          type="number"
                          value={platformSettings.sessionTimeoutMinutes}
                          onChange={(e) =>
                            handleChange(
                              "sessionTimeoutMinutes",
                              parseInt(e.target.value) || 15
                            )
                          }
                          min="15"
                          max="480"
                          className="border-2 border-red-200 w-full"
                        />
                        <p className="text-xs text-red-600 mt-1">15-480 minutes</p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-2 border-orange-200 bg-orange-50">
                    <CardHeader>
                      <CardTitle className="text-orange-800 font-heading font-bold flex items-center">
                        <Shield className="w-5 h-5 mr-2" />
                        🔐 Login Security
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div>
                        <label className="block text-sm font-heading font-bold text-orange-700 mb-2">
                          Max Login Attempts
                        </label>
                        <Input
                          type="number"
                          value={platformSettings.maxLoginAttempts}
                          onChange={(e) =>
                            handleChange("maxLoginAttempts", parseInt(e.target.value) || 3)
                          }
                          min="3"
                          max="10"
                          className="border-2 border-orange-200 w-full"
                        />
                        <p className="text-xs text-orange-600 mt-1">3-10 attempts</p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-2 border-purple-200 bg-purple-50">
                    <CardHeader>
                      <CardTitle className="text-purple-800 font-heading font-bold flex items-center">
                        <Shield className="w-5 h-5 mr-2" />
                        🛡️ Password Policy
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between p-3 bg-white border border-purple-200 rounded-lg">
                        <div className="flex-1">
                          <div className="font-medium text-purple-700">Strong Passwords</div>
                          <p className="text-sm text-purple-600">Require complex passwords</p>
                        </div>
                        <Switch
                          checked={platformSettings.requireStrongPasswords}
                          onCheckedChange={() => handleToggle("requireStrongPasswords")}
                        />
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </TabsContent>
            </Tabs>

            {/* Save Button */}
            <motion.div
              className="pt-6 border-t border-brand-gold-200 w-full"
              variants={fadeInUp}
              initial="hidden"
              animate="visible"
              transition={{ duration: 0.35, delay: 0.05 }}
            >
              <motion.div whileTap={{ scale: 0.98 }}>
                <Button
                  onClick={handleSave}
                  disabled={saveSettingsMutation.isPending}
                  className={styles.saveBtn}
                >
                  {saveSettingsMutation.isPending ? (
                    <>
                      <Loader className="w-5 h-5 mr-2 animate-spin" />
                      Saving Platform Settings...
                    </>
                  ) : (
                    <>
                      <Save className="w-5 h-5 mr-2" />
                      💾 Save Platform Settings
                    </>
                  )}
                </Button>
              </motion.div>
            </motion.div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

export default SystemSettings;