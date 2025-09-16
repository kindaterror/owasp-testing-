import { Request, Response } from 'express';
import { db } from '@db';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { sendVerificationEmail, sendPasswordResetEmail, sendWelcomeEmail } from '@/pages/api/emailService';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

// ✅ VERIFY EMAIL ENDPOINT
export async function verifyEmail(req: Request, res: Response) {
  try {
    const { token } = req.query;
    if (!token || typeof token !== 'string') {
      return res.status(400).json({ error: 'Invalid verification token' });
    }
    // Find user with this verification token
    const user = await db.select().from(users).where(eq(users.emailVerificationToken, token)).limit(1);
    if (user.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired verification token' });
    }
    const userData = user[0];
    // Check if token is expired (24 hours)
    if (userData.emailVerificationExpires && new Date() > userData.emailVerificationExpires) {
      return res.status(400).json({ error: 'Verification token has expired' });
    }
    // Update user as verified
    await db.update(users)
      .set({
        emailVerified: true,
        emailVerificationToken: null,
        emailVerificationExpires: null,
      })
      .where(eq(users.id, userData.id));
    // Send welcome email
    await sendWelcomeEmail(userData.email, (userData.firstName || userData.username || 'User'), userData.role);
    res.json({ message: 'Email verified successfully' });
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
// ✅ RESEND VERIFICATION ENDPOINT
export async function resendVerification(req: Request, res: Response) {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }
    // Find user by email
    const user = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (user.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    const userData = user[0];
    // Check if already verified
    if (userData.emailVerified) {
      return res.status(400).json({ error: 'Email is already verified' });
    }
    // Generate new verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    // Update user with new token
    await db.update(users)
      .set({
        emailVerificationToken: verificationToken,
        emailVerificationExpires: expiresAt,
      })
      .where(eq(users.id, userData.id));
    // Send verification email
    await sendVerificationEmail(userData.email, verificationToken, (userData.firstName || userData.username || 'User'));
    res.json({ message: 'Verification email sent successfully' });
  } catch (error) {
    console.error('Resend verification error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
// ✅ FORGOT PASSWORD ENDPOINT
export async function forgotPassword(req: Request, res: Response) {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }
    // Find user by email
    const user = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (user.length === 0) {
      // Don't reveal if email exists or not for security
      return res.json({ message: 'If that email exists, a password reset link has been sent' });
    }
    const userData = user[0];
    // Generate password reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    // Update user with reset token
    await db.update(users)
      .set({
        passwordResetToken: resetToken,
        passwordResetExpires: expiresAt,
      })
      .where(eq(users.id, userData.id));
    // Send password reset email
    await sendPasswordResetEmail(userData.email, resetToken, (userData.firstName || userData.username || 'User'));
    res.json({ message: 'If that email exists, a password reset link has been sent' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
// ✅ RESET PASSWORD ENDPOINT
export async function resetPassword(req: Request, res: Response) {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Token and new password are required' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }
    // Find user with this reset token
    const user = await db.select().from(users).where(eq(users.passwordResetToken, token)).limit(1);
    if (user.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }
    const userData = user[0];
    // Check if token is expired
    if (userData.passwordResetExpires && new Date() > userData.passwordResetExpires) {
      return res.status(400).json({ error: 'Reset token has expired' });
    }
    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    // Update user password and clear reset token
    await db.update(users)
      .set({
        password: hashedPassword,
        passwordResetToken: null,
        passwordResetExpires: null,
      })
      .where(eq(users.id, userData.id));
    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}