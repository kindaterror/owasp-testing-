import ProfileSettings from "./settings-sections/ProfileSettings";
import SecuritySettings from "./settings-sections/SecuritySettings";
import AccountActions from "./settings-sections/AccountActions";
import LearningPreferences from "./settings-sections/LearningPreferences";
import ClassSettings from "./settings-sections/ClassSettings";
import SystemSettings from "./settings-sections/SystemSettings";

// == TYPE DEFINITIONS ==
type SettingsContentProps = {
  userRole: "admin" | "teacher" | "student";
  activeSection: string;
  user: any;
}

// == SETTINGS CONTENT COMPONENT ==
export function SettingsContent({ userRole, activeSection, user }: SettingsContentProps) {

  // == RENDER CONTENT BASED ON ACTIVE SECTION ==
  const renderContent = () => {
    switch (activeSection) {
      case "profile":
        return <ProfileSettings userRole={userRole} user={user} />;
      case "security":
        return <SecuritySettings userRole={userRole} user={user} />;
      case "learning":
        return <LearningPreferences userRole={userRole} user={user} />;
      case "classes":
        return <ClassSettings userRole={userRole} user={user} />;
      case "system":
        return <SystemSettings userRole={userRole} user={user} />;
      case "account":
        return <AccountActions userRole={userRole} user={user} />;
      default:
        return <ProfileSettings userRole={userRole} user={user} />;
    }
  };

  return (
    <div className="min-h-[500px]">
      {renderContent()}
    </div>
  );
}

export default SettingsContent;