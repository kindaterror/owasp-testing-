// == IMPORTS & DEPENDENCIES ==
import { Link } from "wouter";
import { Logo } from "@/components/ui/logo";
import { Facebook, Twitter, Instagram, Send, Mail, Phone, MapPin } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

// == FOOTER COMPONENT ==
export default function Footer() {
  return (
    <footer className="bg-gradient-to-b from-ilaw-navy to-brand-navy-900 text-ilaw-white py-12">
      <div className="container mx-auto px-4">
        
        {/* == Main Content Grid == */}
        <div className="grid md:grid-cols-4 gap-8">
          
          {/* == School Information Section == */}
          <div className="md:col-span-2">
            <div className="flex items-center mb-6">
              <Logo variant="visitor" className="bg-transparent border border-ilaw-gold text-ilaw-gold mb-4 hover:animate-torch-glow transition-all duration-300" />
              <div className="ml-4">
                <h2 className="font-heading text-xl font-bold text-ilaw-gold">
                  Ilaw ng Bayan
                </h2>
                <p className="text-brand-gold-200 text-sm font-medium">
                  Learning Institute
                </p>
              </div>
            </div>
            <p className="text-brand-gold-100 mb-6 leading-relaxed">
              Illuminating minds, empowering futures through exceptional education and comprehensive development. 
              Building tomorrow's leaders with wisdom, integrity, and excellence.
            </p>
            
            {/* == Contact Details == */}
            <div className="space-y-3">
              <div className="flex items-center text-brand-gold-200">
                <MapPin className="h-4 w-4 mr-3 text-ilaw-gold" />
                <span className="text-sm">123 Education Street, Learning City, Philippines</span>
              </div>
              <div className="flex items-center text-brand-gold-200">
                <Phone className="h-4 w-4 mr-3 text-ilaw-gold" />
                <span className="text-sm">+63 (02) 123-4567</span>
              </div>
              <div className="flex items-center text-brand-gold-200">
                <Mail className="h-4 w-4 mr-3 text-ilaw-gold" />
                <span className="text-sm">info@ilawngbayan.edu.ph</span>
              </div>
            </div>
          </div>
          
          {/* == Quick Links Section == */}
          <div>
            <h3 className="font-heading text-lg font-semibold mb-6 text-ilaw-gold border-b border-brand-gold-200 pb-2">
              Quick Links
            </h3>
            <ul className="space-y-3">
              <li>
                <Link href="/" className="text-brand-gold-200 hover:text-ilaw-gold transition-colors duration-200 flex items-center">
                  <span className="w-1 h-1 bg-ilaw-gold rounded-full mr-2"></span>
                  Home
                </Link>
              </li>
              <li>
                <a href="#about" className="text-brand-gold-200 hover:text-ilaw-gold transition-colors duration-200 flex items-center">
                  <span className="w-1 h-1 bg-ilaw-gold rounded-full mr-2"></span>
                  About Us
                </a>
              </li>
              <li>
                <a href="#programs" className="text-brand-gold-200 hover:text-ilaw-gold transition-colors duration-200 flex items-center">
                  <span className="w-1 h-1 bg-ilaw-gold rounded-full mr-2"></span>
                  Programs
                </a>
              </li>
              <li>
                <a href="#facilities" className="text-brand-gold-200 hover:text-ilaw-gold transition-colors duration-200 flex items-center">
                  <span className="w-1 h-1 bg-ilaw-gold rounded-full mr-2"></span>
                  Facilities
                </a>
              </li>
              <li>
                <a href="#contact" className="text-brand-gold-200 hover:text-ilaw-gold transition-colors duration-200 flex items-center">
                  <span className="w-1 h-1 bg-ilaw-gold rounded-full mr-2"></span>
                  Contact
                </a>
              </li>
              <li>
                <Link href="/login" className="text-brand-gold-200 hover:text-ilaw-gold transition-colors duration-200 flex items-center">
                  <span className="w-1 h-1 bg-ilaw-gold rounded-full mr-2"></span>
                  Student Portal
                </Link>
              </li>
            </ul>
          </div>

          {/* == Social & Newsletter Section == */}
          <div>
            <h3 className="font-heading text-lg font-semibold mb-6 text-ilaw-gold border-b border-brand-gold-200 pb-2">
              Connect With Us
            </h3>
            
            {/* == Social Media Links == */}
            <div className="flex space-x-4 mb-6">
              <a href="#" className="bg-brand-gold-200 hover:bg-ilaw-gold text-ilaw-navy hover:text-ilaw-navy h-10 w-10 rounded-full flex items-center justify-center transition-all duration-200 hover:shadow-ilaw">
                <Facebook className="h-5 w-5" />
              </a>
              <a href="#" className="bg-brand-gold-200 hover:bg-ilaw-gold text-ilaw-navy hover:text-ilaw-navy h-10 w-10 rounded-full flex items-center justify-center transition-all duration-200 hover:shadow-ilaw">
                <Twitter className="h-5 w-5" />
              </a>
              <a href="#" className="bg-brand-gold-200 hover:bg-ilaw-gold text-ilaw-navy hover:text-ilaw-navy h-10 w-10 rounded-full flex items-center justify-center transition-all duration-200 hover:shadow-ilaw">
                <Instagram className="h-5 w-5" />
              </a>
            </div>

            {/* == Newsletter Signup == */}
            <div>
              <h4 className="text-brand-gold-100 font-medium mb-3">Stay Updated</h4>
              <div className="flex space-x-2">
                <Input 
                  placeholder="Your email" 
                  className="bg-brand-navy-800 border-brand-gold-200 text-ilaw-white placeholder:text-brand-gold-300 focus:border-ilaw-gold"
                />
                <Button 
                  size="icon" 
                  className="bg-ilaw-gold hover:bg-brand-amber text-ilaw-navy hover:shadow-ilaw transition-all duration-200"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
        
        {/* == Footer Bottom Section == */}
        <div className="border-t border-brand-gold-200 mt-10 pt-8">
          
          {/* == Copyright & Legal Links == */}
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="text-center md:text-left">
              <p className="text-brand-gold-200 text-sm">
                &copy; {new Date().getFullYear()} Ilaw ng Bayan Learning Institute. All rights reserved.
              </p>
              <p className="text-brand-gold-300 text-xs mt-1">
                Illuminating minds • Empowering futures • Building excellence
              </p>
            </div>
            
            <div className="flex space-x-6 text-xs text-brand-gold-300">
              <a href="#" className="hover:text-ilaw-gold transition-colors duration-200">Privacy Policy</a>
              <a href="#" className="hover:text-ilaw-gold transition-colors duration-200">Terms of Service</a>
              <a href="#" className="hover:text-ilaw-gold transition-colors duration-200">Accessibility</a>
            </div>
          </div>
          
          {/* == School Motto == */}
          <div className="text-center mt-6 pt-6 border-t border-brand-gold-300">
            <p className="text-ilaw-gold font-heading font-semibold italic">
              "Guiding Light of Knowledge, Beacon of Excellence"
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}