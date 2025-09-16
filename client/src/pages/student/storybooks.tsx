import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Logo } from "@/components/ui/logo";
import { Button } from "@/components/ui/button";
import { Menu,  ChevronLeft, Search,  BookOpen, Filter, Star, Target, Lightbulb, Heart, Sparkles} from "lucide-react";
import type { Book } from "@shared/schema";

// Import book images
import book1Image from "@/assets/books/book1.svg";
import book2Image from "@/assets/books/book2.svg";

export default function Storybooks() {
  // State for filter
  const [gradeFilter, setGradeFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  // Fetch books from the database
  const { data, isLoading, error } = useQuery({
    queryKey: ["/api/books", "storybook", gradeFilter, searchTerm],
    queryFn: async () => {
      let url = `/api/books?type=storybook`;
      if (gradeFilter !== "all") {
        url += `&grade=${gradeFilter}`;
      }
      if (searchTerm) {
        url += `&search=${encodeURIComponent(searchTerm)}`;
      }
      
      // FIXED: Add Authorization header
      const token = localStorage.getItem('token');
      const response = await fetch(url, {
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });
      
      if (!response.ok) {
        throw new Error("Failed to fetch books");
      }
      return response.json();
    }
  });

  // Use the fetched books or fallback to empty array
  const books = data?.books || [];

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-brand-navy-50 to-ilaw-white">
      {/* Header */}
      <header className="bg-ilaw-white shadow-lg border-b-2 border-brand-gold-200">
        <div className="container mx-auto py-4 px-6 flex justify-between items-center">
          <div className="flex items-center">
            <Logo className="h-16 w-auto" variant="student" />
          </div>
          <div className="flex items-center text-ilaw-gold">
            <Lightbulb className="h-6 w-6 mr-2" />
            <span className="font-heading font-semibold">Student Portal</span>
          </div>
        </div>
      </header>
      
      {/* Main content */}
      <main className="flex-grow p-4 md:p-8">
        <div className="container mx-auto max-w-6xl">
          {/* Hero Section - UPDATED: Softer background */}
          <div className="bg-gradient-to-r from-amber-100 to-yellow-100 rounded-2xl p-8 mb-8 text-ilaw-navy shadow-ilaw">
            <div className="flex items-center mb-4">
              <BookOpen className="h-10 w-10 mr-4" />
              <div>
                <span className="text-sm font-semibold uppercase tracking-wide opacity-80">
                  Ilaw ng Bayan Learning Institute
                </span>
              </div>
            </div>
            <h2 className="text-4xl md:text-5xl font-heading font-bold mb-4">Storybooks</h2>
            <p className="text-xl leading-relaxed opacity-90">
              Embark on incredible adventures and discover enchanting tales that will spark your imagination and fill your heart with wonder! ✨
            </p>
            <div className="mt-6 flex items-center">
              <Sparkles className="h-5 w-5 mr-2" />
              <span className="font-medium italic">Where Stories Come to Life</span>
            </div>
          </div>
          
          {/* Back button */}
          <div className="mb-8">
            <Link href="/student">
              <Button variant="outline" className="flex items-center gap-2 border-2 border-ilaw-gold text-ilaw-navy hover:bg-ilaw-gold font-semibold px-6 py-3">
                <ChevronLeft size={18} />
                Back to Dashboard
              </Button>
            </Link>
          </div>
          
          {/* Main content card */}
          <div className="bg-ilaw-white rounded-2xl shadow-lg border-2 border-brand-gold-200 p-8">
            <div className="flex items-center mb-6">
              <Target className="h-7 w-7 text-ilaw-gold mr-3" />
              <h3 className="text-2xl font-heading font-bold text-ilaw-navy">Discover Amazing Stories</h3>
            </div>
            
            {/* Enhanced filters - UPDATED: Softer background */}
            <div className="bg-gradient-to-br from-amber-50 to-ilaw-white p-6 rounded-xl border border-brand-gold-200 mb-8">
              <div className="flex flex-col md:flex-row gap-6">
                <div className="flex-1">
                  <label className="block text-sm font-semibold text-yellow-600 mb-2">Filter by Grade Level</label>
                  <div className="relative">
                    <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-brand-gold-400" size={18} />
                    <select 
                      value={gradeFilter} 
                      onChange={(e) => setGradeFilter(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 rounded-lg border-2 border-brand-gold-200 focus:border-ilaw-gold focus:ring-2 focus:ring-ilaw-gold/20 bg-ilaw-white font-medium text-ilaw-navy"
                    >
                      <option value="all">All Grades</option>
                      <option value="K">Kindergarten</option>
                      <option value="1">Grade 1</option>
                      <option value="2">Grade 2</option>
                      <option value="3">Grade 3</option>
                      <option value="4">Grade 4</option>
                      <option value="5">Grade 5</option>
                      <option value="6">Grade 6</option>
                    </select>
                  </div>
                </div>
                
                <div className="flex-2">
                  <label className="block text-sm font-semibold text-yellow-600 mb-2">Search Stories</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-brand-gold-400" size={18} />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search for adventures, characters, or themes..."
                      className="w-full pl-10 pr-4 py-3 rounded-lg border-2 border-brand-gold-200 focus:border-ilaw-gold focus:ring-2 focus:ring-ilaw-gold/20 bg-ilaw-white font-medium text-ilaw-navy placeholder-brand-gold-400"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Loading State */}
            {isLoading && (
              <div className="text-center py-12">
                <div className="flex items-center justify-center mb-4">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-ilaw-gold border-t-transparent"></div>
                </div>
                <p className="text-yellow-600 font-medium">Loading magical stories...</p>
              </div>
            )}

            {/* Error State */}
            {error && (
              <div className="text-center py-12">
                <div className="bg-red-50 border-2 border-red-200 rounded-xl p-6 max-w-md mx-auto">
                  <h4 className="text-red-700 font-semibold mb-2">Error Loading Stories</h4>
                  <p className="text-red-600">Please try refreshing the page or contact support.</p>
                </div>
              </div>
            )}

            {/* Book list - UPDATED: Softer card backgrounds */}
            {!isLoading && !error && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                {books.map((book: Book) => (
                  <Link key={book.id} href={`/student/storybooks/${book.id}`}>
                    <div className="group flex flex-col items-center p-6 bg-gradient-to-br from-ilaw-white to-amber-50 rounded-xl border-2 border-brand-gold-200 hover:border-ilaw-gold hover:shadow-ilaw transition-all duration-300 cursor-pointer hover:scale-105">
                      {book.coverImage ? (
                        <img 
                          src={book.coverImage} 
                          alt={book.title}
                          className="w-40 h-40 object-contain mb-6 group-hover:scale-110 transition-transform duration-300 rounded-lg"
                        />
                      ) : (
                        <div className="w-40 h-40 flex items-center justify-center bg-gradient-to-br from-amber-200 to-yellow-200 rounded-lg mb-6 group-hover:scale-110 transition-transform duration-300 shadow-ilaw">
                          <BookOpen className="w-16 h-16 text-ilaw-navy" />
                        </div>
                      )}
                      <h4 className="font-heading font-bold text-center text-ilaw-navy text-lg mb-4 line-clamp-2">{book.title}</h4>
                      <Button className="bg-ilaw-gold hover:bg-brand-amber text-ilaw-navy font-semibold px-6 py-3 group-hover:scale-105 transition-all duration-300 shadow-ilaw">
                        <Heart className="mr-2 h-4 w-4" />
                        Read Now
                      </Button>
                    </div>
                  </Link>
                ))}
              </div>
            )}

            {/* Empty State */}
            {!isLoading && !error && books.length === 0 && (
              <div className="text-center py-16">
                <BookOpen className="h-20 w-20 text-brand-gold-300 mx-auto mb-6" />
                <h4 className="text-2xl font-heading font-bold text-yellow-600 mb-4">No Stories Found</h4>
                <p className="text-yellow-600 mb-6 max-w-md mx-auto">
                  {searchTerm || gradeFilter !== "all" 
                    ? "Try adjusting your search criteria to discover more magical stories!" 
                    : "Amazing storybooks are being added to our collection. Check back soon for new adventures!"}
                </p>
                {(searchTerm || gradeFilter !== "all") && (
                  <Button 
                    onClick={() => {
                      setSearchTerm("");
                      setGradeFilter("all");
                    }}
                    variant="outline"
                    className="border-2 border-ilaw-gold text-ilaw-navy hover:bg-ilaw-gold font-semibold"
                  >
                    Clear Filters
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Motivational Section */}
          <div className="mt-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl p-8 text-center text-white">
            <Sparkles className="h-12 w-12 mx-auto mb-4" />
            <h3 className="text-2xl font-heading font-bold mb-4">Let Your Imagination Soar!</h3>
            <p className="text-lg font-medium mb-4">
              Every story you read opens a new world of wonder and possibility. Keep exploring, keep dreaming!
            </p>
            <div className="text-lg font-heading italic">
              Adventure awaits in every page! 🌟📖
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}