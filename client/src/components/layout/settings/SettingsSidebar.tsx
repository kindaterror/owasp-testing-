import { User, Lock, Trash2, Users, Settings as SettingsIcon, GraduationCap} from "lucide-react";

// == TYPE DEFINITIONS ==
type SettingsSidebarProps = {
  userRole: "admin" | "teacher" | "student";
  activeSection: string;
  setActiveSection: (section: string) => void;
}

// == SETTINGS SIDEBAR COMPONENT ==
export function SettingsSidebar({ userRole, activeSection, setActiveSection }: SettingsSidebarProps) {

  // == Role-based menu items (REMOVED Bell/Notifications) ==
  const getMenuItems = () => {
    const baseItems = [
      { id: "profile", label: "Profile Settings", icon: User },
      { id: "security", label: "Password & Security", icon: Lock },
    ];

    const roleSpecificItems = {
      admin: [
        { id: "system", label: "System Settings", icon: SettingsIcon },
      ],
      teacher: [
        { id: "classes", label: "Class Settings", icon: GraduationCap },
      ],
      student: [
        { id: "learning", label: "Learning Preferences", icon: GraduationCap },
      ],
    };

    const accountItems = [
      { id: "account", label: "Account Actions", icon: Trash2 },
    ];

    return [
      ...baseItems,
      ...(roleSpecificItems[userRole] || []),
      ...accountItems,
    ];
  };

  // == Role-based styling ==
  const getRoleStyles = () => {
    switch (userRole) {
      case "admin":
        return {
          sectionBg: "bg-brand-gold-50",
          sectionText: "text-ilaw-navy",
          activeBg: "bg-brand-gold-100",
          activeText: "text-ilaw-navy",
          activeBorder: "border-l-4 border-ilaw-gold",
          hoverBg: "hover:bg-ilaw-white"
        };
      case "teacher":
        return {
          sectionBg: "bg-brand-navy-50",
          sectionText: "text-ilaw-navy",
          activeBg: "bg-brand-navy-100",
          activeText: "text-ilaw-navy",
          activeBorder: "border-l-4 border-brand-navy-400",
          hoverBg: "hover:bg-ilaw-white"
        };
      case "student":
        return {
          sectionBg: "bg-gradient-to-r from-amber-200 to-orange-200",
          sectionText: "text-amber-900",
          activeBg: "bg-gradient-to-r from-amber-300 to-orange-300",
          activeText: "text-amber-900",
          activeBorder: "border-l-4 border-amber-500",
          hoverBg: "hover:bg-gradient-to-r hover:from-amber-100 hover:to-orange-100"
        };
      default:
        return {
          sectionBg: "bg-gray-100",
          sectionText: "text-gray-700",
          activeBg: "bg-gray-200",
          activeText: "text-gray-900",
          activeBorder: "border-l-4 border-gray-400",
          hoverBg: "hover:bg-gray-50"
        };
    }
  };

  const styles = getRoleStyles();
  const menuItems = getMenuItems();

  return (
    <nav className="py-2">
      {/* == SECTION HEADER == */}
      <div className={`px-6 py-3 text-xs font-bold uppercase tracking-wider ${styles.sectionBg} ${styles.sectionText} mx-2 rounded-lg mb-4`}>
        Settings
      </div>

      {/* == MENU ITEMS == */}
      <ul className="space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;
          
          return (
            <li key={item.id}>
              <button
                onClick={() => setActiveSection(item.id)}
                className={`flex items-center w-full px-4 py-2 rounded-lg mx-2 transition-all duration-200 ${
                  isActive 
                    ? `${styles.activeBg} ${styles.activeText} ${styles.activeBorder} shadow-sm` 
                    : `${styles.hoverBg} hover:shadow-sm`
                }`}
              >
                <Icon className="w-5 h-5 mr-3" />
                <span className="font-medium">{item.label}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export default SettingsSidebar;