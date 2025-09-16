import { Request, Response } from 'express';
import { db } from '@db';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';

// ✅ CHECK USERNAME AND GET SECURITY QUESTION
export async function checkUsername(req: Request, res: Response) {
  try {
    const { username } = req.body;

    // Validate input
    if (!username) {
      return res.status(400).json({ 
        success: false, 
        message: 'Username is required' 
      });
    }

    if (username.length < 3) {
      return res.status(400).json({ 
        success: false, 
        message: 'Username must be at least 3 characters' 
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

    // Check if user has a security question set
    if (!userData.securityQuestion || !userData.securityAnswer) {
      return res.status(400).json({ 
        success: false, 
        message: 'No security question found for this account. Please use email reset instead.' 
      });
    }

    // Return the security question (but NOT the answer)
    res.json({ 
      success: true, 
      securityQuestion: userData.securityQuestion,
      message: 'Security question found'
    });

  } catch (error) {
    console.error('Check username error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
}