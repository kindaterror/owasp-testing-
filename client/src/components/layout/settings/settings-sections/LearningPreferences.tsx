import { useState, useEffect } from "react";
import { GraduationCap, Save, BookOpen, Palette, Loader, CheckCircle, AlertCircle } from "lucide-react";
// ✅ REMOVED: Volume2 import

type LearningPreferencesProps = {
  userRole: "admin" | "teacher" | "student";
  user: any;
}

export function LearningPreferences({ userRole, user }: LearningPreferencesProps) {
  const [preferences, setPreferences] = useState({
    readingSpeed: "normal",
    visualStyle: "colorful",
    fontSize: "medium",
    darkMode: false
    // ✅ REMOVED: audioEnabled, autoplay, subtitles
  });

  const [isLoading, setIsLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoadingPreferences, setIsLoadingPreferences] = useState(true);

  // Load preferences on component mount
  useEffect(() => {
    loadLearningPreferences();
  }, []);

  const loadLearningPreferences = async () => {
    try {
      setIsLoadingPreferences(true);
      const token = localStorage.getItem('token');
      
      const response = await fetch('/api/user/learning-preferences', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      });

      const data = await response.json();

      if (data.success && data.preferences) {
        setPreferences({
          readingSpeed: data.preferences.readingSpeed || "normal",
          visualStyle: data.preferences.visualStyle || "colorful",
          fontSize: data.preferences.fontSize || "medium",
          darkMode: data.preferences.darkMode ?? false
          // ✅ REMOVED: audio-related preferences
        });
      }
    } catch (error) {
      console.error('Failed to load learning preferences:', error);
    } finally {
      setIsLoadingPreferences(false);
    }
  };

  const handlePreferenceChange = (field: keyof typeof preferences, value: any) => {
    setPreferences(prev => ({
      ...prev,
      [field]: value
    }));
    if (saveStatus !== 'idle') {
      setSaveStatus('idle');
      setErrorMessage('');
    }
  };

  const handleSave = async () => {
    setIsLoading(true);
    setSaveStatus('idle');
    setErrorMessage('');

    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch('/api/user/learning-preferences', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(preferences)
      });

      const data = await response.json();

      if (data.success) {
        setSaveStatus('success');
        console.log('Learning preferences saved successfully:', data);
      } else {
        setSaveStatus('error');
        setErrorMessage(data.message || 'Failed to save learning preferences');
      }
    } catch (error) {
      setSaveStatus('error');
      setErrorMessage('Network error. Please check your connection.');
      console.error('Save learning preferences error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoadingPreferences) {
    return (
      <div className="p-6 flex items-center justify-center">
        <Loader className="w-6 h-6 animate-spin text-amber-600 mr-2" />
        <span className="text-amber-700">Loading your learning preferences...</span>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center mb-6">
        <GraduationCap className="w-6 h-6 mr-3 text-ilaw-navy" />
        <h2 className="text-xl font-semibold text-ilaw-navy">Learning Preferences</h2>
      </div>

      {/* Status Messages */}
      {saveStatus === 'success' && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center">
          <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
          <span className="text-green-800">Learning preferences saved successfully!</span>
        </div>
      )}

      {saveStatus === 'error' && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center">
          <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
          <span className="text-red-800">{errorMessage}</span>
        </div>
      )}

      <div className="space-y-6">
        
        {/* Reading Preferences */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-center mb-3">
            <BookOpen className="w-5 h-5 mr-2 text-amber-600" />
            <h3 className="font-medium text-amber-800">Reading Preferences</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-amber-700 mb-2">Reading Speed</label>
              <select 
                value={preferences.readingSpeed}
                onChange={(e) => handlePreferenceChange('readingSpeed', e.target.value)}
                className="w-full px-3 py-2 border border-amber-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 transition-colors"
              >
                <option value="slow">Slow - Take your time</option>
                <option value="normal">Normal - Standard pace</option>
                <option value="fast">Fast - Quick reader</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-amber-700 mb-2">Font Size</label>
              <select 
                value={preferences.fontSize}
                onChange={(e) => handlePreferenceChange('fontSize', e.target.value)}
                className="w-full px-3 py-2 border border-amber-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 transition-colors"
              >
                <option value="small">Small - Compact text</option>
                <option value="medium">Medium - Standard size</option>
                <option value="large">Large - Easy to read</option>
              </select>
            </div>
          </div>
        </div>

        {/* ✅ REMOVED: Entire Audio & Media section */}

        {/* Visual Preferences */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center mb-3">
            <Palette className="w-5 h-5 mr-2 text-yellow-600" />
            <h3 className="font-medium text-yellow-800">Visual Style</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-yellow-700 mb-2">Theme Style</label>
              <select 
                value={preferences.visualStyle}
                onChange={(e) => handlePreferenceChange('visualStyle', e.target.value)}
                className="w-full px-3 py-2 border border-yellow-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 transition-colors"
              >
                <option value="colorful">Colorful & Fun - Bright and engaging</option>
                <option value="classic">Classic - Traditional look</option>
                <option value="minimal">Minimal - Clean and simple</option>
              </select>
            </div>
            
            <div className="flex items-center justify-center">
              <div className="flex items-center p-3 bg-white rounded-lg border border-yellow-200">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={preferences.darkMode}
                    onChange={(e) => handlePreferenceChange('darkMode', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-yellow-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-yellow-600"></div>
                </label>
                <span className="text-yellow-700 font-medium ml-3">Enable Dark Mode</span>
              </div>
            </div>
          </div>
        </div>

        <button 
          onClick={handleSave}
          disabled={isLoading}
          className="px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-lg flex items-center justify-center shadow-lg min-w-[200px] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
        >
          {isLoading ? (
            <>
              <Loader className="w-4 h-4 mr-2 animate-spin" />
              Saving Preferences...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Save Learning Preferences
            </>
          )}
        </button>
      </div>
    </div>
  );
}

export default LearningPreferences;