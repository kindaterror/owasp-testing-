import dotenv from 'dotenv';
dotenv.config();
import { db } from "./index";
import * as schema from "@shared/schema";
import bcrypt from "bcrypt";

async function seed() {
  try {
    console.log("Starting database seeding...");

    // Get admin credentials from environment variables with fallbacks
    const adminUsername = process.env.ADMIN_USERNAME || "admin";
    const adminEmail = process.env.ADMIN_EMAIL || "admin@ilawngbayan.edu.ph";
    const adminPassword = process.env.ADMIN_PASSWORD || "DefaultAdmin123!";
    const adminFirstName = process.env.ADMIN_FIRST_NAME || "System";
    const adminLastName = process.env.ADMIN_LAST_NAME || "Administrator";

    // Hash the admin password
    const hashedAdminPassword = await bcrypt.hash(adminPassword, 10);
    
    // Create admin user with environment-based credentials
    const [admin] = await db.insert(schema.users)
      .values({
        username: adminUsername,
        email: adminEmail,
        password: hashedAdminPassword,
        firstName: adminFirstName,
        lastName: adminLastName,
        role: "admin"
      })
      .returning()
      .onConflictDoNothing();
    
    console.log(`Admin user created or already exists: ${adminEmail}`);

    // Create student users with grade levels
    const studentPassword = await bcrypt.hash("student123", 10);
    const studentData = [
      {
        username: "johndoe",
        email: "john@example.com",
        password: studentPassword,
        firstName: "John",
        lastName: "Doe",
        role: "student",
        gradeLevel: "K"
      },
      {
        username: "sarahwilson",
        email: "sarah@example.com",
        password: studentPassword,
        firstName: "Sarah",
        lastName: "Wilson",
        role: "student",
        gradeLevel: "2"
      },
      {
        username: "michaeljohnson",
        email: "michael@example.com",
        password: studentPassword,
        firstName: "Michael",
        lastName: "Johnson",
        role: "student",
        gradeLevel: "4"
      },
      {
        username: "emilydavis",
        email: "emily@example.com",
        password: studentPassword,
        firstName: "Emily",
        lastName: "Davis",
        role: "student",
        gradeLevel: "1"
      },
      {
        username: "jacobbrown",
        email: "jacob@example.com",
        password: studentPassword,
        firstName: "Jacob",
        lastName: "Brown",
        role: "student",
        gradeLevel: "3"
      },
      {
        username: "sophiamiller",
        email: "sophia@example.com",
        password: studentPassword,
        firstName: "Sophia",
        lastName: "Miller",
        role: "student",
        gradeLevel: "5"
      },
      {
        username: "noahthomas",
        email: "noah@example.com",
        password: studentPassword,
        firstName: "Noah",
        lastName: "Thomas",
        role: "student",
        gradeLevel: "6"
      }
    ];

    for (const student of studentData) {
      await db.insert(schema.users)
        .values(student)
        .onConflictDoNothing();
    }
    console.log("Student users created or already exist");

    // Create sample books
    const storybooks = [
      {
        title: "The Magic Tree House",
        description: "Join Jack and Annie on their adventures through time and space in their magical tree house.",
        type: "storybook",
        grade: "2-3",
        rating: 4,
        ratingCount: 28,
        addedById: admin?.id
      },
      {
        title: "Charlotte's Web",
        description: "A tender story of friendship between a pig named Wilbur and a spider named Charlotte.",
        type: "storybook",
        grade: "2-3",
        rating: 5,
        ratingCount: 42,
        addedById: admin?.id
      },
      {
        title: "The Adventures of Tom",
        description: "A story about courage and friendship. Follow Tom on his exciting journey.",
        type: "storybook",
        grade: "4-5",
        rating: 4,
        ratingCount: 18,
        addedById: admin?.id
      },
      {
        title: "The Little Princess",
        description: "A classic tale of resilience. A young girl maintains her dignity and kindness despite adversity.",
        type: "storybook",
        grade: "4-5",
        rating: 5,
        ratingCount: 32,
        addedById: admin?.id
      },
      {
        title: "The Magical Forest",
        description: "Discover the enchanted creatures living in a magical forest and their adventures.",
        type: "storybook",
        grade: "K-1",
        rating: 4,
        ratingCount: 15,
        addedById: admin?.id
      }
    ];

    const educationalBooks = [
      {
        title: "Science Explorers",
        description: "Learn about weather, climate, and natural phenomena in an engaging way.",
        type: "educational",
        grade: "2-3",
        rating: 4,
        ratingCount: 24,
        addedById: admin?.id
      },
      {
        title: "Math Adventures",
        description: "Fun with numbers and shapes. Makes math accessible and enjoyable for young learners.",
        type: "educational",
        grade: "K-1",
        rating: 4,
        ratingCount: 19,
        addedById: admin?.id
      },
      {
        title: "Our World",
        description: "Exploring geography and cultures. Take a journey around the globe to discover new places.",
        type: "educational",
        grade: "4-5",
        rating: 4,
        ratingCount: 22,
        addedById: admin?.id
      },
      {
        title: "The Great Adventures",
        description: "A collection of stories about exploration and discovery throughout history.",
        type: "educational",
        grade: "4-5",
        rating: 4,
        ratingCount: 17,
        addedById: admin?.id
      },
      {
        title: "Science for Kids",
        description: "An introduction to basic scientific concepts with fun experiments for children.",
        type: "educational",
        grade: "2-3",
        rating: 5,
        ratingCount: 31,
        addedById: admin?.id
      }
    ];

    // Insert books
    for (const book of [...storybooks, ...educationalBooks]) {
      await db.insert(schema.books)
        .values(book)
        .onConflictDoNothing();
    }
    console.log("Sample books created or already exist");

    // Get all books
    const books = await db.query.books.findMany();
    
    // Get all student users
    const students = await db.query.users.findMany({
      where: (users, { eq }) => eq(users.role, "student")
    });

    // Create some sample reading progress
    if (students.length > 0 && books.length > 0) {
      // For each student, create progress records for some books
      for (const student of students) {
        // Select 2-3 random books for each student
        const numBooks = Math.floor(Math.random() * 2) + 2;
        const studentBooks = [...books].sort(() => 0.5 - Math.random()).slice(0, numBooks);
        
        for (const [index, book] of studentBooks.entries()) {
          // Calculate a random progress percentage
          let percentComplete;
          let currentChapter;
          
          if (index === 0) {
            // First book is in progress (25-75%)
            percentComplete = Math.floor(Math.random() * 51) + 25;
            currentChapter = "Chapter " + (Math.floor(percentComplete / 20) + 1);
          } else if (index === 1) {
            // Second book is complete (100%)
            percentComplete = 100;
            currentChapter = "Completed";
          } else {
            // Other books are just started (10-20%)
            percentComplete = Math.floor(Math.random() * 11) + 10;
            currentChapter = "Chapter 1";
          }
          
          // Calculate a plausible reading time (in minutes)
          const totalReadingTime = Math.floor(percentComplete * (60 + Math.random() * 60) / 100);
          
          // Create a progress record
          await db.insert(schema.progress)
            .values({
              userId: student.id,
              bookId: book.id,
              percentComplete,
              currentChapter,
              totalReadingTime,
              lastReadAt: new Date(Date.now() - Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000)) // Random time in the last week
            })
            .onConflictDoNothing();
        }
      }
      console.log("Sample reading progress created");
    }

    console.log("Database seeding completed successfully!");
    console.log(`Admin login: ${adminEmail} / ${adminPassword}`);
  } catch (error) {
    console.error("Error seeding database:", error);
  }
}

seed();