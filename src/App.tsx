import React, { useState, useEffect } from 'react';
import { User, LanguageCode } from './types';
import { initializeDB } from './db';
import WelcomeScreen from './components/WelcomeScreen';
import ClientDashboard from './components/ClientDashboard';
import OperatorDashboard from './components/OperatorDashboard';
import AdminDashboard from './components/AdminDashboard';
import SupportChat from './components/SupportChat';
import LegalPage from './components/LegalPage';
import CookieConsentBanner from './components/CookieConsentBanner';
import { initConsentOnAppBoot } from './services/cookieConsent';
import { LegalSlug } from './locales/legal';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentLanguage, setCurrentLanguage] = useState<LanguageCode>('en');

  // Client-side routing state for permanent URLs (/privacy, /terms, /cookies, /contacts)
  const [currentPath, setCurrentPath] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return window.location.pathname;
    }
    return '/';
  });

  // Listen to browser history navigation (popstate) and custom app-navigate events
  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };

    const handleAppNavigate = (e: any) => {
      if (e.detail?.path) {
        setCurrentPath(e.detail.path);
      }
    };

    window.addEventListener('popstate', handlePopState);
    window.addEventListener('app-navigate', handleAppNavigate);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('app-navigate', handleAppNavigate);
    };
  }, []);

  const handleNavigate = (path: string) => {
    if (typeof window !== 'undefined') {
      window.history.pushState(null, '', path);
      setCurrentPath(path);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Determine if URL corresponds to a legal document
  const normalizedPath = currentPath.toLowerCase().replace(/\/+$/, '') || '/';
  const legalMatch = normalizedPath.match(/^\/(privacy|terms|cookies|contacts)$/);
  const activeLegalSlug = legalMatch ? (legalMatch[1] as LegalSlug) : null;

  // Trigger DB seed initialization on Mount
  useEffect(() => {
    initializeDB();
    initConsentOnAppBoot();
    
    // Check if session persists in localStorage for smooth UX reload
    const storedUser = localStorage.getItem('registapp_active_user');
    const storedLang = localStorage.getItem('registapp_active_lang');
    
    if (storedUser) {
      try {
        const u = JSON.parse(storedUser);
        if (u && typeof u === 'object' && u.email) {
          const em = u.email.toLowerCase();
          if (em === 'admin@registapp.uz' || em === 'registapp@gmail.com' || em === 'admin@registapp.online' || em === 'tulyaganovsaid@gmail.com') {
            u.firstName = 'Саид';
            u.lastName = 'Туляганов';
            u.role = 'Admin';
            localStorage.setItem('registapp_active_user', JSON.stringify(u));
          }
          setCurrentUser(u);
        } else {
          localStorage.removeItem('registapp_active_user');
        }
      } catch (e) {
        localStorage.removeItem('registapp_active_user');
      }
    }
    
    if (storedLang) {
      setCurrentLanguage(storedLang as LanguageCode);
    }
  }, []);

  const handleLoginSuccess = (user: User) => {
    const em = (user.email || '').toLowerCase();
    if (em === 'admin@registapp.uz' || em === 'registapp@gmail.com' || em === 'admin@registapp.online' || em === 'tulyaganovsaid@gmail.com') {
      user.firstName = 'Саид';
      user.lastName = 'Туляганов';
      user.role = 'Admin';
    }
    setCurrentUser(user);
    localStorage.setItem('registapp_active_user', JSON.stringify(user));
  };

  const handleProfileUpdate = (user: User) => {
    const em = (user.email || '').toLowerCase();
    if (em === 'admin@registapp.uz' || em === 'registapp@gmail.com' || em === 'admin@registapp.online' || em === 'tulyaganovsaid@gmail.com') {
      user.firstName = 'Саид';
      user.lastName = 'Туляганов';
      user.role = 'Admin';
    }
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

  // Safe router and content resolution preventing any blank screen states
  const renderMainContent = () => {
    // 1. Legal Pages with permanent URLs
    if (activeLegalSlug) {
      return (
        <LegalPage
          slug={activeLegalSlug}
          currentLanguage={currentLanguage}
          setLanguage={handleLanguageChange}
          onNavigate={handleNavigate}
        />
      );
    }

    // 2. Unauthenticated user -> Welcome / Auth Screen
    if (!currentUser) {
      return (
        <WelcomeScreen
          currentLanguage={currentLanguage}
          setLanguage={handleLanguageChange}
          onLoginSuccess={handleLoginSuccess}
          onNavigate={handleNavigate}
        />
      );
    }

    const lowEmail = (currentUser.email || '').toLowerCase();
    const roleStr = (currentUser.role || '').toLowerCase();

    // 3. Admin Workspace
    if (
      roleStr === 'admin' ||
      lowEmail === 'admin@registapp.uz' ||
      lowEmail === 'admin@registapp.online' ||
      lowEmail === 'registapp@gmail.com' ||
      lowEmail === 'tulyaganovsaid@gmail.com' ||
      currentUser.id === 'YmHbaNrbd5U6kGgotrsZdlT2RBP2'
    ) {
      const adminUser: User = {
        ...currentUser,
        role: 'Admin',
        firstName: 'Саид',
        lastName: 'Туляганов',
      };
      return (
        <AdminDashboard
          currentLanguage={currentLanguage}
          setLanguage={handleLanguageChange}
          currentUser={adminUser}
          onLogout={handleLogout}
          onProfileUpdate={handleProfileUpdate}
          onNavigate={handleNavigate}
        />
      );
    }

    // 4. Operator Workspace
    if (
      roleStr === 'operator' ||
      lowEmail.endsWith('@registapp.uz') ||
      lowEmail.endsWith('@registapp.online') ||
      currentUser.id === 'pUrYJVVb31RYKK3pXRTz4Ih0jgG3'
    ) {
      const operatorUser: User = {
        ...currentUser,
        role: 'Operator',
      };
      return (
        <OperatorDashboard
          currentLanguage={currentLanguage}
          setLanguage={handleLanguageChange}
          currentUser={operatorUser}
          onLogout={handleLogout}
          onProfileUpdate={handleProfileUpdate}
          onNavigate={handleNavigate}
        />
      );
    }

    // 5. Client Workspace (Safe fallback for all other authenticated users)
    const clientUser: User = {
      ...currentUser,
      role: 'Client',
    };
    return (
      <ClientDashboard
        currentLanguage={currentLanguage}
        setLanguage={handleLanguageChange}
        currentUser={clientUser}
        onLogout={handleLogout}
        onProfileUpdate={handleProfileUpdate}
        onNavigate={handleNavigate}
      />
    );
  };

  return (
    <div id="app-viewport-wrapper" className="min-h-screen bg-zinc-950 text-zinc-150 relative">
      
      {/* Safe Main Viewport Content */}
      {renderMainContent()}

      {/* Floating Support AI Agent Widget for authenticated users (collapsed by default in Admin and Operator workspaces) */}
      {!activeLegalSlug && currentUser && (
        <SupportChat 
          currentLanguage={currentLanguage} 
          userRole={
            currentUser.id === 'YmHbaNrbd5U6kGgotrsZdlT2RBP2' || 
            currentUser.email?.toLowerCase() === 'admin@registapp.uz' ||
            currentUser.email?.toLowerCase() === 'admin@registapp.online' ||
            currentUser.email?.toLowerCase() === 'registapp@gmail.com' ||
            currentUser.email?.toLowerCase() === 'tulyaganovsaid@gmail.com' ||
            currentUser.role === 'Admin'
              ? 'Admin'
              : currentUser.id === 'pUrYJVVb31RYKK3pXRTz4Ih0jgG3' ||
                currentUser.email?.toLowerCase() === 'operator@registapp.uz' ||
                currentUser.email?.toLowerCase()?.endsWith('@registapp.online') ||
                currentUser.role === 'Operator'
              ? 'Operator'
              : currentUser.role
          }
          defaultOpen={
            currentUser.id === 'YmHbaNrbd5U6kGgotrsZdlT2RBP2' ||
            currentUser.email?.toLowerCase() === 'admin@registapp.uz' ||
            currentUser.email?.toLowerCase() === 'admin@registapp.online' ||
            currentUser.email?.toLowerCase() === 'registapp@gmail.com' ||
            currentUser.email?.toLowerCase() === 'tulyaganovsaid@gmail.com' ||
            currentUser.id === 'pUrYJVVb31RYKK3pXRTz4Ih0jgG3' ||
            currentUser.role === 'Admin' ||
            currentUser.role === 'Operator' ||
            currentUser.email?.toLowerCase()?.endsWith('@registapp.online')
              ? false
              : undefined
          }
        />
      )}

      {/* Non-blocking First-visit & Customizable Cookie Consent Banner */}
      <CookieConsentBanner
        currentLanguage={currentLanguage}
        onNavigate={handleNavigate}
      />

    </div>
  );
}
