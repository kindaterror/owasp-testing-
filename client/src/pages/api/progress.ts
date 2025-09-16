// == IMPORTS & DEPENDENCIES ==
import jwt from 'jsonwebtoken';
import { db } from "@db";
import * as schema from "@shared/schema";
import { eq, and } from "drizzle-orm";

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

// == MAIN API HANDLER ==
export default async function handler(req: any, res: any) {
  console.log(`🔍 API endpoint /api/progress called with method: ${req.method}`);
  
  // == METHOD ROUTING ==
  if (req.method === 'GET') {
    return handleGetProgress(req, res);
  } 
  
  if (req.method === 'POST') {
    return handlePostProgress(req, res);
  }
  
  return res.status(405).json({ message: 'Method not allowed' });
}

// == GET PROGRESS HANDLER ==
async function handleGetProgress(req: any, res: any) {
  
  // == AUTHENTICATION ==
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    console.log("❌ No token provided");
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    // == TOKEN VERIFICATION ==
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    console.log("✅ Decoded token:", decoded);
    console.log("✅ Token role:", decoded.role);
    
    // == AUTHORIZATION CHECK ==
    if (!decoded || (decoded.role !== 'teacher' && decoded.role !== 'admin')) {
      console.log("❌ Access denied for role:", decoded.role);
      return res.status(403).json({ message: 'Access denied' });
    }
    
    console.log("🔍 Starting database query for progress...");
    
    // == FETCH PROGRESS DATA ==
    const progress = await db.query.progress.findMany({
      with: {
        book: {
          columns: {
            id: true,
            title: true,
            description: true,
            type: true,
            grade: true,
            coverImage: true
          }
        },
        user: {
          columns: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            username: true,
            gradeLevel: true
          }
        }
      },
      orderBy: (progress, { desc }) => [desc(progress.lastReadAt)]
    });
    
    console.log("✅ Database query completed");
    console.log("📊 Progress records found:", progress.length);
    
    // == DEBUG LOGGING ==
    if (progress.length > 0) {
      console.log("📝 Sample progress record:", {
        id: progress[0].id,
        userId: progress[0].userId,
        bookId: progress[0].bookId,
        percentComplete: progress[0].percentComplete,
        bookTitle: progress[0].book?.title || "No book title",
        userName: progress[0].user ? `${progress[0].user.firstName} ${progress[0].user.lastName}` : "No user"
      });
      
      console.log("🔍 Total progress records:", progress.length);
    } else {
      console.log("⚠️ No progress records found in database");
      
      // == DIAGNOSTIC CHECKS ==
      try {
        const allProgress = await db.select().from(schema.progress).limit(5);
        console.log("🔍 Raw progress table check:", allProgress.length, "records");
        if (allProgress.length > 0) {
          console.log("📝 Raw progress sample:", allProgress[0]);
        }
      } catch (rawError) {
        console.log("❌ Error checking raw progress table:", rawError);
      }
      
      try {
        const userCount = await db.select().from(schema.users).limit(1);
        const bookCount = await db.select().from(schema.books).limit(1);
        console.log("🔍 Users in DB:", userCount.length > 0 ? "Yes" : "No");
        console.log("🔍 Books in DB:", bookCount.length > 0 ? "Yes" : "No");
      } catch (countError) {
        console.log("❌ Error checking users/books:", countError);
      }
    }
    
    // == SUCCESS RESPONSE ==
    return res.status(200).json({ 
      success: true,
      progress: progress || [],
      totalProgress: progress?.length || 0,
      debug: {
        queryCompleted: true,
        recordsFound: progress.length,
        hasRelations: progress.length > 0 && progress[0].book && progress[0].user
      }
    });
    
  } catch (error) {
    // == ERROR HANDLING ==
    console.error('❌ Error in /api/progress GET endpoint:', error);
    return res.status(500).json({ 
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

// == POST PROGRESS HANDLER ==
async function handlePostProgress(req: any, res: any) {
  console.log("📝 Saving progress update:", req.body);
  
  // == AUTHENTICATION ==
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    console.log("❌ No token provided for POST");
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    // == TOKEN VERIFICATION ==
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    console.log("✅ POST - Decoded token:", { userId: decoded.userId, role: decoded.role });
    
    // == AUTHORIZATION CHECK ==
    if (!decoded || (decoded.role !== 'student' && decoded.role !== 'teacher' && decoded.role !== 'admin')) {
      console.log("❌ Access denied for role:", decoded.role);
      return res.status(403).json({ message: 'Access denied' });
    }
    
    // == INPUT VALIDATION ==
    const { bookId, percentComplete } = req.body;
    
    if (!bookId || percentComplete === undefined) {
      console.log("❌ Missing required fields:", { bookId, percentComplete });
      return res.status(400).json({ message: 'Missing bookId or percentComplete' });
    }
    
    console.log(`📊 Updating progress for user ${decoded.userId}, book ${bookId}, progress ${percentComplete}%`);
    
    // == CHECK EXISTING PROGRESS ==
    const existingProgress = await db.query.progress.findFirst({
      where: and(
        eq(schema.progress.userId, decoded.userId),
        eq(schema.progress.bookId, bookId)
      )
    });

    if (existingProgress) {
      // == UPDATE EXISTING PROGRESS ==
      console.log("🔄 Updating existing progress record:", existingProgress.id);
      await db.update(schema.progress)
        .set({
          percentComplete,
          lastReadAt: new Date()
        })
        .where(eq(schema.progress.id, existingProgress.id));
    } else {
      // == CREATE NEW PROGRESS ==
      console.log("➕ Creating new progress record");
      await db.insert(schema.progress).values({
        userId: decoded.userId,
        bookId,
        percentComplete,
        totalReadingTime: 0, // Initialize with 0, will be updated by reading sessions
        lastReadAt: new Date()
      });
    }

    // == SUCCESS RESPONSE ==
    console.log("✅ Progress saved successfully");
    return res.status(200).json({ 
      success: true, 
      message: 'Progress updated successfully',
      data: { userId: decoded.userId, bookId, percentComplete }
    });
    
  } catch (error) {
    // == ERROR HANDLING ==
    console.error("❌ Error saving progress:", error);
    return res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : String(error)
    });
  }
}