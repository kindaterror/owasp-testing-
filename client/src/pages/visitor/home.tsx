import { useState, useRef, useEffect } from "react";
import { Link } from "wouter";
import VisitorLayout from "./index";
import { ChevronRight, School, BookOpen, ChevronDown, ChevronUp, GraduationCap, Users, Award, Heart} from "lucide-react";
import schoolBuilding from '@/assets/school image/school building.jpg';
import elementaryschool from '@/assets/school image/elementary.jpg';
import kindergarden from '@/assets/school image/kindergarden.jpg';
import legorobot from '@/assets/school image/lego.jpg';

// Add this reusable component for animated expanding content
const ExpandableContent = ({ isExpanded, children }: { isExpanded: boolean; children: React.ReactNode }) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);
  
  useEffect(() => {
    if (contentRef.current) {
      const contentHeight = isExpanded ? contentRef.current.scrollHeight : 0;
      setHeight(contentHeight);
    }
  }, [isExpanded]);
  
  return (
    <div 
      className="overflow-hidden transition-all duration-300 ease-in-out"
      style={{ height: `${height}px`, opacity: isExpanded ? 1 : 0 }}
    >
      <div ref={contentRef} className="pt-4 border-t border-brand-gold-200 text-yellow-600 mt-4">
        {children}
      </div>
    </div>
  );
};

export default function Home() {
  // State to track which programs are expanded
  const [expandedPrograms, setExpandedPrograms] = useState({
    kindergarden: false,
    elementary: false,
    digitalLiteracy: false
  });
  
  // Function to toggle program expansion
  const toggleProgram = (program: 'kindergarden' | 'elementary' | 'digitalLiteracy') => {
    setExpandedPrograms({
      ...expandedPrograms,
      [program]: !expandedPrograms[program]
    });
  };

  return (
    <VisitorLayout>
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-ilaw-navy via-brand-navy-800 to-brand-navy-900 text-ilaw-white overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-20 h-20 border-2 border-ilaw-gold rounded-full"></div>
          <div className="absolute top-32 right-20 w-16 h-16 border-2 border-brand-amber rounded-full"></div>
          <div className="absolute bottom-20 left-1/4 w-12 h-12 border-2 border-ilaw-gold rounded-full"></div>
        </div>
        
        <div className="container mx-auto px-4 py-16 md:py-24 relative z-10">
          <div className="max-w-4xl">
            <div className="mb-6">
              <span className="inline-block bg-ilaw-gold text-ilaw-navy px-4 py-2 rounded-full text-sm font-semibold tracking-wide uppercase">
                Ilaw ng Bayan Learning Institute
              </span>
            </div>
            <h1 className="font-heading text-4xl md:text-6xl font-bold mb-6 leading-tight">
              Illuminating Minds,{" "}
              <span className="text-ilaw-gold font-extrabold">
                Empowering Futures
              </span>
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-brand-gold-100 leading-relaxed max-w-3xl">
              Guiding light of knowledge and excellence in education. Where every student discovers their potential and builds the foundation for extraordinary achievements.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <a href="#programs" className="group bg-ilaw-gold hover:bg-brand-amber text-ilaw-navy py-4 px-8 rounded-lg font-semibold text-center transition-all duration-300 hover:shadow-ilaw hover:scale-105 flex items-center justify-center">
                Explore Our Programs
                <ChevronRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </a>
              <Link href="/login">
                <button className="bg-transparent border-2 border-ilaw-gold hover:bg-ilaw-gold hover:text-ilaw-navy text-ilaw-gold py-4 px-8 rounded-lg font-semibold text-center transition-all duration-300 hover:shadow-ilaw">
                  Log in Portal
                </button>
              </Link>
            </div>
            
            {/* School Motto */}
            <div className="mt-12 pt-8 border-t border-brand-gold-200">
              <p className="text-ilaw-gold font-heading text-lg italic font-medium">
                "Liwanag, Kaalaman, Paglilingkod" • Light, Knowledge, Service
              </p>
            </div>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-ilaw-white to-transparent"></div>
      </section>

      {/* About Section */}
      <section id="about" className="py-20 bg-ilaw-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <div className="inline-block mb-4">
              <GraduationCap className="h-12 w-12 text-ilaw-gold mx-auto mb-4" />
            </div>
            <h2 className="font-heading text-4xl md:text-5xl font-bold text-ilaw-navy mb-6">
              About Ilaw ng Bayan Learning Institute
            </h2>
            <div className="w-32 h-1 bg-gradient-to-r from-ilaw-gold to-brand-amber mx-auto mb-6"></div>
            <p className="text-xl text-yellow-600 max-w-3xl mx-auto">
              A beacon of educational excellence, illuminating the path to knowledge and success for every student.
            </p>
          </div>
          
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="rounded-2xl overflow-hidden shadow-2xl group">
              <img 
                src={schoolBuilding} 
                alt="Ilaw ng Bayan Learning Institute Building" 
                className="w-full h-96 object-cover group-hover:scale-105 transition-transform duration-500"
              />
            </div>
            
            <div className="space-y-8">
              <div className="bg-gradient-to-br from-brand-gold-50 to-ilaw-white p-8 rounded-2xl border border-brand-gold-200 hover:shadow-ilaw transition-all duration-300">
                <div className="flex items-center mb-4">
                  <div className="bg-ilaw-gold p-3 rounded-full mr-4">
                    <Heart className="h-6 w-6 text-ilaw-navy" />
                  </div>
                  <h3 className="font-heading text-2xl font-bold text-ilaw-navy">Our Mission</h3>
                </div>
                <p className="text-yellow-600 leading-relaxed">
                  To illuminate minds and empower futures by providing exceptional education that nurtures intellectual curiosity, moral character, and social responsibility in every student.
                </p>
              </div>
              
              <div className="bg-gradient-to-br from-brand-navy-50 to-ilaw-white p-8 rounded-2xl border border-brand-gold-200 hover:shadow-navy transition-all duration-300">
                <div className="flex items-center mb-4">
                  <div className="bg-ilaw-navy p-3 rounded-full mr-4">
                    <Award className="h-6 w-6 text-ilaw-gold" />
                  </div>
                  <h3 className="font-heading text-2xl font-bold text-ilaw-navy">Our Vision</h3>
                </div>
                <p className="text-yellow-600 leading-relaxed">
                  To be the guiding light of education in our community, inspiring lifelong learners who will become compassionate leaders and innovative thinkers of tomorrow.
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-6 mt-8">
                <div className="bg-ilaw-gold p-6 rounded-xl text-center group hover:bg-brand-amber transition-all duration-300 hover:scale-105">
                  <School className="h-10 w-10 text-ilaw-navy mx-auto mb-3" />
                  <h4 className="font-semibold text-ilaw-navy text-lg">Expert Educators</h4>
                  <p className="text-ilaw-navy/80 text-sm mt-2">Dedicated & qualified teachers</p>
                </div>
                <div className="bg-ilaw-navy p-6 rounded-xl text-center group hover:bg-brand-navy-800 transition-all duration-300 hover:scale-105">
                  <BookOpen className="h-10 w-10 text-ilaw-gold mx-auto mb-3" />
                  <h4 className="font-semibold text-ilaw-gold text-lg">Premium Resources</h4>
                  <p className="text-brand-gold-200 text-sm mt-2">State-of-the-art facilities</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Programs Section */}
      <section id="programs" className="py-20 bg-gradient-to-br from-brand-gold-50 to-ilaw-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <div className="inline-block mb-4">
              <Users className="h-12 w-12 text-ilaw-gold mx-auto mb-4" />
            </div>
            <h2 className="font-heading text-4xl md:text-5xl font-bold text-ilaw-navy mb-6">Our Educational Programs</h2>
            <div className="w-32 h-1 bg-gradient-to-r from-ilaw-gold to-brand-amber mx-auto mb-6"></div>
            <p className="max-w-3xl mx-auto text-xl text-yellow-600">
              Comprehensive educational programs designed to illuminate every student's path to success and personal growth.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Kindergarden Program */}
            <div className="bg-ilaw-white rounded-2xl shadow-lg overflow-hidden border border-brand-gold-200 hover:shadow-ilaw transition-all duration-300 group">
              <div className="h-56 overflow-hidden relative">
                <div className="absolute top-4 left-4 bg-ilaw-gold text-ilaw-navy px-3 py-1 rounded-full text-sm font-semibold z-10">
                  Foundation
                </div>
                <img 
                   src={kindergarden} 
                   alt="Kindergarden Program" 
                   className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                 />
              </div>
              <div className="p-8">
                <h3 className="font-heading text-2xl font-bold mb-3 text-ilaw-navy">Kindergarden</h3>
                <p className="text-yellow-600 mb-6 leading-relaxed">
                  Building strong foundations through play-based learning, creativity, and early literacy development.
                </p>
                <button 
                  onClick={() => toggleProgram('kindergarden')} 
                  className="text-ilaw-gold font-semibold hover:text-brand-amber transition-colors flex items-center group"
                >
                  Discover More 
                  {expandedPrograms.kindergarden ? 
                    <ChevronUp className="h-5 w-5 ml-2 group-hover:-translate-y-1 transition-transform" /> : 
                    <ChevronDown className="h-5 w-5 ml-2 group-hover:translate-y-1 transition-transform" />
                  }
                </button>
                
                <ExpandableContent isExpanded={expandedPrograms.kindergarden}>
                  <div className="flex flex-col space-y-4">
                    <p className="leading-relaxed">
                      Our Kindergarden program nurtures young minds through interactive play, creative arts, basic mathematics, storytelling, and social skills development in a warm, supportive environment.
                    </p>
                    
                    <div className="grid grid-cols-2 gap-3 mt-4">
                      <img 
                        src="/images/kindergarden-activity-1.jpg" 
                        alt="Kindergarden Activity" 
                        className="rounded-lg w-full h-32 object-cover hover:scale-105 transition-transform"
                      />
                      <img 
                        src="/images/kindergarden-activity-2.jpg" 
                        alt="Kindergarden Classroom" 
                        className="rounded-lg w-full h-32 object-cover hover:scale-105 transition-transform"
                      />
                    </div>
                  </div>
                </ExpandableContent>
              </div>
            </div>

            {/* Elementary Program */}
            <div className="bg-ilaw-white rounded-2xl shadow-lg overflow-hidden border border-brand-gold-200 hover:shadow-ilaw transition-all duration-300 group">
              <div className="h-56 overflow-hidden relative">
                <div className="absolute top-4 left-4 bg-ilaw-navy text-ilaw-gold px-3 py-1 rounded-full text-sm font-semibold z-10">
                  Core Learning
                </div>
                <img 
                   src={elementaryschool} 
                   alt="Elementary Program" 
                   className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                 />
              </div>
              <div className="p-8">
                <h3 className="font-heading text-2xl font-bold mb-3 text-ilaw-navy">Elementary Program</h3>
                <p className="text-yellow-600 mb-6 leading-relaxed">
                  Comprehensive academic excellence combined with character development and creative exploration.
                </p>
                <button 
                  onClick={() => toggleProgram('elementary')} 
                  className="text-ilaw-gold font-semibold hover:text-brand-amber transition-colors flex items-center group"
                >
                  Discover More 
                  {expandedPrograms.elementary ? 
                    <ChevronUp className="h-5 w-5 ml-2 group-hover:-translate-y-1 transition-transform" /> : 
                    <ChevronDown className="h-5 w-5 ml-2 group-hover:translate-y-1 transition-transform" />
                  }
                </button>
                
                <ExpandableContent isExpanded={expandedPrograms.elementary}>
                  <div className="flex flex-col space-y-4">
                    <p className="leading-relaxed">
                      Our Elementary program delivers excellence in language arts, mathematics, science, social studies, physical education, and creative arts through innovative teaching methods.
                    </p>
                    
                    <div className="grid grid-cols-2 gap-3 mt-4">
                      <img 
                        src="/images/elementary-classroom.jpg" 
                        alt="Elementary Classroom" 
                        className="rounded-lg w-full h-32 object-cover hover:scale-105 transition-transform"
                      />
                      <img 
                        src="/images/elementary-activities.jpg" 
                        alt="Elementary Activities" 
                        className="rounded-lg w-full h-32 object-cover hover:scale-105 transition-transform"
                      />
                    </div>
                  </div>
                </ExpandableContent>
              </div>
            </div>

            {/* Lego Robotics Programming Program */}
            <div className="bg-ilaw-white rounded-2xl shadow-lg overflow-hidden border border-brand-gold-200 hover:shadow-ilaw transition-all duration-300 group">
              <div className="h-56 overflow-hidden relative">
                <div className="absolute top-4 left-4 bg-ilaw-gold text-ilaw-navy px-3 py-1 rounded-full text-sm font-semibold z-10">
                  Innovation
                </div>
                <img 
                   src={legorobot} 
                   alt="Lego Robotics Program" 
                   className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
              </div>
              <div className="p-8">
                <h3 className="font-heading text-2xl font-bold mb-3 text-ilaw-navy">Lego Robotics Programming</h3>
                <p className="text-yellow-600 mb-6 leading-relaxed">
                  Hands-on STEM learning through building, programming, and controlling robots using Lego Mindstorms technology.
                </p>
                <button 
                  onClick={() => toggleProgram('digitalLiteracy')} 
                  className="text-ilaw-gold font-semibold hover:text-brand-amber transition-colors flex items-center group"
                >
                  Discover More 
                  {expandedPrograms.digitalLiteracy ? 
                    <ChevronUp className="h-5 w-5 ml-2 group-hover:-translate-y-1 transition-transform" /> : 
                    <ChevronDown className="h-5 w-5 ml-2 group-hover:translate-y-1 transition-transform" />
                  }
                </button>
                
                <ExpandableContent isExpanded={expandedPrograms.digitalLiteracy}>
                  <div className="flex flex-col space-y-4">
                    <p className="leading-relaxed">
                      Our Lego Robotics Programming course teaches students engineering principles, coding fundamentals, problem-solving skills, and teamwork through exciting robot-building challenges and competitions.
                    </p>
                    
                    <div className="grid grid-cols-2 gap-3 mt-4">
                      <img 
                        src="/images/lego-robots.jpg" 
                        alt="Student-built Lego Robots" 
                        className="rounded-lg w-full h-32 object-cover hover:scale-105 transition-transform"
                      />
                      <img 
                        src="/images/robotics-competition.jpg" 
                        alt="Robotics Competition" 
                        className="rounded-lg w-full h-32 object-cover hover:scale-105 transition-transform"
                      />
                    </div>
                  </div>
                </ExpandableContent>
              </div>
            </div>
          </div>
        </div>
      </section>
    </VisitorLayout>
  );
}