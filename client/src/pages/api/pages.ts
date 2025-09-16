// == IMPORTS & DEPENDENCIES ==
import type { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import * as schema from '@shared/schema';
import { eq } from 'drizzle-orm';
import { db } from '@db';

// == CONSTANTS ==
const JWT_SECRET = process.env.JWT_SECRET || "adonai_grace_school_secret";

// == UTILITY FUNCTIONS ==
const authenticate = (req: Request) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) throw new Error("Authentication required");
  
  try {
    return jwt.verify(token, JWT_SECRET) as any;
  } catch (error) {
    throw new Error("Invalid or expired token");
  }
};

// == GET HANDLER ==
export async function GET(req: Request, res: Response) {
  console.log("=== CLIENT API PAGES GET ===");
  const { id } = req.query;
  
  try {
    if (id) {
      // == FETCH SINGLE PAGE ==
      const pageId = parseInt(id as string, 10);
      const page = await db.query.pages.findFirst({
        where: eq(schema.pages.id, pageId),
        with: {
          questions: true
        }
      });
      
      if (!page) {
        return res.status(404).json({ message: "Page not found" });
      }
      
      // NOTE: page now includes `shuffleQuestions` because it's a column in `pages`
      return res.status(200).json({ page });
    } else {
      return res.status(400).json({ message: "Page ID is required" });
    }
  } catch (error) {
    // == ERROR HANDLING ==
    console.error("Error fetching page:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

// == PUT HANDLER ==
export async function PUT(req: Request, res: Response) {
  console.log("=== CLIENT API PAGES PUT ===");
  
  try {
    // == AUTHENTICATION & AUTHORIZATION ==
    const user = authenticate(req);
    if (user.role !== 'admin') {
      return res.status(403).json({ message: "Access denied" });
    }
    
    // == INPUT VALIDATION ==
    const pageId = parseInt(req.query.id as string, 10);
    const { title, content, imageUrl, pageNumber, questions, shuffleQuestions } = req.body as {
      title?: string;
      content?: string;
      imageUrl?: string;
      pageNumber?: number;
      questions?: Array<{
        questionText: string;
        answerType?: string;
        correctAnswer?: string;
        options?: string;
      }>;
      shuffleQuestions?: boolean; // ← NEW
    };
    
    console.log("=== CLIENT API: Request data ===");
    console.log("Page ID:", pageId);
    console.log("Questions received:", JSON.stringify(questions, null, 2));
    
    if (!content || pageNumber === undefined || pageNumber === null) {
      return res.status(400).json({ 
        message: "Content and page number are required" 
      });
    }
    
    // == FIND EXISTING PAGE ==
    const page = await db.query.pages.findFirst({
      where: eq(schema.pages.id, pageId)
    });
    
    if (!page) {
      return res.status(404).json({ message: "Page not found" });
    }
    
    // == UPDATE PAGE ==
    const updateData: any = {
      title: title || '',
      content: content.trim(),
      imageUrl: imageUrl || '',
      pageNumber
    };

    // ← NEW: only set shuffleQuestions if caller provided a boolean
    if (typeof shuffleQuestions === 'boolean') {
      updateData.shuffleQuestions = shuffleQuestions;
    }
    
    const [updatedPage] = await db.update(schema.pages)
      .set(updateData)
      .where(eq(schema.pages.id, pageId))
      .returning();
    
    // == HANDLE QUESTIONS ==
    if (questions && Array.isArray(questions)) {
      console.log("=== CLIENT API: Updating questions ===", questions.length, "questions");
      
      // Delete existing questions for this page
      await db.delete(schema.questions)
        .where(eq(schema.questions.pageId, pageId));
      
      console.log("=== CLIENT API: Deleted existing questions ===");
      
      // Create new questions
      for (const question of questions) {
        if (question.questionText && question.questionText.trim()) {
          const newQuestion = await db.insert(schema.questions)
            .values({
              pageId: pageId,
              questionText: question.questionText.trim(),
              answerType: question.answerType || 'text',
              correctAnswer: question.correctAnswer || '',
              options: question.options || ''
            })
            .returning();
          
          console.log("=== CLIENT API: Created question ===", newQuestion[0]);
        }
      }
      
      console.log("=== CLIENT API: Questions updated successfully ===");
    } else {
      console.log("=== CLIENT API: No questions to update ===");
    }
    
    console.log("=== CLIENT API: Page updated successfully ===", updatedPage);
    
    // == SUCCESS RESPONSE ==
    return res.status(200).json({
      message: "Page updated successfully",
      page: updatedPage
    });
  } catch (error) {
    // == ERROR HANDLING ==
    console.error("=== CLIENT API: Error updating page ===", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage === "Authentication required" || errorMessage === "Invalid or expired token") {
      return res.status(401).json({ message: errorMessage });
    }
    return res.status(500).json({ message: "Internal server error" });
  }
}

// == POST HANDLER ==
export async function POST(req: Request, res: Response) {
  console.log("=== CLIENT API PAGES POST ===");
  
  try {
    // == AUTHENTICATION & AUTHORIZATION ==
    const user = authenticate(req);
    if (user.role !== 'admin') {
      return res.status(403).json({ message: "Access denied" });
    }
    
    // == INPUT VALIDATION ==
    const { title, content, imageUrl, pageNumber, bookId, questions, shuffleQuestions } = req.body as {
      title?: string;
      content: string;
      imageUrl?: string;
      pageNumber: number;
      bookId: number;
      questions?: Array<{
        questionText: string;
        answerType?: string;
        correctAnswer?: string;
        options?: string;
      }>;
      shuffleQuestions?: boolean; // ← NEW
    };
    
    if (!content || pageNumber === undefined || pageNumber === null || !bookId) {
      return res.status(400).json({ 
        message: "Content, page number, and book ID are required for new pages" 
      });
    }
    
    // == CREATE NEW PAGE ==
    const [newPage] = await db.insert(schema.pages)
      .values({
        title: title || '',
        content: content.trim(),
        imageUrl: imageUrl || '',
        pageNumber,
        bookId,
        // ← NEW: default to false if not sent
        shuffleQuestions: typeof shuffleQuestions === 'boolean' ? shuffleQuestions : false
      })
      .returning();
    
    console.log("=== CLIENT API: Created new page ===", newPage);
    
    // == HANDLE QUESTIONS FOR NEW PAGE ==
    if (questions && Array.isArray(questions) && newPage.id) {
      console.log("=== CLIENT API: Creating questions for new page ===", questions);
      
      for (const question of questions) {
        if (question.questionText && question.questionText.trim()) {
          const newQuestion = await db.insert(schema.questions)
            .values({
              pageId: newPage.id,
              questionText: question.questionText.trim(),
              answerType: question.answerType || 'text',
              correctAnswer: question.correctAnswer || '',
              options: question.options || ''
            })
            .returning();
          
          console.log("=== CLIENT API: Created question for new page ===", newQuestion[0]);
        }
      }
    }
    
    // == SUCCESS RESPONSE ==
    return res.status(201).json({
      message: "Page created successfully",
      page: newPage
    });
  } catch (error) {
    // == ERROR HANDLING ==
    console.error("Error creating page:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage === "Authentication required" || errorMessage === "Invalid or expired token") {
      return res.status(401).json({ message: errorMessage });
    }
    return res.status(500).json({ message: "Internal server error" });
  }
}

// == DELETE HANDLER ==
export async function DELETE(req: Request, res: Response) {
  console.log("=== CLIENT API PAGES DELETE ===");
  
  try {
    // == AUTHENTICATION & AUTHORIZATION ==
    const user = authenticate(req);
    if (user.role !== 'admin') {
      return res.status(403).json({ message: "Access denied" });
    }
    
    // == INPUT VALIDATION ==
    const pageId = parseInt(req.query.id as string, 10);
    
    // == FIND EXISTING PAGE ==
    const page = await db.query.pages.findFirst({
      where: eq(schema.pages.id, pageId)
    });
    
    if (!page) {
      return res.status(404).json({ message: "Page not found" });
    }
    
    // == DELETE RELATED DATA ==
    await db.delete(schema.questions)
      .where(eq(schema.questions.pageId, pageId));
    
    console.log("=== CLIENT API: Deleted questions for page ===", pageId);
    
    // == DELETE PAGE ==
    await db.delete(schema.pages)
      .where(eq(schema.pages.id, pageId));
    
    console.log("=== CLIENT API: Deleted page ===", pageId);
    
    // == SUCCESS RESPONSE ==
    return res.status(200).json({
      message: "Page deleted successfully",
      id: pageId
    });
  } catch (error) {
    // == ERROR HANDLING ==
    console.error("Error deleting page:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage === "Authentication required" || errorMessage === "Invalid or expired token") {
      return res.status(401).json({ message: errorMessage });
    }
    return res.status(500).json({ message: "Internal server error" });
  }
}
