import { db } from "@db";
import * as schema from "@shared/schema";
import { eq, and, desc, asc } from "drizzle-orm";
import bcrypt from "bcrypt";

export const storage = {
  // User operations
  async getUserById(id: number) {
    return await db.query.users.findFirst({
      where: eq(schema.users.id, id),
      columns: {
        id: true,
        username: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        createdAt: true
      }
    });
  },

  async getUserByEmail(email: string) {
    return await db.query.users.findFirst({
      where: eq(schema.users.email, email)
    });
  },

  async createUser(user: schema.InsertUser) {
    const hashedPassword = await bcrypt.hash(user.password, 10);
    
    const [newUser] = await db.insert(schema.users)
      .values({
        ...user,
        password: hashedPassword
      })
      .returning({
        id: schema.users.id,
        username: schema.users.username,
        email: schema.users.email,
        firstName: schema.users.firstName,
        lastName: schema.users.lastName,
        role: schema.users.role
      });
    
    return newUser;
  },

  // Book operations
  async getBooks(type?: string) {
    if (type && type !== 'all') {
      return await db.query.books.findMany({
        where: eq(schema.books.type, type as any),
        orderBy: desc(schema.books.createdAt)
      });
    }
    
    return await db.query.books.findMany({
      orderBy: desc(schema.books.createdAt)
    });
  },

  async getBookById(id: number) {
    return await db.query.books.findFirst({
      where: eq(schema.books.id, id),
      with: {
        chapters: {
          orderBy: asc(schema.chapters.orderIndex)
        }
      }
    });
  },

  async createBook(book: schema.InsertBook) {
    const [newBook] = await db.insert(schema.books)
      .values(book)
      .returning();
    
    return newBook;
  },

  // Chapter operations
  async getChaptersByBookId(bookId: number) {
    return await db.query.chapters.findMany({
      where: eq(schema.chapters.bookId, bookId),
      orderBy: asc(schema.chapters.orderIndex)
    });
  },

  async createChapter(chapter: schema.InsertChapter) {
    const [newChapter] = await db.insert(schema.chapters)
      .values(chapter)
      .returning();
    
    return newChapter;
  },

  // Progress operations
  async getProgressByUserId(userId: number) {
    return await db.query.progress.findMany({
      where: eq(schema.progress.userId, userId),
      with: {
        book: true
      },
      orderBy: desc(schema.progress.lastReadAt)
    });
  },

  async getProgressByUserAndBookId(userId: number, bookId: number) {
    return await db.query.progress.findFirst({
      where: and(
        eq(schema.progress.userId, userId),
        eq(schema.progress.bookId, bookId)
      )
    });
  },

  async createOrUpdateProgress(progress: schema.InsertProgress) {
    const existingProgress = await this.getProgressByUserAndBookId(
      progress.userId,
      progress.bookId
    );
    
    if (existingProgress) {
      const [updatedProgress] = await db.update(schema.progress)
        .set({
          ...progress,
          lastReadAt: new Date()
        })
        .where(eq(schema.progress.id, existingProgress.id))
        .returning();
      
      return updatedProgress;
    }
    
    const [newProgress] = await db.insert(schema.progress)
      .values(progress)
      .returning();
    
    return newProgress;
  },

  // Student operations (for admin)
  async getAllStudents() {
    return await db.query.users.findMany({
      where: eq(schema.users.role, 'student'),
      columns: {
        id: true,
        username: true,
        email: true,
        firstName: true,
        lastName: true,
        gradeLevel: true,
        approvalStatus: true,
        createdAt: true
      }
    });
  },
  
  async getPendingStudents() {
    return await db.query.users.findMany({
      where: and(
        eq(schema.users.role, 'student'),
        eq(schema.users.approvalStatus, 'pending')
      ),
      columns: {
        id: true,
        username: true,
        email: true,
        firstName: true,
        lastName: true,
        gradeLevel: true,
        approvalStatus: true,
        createdAt: true
      }
    });
  },
  
  async approveStudent(id: number) {
    const [updatedUser] = await db.update(schema.users)
      .set({
        approvalStatus: 'approved'
      })
      .where(and(
        eq(schema.users.id, id),
        eq(schema.users.role, 'student')
      ))
      .returning({
        id: schema.users.id,
        username: schema.users.username,
        email: schema.users.email,
        firstName: schema.users.firstName,
        lastName: schema.users.lastName,
        role: schema.users.role,
        approvalStatus: schema.users.approvalStatus
      });
    
    return updatedUser;
  },
  
  async rejectStudent(id: number, reason: string) {
    const [updatedUser] = await db.update(schema.users)
      .set({
        approvalStatus: 'rejected',
        rejectionReason: reason
      })
      .where(and(
        eq(schema.users.id, id),
        eq(schema.users.role, 'student')
      ))
      .returning({
        id: schema.users.id,
        username: schema.users.username,
        email: schema.users.email,
        firstName: schema.users.firstName,
        lastName: schema.users.lastName,
        role: schema.users.role,
        approvalStatus: schema.users.approvalStatus,
        rejectionReason: schema.users.rejectionReason
      });
    
    return updatedUser;
  },

  // Page operations
  async getPagesByBookId(bookId: number) {
    return await db.query.pages.findMany({
      where: eq(schema.pages.bookId, bookId),
      orderBy: asc(schema.pages.pageNumber),
      with: {
        questions: true
      }
    });
  },

  async getPageById(id: number) {
    return await db.query.pages.findFirst({
      where: eq(schema.pages.id, id),
      with: {
        questions: true
      }
    });
  },

  async createPage(page: schema.InsertPage) {
    const [newPage] = await db.insert(schema.pages)
      .values(page)
      .returning();
    
    return newPage;
  },

  async updatePage(id: number, page: Partial<schema.InsertPage>) {
    const [updatedPage] = await db.update(schema.pages)
      .set(page)
      .where(eq(schema.pages.id, id))
      .returning();
    
    return updatedPage;
  },

  async deletePage(id: number) {
    return await db.delete(schema.pages)
      .where(eq(schema.pages.id, id))
      .returning();
  },

  // Question operations
  async getQuestionsByPageId(pageId: number) {
    return await db.query.questions.findMany({
      where: eq(schema.questions.pageId, pageId)
    });
  },

  async createQuestion(question: schema.InsertQuestion) {
    const [newQuestion] = await db.insert(schema.questions)
      .values(question)
      .returning();
    
    return newQuestion;
  },

  async updateQuestion(id: number, question: Partial<schema.InsertQuestion>) {
    const [updatedQuestion] = await db.update(schema.questions)
      .set(question)
      .where(eq(schema.questions.id, id))
      .returning();
    
    return updatedQuestion;
  },

  async deleteQuestion(id: number) {
    return await db.delete(schema.questions)
      .where(eq(schema.questions.id, id))
      .returning();
  }
};
