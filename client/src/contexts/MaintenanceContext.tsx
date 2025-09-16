import React, { createContext, useContext, useState, useEffect } from 'react';

interface MaintenanceContextType {
  isMaintenanceMode: boolean;
  setMaintenanceMode: (enabled: boolean) => void;
  checkMaintenanceMode: () => Promise<void>;
}

const MaintenanceContext = createContext<MaintenanceContextType | undefined>(undefined);

export const useMaintenanceMode = () => {
  const context = useContext(MaintenanceContext);
  if (!context) {
    throw new Error('useMaintenanceMode must be used within MaintenanceProvider');
  }
  return context;
};

export const MaintenanceProvider = ({ children }: { children: React.ReactNode }) => {
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false);

  const setMaintenanceMode = (enabled: boolean) => {
    setIsMaintenanceMode(enabled);
  };

  const checkMaintenanceMode = async () => {
    try {
      const response = await fetch('/api/system/maintenance-status');
      if (response.ok) {
        const data = await response.json();
        setIsMaintenanceMode(data.maintenanceMode || false);
      }
    } catch (error) {
      console.error('Failed to check maintenance mode:', error);
      // Default to false if there's an error
      setIsMaintenanceMode(false);
    }
  };

  useEffect(() => {
    checkMaintenanceMode();
    // Check every 30 seconds
    const interval = setInterval(checkMaintenanceMode, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <MaintenanceContext.Provider value={{
      isMaintenanceMode,
      setMaintenanceMode,
      checkMaintenanceMode
    }}>
      {children}
    </MaintenanceContext.Provider>
  );
};