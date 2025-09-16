import { Request, Response } from 'express';
import { db } from '@db';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

// ✅ VERIFY SECURITY ANSWER AND GENERATE RESET TOKEN
export async function verifySecurity(req: Request, res: Response) {
  try {
    const { username, securityAnswer } = req.body;

    // Validate input
    if (!username || !securityAnswer) {
      return res.status(400).json({ 
        success: false, 
        message: 'Username and security answer are required' 
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

    // Check if user has security question/answer set
    if (!userData.securityQuestion || !userData.securityAnswer) {
      return res.status(400).json({ 
        success: false, 
        message: 'No security question found for this account' 
      });
    }

    // Verify the security answer (case-insensitive comparison)
    const userAnswer = securityAnswer.trim().toLowerCase();
    const storedAnswer = userData.securityAnswer.trim().toLowerCase();

    if (userAnswer !== storedAnswer) {
      return res.status(400).json({ 
        success: false, 
        message: 'Incorrect security answer. Please try again.' 
      });
    }

    // Generate a temporary reset token for this session
    const resetToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Store the reset token temporarily
    await db.update(users)
      .set({
        passwordResetToken: resetToken,
        passwordResetExpires: expiresAt,
      })
      .where(eq(users.id, userData.id));

    // Return success with reset token
    res.json({ 
      success: true, 
      resetToken: resetToken,
      message: 'Security answer verified successfully'
    });

  } catch (error) {
    console.error('Verify security error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
}