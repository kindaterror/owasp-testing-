import { useState, useEffect } from "react";
import {
  GraduationCap,
  Save,
  BookOpen,
  Loader,
  CheckCircle,
  AlertCircle,
  Users,
  Target,
} from "lucide-react";

// --- helpers: grade label/key conversions ---
const gradeLabelToKey = (g: string) => {
  if (!g) return g;
  if (g === "Kinder") return "K";
  return g.replace(/^Grade\s+/i, "").trim(); // "Grade 5" -> "5"
};

const gradeKeyToLabel = (k: string) => {
  if (!k) return k;
  if (k === "K") return "Kinder";
  return /^\d+$/.test(k) ? `Grade ${k}` : k;
};

type ClassSettingsProps = {
  userRole: "admin" | "teacher" | "student";
  user: any;
};

export function ClassSettings({ userRole, user }: ClassSettingsProps) {
  const [teacherSettings, setTeacherSettings] = useState({
    preferredGrades: [] as string[],
    subjects: [] as string[],
    maxClassSize: 30,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">(
    "idle"
  );
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);

  useEffect(() => {
    loadTeachingSettings();
  }, []);

  const loadTeachingSettings = async () => {
    try {
      setIsLoadingSettings(true);
      const token = localStorage.getItem("token");

      const response = await fetch("/api/user/teaching-settings", {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (data.success && data.settings) {
        setTeacherSettings({
          preferredGrades: (data.settings.preferredGrades || [])
            .map(gradeKeyToLabel)
            .filter(Boolean),
          subjects: (data.settings.subjects || []).filter(Boolean),
          maxClassSize: data.settings.maxClassSize || 30,
        });
      }
    } catch (error) {
      console.error("Failed to load teaching settings:", error);
    } finally {
      setIsLoadingSettings(false);
    }
  };

  const gradeOptions = [
    "Kinder",
    "Grade 1",
    "Grade 2",
    "Grade 3",
    "Grade 4",
    "Grade 5",
    "Grade 6",
  ];

  const subjectOptions = [
    "Storybook",
    "GMRC",
    "Jolly Phonics (English Reading)",
    "Makabansa",
    "English (language)",
    "Mathematics",
    "Filipino",
    "Science",
    "English grammar",
    "Reading comprehension",
    "Marungko",
    "MAPEH",
  ];

  const handleSettingsChange = () => {
    if (saveStatus !== "idle") {
      setSaveStatus("idle");
      setErrorMessage("");
    }
  };

  const handleGradeChange = (grade: string, checked: boolean) => {
    setTeacherSettings((prev) => {
      const current = prev.preferredGrades.filter(Boolean);
      const next = checked
        ? Array.from(new Set([...current, grade]))
        : current.filter((g) => g !== grade);
      return { ...prev, preferredGrades: next };
    });
    handleSettingsChange();
  };

  const handleSubjectChange = (subject: string, checked: boolean) => {
    setTeacherSettings((prev) => {
      const current = prev.subjects.filter(Boolean);
      const next = checked
        ? Array.from(new Set([...current, subject]))
        : current.filter((s) => s !== subject);
      return { ...prev, subjects: next };
    });
    handleSettingsChange();
  };

  const handleClassSizeChange = (size: number) => {
    setTeacherSettings((prev) => ({ ...prev, maxClassSize: size }));
    handleSettingsChange();
  };

  const handleSave = async () => {
    if (teacherSettings.preferredGrades.filter(Boolean).length === 0) {
      setSaveStatus("error");
      setErrorMessage("Please select at least one grade level");
      return;
    }
    if (teacherSettings.subjects.filter(Boolean).length === 0) {
      setSaveStatus("error");
      setErrorMessage("Please select at least one subject");
      return;
    }

    setIsLoading(true);
    setSaveStatus("idle");
    setErrorMessage("");

    try {
      const token = localStorage.getItem("token");

      const response = await fetch("/api/user/teaching-settings", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          preferredGrades: teacherSettings.preferredGrades
            .filter(Boolean)
            .map(gradeLabelToKey),
          subjects: teacherSettings.subjects.filter(Boolean),
          maxClassSize: teacherSettings.maxClassSize,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSaveStatus("success");
        console.log("Teaching settings saved successfully:", data);
      } else {
        setSaveStatus("error");
        setErrorMessage(data.message || "Failed to save teaching settings");
      }
    } catch (error) {
      setSaveStatus("error");
      setErrorMessage("Network error. Please check your connection.");
      console.error("Save teaching settings error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoadingSettings) {
    return (
      <div className="p-6 flex items-center justify-center">
        <Loader className="w-6 h-6 animate-spin text-ilaw-gold mr-2" />
        <span className="text-ilaw-navy">
          Loading your teaching preferences...
        </span>
      </div>
    );
  }

  const selectedGradesCount = teacherSettings.preferredGrades.filter(Boolean)
    .length;
  const selectedSubjectsCount = teacherSettings.subjects.filter(Boolean).length;

  return (
    <div className="p-6">
      <div className="flex items-center mb-6">
        <GraduationCap className="w-6 h-6 mr-3 text-ilaw-gold" />
        <h2 className="text-xl font-heading font-bold text-ilaw-navy">
          Teaching Preferences
        </h2>
      </div>

      {/* Status Messages */}
      {saveStatus === "success" && (
        <div className="mb-4 p-3 bg-green-50 border-2 border-green-200 rounded-xl flex items-center">
          <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
          <span className="text-green-700">
            Teaching preferences saved successfully!
          </span>
        </div>
      )}

      {saveStatus === "error" && (
        <div className="mb-4 p-3 bg-red-50 border-2 border-red-200 rounded-xl flex items-center">
          <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
          <span className="text-red-700">{errorMessage}</span>
        </div>
      )}

      <div className="space-y-6">
        {/* Grade Levels */}
        <div className="bg-white border-2 border-brand-navy-200 rounded-2xl p-6">
          <div className="flex items-center mb-4">
            <BookOpen className="w-5 h-5 mr-2 text-ilaw-gold" />
            <h3 className="font-heading font-bold text-ilaw-navy">
              Which grades do you want to teach?
            </h3>
            <span className="text-sm text-ilaw-navy/70 ml-2">
              ({selectedGradesCount} selected)
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {gradeOptions.map((grade) => {
              const active = teacherSettings.preferredGrades.includes(grade);
              return (
                <label
                  key={grade}
                  className={`flex items-center space-x-3 p-3 border-2 rounded-xl cursor-pointer transition-all ${
                    active
                      ? "bg-brand-navy-50 border-ilaw-navy shadow-md"
                      : "bg-white border-brand-navy-200 hover:bg-brand-navy-50"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={active}
                    onChange={(e) => handleGradeChange(grade, e.target.checked)}
                    className="w-4 h-4 text-ilaw-gold rounded focus:ring-ilaw-gold"
                  />
                  <span className="text-ilaw-navy font-medium">{grade}</span>
                </label>
              );
            })}
          </div>
        </div>

        {/* Subjects */}
        <div className="bg-white border-2 border-brand-navy-200 rounded-2xl p-6">
          <div className="flex items-center mb-4">
            <Target className="w-5 h-5 mr-2 text-ilaw-gold" />
            <h3 className="font-heading font-bold text-ilaw-navy">
              What subjects do you prefer to teach?
            </h3>
            <span className="text-sm text-ilaw-navy/70 ml-2">
              ({selectedSubjectsCount} selected)
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {subjectOptions.map((subject) => {
              const active = teacherSettings.subjects.includes(subject);
              return (
                <label
                  key={subject}
                  className={`flex items-center space-x-3 p-3 border-2 rounded-xl cursor-pointer transition-all ${
                    active
                      ? "bg-brand-navy-50 border-ilaw-navy shadow-md"
                      : "bg-white border-brand-navy-200 hover:bg-brand-navy-50"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={active}
                    onChange={(e) =>
                      handleSubjectChange(subject, e.target.checked)
                    }
                    className="w-4 h-4 text-ilaw-gold rounded focus:ring-ilaw-gold"
                  />
                  <span className="text-ilaw-navy font-medium">{subject}</span>
                </label>
              );
            })}
          </div>
        </div>

        {/* Class Size Preference */}
        <div className="bg-white border-2 border-brand-navy-200 rounded-2xl p-6">
          <div className="flex items-center mb-4">
            <Users className="w-5 h-5 mr-2 text-ilaw-gold" />
            <h3 className="font-heading font-bold text-ilaw-navy">
              Preferred class size
            </h3>
          </div>

          <div className="flex items-center space-x-4">
            <label className="text-ilaw-navy font-medium">
              Maximum students per class:
            </label>
            <select
              value={teacherSettings.maxClassSize}
              onChange={(e) => handleClassSizeChange(parseInt(e.target.value))}
              className="px-4 py-2 border-2 border-brand-navy-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-ilaw-gold transition-colors bg-white text-ilaw-navy"
            >
              <option value={15}>15 students</option>
              <option value={20}>20 students</option>
              <option value={25}>25 students</option>
              <option value={30}>30 students</option>
              <option value={35}>35 students</option>
            </select>
          </div>

          <div className="mt-3 p-3 bg-brand-navy-50 rounded-xl border border-brand-navy-200">
            <p className="text-sm text-ilaw-navy">
              <strong>Current preference:</strong> Up to{" "}
              {teacherSettings.maxClassSize} students per class
            </p>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={
            isLoading ||
            teacherSettings.preferredGrades.filter(Boolean).length === 0 ||
            teacherSettings.subjects.filter(Boolean).length === 0
          }
          className="px-6 py-3 bg-ilaw-gold hover:bg-brand-amber text-ilaw-navy rounded-xl flex items-center justify-center shadow-lg min-w-[220px] font-heading font-bold border-2 border-ilaw-gold disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
        >
          {isLoading ? (
            <>
              <Loader className="w-4 h-4 mr-2 animate-spin" />
              Saving Preferences...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Save Teaching Preferences
            </>
          )}
        </button>
      </div>
    </div>
  );
}

export default ClassSettings;