import React, { useState, useEffect } from 'react';
import { User, LanguageCode } from './types';
import { initializeDB } from './db';
import WelcomeScreen from './components/WelcomeScreen';
import ClientDashboard from './components/ClientDashboard';
import OperatorDashboard from './components/OperatorDashboard';
import AdminDashboard from './components/AdminDashboard';
import AdminUserDashboard from './components/AdminUserDashboard';
import SupportChat from './components/SupportChat';
import MailSimulationCenter from './components/MailSimulationCenter';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentLanguage, setCurrentLanguage] = useState<LanguageCode>('en');

  // Trigger DB seed initialization on Mount
  useEffect(() => {
    initializeDB();
    
    // Check if session persists in localStorage for smooth UX reload
    const storedUser = localStorage.getItem('registapp_active_user');
    const storedLang = localStorage.getItem('registapp_active_lang');
    
    if (storedUser) {
      try {
        setCurrentUser(JSON.parse(storedUser));
      } catch (e) {
        localStorage.removeItem('registapp_active_user');
      }
    }
    
    if (storedLang) {
      setCurrentLanguage(storedLang as LanguageCode);
    }
  }, []);

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem('registapp_active_user', JSON.stringify(user));
  };

  const handleProfileUpdate = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem('registapp_active_user', JSON.stringify(user));
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('registapp_active_user');
  };

  const handleLanguageChange = (lang: LanguageCode) => {
    setCurrentLanguage(lang);
    localStorage.setItem('registapp_active_lang', lang);
  };

  return (
    <div id="app-viewport-wrapper" className="min-h-screen bg-zinc-950 text-zinc-150 relative">
      
      {/* Route and Render depending on Auth states */}
      {currentUser === null ? (
        <WelcomeScreen
          currentLanguage={currentLanguage}
          setLanguage={handleLanguageChange}
          onLoginSuccess={handleLoginSuccess}
        />
      ) : (
        <>
          {currentUser.id === 'YmHbaNrbd5U6kGgotrsZdlT2RBP2' ? (
            <AdminDashboard
              currentLanguage={currentLanguage}
              setLanguage={handleLanguageChange}
              currentUser={currentUser}
              onLogout={handleLogout}
              onProfileUpdate={handleProfileUpdate}
            />
          ) : currentUser.id === 'pUrYJVVb31RYKK3pXRTz4Ih0jgG3' ? (
            <OperatorDashboard
              currentLanguage={currentLanguage}
              setLanguage={handleLanguageChange}
              currentUser={{ ...currentUser, role: 'Operator' }}
              onLogout={handleLogout}
              onProfileUpdate={handleProfileUpdate}
            />
          ) : (
            <>
              {currentUser.role === 'Client' && (
                <ClientDashboard
                  currentLanguage={currentLanguage}
                  setLanguage={handleLanguageChange}
                  currentUser={currentUser}
                  onLogout={handleLogout}
                  onProfileUpdate={handleProfileUpdate}
                />
              )}

              {currentUser.role === 'Operator' && (
                <OperatorDashboard
                  currentLanguage={currentLanguage}
                  setLanguage={handleLanguageChange}
                  currentUser={currentUser}
                  onLogout={handleLogout}
                  onProfileUpdate={handleProfileUpdate}
                />
              )}

              {currentUser.role === 'Admin' && (
                <AdminDashboard
                  currentLanguage={currentLanguage}
                  setLanguage={handleLanguageChange}
                  currentUser={currentUser}
                  onLogout={handleLogout}
                  onProfileUpdate={handleProfileUpdate}
                />
              )}
            </>
          )}
        </>
      )}

      {/* Floating Support AI Agent Widget */}
      <SupportChat currentLanguage={currentLanguage} />
      <MailSimulationCenter />

    </div>
  );
}
