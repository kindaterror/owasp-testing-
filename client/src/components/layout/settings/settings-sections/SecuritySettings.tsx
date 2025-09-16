import { useState } from "react";
import {
  Lock,
  Save,
  Shield,
  Eye,
  EyeOff,
  Loader,
  CheckCircle,
  AlertCircle
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type SecuritySettingsProps = {
  userRole: "admin" | "teacher" | "student";
  user: any;
};

const fadeInUp = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 }
};

export function SecuritySettings({ userRole, user }: SecuritySettingsProps) {
  const [formData, setFormData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });

  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });

  const [isLoading, setIsLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const isAdmin = userRole === "admin";

  // Role-based styling (admin gets the strong Ilaw theme)
  const styles = isAdmin
    ? {
        card:
          "border-2 border-brand-gold-200 bg-white rounded-2xl shadow-lg overflow-hidden",
        header: "bg-ilaw-navy text-white px-6 py-4 flex items-center justify-between",
        headline: "text-xl font-heading font-bold tracking-tight",
        sub: "text-blue-100 text-sm",
        pill:
          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-brand-gold-100 text-ilaw-navy border border-brand-gold-300 text-xs font-semibold",
        field:
          "w-full px-4 py-2 border border-brand-gold-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-ilaw-gold focus:ring-opacity-50",
        button:
          "bg-ilaw-gold hover:bg-brand-amber text-ilaw-navy font-semibold shadow-sm",
        infoPanel: "bg-brand-gold-50 border border-brand-gold-200",
        infoTitle: "text-ilaw-navy",
        infoText: "text-yellow-800"
      }
    : {
        card: "border border-gray-200 bg-white rounded-xl shadow-sm overflow-hidden",
        header: "bg-gray-50 px-6 py-4",
        headline: "text-lg font-semibold",
        sub: "text-gray-500 text-sm",
        pill: "hidden",
        field:
          "w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-ilaw-navy/40",
        button: "bg-ilaw-navy hover:bg-ilaw-navy-600 text-white",
        infoPanel: "bg-blue-50 border border-blue-200",
        infoTitle: "text-blue-800",
        infoText: "text-blue-700"
      };

  // Password validation
  const validatePassword = (password: string) => {
    const minLength = password.length >= 8;
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    return {
      isValid: minLength && hasUpper && hasLower && hasNumber && hasSpecial,
      requirements: { minLength, hasUpper, hasLower, hasNumber, hasSpecial }
    };
  };

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (saveStatus !== "idle") {
      setSaveStatus("idle");
      setErrorMessage("");
    }
  };

  const handlePasswordUpdate = async () => {
    if (!formData.currentPassword) {
      setSaveStatus("error");
      setErrorMessage("Current password is required");
      return;
    }
    if (!formData.newPassword) {
      setSaveStatus("error");
      setErrorMessage("New password is required");
      return;
    }
    if (formData.newPassword !== formData.confirmPassword) {
      setSaveStatus("error");
      setErrorMessage("New passwords do not match");
      return;
    }
    const pv = validatePassword(formData.newPassword);
    if (!pv.isValid) {
      setSaveStatus("error");
      setErrorMessage("New password does not meet security requirements");
      return;
    }
    if (formData.currentPassword === formData.newPassword) {
      setSaveStatus("error");
      setErrorMessage("New password must be different from current password");
      return;
    }

    setIsLoading(true);
    setSaveStatus("idle");
    setErrorMessage("");

    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/user/password", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          currentPassword: formData.currentPassword,
          newPassword: formData.newPassword
        })
      });

      const data = await response.json();

      if (data.success) {
        setSaveStatus("success");
        setFormData({ currentPassword: "", newPassword: "", confirmPassword: "" });
      } else {
        setSaveStatus("error");
        setErrorMessage(data.message || "Failed to update password");
      }
    } catch (error) {
      setSaveStatus("error");
      setErrorMessage("Network error. Please check your connection.");
      console.error("Update password error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const togglePasswordVisibility = (field: "current" | "new" | "confirm") => {
    setShowPasswords(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const passwordValidation = validatePassword(formData.newPassword);
  const passwordsMatch = formData.newPassword === formData.confirmPassword;

  return (
    <motion.div
      className={`p-0 ${styles.card}`}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      {/* Header */}
      <div className={styles.header}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
            <Lock className="w-5 h-5 text-ilaw-gold" />
          </div>
          <div>
            <h2 className={styles.headline}>
              {isAdmin ? "Admin Password & Security" : "Password & Security"}
            </h2>
            <p className={styles.sub}>
              {isAdmin
                ? "Keep your admin account secure with a strong password."
                : "Update your password and security preferences."}
            </p>
          </div>
        </div>

        <span className={styles.pill}>
          <Shield className="w-3.5 h-3.5" />
          {isAdmin ? "ADMIN" : ""}
        </span>
      </div>

      <div className="p-6">
        {/* Status Messages */}
        <AnimatePresence mode="wait">
          {saveStatus === "success" && (
            <motion.div
              key="ok"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center"
            >
              <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
              <span className="text-green-800">Password updated successfully!</span>
            </motion.div>
          )}
          {saveStatus === "error" && (
            <motion.div
              key="err"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center"
            >
              <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
              <span className="text-red-800">{errorMessage}</span>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="space-y-6">
          {/* Current Password */}
          <motion.div
            variants={fadeInUp}
            initial="hidden"
            animate="visible"
            transition={{ duration: 0.35 }}
          >
            <label className="block text-sm font-medium text-ilaw-navy mb-2">
              Current Password
            </label>
            <div className="relative">
              <input
                type={showPasswords.current ? "text" : "password"}
                value={formData.currentPassword}
                onChange={e => handleInputChange("currentPassword", e.target.value)}
                className={`${styles.field} pr-12`}
                placeholder="Enter your current password"
              />
              <button
                type="button"
                onClick={() => togglePasswordVisibility("current")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ilaw-gray hover:text-ilaw-navy"
              >
                {showPasswords.current ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </motion.div>

          {/* New Password */}
          <motion.div
            variants={fadeInUp}
            initial="hidden"
            animate="visible"
            transition={{ duration: 0.35, delay: 0.05 }}
          >
            <label className="block text-sm font-medium text-ilaw-navy mb-2">New Password</label>
            <div className="relative">
              <input
                type={showPasswords.new ? "text" : "password"}
                value={formData.newPassword}
                onChange={e => handleInputChange("newPassword", e.target.value)}
                className={`${styles.field} pr-12`}
                placeholder="Enter your new password"
              />
              <button
                type="button"
                onClick={() => togglePasswordVisibility("new")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ilaw-gray hover:text-ilaw-navy"
              >
                {showPasswords.new ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </motion.div>

          {/* Confirm Password */}
          <motion.div
            variants={fadeInUp}
            initial="hidden"
            animate="visible"
            transition={{ duration: 0.35, delay: 0.08 }}
          >
            <label className="block text-sm font-medium text-ilaw-navy mb-2">
              Confirm New Password
            </label>
            <div className="relative">
              <input
                type={showPasswords.confirm ? "text" : "password"}
                value={formData.confirmPassword}
                onChange={e => handleInputChange("confirmPassword", e.target.value)}
                className={`${styles.field} pr-12 ${
                  formData.confirmPassword && !passwordsMatch ? "border-red-300" : ""
                }`}
                placeholder="Confirm your new password"
              />
              <button
                type="button"
                onClick={() => togglePasswordVisibility("confirm")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ilaw-gray hover:text-ilaw-navy"
              >
                {showPasswords.confirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {formData.confirmPassword && !passwordsMatch && (
              <p className="text-red-600 text-sm mt-1">Passwords do not match</p>
            )}
          </motion.div>

          {/* Password Strength Indicator */}
          {formData.newPassword && (
            <motion.div
              variants={fadeInUp}
              initial="hidden"
              animate="visible"
              transition={{ duration: 0.35, delay: 0.11 }}
              className={`${styles.infoPanel} rounded-lg p-4`}
            >
              <h3 className={`font-medium mb-2 ${styles.infoTitle}`}>Password Strength</h3>
              <div className="space-y-1">
                <Req ok={passwordValidation.requirements.minLength} text="At least 8 characters" />
                <Req ok={passwordValidation.requirements.hasUpper} text="Uppercase letter" />
                <Req ok={passwordValidation.requirements.hasLower} text="Lowercase letter" />
                <Req ok={passwordValidation.requirements.hasNumber} text="Number" />
                <Req ok={passwordValidation.requirements.hasSpecial} text="Special character" />
              </div>
            </motion.div>
          )}

          {/* Security Tips */}
          <motion.div
            variants={fadeInUp}
            initial="hidden"
            animate="visible"
            transition={{ duration: 0.35, delay: 0.14 }}
            className={`${styles.infoPanel} rounded-lg p-4`}
          >
            <div className="flex items-start">
              <Shield className={`w-5 h-5 mr-3 mt-0.5 ${isAdmin ? "text-ilaw-navy" : "text-blue-600"}`} />
              <div>
                <h3 className={`font-medium mb-1 ${styles.infoTitle}`}>Security Tips</h3>
                <ul className={`text-sm space-y-1 ${styles.infoText}`}>
                  <li>• Use a unique password for this account</li>
                  <li>• Consider using a password manager</li>
                  <li>• Change your password regularly</li>
                  <li>• Never share your password with others</li>
                </ul>
              </div>
            </div>
          </motion.div>

          <motion.button
            variants={fadeInUp}
            initial="hidden"
            animate="visible"
            transition={{ duration: 0.35, delay: 0.18 }}
            onClick={handlePasswordUpdate}
            disabled={
              isLoading ||
              !passwordValidation.isValid ||
              !passwordsMatch ||
              !formData.currentPassword
            }
            className={`px-6 py-3 rounded-lg ${styles.button} flex items-center justify-center min-w-[160px] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200`}
            whileTap={{ scale: 0.98 }}
          >
            {isLoading ? (
              <>
                <Loader className="w-4 h-4 mr-2 animate-spin" />
                Updating...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Update Password
              </>
            )}
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}

function Req({ ok, text }: { ok: boolean; text: string }) {
  return (
    <div className={`flex items-center text-sm ${ok ? "text-green-600" : "text-red-600"}`}>
      <div className={`w-2 h-2 rounded-full mr-2 ${ok ? "bg-green-600" : "bg-red-600"}`} />
      {text}
    </div>
  );
}

export default SecuritySettings;