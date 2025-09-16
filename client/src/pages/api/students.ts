// == IMPORTS & DEPENDENCIES ==
import jwt from 'jsonwebtoken';
import { db } from "@db";
import * as schema from "@shared/schema";
import { eq, and, or, like, asc } from "drizzle-orm";

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
  console.log("=== STUDENTS API CALLED - NEW VERSION ===");
  console.log("API endpoint /api/students called"); 
  
  // == AUTHENTICATION ==
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    // == TOKEN VERIFICATION ==
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    console.log("Full decoded token:", JSON.stringify(decoded, null, 2));
    console.log("Decoded token:", decoded);
    console.log("Token role:", decoded.role);
    
    // == AUTHORIZATION CHECK ==
    if (!decoded || (decoded.role !== 'teacher' && decoded.role !== 'admin')) {
      console.log("Access denied for role:", decoded.role);
      return res.status(403).json({ message: 'Access denied' });
    }
    
    // == FETCH STUDENTS ==
    const students = await db
      .select()
      .from(schema.users)
      .where(and(
        eq(schema.users.role, 'student'),
        eq(schema.users.approvalStatus, 'approved')
      ))
      .orderBy(asc(schema.users.lastName));
    
    console.log("Students found:", students.length);
    
    // == FETCH PROGRESS DATA ==
    let progress: any[] = [];
    if (students.length > 0) {
      progress = await db.query.progress.findMany({
        with: {
          book: true
        }
      });
    }
    
    // == FETCH BOOKS DATA ==
    const books = await db.query.books.findMany();
    
    // == PROCESS STUDENT DATA ==
    const studentsWithData = students.map(student => {
      const studentProgress = progress.filter(p => p.userId === student.id);
      const completedBooks = studentProgress.filter(p => {
        const percent = typeof p.percentComplete === 'number' 
          ? p.percentComplete 
          : parseFloat(p.percentComplete?.toString() || '0');
        return percent >= 99.5;
      });

      return {
        ...student,
        booksCompleted: completedBooks.length
      };
    });
    
    // == SUCCESS RESPONSE ==
    return res.status(200).json({ 
      students: studentsWithData,
      totalStudents: studentsWithData.length,
      progress: progress,
      books: books
    });
    
  } catch (error) {
    // == ERROR HANDLING ==
    
    // JWT-specific errors
    if (error instanceof jwt.JsonWebTokenError || error instanceof jwt.TokenExpiredError || error instanceof jwt.NotBeforeError) {
      console.error("JWT verification failed:", error);
      console.error("Token that failed:", token);
      return res.status(401).json({ 
        message: 'Invalid token',
        error: error.message
      });
    }
    
    // General errors
    console.error('Error in /api/students endpoint:', error);
    return res.status(500).json({ 
      message: 'Internal server error',
      error: error instanceof Error ? error.message : String(error)
    });
  }
}