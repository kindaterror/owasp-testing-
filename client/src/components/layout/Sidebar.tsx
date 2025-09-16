// == IMPORTS & DEPENDENCIES ==
import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { Logo } from "@/components/ui/logo";
import {
  Home,
  LogOut,
  Menu,
  X,
  User,
  BookOpen,
  BarChart,
  Settings,
  Users,
  FileText,
  PlusCircle,
  Clock,
  GraduationCap,
} from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useMobile } from "@/hooks/use-mobile";

// == TYPE DEFINITIONS ==
type SidebarProps = {
  variant?: "visitor" | "admin" | "student" | "teacher";
};

// == SIDEBAR COMPONENT ==
export function Sidebar({ variant = "visitor" }: SidebarProps) {
  // == Hooks & State ==
  const [location, navigate] = useLocation();
  const isMobile = useMobile();
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);

  // == Effects ==
  useEffect(() => {
    if (isMobile && open) setOpen(false);
  }, [location, isMobile]); // eslint-disable-line react-hooks/exhaustive-deps

  // == Event Handlers ==
  const handleLogout = () => {
    logout();
    navigate("/");
  };

  // == Navigation Link Renderers ==
  const renderVisitorLinks = () => (
    <>
      <li>
        <Link
          href="/"
          className={`flex items-center px-4 py-2 rounded-lg mx-2 transition-all duration-200 ${
            location === "/"
              ? "bg-brand-gold-100 text-ilaw-navy border-l-4 border-ilaw-gold"
              : "hover:bg-ilaw-white hover:shadow-sm"
          }`}
        >
          <Home className="w-5 h-5 mr-3" />
          <span className="font-medium">Home</span>
        </Link>
      </li>
      <li>
        <a
          href="#about"
          className="flex items-center px-4 py-2 rounded-lg mx-2 hover:bg-ilaw-white hover:shadow-sm transition-all duration-200"
        >
          <FileText className="w-5 h-5 mr-3 text-ilaw-navy" />
          <span className="font-medium text-ilaw-gray">About Us</span>
        </a>
      </li>
      <li>
        <a
          href="#programs"
          className="flex items-center px-4 py-2 rounded-lg mx-2 hover:bg-ilaw-white hover:shadow-sm transition-all duration-200"
        >
          <BookOpen className="w-5 h-5 mr-3 text-ilaw-navy" />
          <span className="font-medium text-ilaw-gray">Programs</span>
        </a>
      </li>
      <li className="mt-6 px-4">
        <Link
          href="/login"
          className="block w-full py-3 px-4 bg-ilaw-gold text-ilaw-navy rounded-lg text-center hover:bg-brand-amber font-semibold shadow-ilaw hover:shadow-lg transition-all duration-200"
        >
          Log In
        </Link>
      </li>
    </>
  );

  const renderAdminLinks = () => (
    <>
      <div className="px-6 py-3 text-xs font-bold text-ilaw-navy uppercase tracking-wider bg-brand-gold-50 mx-2 rounded-lg">
        Management
      </div>
      <li>
        <Link
          href="/admin"
          className={`flex items-center px-4 py-2 rounded-lg mx-2 transition-all duration-200 ${
            location === "/admin"
              ? "bg-brand-gold-100 text-ilaw-navy border-l-4 border-ilaw-gold shadow-sm"
              : "hover:bg-ilaw-white hover:shadow-sm"
          }`}
        >
          <BarChart className="w-5 h-5 mr-3" />
          <span className="font-medium">Dashboard</span>
        </Link>
      </li>
      <li>
        <Link
          href="/admin/students"
          className={`flex items-center px-4 py-2 rounded-lg mx-2 transition-all duration-200 ${
            location === "/admin/students"
              ? "bg-brand-gold-100 text-ilaw-navy border-l-4 border-ilaw-gold shadow-sm"
              : "hover:bg-ilaw-white hover:shadow-sm"
          }`}
        >
          <Users className="w-5 h-5 mr-3" />
          <span className="font-medium">Students</span>
        </Link>
      </li>
      <li>
        <Link
          href="/admin/teacher"
          className={`flex items-center px-4 py-2 rounded-lg mx-2 transition-all duration-200 ${
            location === "/admin/teacher"
              ? "bg-brand-gold-100 text-ilaw-navy border-l-4 border-ilaw-gold shadow-sm"
              : "hover:bg-ilaw-white hover:shadow-sm"
          }`}
        >
          <GraduationCap className="w-5 h-5 mr-3" />
          <span className="font-medium">Teachers</span>
        </Link>
      </li>
      <li>
        <Link
          href="/admin/books"
          className={`flex items-center px-4 py-2 rounded-lg mx-2 transition-all duration-200 ${
            location === "/admin/books"
              ? "bg-brand-gold-100 text-ilaw-navy border-l-4 border-ilaw-gold shadow-sm"
              : "hover:bg-ilaw-white hover:shadow-sm"
          }`}
        >
          <BookOpen className="w-5 h-5 mr-3" />
          <span className="font-medium">Books</span>
        </Link>
      </li>
      <li>
        <Link
          href="/admin/add-book"
          className={`flex items-center px-4 py-2 rounded-lg mx-2 transition-all duration-200 ${
            location === "/admin/add-book"
              ? "bg-brand-gold-100 text-ilaw-navy border-l-4 border-ilaw-gold shadow-sm"
              : "hover:bg-ilaw-white hover:shadow-sm"
          }`}
        >
          <PlusCircle className="w-5 h-5 mr-3" />
          <span className="font-medium">Add Book</span>
        </Link>
      </li>
      <div className="px-6 py-3 mt-4 text-xs font-bold text-ilaw-navy uppercase tracking-wider bg-brand-gold-50 mx-2 rounded-lg">
        Settings
      </div>
      <li>
        <Link
          href="/admin/settings"
          className={`flex items-center px-4 py-2 rounded-lg mx-2 transition-all duration-200 ${
            location.startsWith("/admin/settings")
              ? "bg-brand-gold-100 text-ilaw-navy border-l-4 border-ilaw-gold shadow-sm"
              : "hover:bg-ilaw-white hover:shadow-sm"
          }`}
        >
          <Settings className="w-5 h-5 mr-3" />
          <span className="font-medium">Account Settings</span>
        </Link>
      </li>
      <li>
        <a
          onClick={handleLogout}
          className="flex items-center px-4 py-2 rounded-lg mx-2 hover:bg-red-50 text-red-600 cursor-pointer transition-all duration-200"
        >
          <LogOut className="w-5 h-5 mr-3" />
          <span className="font-medium">Log Out</span>
        </a>
      </li>
    </>
  );

  const renderTeacherLinks = () => (
    <>
      <div className="px-6 py-3 text-xs font-bold text-ilaw-navy uppercase tracking-wider bg-brand-navy-50 mx-2 rounded-lg">
        Management
      </div>
      <li>
        <Link
          href="/teacher"
          className={`flex items-center px-4 py-2 rounded-lg mx-2 transition-all duration-200 ${
            location === "/teacher"
              ? "bg-brand-navy-100 text-ilaw-navy border-l-4 border-brand-navy-400 shadow-sm"
              : "hover:bg-ilaw-white hover:shadow-sm"
          }`}
        >
          <BarChart className="w-5 h-5 mr-3" />
          <span className="font-medium">Dashboard</span>
        </Link>
      </li>
      <li>
        <Link
          href="/teacher/students"
          className={`flex items-center px-4 py-2 rounded-lg mx-2 transition-all duration-200 ${
            location === "/teacher/students"
              ? "bg-brand-navy-100 text-ilaw-navy border-l-4 border-brand-navy-400 shadow-sm"
              : "hover:bg-ilaw-white hover:shadow-sm"
          }`}
        >
          <Users className="w-5 h-5 mr-3" />
          <span className="font-medium">Students</span>
        </Link>
      </li>
      <li>
        <Link
          href="/teacher/books"
          className={`flex items-center px-4 py-2 rounded-lg mx-2 transition-all duration-200 ${
            location === "/teacher/books"
              ? "bg-brand-navy-100 text-ilaw-navy border-l-4 border-brand-navy-400 shadow-sm"
              : "hover:bg-ilaw-white hover:shadow-sm"
          }`}
        >
          <BookOpen className="w-5 h-5 mr-3" />
          <span className="font-medium">Books</span>
        </Link>
      </li>
      <li>
        <Link
          href="/teacher/add-book"
          className={`flex items-center px-4 py-2 rounded-lg mx-2 transition-all duration-200 ${
            location === "/teacher/add-book"
              ? "bg-brand-navy-100 text-ilaw-navy border-l-4 border-brand-navy-400 shadow-sm"
              : "hover:bg-ilaw-white hover:shadow-sm"
          }`}
        >
          <PlusCircle className="w-5 h-5 mr-3" />
          <span className="font-medium">Add Book</span>
        </Link>
      </li>
      <div className="px-6 py-3 mt-4 text-xs font-bold text-ilaw-navy uppercase tracking-wider bg-brand-navy-50 mx-2 rounded-lg">
        Settings
      </div>
      <li>
        <Link
          href="/teacher/settings"
          className={`flex items-center px-4 py-2 rounded-lg mx-2 transition-all duration-200 ${
            location.startsWith("/teacher/settings")
              ? "bg-brand-navy-100 text-ilaw-navy border-l-4 border-brand-navy-400 shadow-sm"
              : "hover:bg-ilaw-white hover:shadow-sm"
          }`}
        >
          <Settings className="w-5 h-5 mr-3" />
          <span className="font-medium">Account Settings</span>
        </Link>
      </li>
      <li>
        <a
          onClick={handleLogout}
          className="flex items-center px-4 py-2 rounded-lg mx-2 hover:bg-red-50 text-red-600 cursor-pointer transition-all duration-200"
        >
          <LogOut className="w-5 h-5 mr-3" />
          <span className="font-medium">Log Out</span>
        </a>
      </li>
    </>
  );

  const renderStudentLinks = () => (
    <>
      <div className="px-6 py-3 text-xs font-bold text-ilaw-navy uppercase tracking-wider bg-brand-amber mx-2 rounded-lg">
        Learning
      </div>
      <li>
        <Link
          href="/student"
          className={`flex items-center px-4 py-2 rounded-lg mx-2 transition-all duration-200 ${
            location === "/student"
              ? "bg-brand-gold-100 text-ilaw-navy border-l-4 border-brand-amber shadow-sm"
              : "hover:bg-ilaw-white hover:shadow-sm"
          }`}
        >
          <BarChart className="w-5 h-5 mr-3" />
          <span className="font-medium">Dashboard</span>
        </Link>
      </li>
      <li>
        <Link
          href="/student/storybooks"
          className={`flex items-center px-4 py-2 rounded-lg mx-2 transition-all duration-200 ${
            location === "/student/storybooks"
              ? "bg-brand-gold-100 text-ilaw-navy border-l-4 border-brand-amber shadow-sm"
              : "hover:bg-ilaw-white hover:shadow-sm"
          }`}
        >
          <BookOpen className="w-5 h-5 mr-3" />
          <span className="font-medium">Storybooks</span>
        </Link>
      </li>
      <li>
        <Link
          href="/student/educational-books"
          className={`flex items-center px-4 py-2 rounded-lg mx-2 transition-all duration-200 ${
            location === "/student/educational-books"
              ? "bg-brand-gold-100 text-ilaw-navy border-l-4 border-brand-amber shadow-sm"
              : "hover:bg-ilaw-white hover:shadow-sm"
          }`}
        >
          <BookOpen className="w-5 h-5 mr-3" />
          <span className="font-medium">Educational Books</span>
        </Link>
      </li>
      <li>
        <Link
          href="/student/progress"
          className={`flex items-center px-4 py-2 rounded-lg mx-2 transition-all duration-200 ${
            location === "/student/progress"
              ? "bg-brand-gold-100 text-ilaw-navy border-l-4 border-brand-amber shadow-sm"
              : "hover:bg-ilaw-white hover:shadow-sm"
          }`}
        >
          <Clock className="w-5 h-5 mr-3" />
          <span className="font-medium">My Progress</span>
        </Link>
      </li>
      <div className="px-6 py-3 mt-4 text-xs font-bold text-ilaw-navy uppercase tracking-wider bg-brand-amber mx-2 rounded-lg">
        Account
      </div>
      <li>
        <Link
          href="/student/settings"
          className={`flex items-center px-4 py-2 rounded-lg mx-2 transition-all duration-200 ${
            location.startsWith("/student/settings")
              ? "bg-brand-gold-100 text-ilaw-navy border-l-4 border-brand-amber shadow-sm"
              : "hover:bg-ilaw-white hover:shadow-sm"
          }`}
        >
          <Settings className="w-5 h-5 mr-3" />
          <span className="font-medium">Settings</span>
        </Link>
      </li>
      <li>
        <a
          onClick={handleLogout}
          className="flex items-center px-4 py-2 rounded-lg mx-2 hover:bg-red-50 text-red-600 cursor-pointer transition-all duration-200"
        >
          <LogOut className="w-5 h-5 mr-3" />
          <span className="font-medium">Log Out</span>
        </a>
      </li>
    </>
  );

  // == User Info Renderer ==
  const userInfo = () => {
    if (!user) return null;

    const avatar = (user as any)?.avatar as string | undefined;

    return (
      <div className="p-4 border-b border-brand-gold-200 bg-gradient-to-r from-brand-gold-50 to-brand-amber">
        <div className="flex items-center">
          {avatar ? (
            <img
              src={avatar}
              alt="User Avatar"
              className="h-12 w-12 rounded-full object-cover mr-3 shadow-sm border border-gray-200"
              onError={(e) => ((e.currentTarget as HTMLImageElement).style.display = "none")}
            />
          ) : (
            <div
              className={`h-12 w-12 rounded-full ${
                variant === "admin"
                  ? "bg-ilaw-gold text-ilaw-navy"
                  : variant === "teacher"
                  ? "bg-brand-navy-100 text-ilaw-navy"
                  : "bg-brand-amber text-ilaw-navy"
              } flex items-center justify-center mr-3 shadow-sm`}
            >
              <User className="h-6 w-6" />
            </div>
          )}
          <div>
            <div className="font-semibold text-ilaw-navy">
              {user.firstName} {user.lastName}
            </div>
            <div className="text-sm text-ilaw-gray">{user.email}</div>
            <div className="text-xs text-ilaw-navy font-medium mt-1">
              {variant === "admin" ? "Administrator" : variant === "teacher" ? "Teacher" : "Student"}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // == Render Component ==
  return (
    <>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="p-2 hover:bg-brand-gold-100 hover:text-ilaw-navy">
            <Menu className="h-6 w-6" />
            <span className="sr-only">Toggle menu</span>
          </Button>
        </SheetTrigger>

        <SheetContent
          side="left"
          className="p-0 w-64 bg-gradient-to-b from-ilaw-white to-brand-gold-50 [&>button[data-dismiss]]:hidden [&>button]:hidden"
        >
          {/* == Header Section == */}
          <div className="p-4 border-b border-brand-gold-200 bg-ilaw-white">
            <div className="flex justify-between items-center">
              <div className="flex flex-col">
                <Logo variant={variant} className="h-12 w-auto hover:animate-torch-glow transition-all duration-300" />
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setOpen(false)}
                className="h-8 w-8 hover:bg-brand-gold-100 hover:text-ilaw-navy"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* == User Info Section == */}
          {variant !== "visitor" && userInfo()}

          {/* == Navigation Section == */}
          <nav className="py-4">
            <ul className="space-y-1">
              {variant === "visitor" && renderVisitorLinks()}
              {variant === "admin" && renderAdminLinks()}
              {variant === "teacher" && renderTeacherLinks()}
              {variant === "student" && renderStudentLinks()}
            </ul>
          </nav>
        </SheetContent>
      </Sheet>
    </>
  );
}

// == EXPORTS ==
export default Sidebar;