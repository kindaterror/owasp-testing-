import express, { type Express, type Request, type Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import * as schema from "@shared/schema";
import { ZodError } from "zod";
import { eq, and, desc, asc, or, like, inArray, isNull, isNotNull } from "drizzle-orm";
import { db } from "@db";
import { sendVerificationEmail, sendPasswordResetEmail, sendWelcomeEmail } from "@/pages/api/emailService";
import crypto from "crypto";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import uploadHandler from "@/pages/api/upload";
import cors from "cors";

// -----------------------------------------------------------------------------
// JWT Secret
// -----------------------------------------------------------------------------
const JWT_SECRET =
  process.env.JWT_SECRET ||
  (() => {
    console.warn("⚠️  JWT_SECRET not found in environment variables. Using development fallback.");
    console.warn("⚠️  For production, please set a secure JWT_SECRET in your environment.");
    return "ilaw_ng_bayan_dev_secret_key_2024";
  })();

if (JWT_SECRET.length < 32) {
  console.warn("⚠️  JWT_SECRET is too short. Consider using a longer, more secure key.");
}

const FRONTEND_ORIGIN = String(process.env.FRONTEND_URL || "https://schoolsomething.onrender.com").replace(/\/+$/, "");
const corsOptions: cors.CorsOptions = {
  origin: FRONTEND_ORIGIN,           // exact origin, never "*"
  credentials: true,                 // OK even if client omits cookies; safe to keep
  methods: ["GET","POST","PUT","PATCH","DELETE","OPTIONS"],
  allowedHeaders: ["Content-Type","Authorization"],
  optionsSuccessStatus: 204,
};

// -----------------------------------------------------------------------------
// Cloudinary
// -----------------------------------------------------------------------------
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

console.log("☁️  Cloudinary configured for:", process.env.CLOUDINARY_CLOUD_NAME);

// Avatar storage (images only)
const avatarStorage = new CloudinaryStorage({
  cloudinary,
  params: async () => ({
    folder: "ilaw-ng-bayan/avatars",
    allowed_formats: ["jpg", "jpeg", "png", "gif", "webp"],
    transformation: [{ width: 200, height: 200, crop: "fill", quality: "auto" }],
    public_id: `avatar-${Date.now()}-${Math.round(Math.random() * 1e9)}`,
  }),
});

const uploadAvatar = multer({
  storage: avatarStorage,
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => {
    const allowedMimes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];
    if (allowedMimes.includes(file.mimetype)) return cb(null, true);
    cb(new Error("Only image files (JPEG, PNG, GIF, WebP) are allowed"));
  },
});

// -----------------------------------------------------------------------------
// Auth helpers
// -----------------------------------------------------------------------------
const authenticate = (req: Request, res: Response, next: Function) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      message: "Authentication required. Please provide a valid Bearer token.",
    });
  }
  const token = authHeader.split(" ")[1];
  if (!token) {
    return res.status(401).json({ success: false, message: "Authentication token is missing." });
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    (req as any).user = decoded;
    next();
  } catch (error) {
    let message = "Invalid or expired token";
    if (error instanceof jwt.TokenExpiredError) message = "Token has expired. Please log in again.";
    else if (error instanceof jwt.JsonWebTokenError) message = "Invalid token format.";
    return res.status(401).json({ success: false, message });
  }
};

const authorize = (roles: string[]) => {
  return (req: Request, res: Response, next: Function) => {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ success: false, message: "Authentication required" });
    if (!roles.includes(user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required role: ${roles.join(" or ")}`,
      });
    }
    next();
  };
};

const requireAdmin = (req: any, res: any, next: any) => {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ success: false, message: "Admin access required" });
  }
  next();
};

let maintenanceMode = false;

function isStrongPassword(password: string): boolean {
  const strongRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
  return strongRegex.test(password);
}

export async function approveStudent(studentId: number) {
  const [row] = await db
    .update(schema.users)
    .set({
      approvalStatus: "approved",
      rejectionReason: null, // clear any previous rejection note
    })
    .where(and(
      eq(schema.users.id, studentId),
      eq(schema.users.role, "student"),
    ))
    .returning();
  return row;
}

// routes.ts (near the top with other helpers)
const normalizeSubjects = (arr: unknown): string[] => {
  if (!Array.isArray(arr)) return [];
  return arr
    .map((x) => (typeof x === "string" ? x.trim() : ""))
    .filter((x) => x.length > 0)
    .map((s) => (/^storybooks?$/i.test(s) ? "Storybook" : s));
};

// ✅ add near your other helpers
const isStorybookSubject = (s?: string) => !!s && /^storybook(s)?$/i.test(s.trim());
 
// -----------------------------------------------------------------------------
// Routes
// -----------------------------------------------------------------------------
export function setupRoutes(app: Express): Server {
  // NOTE: do NOT serve local /uploads here since we’re using Cloudinary now.
  app.use(cors(corsOptions));                   // applies to all routes and preflight
  app.options("*", cors(corsOptions));          // optional, harmless if kept

  // =========================
  // Profile
  // =========================
  app.get("/api/user/profile", authenticate, async (req, res) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) return res.status(401).json({ success: false, message: "User not authenticated" });

      const user = await db.query.users.findFirst({
        where: eq(schema.users.id, userId),
        columns: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          username: true,
          avatar: true,
        },
      });

      if (!user) return res.status(404).json({ success: false, message: "User not found" });

      return res.json({
        success: true,
        profile: {
          id: user.id,
          name: `${user.firstName} ${user.lastName}`.trim(),
          email: user.email,
          bio: "",
          location: "",
          phone: "",
          dateOfBirth: null,
          avatar: user.avatar || null,
        },
      });
    } catch (error) {
      console.error("Get profile error:", error);
      return res.status(500).json({ success: false, message: "Failed to load profile" });
    }
  });

  app.put("/api/user/profile", authenticate, async (req, res) => {
    try {
      const { name, email, bio, location, phone, avatar } = req.body;
      const userId = (req as any).user?.id;
      if (!userId) return res.status(401).json({ success: false, message: "User not authenticated" });
      if (!name || !email)
        return res.status(400).json({ success: false, message: "Name and email are required" });

      // check email clash (other user)
      const existingUser = await db.query.users.findFirst({
        where: and(eq(schema.users.email, email), eq(schema.users.id, userId)),
      });
      if (existingUser && existingUser.id !== userId) {
        return res.status(400).json({ success: false, message: "Email is already in use by another user" });
      }

      const updateData: any = {
        firstName: name.split(" ")[0] || name,
        lastName: name.split(" ").slice(1).join(" ") || "",
        email,
      };
      if (avatar !== undefined) updateData.avatar = avatar;

      const [updatedUser] = await db
        .update(schema.users)
        .set(updateData)
        .where(eq(schema.users.id, userId))
        .returning({
          id: schema.users.id,
          firstName: schema.users.firstName,
          lastName: schema.users.lastName,
          email: schema.users.email,
          username: schema.users.username,
          avatar: schema.users.avatar,
        });

      await new Promise((r) => setTimeout(r, 800));

      return res.json({
        success: true,
        message: "Profile updated successfully",
        user: {
          id: updatedUser.id,
          name: `${updatedUser.firstName} ${updatedUser.lastName}`.trim(),
          email: updatedUser.email,
          bio: bio || "",
          location: location || "",
          phone: phone || "",
          avatar: updatedUser.avatar || null,
        },
      });
    } catch (error) {
      console.error("Profile update error:", error);
      return res.status(500).json({ success: false, message: "Failed to update profile. Please try again." });
    }
  });

  // Avatar upload -> Cloudinary
  app.post("/api/user/avatar", authenticate, uploadAvatar.single("avatar"), async (req: any, res) => {
    try {
      const userId = req.user?.id;
      if (!req.file) return res.status(400).json({ success: false, message: "No file uploaded" });

      // Cloudinary URL is in req.file.path
      const avatarUrl = req.file.path as string;

      await db.update(schema.users).set({ avatar: avatarUrl }).where(eq(schema.users.id, userId));
      return res.json({
        success: true,
        message: "Avatar uploaded successfully to Cloudinary",
        avatarUrl,
      });
    } catch (error) {
      console.error("❌ Avatar upload error:", error);
      return res.status(500).json({ success: false, message: "Failed to upload avatar to cloud storage" });
    }
  });
   
app.post("/api/upload", authenticate, (req, res) => {
  // 🔐 Optional: uncomment if you want only teachers/admins to upload
  // if (!["admin", "teacher"].includes((req as any).user?.role)) {
  //   return res.status(403).json({ success: false, error: "Forbidden" });
  // }

  // Delegate to upload.ts handler (busboy + Cloudinary logic)
  return (uploadHandler as any)(req, res);
});

  // =========================
  // Password / Security
  // =========================
  app.put("/api/user/password", authenticate, async (req, res) => {
    try {
      const userId = (req as any).user?.id;
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword)
        return res.status(400).json({ success: false, message: "Current password and new password are required" });

      if (newPassword.length < 6)
        return res.status(400).json({ success: false, message: "New password must be at least 6 characters long" });

      const user = await db.query.users.findFirst({ where: eq(schema.users.id, userId) });
      if (!user) return res.status(404).json({ success: false, message: "User not found" });

      const validPassword = await bcrypt.compare(currentPassword, user.password);
      if (!validPassword) return res.status(400).json({ success: false, message: "Current password is incorrect" });

      const hashedNewPassword = await bcrypt.hash(newPassword, 10);
      await db.update(schema.users).set({ password: hashedNewPassword }).where(eq(schema.users.id, userId));

      res.json({ success: true, message: "Password changed successfully" });
    } catch (error) {
      console.error("Change password error:", error);
      res.status(500).json({ success: false, message: "Failed to change password" });
    }
  });

  // =========================
  // Learning / Teaching Prefs
  // =========================
  app.get("/api/user/learning-preferences", authenticate, async (req, res) => {
    try {
      res.json({
        success: true,
        preferences: {
          readingSpeed: "normal",
          visualStyle: "colorful",
          fontSize: "medium",
          darkMode: false,
        },
      });
    } catch (error) {
      console.error("Get learning preferences error:", error);
      res.status(500).json({ success: false, message: "Failed to fetch learning preferences" });
    }
  });

  app.put("/api/user/learning-preferences", authenticate, async (req, res) => {
    try {
      await new Promise((r) => setTimeout(r, 1000));
      res.json({ success: true, message: "Learning preferences saved successfully" });
    } catch (error) {
      console.error("Update learning preferences error:", error);
      res.status(500).json({ success: false, message: "Failed to save learning preferences" });
    }
  });

// --- helpers (place near other route helpers) ---
const toCanonicalGrade = (g: string): string => {
  const v = String(g || "").trim();
  if (!v) return v;
  // Kinder / Kindergarten → "K"
  if (/^k(in(der(garten)?)?)?$/i.test(v) || /^kinder$/i.test(v)) return "K";
  // "Grade 1" → "1", "grade 6" → "6"
  const m = v.match(/\d+/);
  if (m) return m[0]; // ✅ FIXED: was m[1], should be m[0]
  // Already canonical? allow "K" or plain "1".."12"
  if (/^(K|[0-9]{1,2})$/i.test(v)) return v.toUpperCase();
  return v; // fallback
};


const toLabelGrade = (canon: string): string => {
  if (!canon) return canon;
  if (canon.toUpperCase() === "K") return "Kinder";
  if (/^[0-9]{1,2}$/.test(canon)) return `Grade ${canon}`;
  // If someone previously stored "Grade 3", pass it through for backward compatibility
  if (/^grade\s*\d+$/i.test(canon)) return canon.replace(/^grade\s*/i, (m) => m[0].toUpperCase() + m.slice(1));
  return canon;
};

const uniq = <T,>(arr: T[]) => Array.from(new Set(arr));

// =========================
// Teaching settings
// =========================
app.get("/api/user/teaching-settings", authenticate, async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    const userRole = (req as any).user?.role;
    if (userRole !== "teacher" && userRole !== "admin") {
      return res.status(403).json({ success: false, message: "Only teachers can access teaching settings" });
    }

    const existing = await db
      .select()
      .from(schema.teachingSettings)
      .where(eq(schema.teachingSettings.userId, userId))
      .limit(1);

    const settings = existing[0] || {
      preferredGrades: ["Grade 5"],
      subjects: ["Storybook"], // ✅ default includes Storybook
      maxClassSize: 30,
    };

    const preferredGrades = Array.isArray(settings.preferredGrades)
      ? settings.preferredGrades.filter((x: any) => typeof x === "string" && x.trim() !== "")
      : [];

    // ✅ normalize subjects (Storybook variations -> "Storybook")
    const subjects = normalizeSubjects(settings.subjects);

    res.json({
      success: true,
      settings: {
        preferredGrades,
        subjects,
        maxClassSize: typeof settings.maxClassSize === "number" ? settings.maxClassSize : 30,
      },
    });
  } catch (error) {
    console.error("Get teaching settings error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch teaching settings" });
  }
});

app.put("/api/user/teaching-settings", authenticate, async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    const userRole = (req as any).user?.role;
    if (userRole !== "teacher" && userRole !== "admin") {
      return res.status(403).json({ success: false, message: "Only teachers can update teaching settings" });
    }

    const payload = {
      preferredGrades: Array.isArray(req.body?.preferredGrades)
        ? req.body.preferredGrades.filter((x: any) => typeof x === "string" && x.trim() !== "")
        : [],
      // ✅ normalize subjects so “Storybooks” etc. -> “Storybook”
      subjects: normalizeSubjects(req.body?.subjects),
      maxClassSize: Number.isFinite(Number(req.body?.maxClassSize))
        ? Number(req.body.maxClassSize)
        : 30,
    };

    const validatedData = schema.updateTeachingSettingsSchema.parse(payload);

    const existing = await db
      .select()
      .from(schema.teachingSettings)
      .where(eq(schema.teachingSettings.userId, userId))
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(schema.teachingSettings)
        .set({ ...validatedData, updatedAt: new Date() })
        .where(eq(schema.teachingSettings.userId, userId));
    } else {
      await db.insert(schema.teachingSettings).values({
        userId,
        preferredGrades: validatedData.preferredGrades || [],
        subjects: validatedData.subjects || [],
        maxClassSize: validatedData.maxClassSize || 30,
      });
    }

    res.json({ success: true, message: "Teaching settings saved successfully" });
  } catch (error) {
    console.error("Update teaching settings error:", error);
    res.status(500).json({ success: false, message: "Failed to save teaching settings" });
  }
});


  // =========================
  // System settings (Admin)
  // =========================
  app.get("/api/admin/system-settings", authenticate, requireAdmin, async (req, res) => {
    try {
      let settings = await db.query.systemSettings.findFirst();
      if (!settings) {
        const [newSettings] = await db
          .insert(schema.systemSettings)
          .values({
            allowNewRegistrations: true,
            requireEmailVerification: false,
            autoApproveTeachers: false,
            autoApproveStudents: false,
          })
          .returning();
        settings = newSettings;
      }

      res.json({
        success: true,
        settings: {
          maintenanceMode,
          allowNewRegistrations: settings.allowNewRegistrations,
          requireEmailVerification: settings.requireEmailVerification,
          autoApproveTeachers: settings.autoApproveTeachers,
          autoApproveStudents: settings.autoApproveStudents,
          sessionTimeoutMinutes: settings.sessionTimeoutMinutes ?? 60,
          maxLoginAttempts: settings.maxLoginAttempts ?? 5,
          requireStrongPasswords: settings.requireStrongPasswords ?? false,
        },
      });
    } catch (error) {
      console.error("Get system settings error:", error);
      res.status(500).json({ success: false, message: "Failed to fetch system settings" });
    }
  });

  app.put("/api/admin/system-settings", authenticate, requireAdmin, async (req, res) => {
    try {
      const {
        maintenanceMode: newMaintenanceMode,
        allowNewRegistrations,
        requireEmailVerification,
        autoApproveTeachers,
        autoApproveStudents,
        sessionTimeoutMinutes,
        maxLoginAttempts,
        requireStrongPasswords,
      } = req.body;

      maintenanceMode = newMaintenanceMode;

      if (sessionTimeoutMinutes < 1 || sessionTimeoutMinutes > 480) {
        return res
          .status(400)
          .json({ success: false, message: "Session timeout must be between 15 and 480 minutes" });
      }
      if (maxLoginAttempts < 3 || maxLoginAttempts > 10) {
        return res.status(400).json({ success: false, message: "Max login attempts must be between 3 and 10" });
      }

      const settingsToSave = {
        allowNewRegistrations: allowNewRegistrations ?? true,
        requireEmailVerification: requireEmailVerification ?? false,
        autoApproveTeachers: autoApproveTeachers ?? false,
        autoApproveStudents: autoApproveStudents ?? false,
        sessionTimeoutMinutes: sessionTimeoutMinutes ?? 60,
        maxLoginAttempts: maxLoginAttempts ?? 5,
        requireStrongPasswords: requireStrongPasswords ?? false,
      };

      const validated = schema.updateSystemSettingsSchema.parse(settingsToSave);

      let existing = await db.query.systemSettings.findFirst();
      if (existing) {
        await db
          .update(schema.systemSettings)
          .set({ ...validated, updatedAt: new Date() })
          .where(eq(schema.systemSettings.id, existing.id))
          .returning();
      } else {
        await db.insert(schema.systemSettings).values(validated).returning();
      }

      res.json({ success: true, message: "System settings saved successfully" });
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ success: false, message: "Validation error", errors: error.errors });
      }
      console.error("Update system settings error:", error);
      res.status(500).json({ success: false, message: "Failed to save system settings" });
    }
  });

// Account Actions API endpoints
app.get('/api/user/export', authenticate, async (req, res) => {
try {
const userId = (req as any).user?.id;
const userEmail = (req as any).user?.email;

console.log('📤 Data export request for:', userEmail);

const userData = {
profile: {
email: userEmail,
exportDate: new Date().toISOString(),
accountCreated: '2024-01-01'
},
settings: {
preferences: 'User preferences data...',
security: 'Security settings...'
},
activity: {
loginHistory: 'Recent login activity...',
actions: 'User actions history...'
}
};

res.json({
success: true,
data: userData,
message: 'Data export completed'
});

} catch (error) {
console.error('Export data error:', error);
res.status(500).json({
success: false,
message: 'Failed to export data'
});
}
});

// Logout all devices
app.post('/api/user/logout-all', authenticate, async (req, res) => {
try {
const userId = (req as any).user?.id;
const userEmail = (req as any).user?.email;

console.log('🚪 Logout all devices for:', userEmail);

res.json({
success: true,
message: 'Logged out from all devices successfully'
});

} catch (error) {
console.error('Logout all error:', error);
res.status(500).json({
success: false,
message: 'Failed to logout from all devices'
});
}
});

// Delete account
app.delete('/api/user/account', authenticate, async (req, res) => {
try {
const userId = (req as any).user?.id;
const userEmail = (req as any).user?.email;

console.log('🗑️ Account deletion request for:', userEmail);

// Delete user progress
await db.delete(schema.progress)
.where(eq(schema.progress.userId, userId));

// Delete reading sessions
await db.delete(schema.readingSessions)
.where(eq(schema.readingSessions.userId, userId));

// Delete user account
await db.delete(schema.users)
.where(eq(schema.users.id, userId));

res.json({
success: true,
message: 'Account deleted successfully'
});

} catch (error) {
console.error('Delete account error:', error);
res.status(500).json({
success: false,
message: 'Failed to delete account'
});
}
});

  app.get("/api/system/maintenance-status", async (req, res) => {
    try {
      res.json({ success: true, maintenanceMode });
    } catch (error) {
      console.error("Get maintenance status error:", error);
      res.status(500).json({ success: false, message: "Failed to get maintenance status" });
    }
  });

  // =========================
  // Stats
  // =========================
  const statsHandler = async (req: Request, res: Response) => {
    if (req.method !== "GET") return res.status(405).json({ message: "Method not allowed" });
    try {
      const allSessions = await db
        .select()
        .from(schema.readingSessions)
        .where(isNotNull(schema.readingSessions.endTime));

      const completedSessions = allSessions.filter((s) => s.totalMinutes && s.totalMinutes > 0);
      const avgReadingTime =
        completedSessions.length > 0
          ? Math.round(completedSessions.reduce((sum, s) => sum + (s.totalMinutes || 0), 0) / completedSessions.length)
          : 25;

      const allProgress = await db
        .select({
          id: schema.progress.id,
          userId: schema.progress.userId,
          bookId: schema.progress.bookId,
          percentComplete: schema.progress.percentComplete,
          userFirstName: schema.users.firstName,
          userLastName: schema.users.lastName,
          userRole: schema.users.role,
          userApprovalStatus: schema.users.approvalStatus,
          bookTitle: schema.books.title,
        })
        .from(schema.progress)
        .leftJoin(schema.users, eq(schema.progress.userId, schema.users.id))
        .leftJoin(schema.books, eq(schema.progress.bookId, schema.books.id));

      const approvedStudentProgress = allProgress.filter(
        (p) => p.userRole === "student" && p.userApprovalStatus === "approved"
      );
      const completedBooks = approvedStudentProgress.filter((p) => (p.percentComplete || 0) >= 100);

      const approvedUserIds = approvedStudentProgress.map((p) => p.userId);
      const completedApprovedUserIds = completedBooks.map((p) => p.userId);
      const uniqueApprovedUsers = Array.from(new Set(approvedUserIds));
      const approvedUsersWithCompletedBooks = Array.from(new Set(completedApprovedUserIds));

      const userBasedCompletionRate =
        uniqueApprovedUsers.length > 0
          ? Math.round((approvedUsersWithCompletedBooks.length / uniqueApprovedUsers.length) * 100)
          : 0;

      const bookCompletionRate =
        approvedStudentProgress.length > 0
          ? Math.round((completedBooks.length / approvedStudentProgress.length) * 100)
          : 0;

      const stats = {
        avgReadingTime,
        completionRate: bookCompletionRate,
        totalSessions: allSessions.length,
        totalReadingMinutes: completedSessions.reduce((sum, s) => sum + (s.totalMinutes || 0), 0),
        debug: {
          totalProgressRecords: allProgress.length,
          approvedStudentProgressRecords: approvedStudentProgress.length,
          completedBooksCount: completedBooks.length,
          uniqueApprovedUsers: uniqueApprovedUsers.length,
          approvedUsersWithCompletedBooks: approvedUsersWithCompletedBooks.length,
          userBasedCompletionRate,
          bookBasedCompletionRate: bookCompletionRate,
        },
      };

      return res.status(200).json({ success: true, stats });
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      return res.status(500).json({ success: false, message: "Internal server error" });
    }
  };

  app.get("/api/stats", authenticate, authorize(["admin", "teacher"]), statsHandler);

  // =========================
  // Email verification + Password reset (email-token flows)
  // =========================
  app.get("/api/auth/verify-email", async (req, res) => {
    try {
      const { token } = req.query;
      if (!token) return res.status(400).json({ message: "Verification token is required" });

      const user = await db.query.users.findFirst({
        where: eq(schema.users.emailVerificationToken, token as string),
      });
      if (!user) return res.status(400).json({ message: "Invalid or expired verification token" });
      if (user.emailVerified) return res.status(400).json({ message: "Email already verified" });

      await db
        .update(schema.users)
        .set({ emailVerified: true, emailVerificationToken: null })
        .where(eq(schema.users.id, user.id));

      try {
        await sendWelcomeEmail(user.email, user.firstName || user.username || "User", String(user.role || "student"));
      } catch (emailError) {
        console.error("Failed to send welcome email:", emailError);
      }

      return res.status(200).json({ message: "Email verified successfully" });
    } catch (error) {
      console.error("Error verifying email:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/auth/resend-verification", async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) return res.status(400).json({ message: "Email is required" });

      const user = await db.query.users.findFirst({ where: eq(schema.users.email, email) });
      if (!user) return res.status(404).json({ message: "User not found" });
      if (user.emailVerified) return res.status(400).json({ message: "Email already verified" });

      const verificationToken = crypto.randomBytes(32).toString("hex");
      await db
        .update(schema.users)
        .set({ emailVerificationToken: verificationToken })
        .where(eq(schema.users.id, user.id));

      await sendVerificationEmail(user.email, verificationToken, user.firstName || user.username);
      return res.status(200).json({ message: "Verification email sent" });
    } catch (error) {
      console.error("Error resending verification:", error);
      return res.status(500).json({ message: "Failed to send verification email" });
    }
  });

  app.post("/api/auth/forgot-password", async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) return res.status(400).json({ message: "Email is required" });

      const user = await db.query.users.findFirst({ where: eq(schema.users.email, email) });
      if (!user) {
        return res.status(200).json({ message: "If the email exists, a reset link has been sent" });
      }

      const resetToken = crypto.randomBytes(32).toString("hex");
      const resetTokenExpiry = new Date(Date.now() + 15 * 60 * 1000);

      await db
        .update(schema.users)
        .set({ passwordResetToken: resetToken, passwordResetExpires: resetTokenExpiry })
        .where(eq(schema.users.id, user.id));

      await sendPasswordResetEmail(user.email, resetToken, user.firstName || user.username || "User");
      return res.status(200).json({ message: "If the email exists, a reset link has been sent" });
    } catch (error) {
      console.error("Error sending password reset:", error);
      return res.status(500).json({ message: "Failed to send reset email" });
    }
  });

  app.post("/api/auth/reset-password", async (req, res) => {
    try {
      const { token, newPassword } = req.body;
      if (!token || !newPassword) return res.status(400).json({ message: "Token and new password are required" });

      const user = await db.query.users.findFirst({
        where: and(eq(schema.users.passwordResetToken, token)),
      });
      if (!user || !user.passwordResetExpires) {
        return res.status(400).json({ message: "Invalid or expired reset token" });
      }
      if (new Date() > user.passwordResetExpires) {
        return res.status(400).json({ message: "Reset token has expired" });
      }

      const systemSettings = await db.query.systemSettings.findFirst();
      if (systemSettings?.requireStrongPasswords && !isStrongPassword(newPassword)) {
        return res.status(400).json({
          message:
            "New password does not meet strong password requirements. It must include at least 8 characters, one uppercase letter, one lowercase letter, one number, and one special character.",
        });
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await db
        .update(schema.users)
        .set({ password: hashedPassword, passwordResetToken: null, passwordResetExpires: null })
        .where(eq(schema.users.id, user.id));

      return res.status(200).json({ message: "Password reset successfully" });
    } catch (error) {
      console.error("Error resetting password:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // =========================
  // Registration / Login
  // =========================
  app.post("/api/auth/register", async (req, res) => {
    try {
      if (!req.body || Object.keys(req.body).length === 0) {
        return res.status(400).json({ message: "Request body is required" });
      }

      let systemSettings = await db.query.systemSettings.findFirst();
      if (!systemSettings) {
        const [newSettings] = await db
          .insert(schema.systemSettings)
          .values({
            allowNewRegistrations: true,
            requireEmailVerification: false,
            autoApproveTeachers: false,
            autoApproveStudents: false,
            requireStrongPasswords: true,
          })
          .returning();
        systemSettings = newSettings;
      }

      if (!systemSettings.allowNewRegistrations) {
        return res.status(403).json({
          success: false,
          message: "New registrations are currently disabled by the administrator.",
        });
      }

      const userData = schema.insertUserSchema.parse(req.body);
      if (systemSettings.requireStrongPasswords && !isStrongPassword(userData.password)) {
        return res.status(400).json({
          success: false,
          message:
            "Password does not meet strength requirements. It must be at least 8 characters long, contain uppercase and lowercase letters, a number, and a special character.",
        });
      }

      const existingUser = await db.query.users.findFirst({
        where: or(eq(schema.users.email, userData.email), eq(schema.users.username, userData.username)),
      });
      if (existingUser) {
        return res.status(400).json({ success: false, message: "Email or username already in use" });
      }

      const hashedPassword = await bcrypt.hash(userData.password, 10);
      const verificationToken = crypto.randomBytes(32).toString("hex");

      let approvalStatus: "pending" | "approved" = "pending";
      if (userData.role === "teacher" && systemSettings.autoApproveTeachers) approvalStatus = "approved";
      else if (userData.role === "student" && systemSettings.autoApproveStudents) approvalStatus = "approved";

      const [newUser] = await db
        .insert(schema.users)
        .values({
          ...userData,
          password: hashedPassword,
          emailVerified: false,
          emailVerificationToken: verificationToken,
          approvalStatus,
        })
        .returning({
          id: schema.users.id,
          username: schema.users.username,
          email: schema.users.email,
          firstName: schema.users.firstName,
          lastName: schema.users.lastName,
          role: schema.users.role,
          gradeLevel: schema.users.gradeLevel,
          emailVerified: schema.users.emailVerified,
          approvalStatus: schema.users.approvalStatus,
        });

      try {
        await sendVerificationEmail(
          newUser.email,
          verificationToken,
          newUser.firstName || newUser.username || "User"
        );
      } catch (emailError) {
        console.error("Failed to send verification email:", emailError);
      }

      let token: string | null = null;
      if (approvalStatus === "approved") {
        token = jwt.sign({ id: newUser.id, role: newUser.role }, JWT_SECRET, { expiresIn: "24h" });
      }

      return res.status(201).json({
        success: true,
        message:
          approvalStatus === "approved"
            ? "Registration successful! Please check your email for verification, then you can access the platform."
            : "Registration successful! Your account is pending approval. Please check your email for verification.",
        user: newUser,
        token,
        emailSent: true,
        requiresApproval: approvalStatus === "pending",
      });
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ success: false, message: "Validation error", errors: error.errors });
      }
      console.error("Error registering user:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error during registration",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

// Immediately after this definition, a mount log is emitted so deploy logs confirm it exists.
app.post("/api/auth/login", async (req, res) => {
  try {
    // Ensure system settings exist
    let systemSettings = await db.query.systemSettings.findFirst();
    if (!systemSettings) {
      const [newSettings] = await db
        .insert(schema.systemSettings)
        .values({
          allowNewRegistrations: true,
          requireEmailVerification: false,
          autoApproveTeachers: false,
          autoApproveStudents: false,
          maxLoginAttempts: 5,
          sessionTimeoutMinutes: 60,
          requireStrongPasswords: true,
        })
        .returning();
      systemSettings = newSettings;
    }

    // Validate payload
    const loginData = schema.loginSchema.parse(req.body);

    // Look up user by email
    const user = await db.query.users.findFirst({
      where: eq(schema.users.email, loginData.email),
    });
    if (!user) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid email or password" });
    }

    // Throttle by attempts
    const MAX_LOGIN_ATTEMPTS = systemSettings.maxLoginAttempts ?? 5;
    const COOLDOWN_MINUTES = 15;
    if ((user.loginAttempts ?? 0) >= MAX_LOGIN_ATTEMPTS) {
      const lastAttemptTime = user.lastFailedLoginAt
        ? new Date(user.lastFailedLoginAt).getTime()
        : 0;
      const cooldown = COOLDOWN_MINUTES * 60 * 1000;
      if (Date.now() - lastAttemptTime < cooldown) {
        return res.status(403).json({
          success: false,
          message: `Too many failed login attempts. Please try again after ${COOLDOWN_MINUTES} minutes.`,
        });
      } else {
        await db
          .update(schema.users)
          .set({ loginAttempts: 0 })
          .where(eq(schema.users.id, user.id));
      }
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(
      loginData.password,
      user.password
    );
    if (!isPasswordValid) {
      await db
        .update(schema.users)
        .set({
          loginAttempts: (user.loginAttempts || 0) + 1,
          lastFailedLoginAt: new Date(),
        })
        .where(eq(schema.users.id, user.id));
      return res
        .status(400)
        .json({ success: false, message: "Invalid email or password" });
    }

    // Email verification requirement
    if (systemSettings.requireEmailVerification && !user.emailVerified) {
      return res.status(403).json({
        success: false,
        message:
          "Email verification is required. Please verify your email before logging in.",
        emailVerificationRequired: true,
      });
    }

    // Approval requirement
    if (user.approvalStatus !== "approved") {
      if (user.approvalStatus === "pending") {
        const roleMessage =
          user.role === "student"
            ? "Your account is pending approval from an administrator. Please check back later."
            : user.role === "teacher"
            ? "Your teacher account is pending approval from an administrator. Please check back later."
            : "Your account is pending approval from an administrator. Please check back later.";
        return res.status(403).json({ success: false, message: roleMessage });
      } else if (user.approvalStatus === "rejected") {
        const roleMessage =
          user.role === "student"
            ? "Your account application has been rejected."
            : user.role === "teacher"
            ? "Your teacher account application has been rejected."
            : "Your account application has been rejected.";
        return res.status(403).json({
          success: false,
          message: roleMessage,
          reason: user.rejectionReason || "No reason provided.",
        });
      }
    }

    // Reset attempts on success
    await db
      .update(schema.users)
      .set({ loginAttempts: 0, lastFailedLoginAt: new Date(0) })
      .where(eq(schema.users.id, user.id));

    // Token lifetime by role
    const sessionTimeout =
      user.role === "admin"
        ? "7d"
        : `${systemSettings.sessionTimeoutMinutes ?? 60}m`;

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: sessionTimeout } as jwt.SignOptions
    );

    return res.status(200).json({
      success: true,
      message: "Login successful",
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        gradeLevel: user.gradeLevel,
        approvalStatus: user.approvalStatus,
        emailVerified: user.emailVerified,
      },
      token,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return res
        .status(400)
        .json({ success: false, message: "Validation error", errors: error.errors });
    }
    console.error("Error logging in:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
});

// Emit a one-time mount log so production logs prove this handler is active
console.log("Mounted POST /api/auth/login");

app.get("/api/auth/user", authenticate, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const user = await db.query.users.findFirst({
      where: eq(schema.users.id, userId),
      columns: {
        id: true,
        username: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        gradeLevel: true,
        createdAt: true,
        avatar: true, // ✅ add this
      },
    });
    if (!user) return res.status(404).json({ message: "User not found" });
    return res.status(200).json({ user });
  } catch (error) {
    console.error("Error fetching user:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

  // =========================
  // Books
  // =========================
  app.get("/api/books", authenticate, authorize(["admin", "teacher", "student"]), async (req, res) => {
    try {
      const type = req.query.type as string;
      const search = req.query.search as string;
      const grade = req.query.grade as string;
      const subject = req.query.subject as string;

      let query = db.select().from(schema.books);
      const conditions: any[] = [];

      if (type && type !== "all") conditions.push(eq(schema.books.type, type as any));
      if (grade && grade !== "all") conditions.push(eq(schema.books.grade, grade));
      if (subject && subject !== "all") conditions.push(eq(schema.books.subject, subject));
      if (search) {
        conditions.push(
          or(
            like(schema.books.title, `%${search}%`),
            like(schema.books.description, `%${search}%`),
            like(schema.books.subject, `%${search}%`)
          )
        );
      }
      if (conditions.length > 0) query = (query.where(and(...conditions)) as typeof query) || query;

      const books = await query.orderBy(desc(schema.books.createdAt));
      return res.status(200).json({ books });
    } catch (error) {
      console.error("Error fetching books:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/books/:id", authenticate, authorize(["admin", "teacher", "student"]), async (req, res) => {
    try {
      const bookId = parseInt(req.params.id);
      const book = await db.query.books.findFirst({
        where: eq(schema.books.id, bookId),
        with: { chapters: { orderBy: asc(schema.chapters.orderIndex) } },
      });
      if (!book) return res.status(404).json({ message: "Book not found" });
      return res.status(200).json({ book });
    } catch (error) {
      console.error("Error fetching book:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/books/:id", authenticate, authorize(["admin", "teacher"]), async (req, res) => {
    try {
      const bookId = parseInt(req.params.id);
      const book = await db.query.books.findFirst({ where: eq(schema.books.id, bookId) });
      if (!book) return res.status(404).json({ message: "Book not found" });

      const pages = await db.query.pages.findMany({
        where: eq(schema.pages.bookId, bookId),
        with: { questions: true },
      });

      await db.transaction(async (tx) => {
        await tx.delete(schema.readingSessions).where(eq(schema.readingSessions.bookId, bookId));
        for (const page of pages) {
          if (page.questions?.length) {
            await tx.delete(schema.questions).where(inArray(schema.questions.id, page.questions.map((q) => q.id)));
          }
        }
        if (pages.length) await tx.delete(schema.pages).where(eq(schema.pages.bookId, bookId));
        await tx.delete(schema.progress).where(eq(schema.progress.bookId, bookId));
        await tx.delete(schema.books).where(eq(schema.books.id, bookId));
      });

      return res.status(200).json({ message: "Book deleted successfully", id: bookId });
    } catch (error) {
      console.error("Error deleting book:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/books/:id", authenticate, authorize(["admin", "teacher"]), async (req, res) => {
    try {
      const bookId = parseInt(req.params.id);
      const { title, description, type, grade, subject, coverImage, musicUrl, quizMode } = req.body;

      if (!title || !description || !type || !grade) {
        return res.status(400).json({
          message: "Validation error",
          errors: "Title, description, type, and grade are required",
        });
      }

      const safeQuizMode: "retry" | "straight" = quizMode === "straight" ? "straight" : "retry";
      const bookData = {
        title: title.trim(),
        description: description.trim(),
        type,
        grade,
        subject: subject || null,
        coverImage: coverImage || null,
        musicUrl: musicUrl || null,
        quizMode: safeQuizMode,
      };

      const book = await db.query.books.findFirst({ where: eq(schema.books.id, bookId) });
      if (!book) return res.status(404).json({ message: "Book not found" });

      const [updatedBook] = await db.update(schema.books).set(bookData).where(eq(schema.books.id, bookId)).returning();
      return res.status(200).json({ message: "Book updated successfully", book: updatedBook });
    } catch (error) {
      console.error("Error in edit book:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

// /api/books  — create a new book
app.post("/api/books", authenticate, authorize(["admin", "teacher"]), async (req, res) => {
    try {
      // 1) Basic shape/enum validation via drizzle-zod schema
      const parsed = schema.insertBookSchema.partial().parse(req.body);

      // 2) Coerce/normalize a few fields from request
      const {
        title,
        description,
        type,                 // "storybook" | "educational"
        subject,              // required only if type == "educational"
        grade,
        coverImage,           // Cloudinary secure URL (string) – optional
        coverPublicId,        // Cloudinary public_id (string) – optional
        musicUrl,             // Cloudinary/HTTPS audio URL – optional
        quizMode,             // "retry" | "straight" – optional (default retry)
      } = parsed as {
        title: string;
        description: string;
        type: "storybook" | "educational";
        subject?: string | null;
        grade?: string | null;
        coverImage?: string | null;
        coverPublicId?: string | null;
        musicUrl?: string | null;
        quizMode?: "retry" | "straight";
      };

      // 3) Backend guard: require subject only for educational books
      if (type === "educational" && (!subject || subject.trim() === "")) {
        return res.status(400).json({
          message: "Subject is required for educational books",
        });
      }

      // 4) Coerce quiz mode
      const normalizedQuizMode: "retry" | "straight" =
        quizMode === "straight" ? "straight" : "retry";

      // 5) User creating the book
      const userId = (req as any).user?.id;

      // 6) Insert
      const [newBook] = await db
        .insert(schema.books)
        .values({
          title,
          description,
          type,
          subject: type === "educational" ? subject ?? null : null,
          grade: grade ?? null,

          // media
          coverImage: coverImage ?? null,        // secure URL
          coverPublicId: coverPublicId ?? null,  // Cloudinary public_id
          musicUrl: musicUrl ?? null,

          // quiz behavior
          quizMode: normalizedQuizMode,

          // attribution
          addedById: userId ?? null,
        })
        .returning();

      return res
        .status(201)
        .json({ message: "Book added successfully", book: newBook });
    } catch (error: any) {
      if (error?.name === "ZodError") {
        return res
          .status(400)
          .json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error adding book:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }
);

  app.post("/api/books/:bookId/chapters", authenticate, authorize(["admin", "teacher"]), async (req, res) => {
    try {
      const bookId = parseInt(req.params.bookId);
      const chapterData = schema.insertChapterSchema.parse(req.body);

      const book = await db.query.books.findFirst({ where: eq(schema.books.id, bookId) });
      if (!book) return res.status(404).json({ message: "Book not found" });

      const chapters = await db.query.chapters.findMany({
        where: eq(schema.chapters.bookId, bookId),
        orderBy: desc(schema.chapters.orderIndex),
        limit: 1,
      });
      const orderIndex = chapters.length > 0 ? chapters[0].orderIndex + 1 : 0;

      const [newChapter] = await db
        .insert(schema.chapters)
        .values({ ...chapterData, bookId, orderIndex })
        .returning();

      return res.status(201).json({ message: "Chapter added successfully", chapter: newChapter });
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error adding chapter:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // Teacher book listing (filtered by teacher settings)
// very forgiving subject normalizer (for comparing free text vs kebab-case)
const normSubject = (s?: string) =>
  String(s ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");

// ---------------- routes ----------------

// Teacher book listing (filtered by teacher settings)
app.get("/api/teacher/books", authenticate, authorize(["teacher"]), async (req, res) => {
  try {
    const type = (req.query.type as string) || "";
    const search = (req.query.search as string) || "";
    const gradeQ = (req.query.grade as string) || "all";
    const subjectQ = (req.query.subject as string) || "all";
    const userId = (req as any).user?.id;

    // Load teacher settings
    const teacherSettings = await db
      .select()
      .from(schema.teachingSettings)
      .where(eq(schema.teachingSettings.userId, userId))
      .limit(1);

    let query = db.select().from(schema.books);
    const conditions: any[] = [];

    // ---------- Settings: grades ----------
    if (
      teacherSettings.length > 0 &&
      Array.isArray(teacherSettings[0].preferredGrades) &&
      teacherSettings[0].preferredGrades.length
    ) {
      const canon = teacherSettings[0].preferredGrades.map(toCanonicalGrade).filter(Boolean) as string[];
      if (canon.length) {
        const gradeConds = canon.map((g: string) => eq(schema.books.grade, g));
        conditions.push(or(...gradeConds));
      }
    }

    // ---------- Settings: subjects ----------
    if (
      teacherSettings.length > 0 &&
      Array.isArray(teacherSettings[0].subjects) &&
      teacherSettings[0].subjects.length
    ) {
      const wantedRaw = teacherSettings[0].subjects.map((s: string) => s?.trim()).filter(Boolean);

      const hasStorybook = wantedRaw.some(isStorybookSubject);
      const eduWanted = wantedRaw.filter((s) => !isStorybookSubject(s));

      // Build the OR(...) for educational subjects (label + kebab + like variants)
      const eduOr =
        eduWanted.length > 0
          ? or(
              ...eduWanted.flatMap((label: string) => {
                const kebab = normSubject(label);
                return [
                  eq(schema.books.subject, label),
                  eq(schema.books.subject, kebab),
                  like(schema.books.subject, `%${label}%`),
                  like(schema.books.subject, `%${kebab}%`),
                ];
              })
            )
          : null;

      if (hasStorybook && eduOr) {
        // (type = storybook) OR (type = educational AND subject matches eduWanted)
        conditions.push(or(eq(schema.books.type, "storybook"), and(eq(schema.books.type, "educational"), eduOr)));
      } else if (hasStorybook) {
        // only Storybook selected
        conditions.push(eq(schema.books.type, "storybook"));
      } else if (eduOr) {
        // only educational subjects selected
        conditions.push(and(eq(schema.books.type, "educational"), eduOr));
      }
    }

    // ---------- Explicit filters ----------
    const subjectIsStory = isStorybookSubject(subjectQ);

    // grade
    if (gradeQ && gradeQ !== "all") {
      const g = toCanonicalGrade(gradeQ);
      if (g) conditions.push(eq(schema.books.grade, g));
    }

    // subject
    if (subjectQ && subjectQ !== "all") {
      if (subjectIsStory) {
        // treat "Storybook" as a type filter
        conditions.push(eq(schema.books.type, "storybook"));
      } else {
        const sLabel = String(subjectQ).trim();
        const sKebab = normSubject(sLabel);
        // educational subjects imply educational type
        conditions.push(
          and(
            eq(schema.books.type, "educational"),
            or(
              eq(schema.books.subject, sLabel),
              eq(schema.books.subject, sKebab),
              like(schema.books.subject, `%${sLabel}%`),
              like(schema.books.subject, `%${sKebab}%`)
            )
          )
        );
      }
    }

    // type (only if no subject filter present to avoid contradictions)
    if (!subjectQ || subjectQ === "all") {
      if (type && type !== "all") {
        conditions.push(eq(schema.books.type, type as any));
      }
    }

    // search
    if (search) {
      conditions.push(
        or(
          like(schema.books.title, `%${search}%`),
          like(schema.books.description, `%${search}%`),
          like(schema.books.subject, `%${search}%`)
        )
      );
    }

    // ✅ Apply conditions
    if (conditions.length > 0) {
      query = (query.where(and(...conditions)) as typeof query) || query;
    }

    const books = await query.orderBy(desc(schema.books.createdAt));
    return res.status(200).json({ books });
  } catch (error) {
    console.error("Error fetching books for teacher:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

app.get("/api/teacher/books/:id", authenticate, authorize(["teacher"]), async (req, res) => {
  try {
    const bookId = parseInt(req.params.id);
    const book = await db.query.books.findFirst({
      where: eq(schema.books.id, bookId),
      with: { chapters: { orderBy: asc(schema.chapters.orderIndex) } },
    });
    if (!book) return res.status(404).json({ message: "Book not found" });
    return res.status(200).json({ book });
  } catch (error) {
    console.error("Error fetching book for teacher:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// Create (teacher)
app.post("/api/teacher/books", authenticate, authorize(["teacher"]), async (req, res) => {
  try {
    // Make schema lenient then enforce our own rules:
    const parsed = schema.insertBookSchema.partial().parse(req.body);

    const {
      title,
      description,
      type,              // "storybook" | "educational"
      subject,           // required only if educational
      grade,
      coverImage,
      coverPublicId,
      musicUrl,
      quizMode,
    } = parsed as {
      title: string;
      description: string;
      type: "storybook" | "educational";
      subject?: string | null;
      grade?: string | null;
      coverImage?: string | null;
      coverPublicId?: string | null;
      musicUrl?: string | null;
      quizMode?: "retry" | "straight";
    };

    if (!title || !description || !type) {
      return res.status(400).json({ message: "Title, description, and type are required" });
    }
    if (type === "educational" && (!subject || !String(subject).trim())) {
      return res.status(400).json({ message: "Subject is required for educational books" });
    }

    const userId = (req as any).user.id;
    const safeQuizMode: "retry" | "straight" = quizMode === "straight" ? "straight" : "retry";

    const [newBook] = await db
      .insert(schema.books)
      .values({
        title: title.trim(),
        description: description.trim(),
        type,
        subject: type === "educational" ? String(subject).trim() : null,
        grade: grade ?? null,
        coverImage: coverImage ?? null,
        coverPublicId: coverPublicId ?? null,
        musicUrl: musicUrl ?? null,
        quizMode: safeQuizMode,
        addedById: userId,
      })
      .returning();

    return res.status(201).json({ message: "Book added successfully", book: newBook });
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({ message: "Validation error", errors: error.errors });
    }
    console.error("Error adding book for teacher:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// Update (teacher)
app.put("/api/teacher/books/:id", authenticate, authorize(["teacher"]), async (req, res) => {
  try {
    const bookId = parseInt(req.params.id, 10);

    const {
      title,
      description,
      type,              // "storybook" | "educational"
      grade,
      subject,
      coverImage,
      coverPublicId,
      musicUrl,
      quizMode,
    } = (req.body ?? {}) as any;

    if (!title || !description || !type || !grade) {
      return res.status(400).json({
        message: "Validation error",
        errors: "Title, description, type, and grade are required",
      });
    }
    if (type === "educational" && (!subject || !String(subject).trim())) {
      return res.status(400).json({ message: "Subject is required for educational books" });
    }

    const safeQuizMode: "retry" | "straight" = quizMode === "straight" ? "straight" : "retry";
    const update = {
      title: String(title).trim(),
      description: String(description).trim(),
      type,
      grade,
      subject: type === "educational" ? String(subject).trim() : null,
      coverImage: coverImage ?? null,
      coverPublicId: coverPublicId ?? null,
      musicUrl: musicUrl ?? null,
      quizMode: safeQuizMode,
    };

    const exists = await db.query.books.findFirst({ where: eq(schema.books.id, bookId) });
    if (!exists) return res.status(404).json({ message: "Book not found" });

    const [updated] = await db.update(schema.books).set(update).where(eq(schema.books.id, bookId)).returning();
    return res.status(200).json({ message: "Book updated successfully", book: updated });
  } catch (error) {
    console.error("Error in edit book (teacher):", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

app.delete("/api/teacher/books/:id", authenticate, authorize(["teacher"]), async (req, res) => {
  try {
    const bookId = parseInt(req.params.id);
    const book = await db.query.books.findFirst({ where: eq(schema.books.id, bookId) });
    if (!book) return res.status(404).json({ message: "Book not found" });

    const pages = await db.query.pages.findMany({
      where: eq(schema.pages.bookId, bookId),
      with: { questions: true },
    });

    await db.transaction(async (tx) => {
      for (const page of pages) {
        if (page.questions?.length) {
          await tx.delete(schema.questions).where(inArray(schema.questions.id, page.questions.map((q) => q.id)));
        }
      }
      if (pages.length) await tx.delete(schema.pages).where(eq(schema.pages.bookId, bookId));
      await tx.delete(schema.progress).where(eq(schema.progress.bookId, bookId));
      await tx.delete(schema.books).where(eq(schema.books.id, bookId));
    });

    return res.status(200).json({ message: "Book deleted successfully by teacher", id: bookId });
  } catch (error) {
    console.error("Error deleting book for teacher:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});


  // =========================
// Badges & Book–Badge Mapping
// =========================

// Create a badge (admin/teacher)
app.post("/api/badges", authenticate,authorize(["admin", "teacher"]),async (req, res) => {
    try {
      const userId = (req as any).user?.id;
      const {
        name,
        description = "",
        iconUrl = null,
        iconPublicId = null,
        isGeneric = true,
        isActive = true,
      } = req.body || {};

      if (!name || String(name).trim().length < 2) {
        return res.status(400).json({ success: false, message: "Badge name is required (min 2 chars)" });
      }

      const [badge] = await db
        .insert(schema.badges)
        .values({
          name: String(name).trim(),
          description: String(description || ""),
          iconUrl: iconUrl || null,
          iconPublicId: iconPublicId || null,
          isGeneric: !!isGeneric,
          isActive: !!isActive,
          createdById: userId ?? null,
        })
        .returning();

      return res.status(201).json({ success: true, badge });
    } catch (err) {
      console.error("POST /api/badges error:", err);
      return res.status(500).json({ success: false, message: "Failed to create badge" });
    }
  }
);

// List badges (any authenticated user)
app.get("/api/badges", authenticate, async (req, res) => {
  try {
    const search = (req.query.search as string) || "";
    const active = (req.query.active as string) || "";

    const where: any[] = [];
    if (search.trim()) {
      where.push(
        or(
          like(schema.badges.name, `%${search}%`),
          like(schema.badges.description, `%${search}%`)
        )
      );
    }
    if (active === "true") where.push(eq(schema.badges.isActive, true));
    if (active === "false") where.push(eq(schema.badges.isActive, false));

    const badges = await db.query.badges.findMany({
      where: where.length ? (and as any)(...where) : undefined,
      orderBy: [desc(schema.badges.createdAt)],
    });

    return res.status(200).json({ success: true, badges });
  } catch (err) {
    console.error("GET /api/badges error:", err);
    return res.status(500).json({ success: false, message: "Failed to list badges" });
  }
});

// Update badge (admin/teacher)
app.patch("/api/badges/:id", authenticate, authorize(["admin", "teacher"]),
  async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (Number.isNaN(id)) return res.status(400).json({ success: false, message: "Invalid badge id" });

      const exists = await db.query.badges.findFirst({ where: eq(schema.badges.id, id) });
      if (!exists) return res.status(404).json({ success: false, message: "Badge not found" });

      const { name, description, iconUrl, iconPublicId, isGeneric, isActive } = req.body || {};
      const update: any = {};
      if (name !== undefined) update.name = String(name);
      if (description !== undefined) update.description = String(description);
      if (iconUrl !== undefined) update.iconUrl = iconUrl || null;
      if (iconPublicId !== undefined) update.iconPublicId = iconPublicId || null;
      if (isGeneric !== undefined) update.isGeneric = !!isGeneric;
      if (isActive !== undefined) update.isActive = !!isActive;

      const [updated] = await db.update(schema.badges).set(update).where(eq(schema.badges.id, id)).returning();
      return res.status(200).json({ success: true, badge: updated });
    } catch (err) {
      console.error("PATCH /api/badges/:id error:", err);
      return res.status(500).json({ success: false, message: "Failed to update badge" });
    }
  }
);

// Delete badge (admin only)
app.delete("/api/badges/:id", authenticate, authorize(["admin"]),
  async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (Number.isNaN(id)) return res.status(400).json({ success: false, message: "Invalid badge id" });

      const exists = await db.query.badges.findFirst({ where: eq(schema.badges.id, id) });
      if (!exists) return res.status(404).json({ success: false, message: "Badge not found" });

      await db.delete(schema.bookBadges).where(eq(schema.bookBadges.badgeId, id)); // clean mapping
      await db.delete(schema.earnedBadges).where(eq(schema.earnedBadges.badgeId, id)); // clean earned
      await db.delete(schema.badges).where(eq(schema.badges.id, id));

      return res.status(200).json({ success: true, message: "Badge deleted" });
    } catch (err) {
      console.error("DELETE /api/badges/:id error:", err);
      return res.status(500).json({ success: false, message: "Failed to delete badge" });
    }
  }
);

// Attach badge to a book (admin/teacher)
app.post(
  "/api/books/:bookId/badges",
  authenticate,
  authorize(["admin", "teacher"]),
  async (req, res) => {
    try {
      const bookId = Number(req.params.bookId);
      if (Number.isNaN(bookId)) {
        return res.status(400).json({ success: false, message: "Invalid book id" });
      }

      const { badgeId, awardMethod, completionThreshold, isEnabled } = req.body || {};
      if (!badgeId) {
        return res.status(400).json({ success: false, message: "badgeId is required" });
      }

      // ensure book & badge exist
      const book = await db.query.books.findFirst({ where: eq(schema.books.id, bookId) });
      if (!book) return res.status(404).json({ success: false, message: "Book not found" });

      const badge = await db.query.badges.findFirst({
        where: eq(schema.badges.id, Number(badgeId)),
      });
      if (!badge) return res.status(404).json({ success: false, message: "Badge not found" });

      // sanitize inputs for mapping
      const safeMethod: "auto_on_book_complete" | "manual" =
        awardMethod === "manual" ? "manual" : "auto_on_book_complete";

      let safeThreshold = Number(completionThreshold);
      if (!Number.isFinite(safeThreshold)) safeThreshold = 100;
      safeThreshold = Math.min(100, Math.max(1, Math.round(safeThreshold)));

      const safeEnabled = typeof isEnabled === "boolean" ? isEnabled : true;

      // prevent duplicate mapping
      const existing = await db.query.bookBadges.findFirst({
        where: and(
          eq(schema.bookBadges.bookId, bookId),
          eq(schema.bookBadges.badgeId, Number(badgeId))
        ),
      });
      if (existing) {
        return res.status(200).json({
          success: true,
          message: "Badge already attached to this book",
          bookBadge: existing,
        });
      }

      const [mapping] = await db
        .insert(schema.bookBadges)
        .values({
          bookId,
          badgeId: Number(badgeId),
          awardMethod: safeMethod,
          completionThreshold: safeThreshold,
          isEnabled: safeEnabled,
        })
        .returning();

      return res.status(201).json({ success: true, bookBadge: mapping });
    } catch (err) {
      console.error("POST /api/books/:bookId/badges error:", err);
      return res
        .status(500)
        .json({ success: false, message: "Failed to attach badge to book" });
    }
  }
);

// List badges attached to a book
app.get( "/api/books/:bookId/badges", authenticate, authorize(["admin", "teacher", "student"]),
  async (req, res) => {
    try {
      const bookId = parseInt(req.params.bookId);
      if (Number.isNaN(bookId)) return res.status(400).json({ success: false, message: "Invalid book id" });

      const mappings = await db.query.bookBadges.findMany({
        where: eq(schema.bookBadges.bookId, bookId),
        with: { badge: true },
        orderBy: [desc(schema.bookBadges.createdAt)],
      });

      return res.status(200).json({ success: true, bookBadges: mappings });
    } catch (err) {
      console.error("GET /api/books/:bookId/badges error:", err);
      return res.status(500).json({ success: false, message: "Failed to list book badges" });
    }
  }
);

// Remove badge mapping from a book (admin/teacher)
app.delete( "/api/books/:bookId/badges/:bookBadgeId", authenticate, authorize(["admin", "teacher"]), async (req, res) => {
    try {
      const bookId = parseInt(req.params.bookId);
      const bookBadgeId = parseInt(req.params.bookBadgeId);
      if (Number.isNaN(bookId) || Number.isNaN(bookBadgeId)) {
        return res.status(400).json({ success: false, message: "Invalid id(s)" });
      }

      const mapping = await db.query.bookBadges.findFirst({
        where: and(eq(schema.bookBadges.id, bookBadgeId), eq(schema.bookBadges.bookId, bookId)),
      });
      if (!mapping) return res.status(404).json({ success: false, message: "Book badge mapping not found" });

      await db.delete(schema.bookBadges).where(eq(schema.bookBadges.id, bookBadgeId));
      return res.status(200).json({ success: true, message: "Book badge removed" });
    } catch (err) {
      console.error("DELETE /api/books/:bookId/badges/:bookBadgeId error:", err);
      return res.status(500).json({ success: false, message: "Failed to remove book badge" });
    }
  }
);

// List earned badges for a user
app.get("/api/users/:userId/badges", authenticate, async (req, res) => {
  try {
    const requester = (req as any).user as { id: number; role: "student" | "teacher" | "admin" };
    const userId = parseInt(req.params.userId);
    if (Number.isNaN(userId)) return res.status(400).json({ success: false, message: "Invalid user id" });

    if (requester.role === "student" && requester.id !== userId) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    const earned = await db.query.earnedBadges.findMany({
      where: eq(schema.earnedBadges.userId, userId),
      with: { badge: true, book: { columns: { id: true, title: true } } },
      orderBy: [desc(schema.earnedBadges.createdAt)],
    });

    // 🔑 map snake_case → camelCase for frontend
    const formatted = earned.map((eb) => ({
      id: eb.id,
      userId: eb.userId,
      badgeId: eb.badgeId,
      bookId: eb.bookId,
      awardedAt: eb.awardedAt ?? eb.awardedAt ?? null,
      createdAt: eb.createdAt ?? eb.createdAt ?? null,
      note: eb.note,
      badge: eb.badge
        ? {
            id: eb.badge.id,
            name: eb.badge.name,
            description: eb.badge.description,
            iconUrl: eb.badge.iconUrl ?? eb.badge.iconUrl,
            iconPublicId: eb.badge.iconPublicId ?? eb.badge.iconPublicId,
          }
        : null,
      book: eb.book || null,
    }));

    return res.status(200).json({ success: true, earnedBadges: formatted });
  } catch (err) {
    console.error("GET /api/users/:userId/badges error:", err);
    return res.status(500).json({ success: false, message: "Failed to list earned badges" });
  }
});

// Award a badge manually to a user (admin/teacher)
app.post(
  "/api/users/:userId/badges",
  authenticate,
  authorize(["admin", "teacher"]),
  async (req, res) => {
    try {
      const userId = Number(req.params.userId);
      if (Number.isNaN(userId)) {
        return res.status(400).json({ success: false, message: "Invalid user id" });
      }

      const { badgeId, bookId = null, note = null } = req.body || {};
      if (!badgeId) {
        return res.status(400).json({ success: false, message: "badgeId is required" });
      }

      // ensure user & badge exist
      const user = await db.query.users.findFirst({ where: eq(schema.users.id, userId) });
      if (!user) return res.status(404).json({ success: false, message: "User not found" });

      const badge = await db.query.badges.findFirst({
        where: eq(schema.badges.id, Number(badgeId)),
      });
      if (!badge) return res.status(404).json({ success: false, message: "Badge not found" });

      // if bookId provided, ensure book exists
      let safeBookId: number | null = null;
      if (bookId != null) {
        const b = await db.query.books.findFirst({
          where: eq(schema.books.id, Number(bookId)),
        });
        if (!b) return res.status(404).json({ success: false, message: "Book not found" });
        safeBookId = Number(bookId);
      }

      // prevent duplicate (same user + same badge + same book/null)
      const existing = await db.query.earnedBadges.findFirst({
        where: and(
          eq(schema.earnedBadges.userId, userId),
          eq(schema.earnedBadges.badgeId, Number(badgeId)),
          safeBookId == null
            ? isNull(schema.earnedBadges.bookId)
            : eq(schema.earnedBadges.bookId, safeBookId)
        ),
      });
      if (existing) {
        return res
          .status(200)
          .json({ success: true, message: "Badge already earned", earnedBadge: existing });
      }

      const [earned] = await db
        .insert(schema.earnedBadges)
        .values({
          userId,
          badgeId: Number(badgeId),
          bookId: safeBookId,                      // may be null
          awardedById: (req as any)?.user?.id ?? null,
          note: note || null,
        })
        .returning();

      return res.status(201).json({ success: true, earnedBadge: earned });
    } catch (err) {
      console.error("POST /api/users/:userId/badges error:", err);
      return res.status(500).json({ success: false, message: "Failed to award badge" });
    }
  }
);

  // =========================
  // Progress
  // =========================
  app.get("/api/progress", authenticate, async (req, res) => {
    try {
      const userId = (req as any).user.id;
      const role = (req as any).user.role;

      if (role === "admin" && req.query.studentId) {
        const studentId = parseInt(req.query.studentId as string);
        const progressData = await db.query.progress.findMany({
          where: eq(schema.progress.userId, studentId),
          with: {
            book: true,
            user: { columns: { id: true, firstName: true, lastName: true, username: true } },
          },
          orderBy: desc(schema.progress.lastReadAt),
        });
        return res.status(200).json({ progress: progressData });
      }

      if (role === "admin" && !req.query.studentId) {
        const progressData = await db.query.progress.findMany({
          with: {
            book: true,
            user: { columns: { id: true, firstName: true, lastName: true, username: true } },
          },
          orderBy: desc(schema.progress.lastReadAt),
        });
        return res.status(200).json({ progress: progressData });
      }

      if (role === "teacher") {
        const progressData = await db.query.progress.findMany({
          with: {
            book: true,
            user: {
              columns: { id: true, firstName: true, lastName: true, username: true, approvalStatus: true, role: true },
            },
          },
          orderBy: desc(schema.progress.lastReadAt),
        });
        const approved = progressData.filter((p) => p.user.role === "student" && p.user.approvalStatus === "approved");
        return res.status(200).json({ progress: approved });
      }

      const progressData = await db.query.progress.findMany({
        where: eq(schema.progress.userId, userId),
        with: { book: true },
        orderBy: desc(schema.progress.lastReadAt),
      });
      return res.status(200).json({ progress: progressData });
    } catch (error) {
      console.error("Error fetching progress:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/progress", authenticate, async (req, res) => {
    try {
      const { id: authUserId, role } = (req as any).user ?? {};
      const body = req.body ?? {};

      const userId =
        role === "student" ? authUserId : Number.isFinite(Number(body.userId)) ? Number(body.userId) : authUserId;

      const bookId = Number(body.bookId);
      let percentComplete = Number(body.percentComplete);
      if (!Number.isFinite(bookId)) return res.status(400).json({ message: "Invalid or missing bookId" });
      if (!Number.isFinite(percentComplete)) percentComplete = 0;
      percentComplete = Math.max(0, Math.min(100, Math.round(percentComplete)));

      const progressData = { userId, bookId, percentComplete, lastReadAt: new Date() };

      const book = await db.query.books.findFirst({ where: eq(schema.books.id, progressData.bookId) });
      if (!book) return res.status(404).json({ message: "Book not found" });

      const existing = await db.query.progress.findFirst({
        where: and(eq(schema.progress.userId, userId), eq(schema.progress.bookId, progressData.bookId)),
      });

      if (existing) {
        const [updated] = await db
          .update(schema.progress)
          .set({ percentComplete: progressData.percentComplete, lastReadAt: progressData.lastReadAt })
          .where(eq(schema.progress.id, existing.id))
          .returning();
        return res.status(200).json({ message: "Progress updated", progress: updated });
      }

      const [created] = await db.insert(schema.progress).values(progressData).returning();
      return res.status(201).json({ message: "Progress created", progress: created });
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error updating progress:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // =========================
  // Quiz Attempts
  // =========================
  app.post("/api/quiz-attempts", authenticate, async (req, res) => {
    try {
      const user = (req as any).user as { id: number; role: "student" | "teacher" | "admin" };
      if (!["student", "teacher", "admin"].includes(user.role)) {
        return res.status(403).json({ success: false, message: "Access denied" });
      }

      const {
        bookId,
        pageId,
        scoreCorrect,
        scoreTotal,
        percentage,
        mode,
        durationSec,
        userId,
      } = req.body || {};

      const ownerUserId = user.role === "student" ? user.id : parseInt(userId, 10) || user.id;

      if (bookId == null || scoreCorrect == null || scoreTotal == null) {
        return res.status(400).json({
          success: false,
          message: "Missing required fields: bookId, scoreCorrect, scoreTotal",
        });
      }

      const safeBookId = parseInt(bookId, 10);
      const safePageId = pageId == null ? null : parseInt(pageId, 10);
      const safeCorrect = parseInt(scoreCorrect, 10);
      const safeTotal = parseInt(scoreTotal, 10);

      if (
        Number.isNaN(safeBookId) ||
        (safePageId !== null && Number.isNaN(safePageId)) ||
        Number.isNaN(safeCorrect) ||
        Number.isNaN(safeTotal) ||
        safeTotal <= 0 ||
        safeCorrect < 0 ||
        safeCorrect > safeTotal
      ) {
        return res.status(400).json({ success: false, message: "Invalid score/book/page values" });
      }

      const safeMode: "retry" | "straight" = mode === "straight" ? "straight" : "retry";
      const computedPct =
        typeof percentage === "number" ? Math.round(percentage) : Math.round((safeCorrect / safeTotal) * 100);
      const safeDuration = durationSec ? parseInt(durationSec, 10) : 0;

      const existingLatest = await db.query.quizAttempts.findFirst({
        where: and(
          eq(schema.quizAttempts.userId, ownerUserId),
          eq(schema.quizAttempts.bookId, safeBookId),
          ...(safePageId === null ? [] : [eq(schema.quizAttempts.pageId, safePageId)])
        ),
        orderBy: [desc(schema.quizAttempts.attemptNumber)],
      });

      const nextAttemptNumber = existingLatest ? (existingLatest.attemptNumber ?? 0) + 1 : 1;

      const [inserted] = await db
        .insert(schema.quizAttempts)
        .values({
          userId: ownerUserId,
          bookId: safeBookId,
          pageId: safePageId,
          scoreCorrect: safeCorrect,
          scoreTotal: safeTotal,
          percentage: computedPct,
          mode: safeMode,
          attemptNumber: nextAttemptNumber,
          durationSec: safeDuration || 0,
        })
        .returning();

      return res.status(201).json({ success: true, attempt: inserted });
    } catch (err: any) {
      console.error("POST /api/quiz-attempts error:", err);
      return res.status(500).json({ success: false, message: err?.message ?? "Server error" });
    }
  });

  app.get("/api/quiz-attempts", authenticate, async (req, res) => {
    try {
      const user = (req as any).user as { id: number; role: "student" | "teacher" | "admin" };

      const { userId, bookId, pageId, latestPerBook } = req.query || {};
      const filterUserId = user.role === "student" ? user.id : userId ? parseInt(String(userId), 10) : undefined;
      const filterBookId = bookId ? parseInt(String(bookId), 10) : undefined;
      const filterPageId = pageId ? parseInt(String(pageId), 10) : undefined;
      const onlyLatestPerBook = String(latestPerBook || "").toLowerCase() === "true";

      if (user.role === "student" && filterUserId && filterUserId !== user.id) {
        return res.status(403).json({ success: false, message: "Access denied" });
      }

      const whereClauses: any[] = [];
      if (filterUserId !== undefined) whereClauses.push(eq(schema.quizAttempts.userId, filterUserId));
      else if (user.role === "student") whereClauses.push(eq(schema.quizAttempts.userId, user.id));
      if (filterBookId !== undefined) whereClauses.push(eq(schema.quizAttempts.bookId, filterBookId));
      if (filterPageId !== undefined) whereClauses.push(eq(schema.quizAttempts.pageId, filterPageId));

      const attempts = await db.query.quizAttempts.findMany({
        where: whereClauses.length ? (and as any)(...whereClauses) : undefined,
        orderBy: [desc(schema.quizAttempts.createdAt)],
        with: {
          book: {
            columns: { id: true, title: true, type: true, subject: true, grade: true, coverImage: true },
          },
          page: {
            columns: { id: true, pageNumber: true, title: true },
          },
          user: {
            columns: { id: true, firstName: true, lastName: true, username: true, email: true, gradeLevel: true },
          },
        },
      });

      let payload = attempts;
      if (onlyLatestPerBook) {
        const makeKey = (a: any) => `${a.userId}:${a.bookId}`;
        const latestMap = new Map<string, any>();
        for (const a of attempts) {
          const k = makeKey(a);
          const current = latestMap.get(k);
          if (!current) {
            latestMap.set(k, a);
            continue;
          }
          if (
            (a.attemptNumber ?? 0) > (current.attemptNumber ?? 0) ||
            new Date(a.createdAt).getTime() > new Date(current.createdAt).getTime()
          ) {
            latestMap.set(k, a);
          }
        }
        payload = Array.from(latestMap.values());
      }

      return res.status(200).json({ success: true, count: payload.length, attempts: payload });
    } catch (err: any) {
      console.error("GET /api/quiz-attempts error:", err);
      return res.status(500).json({ success: false, message: err?.message ?? "Server error" });
    }
  });

  // =========================
  // Reading sessions
  // =========================
  app.post("/api/reading-sessions/start", authenticate, async (req, res) => {
    try {
      const { bookId } = req.body;
      const userId = (req as any).user?.id;
      if (!userId || !bookId) return res.status(400).json({ success: false, message: "Missing userId or bookId" });

      const activeSession = await db.query.readingSessions.findFirst({
        where: and(
          eq(schema.readingSessions.userId, userId),
          eq(schema.readingSessions.bookId, bookId),
          isNull(schema.readingSessions.endTime)
        ),
      });

      if (activeSession) {
        return res
          .status(200)
          .json({ success: true, message: "Active session already exists", sessionId: activeSession.id, startTime: activeSession.startTime });
      }

      const [newSession] = await db
        .insert(schema.readingSessions)
        .values({ userId, bookId, startTime: new Date(), endTime: null, totalMinutes: null })
        .returning();

      return res
        .status(200)
        .json({ success: true, sessionId: newSession.id, startTime: newSession.startTime, message: "Reading session started successfully" });
    } catch (error) {
      console.error("❌ Express: Error starting session:", error);
      return res.status(500).json({ success: false, error: error instanceof Error ? error.message : String(error) });
    }
  });

  app.post("/api/reading-sessions/end", authenticate, async (req, res) => {
    try {
      const { bookId } = req.body;
      const userId = (req as any).user?.id;
      if (!userId || !bookId) return res.status(400).json({ success: false, message: "Missing userId or bookId" });

      const activeSession = await db.query.readingSessions.findFirst({
        where: and(
          eq(schema.readingSessions.userId, userId),
          eq(schema.readingSessions.bookId, bookId),
          isNull(schema.readingSessions.endTime)
        ),
      });
      if (!activeSession) return res.status(404).json({ success: false, message: "No active reading session found" });

      const endTime = new Date();
      const startTime = new Date(activeSession.startTime);
      const totalSeconds = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);

      await db
        .update(schema.readingSessions)
        .set({ endTime, totalMinutes: totalSeconds })
        .where(eq(schema.readingSessions.id, activeSession.id));

      const existingProgress = await db.query.progress.findFirst({
        where: and(eq(schema.progress.userId, userId), eq(schema.progress.bookId, bookId)),
      });

      if (existingProgress) {
        const existingTimeInSeconds = existingProgress.totalReadingTime || 0;
        const newTotalTime = existingTimeInSeconds + totalSeconds;

        await db
          .update(schema.progress)
          .set({ totalReadingTime: newTotalTime, lastReadAt: endTime })
          .where(eq(schema.progress.id, existingProgress.id));
      } else {
        await db
          .insert(schema.progress)
          .values({ userId, bookId, percentComplete: 0, totalReadingTime: totalSeconds, lastReadAt: endTime });
      }

      return res.status(200).json({
        success: true,
        totalSeconds,
        sessionId: activeSession.id,
        startTime: activeSession.startTime,
        endTime,
        message: "Reading session ended successfully",
      });
    } catch (error) {
      console.error("❌ Express: Error ending session:", error);
      return res.status(500).json({ success: false, error: error instanceof Error ? error.message : String(error) });
    }
  });

  // =========================
  // Students / Teachers (admin views)
  // =========================

app.get("/api/students", authenticate,authorize(["admin", "teacher"]),async (req, res) => {
    try {
      const approvalStatus = (req.query.status as string) || "";
      const gradeLevelQ = (req.query.grade as string) || "all";
      const search = (req.query.search as string) || "";
      const userRole = (req as any).user?.role;
      const userId = (req as any).user?.id;

      const conditions: any[] = [eq(schema.users.role, "student")];

      // status filter
      if (approvalStatus && ["pending", "approved", "rejected"].includes(approvalStatus)) {
        conditions.push(eq(schema.users.approvalStatus, approvalStatus as any));
      }

      // grade filter (query param) — canonicalize before comparing
if (gradeLevelQ && gradeLevelQ !== "all") {
  const g = toCanonicalGrade(gradeLevelQ);
  conditions.push(eq(schema.users.gradeLevel, g as any));
}

      // text search
      if (search.trim()) {
        conditions.push(
          or(
            like(schema.users.firstName, `%${search}%`),
            like(schema.users.lastName, `%${search}%`),
            like(schema.users.email, `%${search}%`),
            like(schema.users.username, `%${search}%`)
          )
        );
      }

      // teacher settings narrowing (grades) — canonicalize stored values too
      if (userRole === "teacher") {
        const teacherSettings = await db
          .select()
          .from(schema.teachingSettings)
          .where(eq(schema.teachingSettings.userId, userId))
          .limit(1);

        if (teacherSettings.length > 0 && teacherSettings[0].preferredGrades?.length) {
          const canon = teacherSettings[0].preferredGrades
            .map((g: string) => toCanonicalGrade(g))
            .filter(Boolean);
          if (canon.length) {
            conditions.push(inArray(schema.users.gradeLevel, canon as any));
          }
        }
      }

      const students = await db
        .select()
        .from(schema.users)
        .where(and(...conditions))
        .orderBy(asc(schema.users.lastName));

      return res.status(200).json({ students });
    } catch (error) {
      console.error("Error fetching students:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }
);

  app.get("/api/students/pending", authenticate, authorize(["admin"]), async (req, res) => {
    try {
      const pendingStudents = await storage.getPendingStudents();
      return res.status(200).json({ students: pendingStudents });
    } catch (error) {
      console.error("Error fetching pending students:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });
// APPROVE (idempotent; works from pending/rejected/approved)
app.post("/api/students/:id/approve", authenticate, authorize(["admin"]), async (req, res) => {
  try {
    const studentId = Number(req.params.id);

    // find by id + role ONLY (no approvalStatus filter)
    const student = await db.query.users.findFirst({
      where: and(eq(schema.users.id, studentId), eq(schema.users.role, "student")),
      columns: { id: true, approvalStatus: true },
    });

    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    if (student.approvalStatus === "approved") {
      // idempotent success so the UI can “re-approve” safely
      return res.status(200).json({ message: "Already approved", student });
    }

    const [approvedStudent] = await db
      .update(schema.users)
      .set({
        approvalStatus: "approved",
        rejectionReason: null,
      })
      .where(and(eq(schema.users.id, studentId), eq(schema.users.role, "student")))
      .returning();

    return res.status(200).json({
      message: "Student account approved successfully",
      student: approvedStudent,
    });
  } catch (error) {
    console.error("Error approving student:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// REJECT (still only from pending)
app.post("/api/students/:id/reject", authenticate, authorize(["admin"]), async (req, res) => {
  try {
    const studentId = Number(req.params.id);
    const { reason } = req.body;

    const student = await db.query.users.findFirst({
      where: and(
        eq(schema.users.id, studentId),
        eq(schema.users.role, "student"),
        eq(schema.users.approvalStatus, "pending"),
      ),
      columns: { id: true },
    });

    if (!student) {
      return res.status(404).json({ message: "Student not found or not pending approval" });
    }

    const [rejectedStudent] = await db
      .update(schema.users)
      .set({
        approvalStatus: "rejected",
        rejectionReason: reason || "",
      })
      .where(and(eq(schema.users.id, studentId), eq(schema.users.role, "student")))
      .returning();

    return res.status(200).json({ message: "Student account rejected", student: rejectedStudent });
  } catch (error) {
    console.error("Error rejecting student:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

  app.get("/api/teachers", authenticate, authorize(["admin"]), async (req, res) => {
    try {
      const approvalStatus = req.query.status as string;
      const search = req.query.search as string;

      const conditions: any[] = [eq(schema.users.role, "teacher")];
      if (approvalStatus && ["pending", "approved", "rejected"].includes(approvalStatus)) {
        conditions.push(eq(schema.users.approvalStatus, approvalStatus as any));
      }
      if (search?.trim()) {
        conditions.push(
          or(
            like(schema.users.firstName, `%${search}%`),
            like(schema.users.lastName, `%${search}%`),
            like(schema.users.email, `%${search}%`),
            like(schema.users.username, `%${search}%`)
          )
        );
      }

      const teachers = await db.select().from(schema.users).where(and(...conditions)).orderBy(asc(schema.users.lastName));
      return res.status(200).json({ teachers });
    } catch (error) {
      console.error("Error fetching teachers:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/teachers/:id/approve", authenticate, authorize(["admin"]), async (req, res) => {
    try {
      const teacherId = parseInt(req.params.id);
      const teacher = await db.query.users.findFirst({
        where: and(eq(schema.users.id, teacherId), eq(schema.users.role, "teacher")),
      });
      if (!teacher) return res.status(404).json({ message: "Teacher not found" });

      const [updatedTeacher] = await db
        .update(schema.users)
        .set({ approvalStatus: "approved" })
        .where(eq(schema.users.id, teacherId))
        .returning();

      return res.status(200).json({ message: "Teacher account approved successfully", teacher: updatedTeacher });
    } catch (error) {
      console.error("Error approving teacher:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/teachers/:id/reject", authenticate, authorize(["admin"]), async (req, res) => {
    try {
      const teacherId = parseInt(req.params.id);
      const { reason } = req.body;

      const teacher = await db.query.users.findFirst({
        where: and(eq(schema.users.id, teacherId), eq(schema.users.role, "teacher")),
      });
      if (!teacher) return res.status(404).json({ message: "Teacher not found" });

      const [updatedTeacher] = await db
        .update(schema.users)
        .set({ approvalStatus: "rejected", rejectionReason: reason || null })
        .where(eq(schema.users.id, teacherId))
        .returning();

      return res.status(200).json({ message: "Teacher account rejected", teacher: updatedTeacher });
    } catch (error) {
      console.error("Error rejecting teacher:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // =========================
  // Pages & Questions
  // =========================
  app.get("/api/books/:bookId/pages", authenticate, authorize(["admin", "teacher", "student"]), async (req, res) => {
    try {
      const bookId = parseInt(req.params.bookId);
      const pages = await db.query.pages.findMany({
        where: eq(schema.pages.bookId, bookId),
        orderBy: asc(schema.pages.pageNumber),
        with: { questions: true },
      });
      return res.status(200).json({ pages });
    } catch (error) {
      console.error("Error fetching pages:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/pages/:id", authenticate, authorize(["admin", "teacher", "student"]), async (req, res) => {
    try {
      const pageId = parseInt(req.params.id);
      const page = await db.query.pages.findFirst({
        where: eq(schema.pages.id, pageId),
        with: { questions: true },
      });
      if (!page) return res.status(404).json({ message: "Page not found" });
      return res.status(200).json({ page });
    } catch (error) {
      console.error("Error fetching page:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/pages", authenticate, authorize(["admin", "teacher"]), async (req, res) => {
    try {
      const { title, content, imageUrl, pageNumber, bookId, questions, shuffleQuestions } = req.body;
      if (!content || pageNumber === undefined || pageNumber === null || !bookId) {
        return res.status(400).json({
          message: "Content, page number, and book ID are required for new pages",
        });
      }

      const book = await db.query.books.findFirst({ where: eq(schema.books.id, Number(bookId)) });
      if (!book) return res.status(404).json({ message: "Book not found" });

      const [newPage] = await db
        .insert(schema.pages)
        .values({
          title: title || "",
          content: String(content).trim(),
          imageUrl: imageUrl || "",
          pageNumber: Number(pageNumber),
          bookId: Number(bookId),
          shuffleQuestions: typeof shuffleQuestions === "boolean" ? shuffleQuestions : false,
        })
        .returning();

      if (Array.isArray(questions) && newPage?.id) {
        for (const q of questions) {
          if (q?.questionText && q.questionText.trim()) {
            await db.insert(schema.questions).values({
              pageId: newPage.id,
              questionText: q.questionText.trim(),
              answerType: q.answerType || "text",
              correctAnswer: q.correctAnswer || "",
              options: q.options || "",
            });
          }
        }
      }

      return res.status(201).json({ id: newPage.id, message: "Page added successfully", page: newPage });
    } catch (error) {
      console.error("Error adding page:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/pages/:id", authenticate, authorize(["admin", "teacher"]), async (req, res) => {
    try {
      const pageId = Number(req.params.id);
      const { title, content, imageUrl, pageNumber, questions, shuffleQuestions } = req.body;

      if (!content || pageNumber === undefined || pageNumber === null) {
        return res.status(400).json({ message: "Content and page number are required" });
      }

      const page = await db.query.pages.findFirst({ where: eq(schema.pages.id, pageId) });
      if (!page) return res.status(404).json({ message: "Page not found" });

      const updateData: any = {
        title: title || "",
        content: String(content).trim(),
        imageUrl: imageUrl || "",
        pageNumber: Number(pageNumber),
      };
      if (typeof shuffleQuestions === "boolean") updateData.shuffleQuestions = shuffleQuestions;

      const [updatedPage] = await db.update(schema.pages).set(updateData).where(eq(schema.pages.id, pageId)).returning();

      if (Array.isArray(questions)) {
        await db.delete(schema.questions).where(eq(schema.questions.pageId, pageId));
        for (const q of questions) {
          if (q?.questionText && q.questionText.trim()) {
            await db.insert(schema.questions).values({
              pageId,
              questionText: q.questionText.trim(),
              answerType: q.answerType || "text",
              correctAnswer: q.correctAnswer || "",
              options: q.options || "",
            });
          }
        }
      }

      return res.status(200).json({ message: "Page updated successfully", page: updatedPage });
    } catch (error) {
      console.error("Error updating page:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/pages/:id", authenticate, authorize(["admin", "teacher"]), async (req, res) => {
    try {
      const pageId = parseInt(req.params.id);
      const page = await db.query.pages.findFirst({
        where: eq(schema.pages.id, pageId),
        with: { questions: true },
      });
      if (!page) return res.status(404).json({ message: "Page not found" });

      if (page.questions?.length) {
        await db.delete(schema.questions).where(inArray(schema.questions.id, page.questions.map((q) => q.id)));
      }
      const [deletedPage] = await db.delete(schema.pages).where(eq(schema.pages.id, pageId)).returning();
      return res.status(200).json({ message: "Page deleted successfully", page: deletedPage });
    } catch (error) {
      console.error("Error deleting page:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/books/:bookId/pages", authenticate, authorize(["admin", "teacher"]), async (req, res) => {
    try {
      const bookId = Number(req.params.bookId);
      const { title, content, imageUrl, pageNumber, questions, shuffleQuestions } = req.body;

      if (!content || pageNumber === undefined || pageNumber === null) {
        return res.status(400).json({ message: "Content and page number are required" });
      }
      const book = await db.query.books.findFirst({ where: eq(schema.books.id, bookId) });
      if (!book) return res.status(404).json({ message: "Book not found" });

      const [newPage] = await db
        .insert(schema.pages)
        .values({
          title: title || "",
          content: String(content).trim(),
          imageUrl: imageUrl || "",
          pageNumber: Number(pageNumber) || 1,
          bookId,
          shuffleQuestions: typeof shuffleQuestions === "boolean" ? shuffleQuestions : false,
        })
        .returning();

      if (Array.isArray(questions) && newPage?.id) {
        for (const q of questions) {
          if (q?.questionText && q.questionText.trim()) {
            await db.insert(schema.questions).values({
              pageId: newPage.id,
              questionText: q.questionText.trim(),
              answerType: q.answerType || "text",
              correctAnswer: q.correctAnswer || "",
              options: q.options || "",
            });
          }
        }
      }

      return res.status(201).json({ message: "Page created successfully", page: newPage });
    } catch (error) {
      console.error("Error creating page:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // =========================
  // Questions
  // =========================
  app.get("/api/pages/:pageId/questions", authenticate, authorize(["admin", "teacher", "student"]), async (req, res) => {
    try {
      const pageId = parseInt(req.params.pageId);
      const questions = await db.query.questions.findMany({ where: eq(schema.questions.pageId, pageId) });
      return res.status(200).json({ questions });
    } catch (error) {
      console.error("Error fetching questions:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/questions", authenticate, authorize(["admin", "teacher"]), async (req, res) => {
    try {
      const questionData = schema.insertQuestionSchema.parse(req.body);
      const page = await db.query.pages.findFirst({ where: eq(schema.pages.id, questionData.pageId) });
      if (!page) return res.status(404).json({ message: "Page not found" });

      const [newQuestion] = await db.insert(schema.questions).values(questionData).returning();
      return res.status(201).json({ message: "Question added successfully", question: newQuestion });
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error adding question:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/questions/:id", authenticate, authorize(["admin", "teacher"]), async (req, res) => {
    try {
      const questionId = parseInt(req.params.id);
      const questionData = schema.insertQuestionSchema.parse(req.body);
      const question = await db.query.questions.findFirst({ where: eq(schema.questions.id, questionId) });
      if (!question) return res.status(404).json({ message: "Question not found" });

      const [updatedQuestion] = await db
        .update(schema.questions)
        .set(questionData)
        .where(eq(schema.questions.id, questionId))
        .returning();

      return res.status(200).json({ message: "Question updated successfully", question: updatedQuestion });
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error updating question:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/questions/:id", authenticate, authorize(["admin", "teacher"]), async (req, res) => {
    try {
      const questionId = parseInt(req.params.id);
      const question = await db.query.questions.findFirst({ where: eq(schema.questions.id, questionId) });
      if (!question) return res.status(404).json({ message: "Question not found" });

      const [deletedQuestion] = await db.delete(schema.questions).where(eq(schema.questions.id, questionId)).returning();
      return res.status(200).json({ message: "Question deleted successfully", question: deletedQuestion });
    } catch (error) {
      console.error("Error deleting question:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // =========================
  // Book completion
  // =========================
// =========================
// Book completion (+ auto-award badges)
// =========================
app.post("/api/books/:bookId/complete", authenticate, async (req, res) => {
  try {
    const bookId = parseInt(req.params.bookId, 10);
    const userId = (req as any).user?.id;

    if (!userId) {
      return res
        .status(401)
        .json({ success: false, message: "User not authenticated properly" });
    }

    const book = await db.query.books.findFirst({
      where: eq(schema.books.id, bookId),
    });
    if (!book) {
      return res.status(404).json({ success: false, message: "Book not found" });
    }

    // --- upsert progress to 100% ---
    const existingProgress = await db.query.progress.findFirst({
      where: and(
        eq(schema.progress.userId, userId),
        eq(schema.progress.bookId, bookId)
      ),
    });

    let progressRow;
    if (existingProgress) {
      const [updated] = await db
        .update(schema.progress)
        .set({ percentComplete: 100, lastReadAt: new Date() })
        .where(eq(schema.progress.id, existingProgress.id))
        .returning();
      progressRow = updated;
    } else {
      const [created] = await db
        .insert(schema.progress)
        .values({
          userId,
          bookId,
          percentComplete: 100,
          lastReadAt: new Date(),
        })
        .returning();
      progressRow = created;
    }

    // --- find badges mapped to this book ---
    // (requires schema: badges, bookBadges, awardedBadges as we added in schema.ts)
    const mappedBadges =
      await db
        .select({
          badgeId: schema.badges.id,
          name: schema.badges.name,
          description: schema.badges.description,
          iconUrl: schema.badges.iconUrl,
          isCustom: schema.badges.isGeneric,
        })
        .from(schema.bookBadges)
        .innerJoin(
          schema.badges,
          eq(schema.bookBadges.badgeId, schema.badges.id)
        )
        .where(eq(schema.bookBadges.bookId, bookId));

    // --- award any not-yet-awarded badges for this user+book ---
    const newlyAwarded: Array<{
      badgeId: number;
      name: string;
      description: string | null;
      iconUrl: string | null;
      isCustom: boolean | null;
      awardedAt: Date;
    }> = [];

    for (const b of mappedBadges) {
      const already = await db.query.earnedBadges.findFirst({
        where: and(
          eq(schema.earnedBadges.userId, userId),
          eq(schema.earnedBadges.bookId, bookId),
          eq(schema.earnedBadges.badgeId, b.badgeId)
        ),
      });

      if (!already) {
        const [inserted] = await db
          .insert(schema.earnedBadges)
          .values({
            userId,
            bookId,
            badgeId: b.badgeId,
            awardedAt: new Date(),
          })
          .returning({ awardedAt: schema.earnedBadges.awardedAt });

        newlyAwarded.push({
          badgeId: b.badgeId,
          name: b.name,
          description: b.description ?? null,
          iconUrl: b.iconUrl ?? null,
          isCustom: (b as any).isCustom ?? null,
          awardedAt: inserted.awardedAt,
        });
      }
    }

    return res.status(200).json({
      success: true,
      message:
        newlyAwarded.length > 0
          ? `Book marked as completed. ${newlyAwarded.length} badge${
              newlyAwarded.length === 1 ? "" : "s"
            } awarded.`
          : "Book marked as completed",
      progress: progressRow,
      awardedBadges: newlyAwarded, // <- badges just earned on completion
    });
  } catch (error) {
    console.error("Error marking book as completed:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

  // =========================
  // Legacy security Q/A reset
  // =========================
  app.post("/api/auth/forgot-password/check-username", async (req, res) => {
    try {
      const data = schema.checkUsernameSchema.parse(req.body);
      const user = await db.query.users.findFirst({
        where: eq(schema.users.username, data.username),
        columns: { id: true, username: true, securityQuestion: true },
      });
      if (!user || !user.securityQuestion) {
        return res.status(404).json({ success: false, message: "User not found or no security question set" });
      }
      return res.status(200).json({ success: true, securityQuestion: user.securityQuestion });
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ success: false, message: "Validation error", errors: error.errors });
      }
      console.error("Error checking username:", error);
      return res.status(500).json({ success: false, message: "Internal server error" });
    }
  });

  app.post("/api/auth/forgot-password/verify-security", async (req, res) => {
    try {
      const data = schema.verifySecuritySchema.parse(req.body);
      const user = await db.query.users.findFirst({
        where: eq(schema.users.username, data.username),
        columns: { id: true, username: true, securityQuestion: true, securityAnswer: true },
      });
      if (!user || !user.securityAnswer) {
        return res.status(404).json({ success: false, message: "User not found or no security answer set" });
      }
      if (data.securityAnswer.toLowerCase() !== user.securityAnswer.toLowerCase()) {
        return res.status(400).json({ success: false, message: "Incorrect security answer" });
      }

      const resetToken = jwt.sign(
        { id: user.id, username: user.username, purpose: "password-reset" },
        JWT_SECRET,
        { expiresIn: "15m" }
      );
      return res.status(200).json({ success: true, message: "Security question verified successfully", resetToken });
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ success: false, message: "Validation error", errors: error.errors });
      }
      console.error("Error verifying security answer:", error);
      return res.status(500).json({ success: false, message: "Internal server error" });
    }
  });

  app.post("/api/auth/forgot-password/reset", async (req, res) => {
    try {
      const data = schema.resetPasswordSchema.parse(req.body);
      const resetToken = req.body.resetToken;
      if (!resetToken) return res.status(400).json({ success: false, message: "Reset token is required" });

      let decoded: any;
      try {
        decoded = jwt.verify(resetToken, JWT_SECRET) as { id: number; username: string; purpose: string };
      } catch (error) {
        return res.status(401).json({ success: false, message: "Invalid or expired reset token" });
      }

      if (decoded.purpose !== "password-reset" || decoded.username !== data.username) {
        return res.status(401).json({ success: false, message: "Invalid reset token" });
      }

      const user = await db.query.users.findFirst({ where: eq(schema.users.username, data.username) });
      if (!user) return res.status(404).json({ success: false, message: "User not found" });

      const hashedPassword = await bcrypt.hash(data.newPassword, 10);
      await db.update(schema.users).set({ password: hashedPassword }).where(eq(schema.users.id, user.id));

      return res.status(200).json({ success: true, message: "Password reset successful" });
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ success: false, message: "Validation error", errors: error.errors });
      }
      console.error("Error resetting password:", error);
      return res.status(500).json({ success: false, message: "Internal server error" });
    }
  });

  // =========================
  // Misc
  // =========================
  app.get("/api/health", (req, res) => {
    res.json({ success: true, message: "AGE(Altered) API is running", timestamp: new Date().toISOString() });
  });

  app.get("/api/user/me", authenticate, async (req, res) => {
    try {
      const userId = (req as any).user?.id;
      const user = await db.query.users.findFirst({
        where: eq(schema.users.id, userId),
        columns: { id: true, firstName: true, lastName: true, email: true, username: true, role: true },
      });
      if (!user) return res.status(404).json({ success: false, message: "User not found" });

      res.json({ success: true, user: { ...user, name: `${user.firstName} ${user.lastName}`.trim() } });
    } catch (error) {
      console.error("Get current user error:", error);
      res.status(500).json({ success: false, message: "Failed to fetch user info" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
