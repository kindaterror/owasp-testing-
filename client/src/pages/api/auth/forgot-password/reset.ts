import { Request, Response } from 'express';
import { db } from '@db';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

// ✅ RESET PASSWORD WITH SECURITY VERIFICATION TOKEN
export async function resetPassword(req: Request, res: Response) {
  try {
    const { username, newPassword, confirmPassword, resetToken } = req.body;

    // Validate input
    if (!username || !newPassword || !confirmPassword || !resetToken) {
      return res.status(400).json({ 
        success: false, 
        message: 'All fields are required' 
      });
    }

    // Check password match
    if (newPassword !== confirmPassword) {
      return res.status(400).json({ 
        success: false, 
        message: 'Passwords do not match' 
      });
    }

    // Check password length
    if (newPassword.length < 6) {
      return res.status(400).json({ 
        success: false, 
        message: 'Password must be at least 6 characters long' 
      });
    }

    // Find user by username
    const user = await db.select().from(users).where(eq(users.username, username)).limit(1);

    if (user.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Username not found' 
      });
    }

    const userData = user[0];

    // Verify reset token
    if (!userData.passwordResetToken || userData.passwordResetToken !== resetToken) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid or expired reset token' 
      });
    }

    // Check if token is expired
    if (userData.passwordResetExpires && new Date() > userData.passwordResetExpires) {
      return res.status(400).json({ 
        success: false, 
        message: 'Reset token has expired. Please start the process again.' 
      });
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

    // Return success
    res.json({ 
      success: true, 
      message: 'Password reset successfully. You can now log in with your new password.'
    });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
}