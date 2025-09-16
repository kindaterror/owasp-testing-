import { useState, useEffect, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  User,
  Upload,
  Save,
  Loader,
  CheckCircle,
  AlertCircle,
  XCircle,
  Trash2,
  Shield
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type ProfileSettingsProps = {
  userRole: "admin" | "teacher" | "student";
  user: {
    id: number;
    firstName?: string;
    lastName?: string;
    email?: string;
    avatar?: string | null;
  } | null;
};

type ProfileResponse = {
  success: boolean;
  profile?: {
    id: number;
    name: string;
    email: string;
    bio: string;
    avatar: string | null;
  };
  message?: string;
};

const fadeInUp = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 }
};

export function ProfileSettings({ userRole, user }: ProfileSettingsProps) {
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    firstName: user?.firstName || "",
    lastName: user?.lastName || "",
    email: user?.email || "",
    bio: ""
  });

  const [isLoading, setIsLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);

  // Avatar states
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(user?.avatar ?? null);

  // local preview while uploading
  const previewUrl = useMemo(() => (selectedFile ? URL.createObjectURL(selectedFile) : null), [selectedFile]);
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  // Load profile on mount
  useEffect(() => {
    void loadProfileData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadProfileData = async () => {
    try {
      setIsLoadingProfile(true);
      const token = localStorage.getItem("token") || "";
      const res = await fetch("/api/user/profile", {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });
      const data: ProfileResponse = await res.json();

      if (data.success && data.profile) {
        const [firstName, ...rest] = (data.profile.name || "").split(" ");
        setFormData({
          firstName: firstName ?? "",
          lastName: rest.join(" "),
          email: data.profile.email || "",
          bio: data.profile.bio || ""
        });
        setAvatarUrl(data.profile.avatar ?? null);
      } else if (!data.success) {
        setSaveStatus("error");
        setErrorMessage(data.message || "Failed to load profile");
      }
    } catch (err) {
      console.error("Failed to load profile data:", err);
      setSaveStatus("error");
      setErrorMessage("Failed to load profile");
    } finally {
      setIsLoadingProfile(false);
    }
  };

  const allowedMimes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];

  // Select file
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!allowedMimes.includes(file.type)) {
      setSaveStatus("error");
      setErrorMessage("Please select a valid image (JPEG, PNG, GIF, or WebP).");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setSaveStatus("error");
      setErrorMessage("File size must be less than 2MB.");
      return;
    }

    setSelectedFile(file);
    void handleUpload(file);
  };

  // Upload to /api/user/avatar
  const handleUpload = async (file: File) => {
    setUploading(true);
    setSaveStatus("idle");
    setErrorMessage("");

    try {
      const token = localStorage.getItem("token") || "";
      const fd = new FormData();
      fd.append("avatar", file);

      const res = await fetch("/api/user/avatar", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: fd
      });

      const result = await res.json();

      if (!res.ok || !result?.success) {
        throw new Error(result?.message || "Upload failed");
      }

      setSaveStatus("success");
      setAvatarUrl(result.avatarUrl as string);
      setSelectedFile(null);

      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    } catch (err) {
      console.error("Upload error:", err);
      setSaveStatus("error");
      setErrorMessage("Failed to upload avatar. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  // Strong admin theme & subtle anims; other roles fall back to previous look
  const styles =
    userRole === "admin"
      ? {
          // gold on navy accents
          card:
            "border-2 border-brand-gold-200 bg-white rounded-2xl shadow-lg overflow-hidden",
          header:
            "bg-ilaw-navy text-white px-6 py-4 flex items-center justify-between",
          headline: "text-xl font-heading font-bold tracking-tight",
          sub: "text-blue-100 text-sm",
          pill:
            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-brand-gold-100 text-ilaw-navy border border-brand-gold-300 text-xs font-semibold",
          button:
            "bg-ilaw-gold hover:bg-brand-amber text-ilaw-navy font-semibold shadow-sm",
          secondaryBtn:
            "border border-gray-200 text-gray-700 hover:bg-gray-50",
          field:
            "w-full px-4 py-2 border border-brand-gold-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-ilaw-gold focus:ring-opacity-50",
          avatarRing: "ring-2 ring-ilaw-gold ring-offset-2 ring-offset-white"
        }
      : {
          card:
            "border border-gray-200 bg-white rounded-xl shadow-sm overflow-hidden",
          header: "bg-gray-50 px-6 py-4",
          headline: "text-lg font-semibold",
          sub: "text-gray-500 text-sm",
          pill: "hidden",
          button: "bg-ilaw-navy hover:bg-ilaw-navy-600 text-white",
          secondaryBtn: "border border-gray-200 text-gray-700 hover:bg-gray-50",
          field:
            "w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-ilaw-navy/40",
          avatarRing: ""
        };

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (saveStatus !== "idle") {
      setSaveStatus("idle");
      setErrorMessage("");
    }
  };

  const handleSave = async () => {
    setIsLoading(true);
    setSaveStatus("idle");
    setErrorMessage("");

    try {
      const token = localStorage.getItem("token") || "";
      const res = await fetch("/api/user/profile", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name: `${formData.firstName} ${formData.lastName}`.trim(),
          email: formData.email,
          bio: formData.bio,
          avatar: avatarUrl
        })
      });

      const data = await res.json();
      if (res.ok && data?.success) {
        setSaveStatus("success");
        queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      } else {
        setSaveStatus("error");
        setErrorMessage(data?.message || "Failed to save profile");
      }
    } catch (err) {
      console.error("Save profile error:", err);
      setSaveStatus("error");
      setErrorMessage("Network error. Please check your connection.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveAvatar = async () => {
    setIsLoading(true);
    setSaveStatus("idle");
    setErrorMessage("");
    try {
      const token = localStorage.getItem("token") || "";
      const res = await fetch("/api/user/profile", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name: `${formData.firstName} ${formData.lastName}`.trim(),
          email: formData.email,
          bio: formData.bio,
          avatar: null
        })
      });
      const data = await res.json();
      if (res.ok && data?.success) {
        setAvatarUrl(null);
        setSelectedFile(null);
        setSaveStatus("success");
        queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      } else {
        setSaveStatus("error");
        setErrorMessage(data?.message || "Failed to remove avatar");
      }
    } catch (err) {
      console.error("Remove avatar error:", err);
      setSaveStatus("error");
      setErrorMessage("Failed to remove avatar.");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoadingProfile) {
    return (
      <div className="p-6 flex items-center justify-center">
        <Loader className="w-6 h-6 animate-spin text-ilaw-navy mr-2" />
        <span className="text-ilaw-navy">Loading profile...</span>
      </div>
    );
  }

  return (
    <motion.div
      className={`p-0 ${styles.card}`}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      {/* Header / Admin banner */}
      <div className={styles.header}>
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className={`w-10 h-10 rounded-full bg-white/10 flex items-center justify-center`}>
              <Shield className="w-5 h-5 text-ilaw-gold" />
            </div>
          </div>
          <div>
            <h2 className={styles.headline}>
              {userRole === "admin" ? "Admin Profile Settings" : "Profile Settings"}
            </h2>
            <p className={styles.sub}>
              {userRole === "admin"
                ? "Manage your admin identity, avatar, and contact details."
                : "Update your profile information."}
            </p>
          </div>
        </div>

        {userRole === "admin" && (
          <span className={styles.pill}>
            <Shield className="w-3.5 h-3.5" />
            ADMIN
          </span>
        )}
      </div>

      <div className="p-6">
        {/* Status messages */}
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
              <span className="text-green-800">
                {uploading ? "Avatar uploaded successfully!" : "Profile updated successfully!"}
              </span>
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
          {/* Avatar */}
          <motion.div
            variants={fadeInUp}
            initial="hidden"
            animate="visible"
            transition={{ duration: 0.35 }}
            className="flex items-center gap-6"
          >
            <div className={`w-20 h-20 bg-brand-gold-100 rounded-full flex items-center justify-center overflow-hidden ${styles.avatarRing}`}>
              {previewUrl ? (
                <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
              ) : avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="Profile Avatar"
                  className="w-full h-full object-cover"
                  onError={() => setAvatarUrl(null)}
                />
              ) : (
                <User className="w-10 h-10 text-ilaw-navy" />
              )}
            </div>

            <div className="flex flex-col gap-2">
              <input
                type="file"
                id="avatar-upload"
                accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                className="hidden"
                onChange={handleFileSelect}
              />
              <motion.label
                whileTap={{ scale: 0.98 }}
                htmlFor="avatar-upload"
                className={`inline-flex items-center px-4 py-2 rounded-lg cursor-pointer transition-all duration-200 ${styles.button} ${uploading ? "opacity-50 cursor-not-allowed" : "hover:brightness-105"}`}
              >
                {uploading ? (
                  <>
                    <Loader className="w-4 h-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Photo
                  </>
                )}
              </motion.label>

              {avatarUrl && !uploading && (
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  type="button"
                  onClick={handleRemoveAvatar}
                  className="inline-flex items-center px-4 py-2 rounded-lg border border-red-200 text-red-700 hover:bg-red-50 transition"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Remove Photo
                </motion.button>
              )}

              <p className="text-sm text-ilaw-gray">JPG, PNG, GIF or WebP. Max size 2MB.</p>
            </div>
          </motion.div>

          {/* Form Fields */}
          <motion.div
            variants={fadeInUp}
            initial="hidden"
            animate="visible"
            transition={{ duration: 0.35, delay: 0.05 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-6"
          >
            <div>
              <label className="block text-sm font-medium text-ilaw-navy mb-2">First Name</label>
              <input
                type="text"
                value={formData.firstName}
                onChange={e => handleInputChange("firstName", e.target.value)}
                className={styles.field}
                placeholder="Enter your first name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-ilaw-navy mb-2">Last Name</label>
              <input
                type="text"
                value={formData.lastName}
                onChange={e => handleInputChange("lastName", e.target.value)}
                className={styles.field}
                placeholder="Enter your last name"
              />
            </div>
          </motion.div>

          <motion.div
            variants={fadeInUp}
            initial="hidden"
            animate="visible"
            transition={{ duration: 0.35, delay: 0.08 }}
          >
            <label className="block text-sm font-medium text-ilaw-navy mb-2">Email Address</label>
            <input
              type="email"
              value={formData.email}
              onChange={e => handleInputChange("email", e.target.value)}
              className={styles.field}
              placeholder="Enter your email address"
            />
          </motion.div>

          <motion.div
            variants={fadeInUp}
            initial="hidden"
            animate="visible"
            transition={{ duration: 0.35, delay: 0.11 }}
          >
            <label className="block text-sm font-medium text-ilaw-navy mb-2">Bio</label>
            <textarea
              value={formData.bio}
              onChange={e => handleInputChange("bio", e.target.value)}
              rows={4}
              className={`${styles.field} resize-none`}
              placeholder="Tell us about yourself..."
            />
          </motion.div>

          <motion.div
            variants={fadeInUp}
            initial="hidden"
            animate="visible"
            transition={{ duration: 0.35, delay: 0.14 }}
            className="flex gap-3"
          >
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={handleSave}
              disabled={isLoading || uploading}
              className={`px-6 py-3 rounded-lg ${styles.button} flex items-center justify-center min-w-[140px] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200`}
            >
              {isLoading ? (
                <>
                  <Loader className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </>
              )}
            </motion.button>

            {saveStatus !== "idle" && (
              <motion.button
                whileTap={{ scale: 0.98 }}
                type="button"
                onClick={() => {
                  setSaveStatus("idle");
                  setErrorMessage("");
                }}
                className={`px-4 py-3 rounded-lg flex items-center ${styles.secondaryBtn}`}
              >
                <XCircle className="w-4 h-4 mr-2" />
                Dismiss
              </motion.button>
            )}
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}

export default ProfileSettings;