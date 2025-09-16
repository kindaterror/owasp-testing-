import { useState, useEffect } from 'react';
import { Link } from 'wouter';
import Header from "@/components/layout/Header";
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BookOpen, Home, ArrowRight, Sparkles } from 'lucide-react';

// We'll use placeholder image paths - replace with your actual image paths
import sunMoonCover from "@/assets/books/sun-moon-cover.jpeg";
import necklaceCombCover from "@/assets/books/necklace-comb-cover.webp";
import coconutManCover from "@/assets/books/coconut-man-cover.jpeg";

export default function TwoDAnimation() {
  const { user } = useAuth();
  const [activeStory, setActiveStory] = useState(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Animation effect when the page loads
  useEffect(() => {
    setIsLoaded(true);
  }, []);

  const stories = [
    {
      id: "sun-moon",
      title: "The Sun and Moon",
      description: "Discover the ancient tale of how the Sun and Moon came to be.",
      coverImage: sunMoonCover,
      color: "from-amber-500 to-yellow-400",
      shadowColor: "shadow-amber-300/30",
      icon: "☀️",
      pages: 8
    },
    {
      id: "necklace-comb",
      title: "The Necklace and the Comb",
      description: "Follow the journey of magical artifacts through generations.",
      coverImage: necklaceCombCover,
      color: "from-blue-500 to-purple-400",
      shadowColor: "shadow-blue-300/30",
      icon: "✨",
      pages: 6
    },
    {
      id: "coconut-man",
      title: "The Man with the Coconut",
      description: "Embark on an adventure with a man and his magical coconut.",
      coverImage: coconutManCover,
      color: "from-green-500 to-emerald-400",
      shadowColor: "shadow-green-300/30",
      icon: "🥥",
      pages: 8
    }
  ];

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
      <Header variant="student" />
      
      <main className="flex-grow p-4 md:p-6 text-white">
        <div className="container mx-auto max-w-6xl">
          {/* Header with animated intro */}
          <div 
            className={`transition-all duration-1000 transform ${
              isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'
            } mb-8 text-center`}
          >
            <h1 className="text-4xl md:text-5xl font-bold mb-3 bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-300">
              2D Animated Storybooks
            </h1>
            <p className="text-lg md:text-xl text-purple-200 max-w-3xl mx-auto">
              Experience the magic of Filipino folklore through beautifully animated interactive stories
            </p>

            <div className="flex items-center justify-center mt-4">
              <div className="h-[1px] w-16 bg-gradient-to-r from-transparent to-purple-500"></div>
              <Sparkles className="h-6 w-6 mx-2 text-purple-300" />
              <div className="h-[1px] w-16 bg-gradient-to-l from-transparent to-purple-500"></div>
            </div>
          </div>

          {/* Navigation bar */}
          <div className="flex justify-end mb-4">
            <Link href="/student">
              <Button variant="outline" className="bg-transparent border-purple-500 text-purple-300 hover:bg-purple-950 flex items-center gap-2">
                <Home size={16} />
                Back to Dashboard
              </Button>
            </Link>
          </div>
          
          {/* Story cards with staggered animation */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            {stories.map((story, index) => (
              <div
                key={story.id}
                className={`transition-all duration-1000 delay-${index * 200} transform ${
                  isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-16 opacity-0'
                }`}
              >
                <Card 
  className={`overflow-hidden hover:shadow-xl transition-all duration-500 bg-gray-800 border-0 h-full ${story.shadowColor} hover:-translate-y-2`}
>
  <div className="relative">
    {/* Gradient overlay for image */}
    <div className={`aspect-[4/3] relative overflow-hidden bg-gradient-to-br ${story.color}`}>
      <img 
        src={story.coverImage} 
        alt={story.title}
        className="w-full h-full object-cover mix-blend-overlay transition-transform hover:scale-110 duration-700"
      />
      <div className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center bg-white/20 backdrop-blur-sm rounded-full text-xl">
        {story.icon}
      </div>
    </div>
    
    {/* Title bar with icon */}
    <div className="p-5 flex flex-col h-48">
      <h2 className="text-xl font-bold mb-2 text-white">{story.title}</h2>
      <p className="text-gray-300 mb-4 flex-grow">{story.description}</p>
      <div className="flex justify-between items-center mt-auto">
        <span className="text-sm text-gray-400">{story.pages} pages</span>
        <Link href={`/student/read-twodanimation/${story.id}`}>
          <Button className={`bg-gradient-to-r ${story.color} hover:brightness-110 text-white group`}>
            Read Story
            <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Button>
        </Link>
      </div>
    </div>
  </div>
</Card>
              </div>
            ))}
          </div>
          
          {/* About Section */}
          <div 
            className={`transition-all duration-1000 delay-600 transform ${
              isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'
            } bg-gray-800/50 backdrop-blur-sm rounded-lg p-8 border border-purple-800/30 mb-8`}
          >
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center mr-4">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-purple-300">About These Stories</h2>
            </div>
            
            <p className="mb-4 text-gray-300 leading-relaxed">
              These interactive 2D animated storybooks are part of our multimedia arts capstone project,
              showcasing traditional Filipino folktales in an engaging, animated format.
            </p>
            
            <p className="text-gray-300 leading-relaxed">
              Each story features custom illustrations, animations, and audio narration to create
              an immersive reading experience. The stories combine traditional Filipino cultural elements
              with modern digital storytelling techniques.
            </p>
            
            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
              <div className="bg-gray-800/70 rounded-lg p-4 backdrop-blur-sm">
                <div className="text-4xl mb-2">✨</div>
                <h3 className="font-bold text-purple-300 mb-1">Custom Animation</h3>
                <p className="text-sm text-gray-400">Fluid 2D animations bring the stories to life</p>
              </div>
              
              <div className="bg-gray-800/70 rounded-lg p-4 backdrop-blur-sm">
                <div className="text-4xl mb-2">🎵</div>
                <h3 className="font-bold text-purple-300 mb-1">Original Audio</h3>
                <p className="text-sm text-gray-400">Atmospheric sounds and music enhance the experience</p>
              </div>
              
              <div className="bg-gray-800/70 rounded-lg p-4 backdrop-blur-sm">
                <div className="text-4xl mb-2">🏮</div>
                <h3 className="font-bold text-purple-300 mb-1">Cultural Heritage</h3>
                <p className="text-sm text-gray-400">Preserving Filipino folklore through digital media</p>
              </div>
            </div>
          </div>
          
          {/* Credits Section */}
          <div 
            className={`transition-all duration-1000 delay-700 transform ${
              isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'
            } text-center mb-8`}
          >
            <p className="text-sm text-gray-400">
              A Multimedia Arts Capstone Project • Created with ❤️ • {new Date().getFullYear()}
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}