// == IMPORTS & DEPENDENCIES ==
import jwt from 'jsonwebtoken';
import { db } from "@db";
import * as schema from "@shared/schema";
import { eq, and, isNull } from "drizzle-orm";

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
  console.log(`🎯 API endpoint /api/books/[id]/complete called`);
  console.log("📝 Request method:", req.method);
  console.log("📝 Book ID:", req.query.id);
  
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
    const bookId = parseInt(req.query.id as string);
    
    if (!bookId || isNaN(bookId)) {
      console.log("❌ Invalid book ID:", req.query.id);
      return res.status(400).json({ message: 'Invalid book ID' });
    }
    
    console.log(`🏆 Marking book ${bookId} as completed for user ${decoded.userId}`);

    // == DATABASE OPERATIONS ==
    
    // Check if progress record exists
    const existingProgress = await db.query.progress.findFirst({
      where: and(
        eq(schema.progress.userId, decoded.userId),
        eq(schema.progress.bookId, bookId)
      )
    });

    if (existingProgress) {
      // == UPDATE EXISTING PROGRESS ==
      console.log("🔄 Updating existing progress to 100%");
      console.log(`📊 Current reading time: ${existingProgress.totalReadingTime} minutes`);
      
      await db.update(schema.progress)
        .set({
          percentComplete: 100,
          lastReadAt: new Date()
          // ✅ Don't touch totalReadingTime - it's already correct from end.ts!
        })
        .where(eq(schema.progress.id, existingProgress.id));
        
    } else {
      // == CREATE NEW PROGRESS RECORD ==
      console.log("➕ Creating new progress record at 100%");
      await db.insert(schema.progress).values({
        userId: decoded.userId,
        bookId,
        percentComplete: 100,
        totalReadingTime: 0, // Will be updated by reading sessions
        lastReadAt: new Date()
      });
    }

    // == SUCCESS RESPONSE ==
    console.log("✅ Book marked as completed successfully");
    return res.status(200).json({ 
      success: true, 
      message: 'Book marked as completed successfully',
      data: { 
        userId: decoded.userId, 
        bookId, 
        percentComplete: 100,
        completedAt: new Date()
      }
    });
    
  } catch (error) {
    // == ERROR HANDLING ==
    console.error("❌ Error marking book as completed:", error);
    return res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : String(error)
    });
  }
}