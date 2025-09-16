import { useState } from "react";
import { Trash2, AlertTriangle, Download, LogOut } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type AccountActionsProps = {
  userRole: "admin" | "teacher" | "student";
  user: any;
};

const fadeInUp = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
};

export function AccountActions({ userRole, user }: AccountActionsProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  // == Role-based styling (admin-first polish) ==
  const getRoleStyles = () => {
    switch (userRole) {
      case "admin":
        return {
          headerIcon: "text-ilaw-gold",
          headerTitle: "text-ilaw-navy",
          primaryBtn:
            "bg-ilaw-gold hover:bg-brand-gold-600 text-white shadow-sm",
          subtleCard: "bg-brand-gold-50 border-2 border-brand-gold-200",
          subtleCardTitle: "text-ilaw-navy",
          subtleCardText: "text-brand-gold-700",
          navyCard: "bg-ilaw-navy/5 border-2 border-ilaw-navy/30",
          navyBtn:
            "bg-ilaw-navy hover:bg-ilaw-navy/90 text-white shadow-sm",
        };
      case "teacher":
        return {
          headerIcon: "text-brand-navy",
          headerTitle: "text-brand-navy",
          primaryBtn: "bg-brand-navy hover:bg-brand-navy-600 text-white",
          subtleCard: "bg-blue-50 border border-blue-200",
          subtleCardTitle: "text-blue-800",
          subtleCardText: "text-blue-700",
          navyCard: "bg-blue-50 border border-blue-200",
          navyBtn: "bg-brand-navy hover:bg-brand-navy-700 text-white",
        };
      case "student":
        return {
          headerIcon: "text-amber-500",
          headerTitle: "text-ilaw-navy",
          primaryBtn:
            "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white",
          subtleCard: "bg-amber-50 border border-amber-200",
          subtleCardTitle: "text-amber-800",
          subtleCardText: "text-amber-700",
          navyCard: "bg-amber-50 border border-amber-200",
          navyBtn:
            "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white",
        };
      default:
        return {
          headerIcon: "text-ilaw-navy",
          headerTitle: "text-ilaw-navy",
          primaryBtn: "bg-ilaw-navy hover:bg-ilaw-navy-600 text-white",
          subtleCard: "bg-gray-50 border border-gray-200",
          subtleCardTitle: "text-gray-800",
          subtleCardText: "text-gray-700",
          navyCard: "bg-gray-50 border border-gray-200",
          navyBtn: "bg-gray-900 hover:bg-black text-white",
        };
    }
  };

  const s = getRoleStyles();

  const handleExportData = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/user/export", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      console.log("📤 Export data:", data);

      if (data.success) {
        alert("Data exported successfully! Check console for details.");
      }
    } catch (error) {
      console.error("Export error:", error);
      alert("Failed to export data");
    }
  };

  const handleLogoutAllDevices = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/user/logout-all", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      console.log("🚪 Logout all:", data);

      if (data.success) {
        alert("Logged out from all devices successfully!");
      }
    } catch (error) {
      console.error("Logout all error:", error);
      alert("Failed to logout from all devices");
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText === "DELETE") {
      try {
        const token = localStorage.getItem("token");
        const response = await fetch("/api/user/account", {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });

        const data = await response.json();

        if (data.success) {
          console.log("✅ Account deleted successfully");

          // Clear all local data
          localStorage.removeItem("token");
          localStorage.removeItem("user");

          // Redirect to home/login page
          window.location.href = "/";
        } else {
          alert("Failed to delete account: " + data.message);
        }
      } catch (error) {
        console.error("❌ Delete account error:", error);
        alert("Network error. Please try again.");
      }

      setShowDeleteConfirm(false);
    }
  };

  return (
    <motion.div
      className="p-6"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
    >
      <div className="flex items-center mb-6">
        <Trash2 className={`w-6 h-6 mr-3 ${s.headerIcon}`} />
        <h2 className={`text-xl font-semibold ${s.headerTitle}`}>Account Actions</h2>
      </div>

      <div className="space-y-6">
        {/* Export Data Section (admin gold) */}
        <motion.div
          className={`rounded-lg p-4 ${s.subtleCard}`}
          variants={fadeInUp}
          initial="hidden"
          animate="visible"
          transition={{ duration: 0.3 }}
        >
          <div className="flex items-start justify-between">
            <div>
              <h3 className={`font-heading font-bold mb-2 ${s.subtleCardTitle}`}>
                Export Your Data
              </h3>
              <p className={`text-sm mb-4 ${s.subtleCardText}`}>
                Download a copy of all your account data including profile information, activity
                history, and preferences.
              </p>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleExportData}
                className={`px-4 py-2 rounded-lg ${s.primaryBtn} inline-flex items-center`}
              >
                <Download className="w-4 h-4 mr-2" />
                Export Data
              </motion.button>
            </div>
          </div>
        </motion.div>

        {/* Logout All Devices (admin navy) */}
        <motion.div
          className={`rounded-lg p-4 ${s.navyCard}`}
          variants={fadeInUp}
          initial="hidden"
          animate="visible"
          transition={{ duration: 0.3, delay: 0.04 }}
        >
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-heading font-bold text-ilaw-navy mb-2">Security Action</h3>
              <p className="text-sm text-ilaw-navy/80 mb-4">
                Log out from all devices except this one. This will require you to sign in again on
                other devices.
              </p>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleLogoutAllDevices}
                className={`px-4 py-2 rounded-lg inline-flex items-center ${s.navyBtn}`}
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout All Devices
              </motion.button>
            </div>
          </div>
        </motion.div>

        {/* Delete Account Section (Danger Zone) */}
        <motion.div
          className="bg-red-50 border border-red-200 rounded-lg p-4"
          variants={fadeInUp}
          initial="hidden"
          animate="visible"
          transition={{ duration: 0.3, delay: 0.08 }}
        >
          <div className="flex items-start">
            <AlertTriangle className="w-5 h-5 text-red-600 mr-3 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-heading font-bold text-red-800 mb-2">Delete Account</h3>
              <p className="text-sm text-red-600 mb-4">
                Permanently delete your account and all associated data. This action cannot be
                undone.
              </p>

              <AnimatePresence initial={false}>
                {!showDeleteConfirm ? (
                  <motion.button
                    key="delete-cta"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setShowDeleteConfirm(true)}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg inline-flex items-center"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Account
                  </motion.button>
                ) : (
                  <motion.div
                    key="delete-confirm"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="space-y-4"
                  >
                    <div>
                      <p className="text-sm text-red-700 mb-2">
                        Type <span className="font-bold">DELETE</span> to confirm account deletion:
                      </p>
                      <input
                        type="text"
                        value={deleteConfirmText}
                        onChange={(e) => setDeleteConfirmText(e.target.value)}
                        className="w-full px-3 py-2 border border-red-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50"
                        placeholder="Type DELETE to confirm"
                      />
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <motion.button
                        whileHover={{ scale: deleteConfirmText === "DELETE" ? 1.02 : 1 }}
                        whileTap={{ scale: deleteConfirmText === "DELETE" ? 0.98 : 1 }}
                        onClick={handleDeleteAccount}
                        disabled={deleteConfirmText !== "DELETE"}
                        className={`px-4 py-2 rounded-lg inline-flex items-center ${
                          deleteConfirmText === "DELETE"
                            ? "bg-red-600 hover:bg-red-700 text-white"
                            : "bg-gray-300 text-gray-500 cursor-not-allowed"
                        }`}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Confirm Delete
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => {
                          setShowDeleteConfirm(false);
                          setDeleteConfirmText("");
                        }}
                        className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg"
                      >
                        Cancel
                      </motion.button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}

export default AccountActions;