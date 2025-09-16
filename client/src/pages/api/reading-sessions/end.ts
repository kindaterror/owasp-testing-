// == IMPORTS & DEPENDENCIES ==
import jwt from 'jsonwebtoken';
import { db } from "@db";
import * as schema from "@shared/schema";
import { eq, and, isNull, sql } from "drizzle-orm";

// == CONSTANTS ==
const JWT_SECRET = process.env.JWT_SECRET || "adonai_grace_school_secret";

// == TYPE DEFINITIONS ==
interface JWTPayload {
  userId: number;
  role: string;
  username: string;
  iat?: number;
  exp?: number;
}

// == API HANDLER ==
export default async function handler(req: any, res: any) {
  console.log(`🛑 API endpoint /api/reading-sessions/end called`);
  console.log("📝 Request body:", req.body);
  
  // == METHOD VALIDATION ==
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  // == AUTHENTICATION ==
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    console.log("❌ No token provided");
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    // == TOKEN VERIFICATION ==
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    console.log("✅ Decoded token:", { userId: decoded.userId, role: decoded.role });
    
    // == AUTHORIZATION CHECK ==
    if (!decoded || (decoded.role !== 'student' && decoded.role !== 'teacher' && decoded.role !== 'admin')) {
      console.log("❌ Access denied for role:", decoded.role);
      return res.status(403).json({ message: 'Access denied' });
    }
    
    // == INPUT VALIDATION ==
    const { bookId } = req.body;
    
    if (!bookId) {
      console.log("❌ Missing bookId");
      return res.status(400).json({ message: 'Missing bookId' });
    }
    
    console.log(`📖 Ending reading session for user ${decoded.userId}, book ${bookId}`);
    
    // == FIND ACTIVE SESSION ==
    const activeSession = await db.query.readingSessions.findFirst({
      where: and(
        eq(schema.readingSessions.userId, decoded.userId),
        eq(schema.readingSessions.bookId, bookId),
        isNull(schema.readingSessions.endTime)
      )
    });

    if (!activeSession) {
      console.log("⚠️ No active session found");
      return res.status(404).json({ 
        success: false, 
        message: 'No active reading session found'
      });
    }
    
    // == CALCULATE SESSION DURATION ==
    const endTime = new Date();
    const startTime = new Date(activeSession.startTime);
    const totalSeconds = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);
    
    console.log(`⏱️ Session duration: ${totalSeconds} seconds`);
    
    // == UPDATE READING SESSION ==
    await db.update(schema.readingSessions)
      .set({
        endTime,
        totalMinutes: totalSeconds // Store seconds in this field (we'll rename later if needed)
      })
      .where(eq(schema.readingSessions.id, activeSession.id));
    
    // == UPDATE PROGRESS TABLE ==
    const existingProgress = await db.query.progress.findFirst({
      where: and(
        eq(schema.progress.userId, decoded.userId),
        eq(schema.progress.bookId, bookId)
      )
    });
    
    if (existingProgress) {
      // == UPDATE EXISTING PROGRESS ==
      console.log("🔄 Updating progress with new reading time");
      const existingTimeInSeconds = (existingProgress.totalReadingTime || 0);
      const newTotalReadingTime = existingTimeInSeconds + totalSeconds;
      
      await db.update(schema.progress)
        .set({
          totalReadingTime: newTotalReadingTime,
          lastReadAt: endTime
        })
        .where(eq(schema.progress.id, existingProgress.id));
        
      console.log(`📊 Updated total reading time: ${newTotalReadingTime} seconds`);
    } else {
      // == CREATE NEW PROGRESS RECORD ==
      console.log("➕ Creating new progress record with reading time");
      await db.insert(schema.progress).values({
        userId: decoded.userId,
        bookId,
        percentComplete: 0, // Will be updated by page progress
        totalReadingTime: totalSeconds,
        lastReadAt: endTime
      });
    }

    // == SUCCESS RESPONSE ==
    console.log("✅ Reading session ended successfully");
    return res.status(200).json({ 
      success: true, 
      message: 'Reading session ended successfully',
      data: {
        sessionId: activeSession.id,
        startTime: activeSession.startTime,
        endTime,
        totalSeconds,
        userId: decoded.userId,
        bookId
      }
    });
    
  } catch (error) {
    // == ERROR HANDLING ==
    console.error("❌ Error ending reading session:", error);
    return res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : String(error)
    });
  }
}