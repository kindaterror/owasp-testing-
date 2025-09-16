import { ReactNode } from "react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

interface VisitorLayoutProps {
  children: ReactNode;
}

export default function VisitorLayout({ children }: VisitorLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col">
      <Header variant="visitor" />
      <main className="flex-grow">
        {children}
      </main>
      <Footer />
    </div>
  );
}
