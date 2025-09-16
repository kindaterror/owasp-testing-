// == IMPORTS & DEPENDENCIES ==
import { Request, Response } from 'express';
import { db } from '@db';
import * as schema from '@shared/schema';
import { isNotNull, eq } from 'drizzle-orm';

// == MAIN API HANDLER ==
export default async function handler(req: Request, res: Response) {
  
  // == METHOD VALIDATION ==
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    console.log("=== FETCHING DASHBOARD STATS ===");
    
    // == FETCH READING SESSIONS ==
    const allSessions = await db.select()
      .from(schema.readingSessions)
      .where(isNotNull(schema.readingSessions.endTime));
    
    // == CALCULATE AVERAGE READING TIME ==
    const completedSessions = allSessions.filter(session => 
      session.totalMinutes && session.totalMinutes > 0
    );
    
    const avgReadingTime = completedSessions.length > 0 
      ? Math.round(
          completedSessions.reduce((sum, session) => sum + (session.totalMinutes || 0), 0) 
          / completedSessions.length
        )
      : 25; // fallback to 25 minutes
    
    // == FETCH PROGRESS DATA ==
    const allProgress = await db.select({
      id: schema.progress.id,
      userId: schema.progress.userId,
      bookId: schema.progress.bookId,
      percentComplete: schema.progress.percentComplete,
      userFirstName: schema.users.firstName,
      userLastName: schema.users.lastName,
      bookTitle: schema.books.title
    })
    .from(schema.progress)
    .leftJoin(schema.users, eq(schema.progress.userId, schema.users.id))
    .leftJoin(schema.books, eq(schema.progress.bookId, schema.books.id));
    
    console.log("📊 Total progress records found:", allProgress.length);
    
    // == FILTER COMPLETED BOOKS ==
    const completedBooks = allProgress.filter((p) => {
      const isComplete = (p.percentComplete || 0) >= 100;
      if (isComplete) {
        const userName = (p.userFirstName && p.userLastName) 
          ? `${p.userFirstName} ${p.userLastName}` 
          : "Unknown User";
        const bookTitle = p.bookTitle || "Unknown Book";
        console.log(`✅ Found completed book: User ${userName} completed ${bookTitle} (${p.percentComplete}%)`);
      }
      return isComplete;
    });
    
    // == CALCULATE COMPLETION RATES ==
    const allUserIds = allProgress.map(p => p.userId);
    const completedUserIds = completedBooks.map(p => p.userId);
    const uniqueUsers = Array.from(new Set(allUserIds));
    const usersWithCompletedBooks = Array.from(new Set(completedUserIds));
    
    const completionRate = uniqueUsers.length > 0 
      ? Math.round((usersWithCompletedBooks.length / uniqueUsers.length) * 100)
      : 0;
    
    const bookCompletionRate = allProgress.length > 0 
      ? Math.round((completedBooks.length / allProgress.length) * 100)
      : 0;
    
    // == BUILD STATS OBJECT ==
    const stats = {
      avgReadingTime: avgReadingTime,
      completionRate: completionRate, // User-based completion rate
      totalSessions: allSessions.length,
      totalReadingMinutes: completedSessions.reduce((sum, session) => 
        sum + (session.totalMinutes || 0), 0
      ),
      debug: {
        totalProgressRecords: allProgress.length,
        completedBooksCount: completedBooks.length,
        uniqueUsersCount: uniqueUsers.length,
        usersWithCompletedBooksCount: usersWithCompletedBooks.length,
        userBasedCompletionRate: completionRate,
        bookBasedCompletionRate: bookCompletionRate,
        sampleProgressRecords: allProgress.slice(0, 3).map(p => ({
          userId: p.userId,
          bookId: p.bookId,
          percentComplete: p.percentComplete,
          bookTitle: p.bookTitle || "Unknown",
          userName: (p.userFirstName && p.userLastName) 
            ? `${p.userFirstName} ${p.userLastName}` 
            : "Unknown"
        }))
      }
    };
    
    // == DEBUG LOGGING ==
    console.log("=== DASHBOARD STATS CALCULATED ===");
    console.log(`📈 Completion Rate: ${completionRate}% (${usersWithCompletedBooks.length}/${uniqueUsers.length} users)`);
    console.log(`📚 Completed Books: ${completedBooks.length}/${allProgress.length} progress records`);
    console.log(`⏱️ Average Reading Time: ${avgReadingTime} minutes`);
    
    // == SUCCESS RESPONSE ==
    return res.status(200).json({
      success: true,
      stats: stats
    });
    
  } catch (error) {
    // == ERROR HANDLING ==
    console.error("Error fetching dashboard stats:", error);
    return res.status(500).json({ 
      success: false, 
      message: "Internal server error" 
    });
  }
}