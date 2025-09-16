// == IMPORTS & DEPENDENCIES ==
import type { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import * as schema from '@shared/schema';
import { eq, desc, or, and } from 'drizzle-orm';
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

// == HELPER: Get teacher settings
async function getTeacherSettings(userId: number) {
  const settings = await db
    .select()
    .from(schema.teachingSettings)
    .where(eq(schema.teachingSettings.userId, userId))
    .limit(1);
  return settings.length > 0 ? settings[0] : null;
}

// == GET HANDLER ==
export async function GET(req: Request, res: Response) {
  console.log("=== TEACHERBOOK API GET ===");

  try {
    const user = authenticate(req);
    if (user.role !== "teacher") {
      return res.status(403).json({ message: "Access denied" });
    }

    const { id } = req.query;

    // If querying a specific book by ID
    if (id) {
      const bookId = parseInt(id as string);
      const book = await db.query.books.findFirst({
        where: eq(schema.books.id, bookId),
      });

      if (!book) {
        console.log("Book not found with ID:", bookId);
        return res.status(404).json({ message: "Book not found" });
      }
      return res.status(200).json({ book });
    }

    // Otherwise, get books filtered by teacher settings
    const settings = await getTeacherSettings(user.id);
    if (!settings) {
      console.warn("No settings found for teacher — returning all books");
      const books = await db.select().from(schema.books).orderBy(desc(schema.books.createdAt));
      return res.status(200).json({ books });
    }

    // Build filters from teacher settings
    const gradeConditions = (settings.preferredGrades || []).map((grade: string) =>
      eq(schema.books.grade, grade.replace("Grade ", ""))
    );
    const subjectConditions = (settings.subjects || []).map((subject: string) =>
      eq(schema.books.subject, subject)
    );

    console.log("Grade filter conditions:", gradeConditions);
    console.log("Subject filter conditions:", subjectConditions);

    const filterConditions = [];
    if (gradeConditions.length > 0) filterConditions.push(or(...gradeConditions));
    if (subjectConditions.length > 0) filterConditions.push(or(...subjectConditions));

    let books;
    if (filterConditions.length > 0) {
      books = await db
        .select()
        .from(schema.books)
        .where(and(...filterConditions))
        .orderBy(desc(schema.books.createdAt));
    } else {
      console.warn("No filters applied, returning all books");
      books = await db.select().from(schema.books).orderBy(desc(schema.books.createdAt));
    }

    return res.status(200).json({ books });
  } catch (error) {
    console.error("Error fetching teacher books:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage === "Authentication required" || errorMessage === "Invalid or expired token") {
      return res.status(401).json({ message: errorMessage });
    }
    return res.status(500).json({ message: "Internal server error" });
  }
}

// == PUT HANDLER ==
export async function PUT(req: Request, res: Response) {
  console.log("=== TEACHERBOOK API PUT ===");

  try {
    const user = authenticate(req);
    if (user.role !== "teacher") {
      return res.status(403).json({ message: "Access denied" });
    }

    const bookId = parseInt(req.query.id as string);
    const { title, description, type, grade, subject, coverImage, musicUrl } = req.body;

    if (!title || !description || !type || !grade) {
      return res.status(400).json({
        message: "Validation error",
        errors: "Title, description, type, and grade are required",
      });
    }

    const book = await db.query.books.findFirst({
      where: eq(schema.books.id, bookId),
    });

    if (!book) {
      return res.status(404).json({ message: "Book not found" });
    }

    const [updatedBook] = await db.update(schema.books)
      .set({
        title,
        description,
        type,
        grade,
        subject: subject || null,
        coverImage: coverImage || null,
        musicUrl: musicUrl || null,
      })
      .where(eq(schema.books.id, bookId))
      .returning();

    console.log("Book updated successfully:", updatedBook);

    return res.status(200).json({
      message: "Book updated successfully",
      book: updatedBook,
    });
  } catch (error) {
    console.error("Error updating teacher book:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage === "Authentication required" || errorMessage === "Invalid or expired token") {
      return res.status(401).json({ message: errorMessage });
    }
    return res.status(500).json({ message: "Internal server error" });
  }
}

// == POST HANDLER ==
export async function POST(req: Request, res: Response) {
  try {
    const user = authenticate(req);
    if (user.role !== "teacher") {
      return res.status(403).json({ message: "Access denied" });
    }

    const { title, description, type, grade, subject, coverImage, musicUrl } = req.body;

    if (!title || !description || !type || !grade) {
      return res.status(400).json({
        message: "Validation error",
        errors: "Title, description, type, and grade are required",
      });
    }

    const [newBook] = await db.insert(schema.books)
      .values({
        title,
        description,
        type,
        grade,
        subject: subject || null,
        coverImage: coverImage || null,
        musicUrl: musicUrl || null,
        addedById: user.id,
      })
      .returning();

    return res.status(201).json({
      message: "Book created successfully",
      book: newBook,
    });
  } catch (error) {
    console.error("Error creating teacher book:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage === "Authentication required" || errorMessage === "Invalid or expired token") {
      return res.status(401).json({ message: errorMessage });
    }
    return res.status(500).json({ message: "Internal server error" });
  }
}

// == DELETE HANDLER ==
export async function DELETE(req: Request, res: Response) {
  try {
    const user = authenticate(req);
    if (user.role !== "teacher") {
      return res.status(403).json({ message: "Access denied" });
    }

    const bookId = parseInt(req.query.id as string);

    const book = await db.query.books.findFirst({
      where: eq(schema.books.id, bookId),
    });

    if (!book) {
      return res.status(404).json({ message: "Book not found" });
    }

    await db.delete(schema.books)
      .where(eq(schema.books.id, bookId));

    return res.status(200).json({
      message: "Book deleted successfully",
      id: bookId,
    });
  } catch (error) {
    console.error("Error deleting teacher book:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage === "Authentication required" || errorMessage === "Invalid or expired token") {
      return res.status(401).json({ message: errorMessage });
    }
    return res.status(500).json({ message: "Internal server error" });
  }
}
