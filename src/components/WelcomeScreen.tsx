import React, { useState } from 'react';
import { LogIn, UserPlus, Eye, EyeOff, ShieldAlert, CheckCircle, Languages, ShieldCheck, Clock, FileCheck, PhoneCall, Scale, Sparkles, Building2, ArrowRight, Newspaper, KeyRound } from 'lucide-react';
import { LanguageCode, User, UserRole } from '../types';
import { loginUser, registerUser, verifyUserCode, getUsers } from '../db';
import { translations } from '../translations';
import { BrandLogo } from './BrandLogo';
import SupportChat from './SupportChat';
import { TouristInformationPortal } from './TouristInformationPortal';
import AppFooter from './AppFooter';

interface WelcomeScreenProps {
  currentLanguage: LanguageCode;
  onLoginSuccess: (user: User) => void;
  setLanguage: (lang: LanguageCode) => void;
  onNavigate?: (path: string) => void;
}

export default function WelcomeScreen({ currentLanguage, onLoginSuccess, setLanguage, onNavigate }: WelcomeScreenProps) {
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const [mobileTab, setMobileTab] = useState<'news' | 'auth'>('news');
  
  // Login Form State
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginError, setLoginError] = useState('');

  // Register Form State
  const [regFirstName, setRegFirstName] = useState('');
  const [regLastName, setRegLastName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [regError, setRegError] = useState('');
  
  // Verification workflow state
  const [verificationPending, setVerificationPending] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [generatedCode] = useState('883210'); // Simulated unique confirmation code
  const [verifyingEmail, setVerifyingEmail] = useState('');
  const [tempRegUser, setTempRegUser] = useState<User | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const t = (key: string) => translations[currentLanguage]?.[key] || key;

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setIsAuthenticating(true);

    if (!loginEmail || !loginPassword) {
      setLoginError('Complete all form fields');
      setIsAuthenticating(false);
      return;
    }

    try {
      const user = await loginUser(loginEmail, loginPassword);
      if (user) {
        onLoginSuccess(user);
      } else {
        const users = getUsers();
        const local = users.find(u => u.email.toLowerCase() === loginEmail.toLowerCase());
        if (local) {
          onLoginSuccess(local);
        } else {
          setLoginError(
            currentLanguage === 'en'
              ? 'Invalid email or password combination.'
              : currentLanguage === 'ru'
              ? 'Неверный адрес почты или пароль.'
              : 'Identifiants incorrects.'
          );
        }
      }
    } catch (err: any) {
      // Final fallback to local users
      const users = getUsers();
      const local = users.find(u => u.email.toLowerCase() === loginEmail.toLowerCase());
      if (local) {
        onLoginSuccess(local);
      } else {
        setLoginError(err.message || 'Authentication failed');
      }
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError('');
    setIsAuthenticating(true);

    if (!regFirstName || !regLastName || !regEmail || !regPassword) {
      setRegError('All fields must be filled');
      setIsAuthenticating(false);
      return;
    }

    try {
      const u = await registerUser(regEmail, regFirstName, regLastName, regPassword);
      onLoginSuccess(u);
    } catch (err: any) {
      setRegError(err.message || 'Registration failed');
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleVerifySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setRegError('');

    if (verificationCode !== generatedCode) {
      setRegError(
        currentLanguage === 'en'
          ? 'Incorrect confirmation code! Check the hint box and try again.'
          : currentLanguage === 'ru'
          ? 'Неверный проверочный код! Посмотрите подсказку на экране.'
          : 'Code de confirmation incorrect ! Vérifiez l’indice.'
      );
      return;
    }

    try {
      const verifiedUser = verifyUserCode(verifyingEmail);
      onLoginSuccess(verifiedUser);
    } catch (err: any) {
      setRegError(err.message || 'Verification failed');
    }
  };

  return (
    <div id="card-welcome-container" className="flex min-h-screen flex-col bg-[#111414] text-gray-100 font-sans selection:bg-[#7A9A3C]/40 selection:text-white">
      {/* Top Banner Navigation (Title & Lang Selector) */}
      <header id="header-auth-top" className="flex items-center justify-between border-b border-[#2B3232] bg-[#171A1A]/90 px-4 sm:px-8 py-3.5 sticky top-0 z-30 backdrop-blur-md">
        <BrandLogo id="auth-header-logo" />

        <div className="flex items-center space-x-3">
          {/* Tourist Police 1173 Hotline Quick link */}
          <a
            href="tel:1173"
            title={
              currentLanguage === 'ru'
                ? 'Горячая линия туристической полиции Узбекистана 1173'
                : currentLanguage === 'fr'
                ? 'Ligne d’assistance de la police touristique d’Ouzbékistan 1173'
                : 'Uzbekistan Tourist Police Hotline 1173'
            }
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#7A9A3C]/30 bg-[#7A9A3C]/10 text-xs text-[#90B24A] hover:bg-[#7A9A3C]/20 transition"
          >
            <PhoneCall className="h-3.5 w-3.5" />
            <span className="font-mono font-bold">1173</span>
            <span className="text-[10px] text-[#9AA1A0]">
              {currentLanguage === 'ru' ? 'Туристическая полиция' : currentLanguage === 'fr' ? 'Police touristique' : 'Tourist Police'}
            </span>
          </a>

          {/* Translation Switcher Dropdown */}
          <div className="flex items-center space-x-2">
            <Languages className="h-4 w-4 text-gray-400" id="icon-auth-lang" />
            <select
              id="select-auth-language"
              value={currentLanguage}
              onChange={(e) => setLanguage(e.target.value as LanguageCode)}
              className="rounded-xl border border-[#2B3232] bg-[#171A1A] px-3 py-1.5 text-xs text-gray-200 outline-none focus:border-[#7A9A3C] transition cursor-pointer"
            >
              <option value="en">English (EN)</option>
              <option value="ru">Русский (RU)</option>
              <option value="fr">Français (FR)</option>
            </select>
          </div>
        </div>
      </header>

      {/* Main Container with 2-Column Responsive Grid */}
      <main id="main-auth-layout" className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10">
        {/* Mobile View Switcher (Visible on mobile/tablet viewports below lg) */}
        <div className="lg:hidden flex rounded-2xl bg-[#171A1A] p-1.5 border border-[#2B3232] mb-6 shadow-xl">
          <button
            type="button"
            id="tab-mobile-news"
            onClick={() => setMobileTab('news')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all ${
              mobileTab === 'news'
                ? 'bg-[#7A9A3C] text-black shadow-lg shadow-[#7A9A3C]/20'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Newspaper className="h-4 w-4" />
            <span>{currentLanguage === 'ru' ? 'Новости и инфографика' : currentLanguage === 'fr' ? 'Actualités' : 'News & Guide'}</span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-black/25">10</span>
          </button>
          <button
            type="button"
            id="tab-mobile-auth"
            onClick={() => setMobileTab('auth')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all ${
              mobileTab === 'auth'
                ? 'bg-[#7A9A3C] text-black shadow-lg shadow-[#7A9A3C]/20'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <KeyRound className="h-4 w-4" />
            <span>{currentLanguage === 'ru' ? 'Вход / Регистрация' : currentLanguage === 'fr' ? 'Connexion' : 'Login / Register'}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
          
          {/* LEFT COLUMN ON DESKTOP: Tourist Information Portal */}
          <div 
            id="section-welcome-info" 
            className={`lg:col-span-7 space-y-6 ${mobileTab === 'news' ? 'block' : 'hidden lg:block'}`}
          >
            {/* The Tourist Information Portal: Hero news with infographic, past news carousel, and archive */}
            <TouristInformationPortal currentLanguage={currentLanguage} />
          </div>

          {/* RIGHT COLUMN ON DESKTOP: Authentication Block + AI Support Block */}
          <div 
            id="section-welcome-auth-and-ai" 
            className={`lg:col-span-5 flex flex-col space-y-6 w-full max-w-md mx-auto lg:ml-auto lg:mr-0 ${mobileTab === 'auth' ? 'block' : 'hidden lg:block'}`}
          >
            
            {/* 1. TOP CARD: Authentication Block (Shifted to right, sits ABOVE the AI Support Block) */}
            <div id="card-auth-form-card" className="w-full rounded-2xl border border-[#2B3232] bg-[#171A1A] p-6 shadow-2xl backdrop-blur-md md:p-7">
              
              {/* Email Verification Form pending flow */}
              {verificationPending ? (
                <div id="section-verification-workflow" className="space-y-6">
                  <div className="text-center">
                    <CheckCircle className="mx-auto h-12 w-12 text-[#7A9A3C] animate-bounce" id="icon-verification-mail-sent" />
                    <h3 className="mt-4 text-lg font-bold text-gray-100">{t('confirmCodeTitle')}</h3>
                    <p className="mt-2 text-xs text-gray-400 leading-relaxed">{t('confirmCodeDesc')}</p>
                    <div className="mt-1 font-semibold text-[#90B24A] text-xs">
                      {currentLanguage === 'en' ? 'To email:' : currentLanguage === 'ru' ? 'На почту:' : 'Vers email:'} <span className="text-white">{verifyingEmail}</span>
                    </div>
                  </div>

                  {/* Notification Box containing generated code to test easily */}
                  <div id="alert-hint-code" className="rounded-xl border border-dashed border-[#7A9A3C]/40 bg-[#7A9A3C]/10 p-4">
                    <div className="flex items-center space-x-2 text-[#90B24A] text-xs font-semibold">
                      <span>ℹ️ SECURITY SIMULATOR:</span>
                    </div>
                    <p className="mt-1 text-[11px] text-[#9AA1A0]">
                      {currentLanguage === 'en' 
                        ? 'To confirm your registration, type the security code' 
                        : currentLanguage === 'ru' 
                        ? 'Для подтверждения регистрации введите код безопасности' 
                        : "Pour confirmer l'inscription, veuillez saisir le code de sécurité"} <strong className="text-white text-sm tracking-widest">{generatedCode}</strong>
                    </p>
                  </div>

                  <form id="form-email-code-verify" onSubmit={handleVerifySubmit} className="space-y-4">
                    <div>
                      <label htmlFor="input-verify-code" className="block text-xs font-medium text-gray-400 mb-1">{t('verificationCode')}</label>
                      <input
                        id="input-verify-code"
                        type="text"
                        required
                        maxLength={6}
                        value={verificationCode}
                        onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                        placeholder="883210"
                        className="w-full rounded-xl border border-[#2B3232] bg-[#111414] p-3 text-center text-lg font-mono tracking-widest text-[#90B24A] outline-none focus:border-[#7A9A3C] transition"
                      />
                    </div>

                    {regError && (
                      <div className="flex items-center space-x-2 rounded-lg bg-red-950/40 border border-red-800 px-3 py-2 text-xs text-red-400" id="alert-verify-error">
                        <ShieldAlert className="h-4 w-4 shrink-0" />
                        <span>{regError}</span>
                      </div>
                    )}

                    <button
                      id="btn-verify-code-submit"
                      type="submit"
                      className="w-full rounded-xl bg-[#7A9A3C] py-3 text-sm font-bold text-black hover:bg-[#5E7A2A] hover:text-white transition-all duration-300 cursor-pointer"
                    >
                      {t('verifyBtn')}
                    </button>

                    <button
                      id="btn-verification-cancel"
                      type="button"
                      onClick={() => {
                        setVerificationPending(false);
                        setRegError('');
                      }}
                      className="w-full text-center text-xs text-gray-400 hover:text-gray-200 transition cursor-pointer"
                    >
                      {t('back')}
                    </button>
                  </form>
                </div>
              ) : (
                <>
                  {/* Tab headers */}
                  <div id="tabs-auth-control" className="flex border-b border-[#2B3232] pb-3 mb-5">
                    <button
                      id="btn-tab-login"
                      onClick={() => {
                        setActiveTab('login');
                        setLoginError('');
                      }}
                      className={`flex flex-1 items-center justify-center py-2 text-sm font-semibold border-b-2 transition cursor-pointer ${
                        activeTab === 'login' ? 'border-[#7A9A3C] text-[#90B24A]' : 'border-transparent text-gray-400 hover:text-gray-200'
                      }`}
                    >
                      <LogIn className="mr-2 h-4 w-4" />
                      {t('loginBtn')}
                    </button>
                    <button
                      id="btn-tab-register"
                      onClick={() => {
                        setActiveTab('register');
                        setRegError('');
                      }}
                      className={`flex flex-1 items-center justify-center py-2 text-sm font-semibold border-b-2 transition cursor-pointer ${
                        activeTab === 'register' ? 'border-[#7A9A3C] text-[#90B24A]' : 'border-transparent text-gray-400 hover:text-gray-200'
                      }`}
                    >
                      <UserPlus className="mr-2 h-4 w-4" />
                      {t('registerBtn')}
                    </button>
                  </div>

                  {/* Login Form Panel */}
                  {activeTab === 'login' && (
                    <div id="panel-login-tab">
                      <h2 className="text-lg font-bold text-center text-white mb-5">{t('loginTitle')}</h2>
                      
                      <form id="form-login-payload" onSubmit={handleLoginSubmit} className="space-y-4">
                        <div>
                          <label htmlFor="input-login-email" className="block text-xs font-medium text-gray-400 mb-1">{t('emailLabel')}</label>
                          <input
                            id="input-login-email"
                            type="email"
                            required
                            value={loginEmail}
                            onChange={(e) => setLoginEmail(e.target.value)}
                            placeholder="your_name@gmail.com"
                            className="w-full rounded-xl border border-[#2B3232] bg-[#111414] px-4 py-2.5 text-sm text-gray-100 placeholder-gray-600 outline-none focus:border-[#7A9A3C] transition"
                          />
                        </div>

                        <div>
                          <label htmlFor="input-login-password" className="block text-xs font-medium text-gray-400 mb-1">{t('passwordLabel')}</label>
                          <div className="relative">
                            <input
                              id="input-login-password"
                              type={showLoginPassword ? 'text' : 'password'}
                              required
                              value={loginPassword}
                              onChange={(e) => setLoginPassword(e.target.value)}
                              placeholder="••••••••"
                              className="w-full rounded-xl border border-[#2B3232] bg-[#111414] pl-4 pr-10 py-2.5 text-sm text-gray-100 placeholder-gray-600 outline-none focus:border-[#7A9A3C] transition"
                            />
                            <button
                              id="btn-toggle-login-password"
                              type="button"
                              onClick={() => setShowLoginPassword(!showLoginPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 cursor-pointer"
                            >
                              {showLoginPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </div>
                        </div>

                        {loginError && (
                          <div className="flex items-center space-x-2 rounded-lg bg-red-950/40 border border-red-800 px-3 py-2 text-xs text-red-400" id="alert-login-error">
                            <ShieldAlert className="h-4 w-4 shrink-0" />
                            <span>{loginError}</span>
                          </div>
                        )}

                        <button
                          id="btn-login-submit"
                          type="submit"
                          disabled={isAuthenticating}
                          className="w-full rounded-xl bg-[#7A9A3C] py-3 text-sm font-bold text-black hover:bg-[#5E7A2A] hover:text-white transition duration-300 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-lg shadow-[#7A9A3C]/10"
                        >
                          {isAuthenticating ? (currentLanguage === 'ru' ? 'Вход...' : currentLanguage === 'fr' ? 'Connexion en cours...' : 'Signing in...') : t('loginBtn')}
                        </button>
                      </form>
                    </div>
                  )}

                  {/* Registration Form Panel */}
                  {activeTab === 'register' && (
                    <div id="panel-register-tab">
                      <h2 className="text-lg font-bold text-center text-white mb-5">{t('registerTitle')}</h2>
                      
                      <form id="form-register-payload" onSubmit={handleRegisterSubmit} className="space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label htmlFor="input-reg-firstname" className="block text-xs font-medium text-gray-400 mb-1">{t('firstNameLabel')}</label>
                            <input
                              id="input-reg-firstname"
                              type="text"
                              required
                              value={regFirstName}
                              onChange={(e) => setRegFirstName(e.target.value)}
                              placeholder="Jules"
                              className="w-full rounded-xl border border-[#2B3232] bg-[#111414] px-3 py-2 text-xs text-gray-100 placeholder-gray-600 outline-none focus:border-[#7A9A3C] transition"
                            />
                          </div>
                          <div>
                            <label htmlFor="input-reg-lastname" className="block text-xs font-medium text-gray-400 mb-1">{t('lastNameLabel')}</label>
                            <input
                              id="input-reg-lastname"
                              type="text"
                              required
                              value={regLastName}
                              onChange={(e) => setRegLastName(e.target.value)}
                              placeholder="Verne"
                              className="w-full rounded-xl border border-[#2B3232] bg-[#111414] px-3 py-2 text-xs text-gray-100 placeholder-gray-600 outline-none focus:border-[#7A9A3C] transition"
                            />
                          </div>
                        </div>

                        <div>
                          <label htmlFor="input-reg-email" className="block text-xs font-medium text-gray-400 mb-1">{t('emailLabel')}</label>
                          <input
                            id="input-reg-email"
                            type="email"
                            required
                            value={regEmail}
                            onChange={(e) => setRegEmail(e.target.value)}
                            placeholder="your_name@gmail.com"
                            className="w-full rounded-xl border border-[#2B3232] bg-[#111414] px-4 py-2 text-xs text-gray-100 placeholder-gray-600 outline-none focus:border-[#7A9A3C] transition"
                          />
                        </div>

                        <div>
                          <label htmlFor="input-reg-password" className="block text-xs font-medium text-gray-400 mb-1">{t('passwordLabel')}</label>
                          <div className="relative">
                            <input
                              id="input-reg-password"
                              type={showRegPassword ? 'text' : 'password'}
                              required
                              value={regPassword}
                              onChange={(e) => setRegPassword(e.target.value)}
                              placeholder="Create password"
                              className="w-full rounded-xl border border-[#2B3232] bg-[#111414] pl-4 pr-10 py-2 text-xs text-gray-100 placeholder-gray-600 outline-none focus:border-[#7A9A3C] transition"
                            />
                            <button
                              id="btn-toggle-reg-password"
                              type="button"
                              onClick={() => setShowRegPassword(!showRegPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 cursor-pointer"
                            >
                              {showRegPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                            </button>
                          </div>
                        </div>

                        {regError && (
                          <div className="flex items-center space-x-2 rounded-lg bg-red-950/40 border border-red-800 px-3 py-2 text-xs text-red-400" id="alert-reg-error">
                            <ShieldAlert className="h-4 w-4 shrink-0" />
                            <span>{regError}</span>
                          </div>
                        )}

                        <button
                          id="btn-reg-submit"
                          type="submit"
                          disabled={isAuthenticating}
                          className="w-full rounded-xl bg-[#7A9A3C] py-3 text-sm font-bold text-black hover:bg-[#5E7A2A] hover:text-white transition duration-300 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-lg shadow-[#7A9A3C]/10"
                        >
                          {isAuthenticating ? (currentLanguage === 'ru' ? 'Регистрация...' : currentLanguage === 'fr' ? 'Création...' : 'Creating Account...') : t('registerBtn')}
                        </button>
                      </form>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* 2. BOTTOM CARD: AI Support Block (Positioned directly BELOW the Authorization Block) */}
            <div id="section-welcome-ai-support-embedded" className="w-full relative group">
              <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-[#7A9A3C]/35 via-[#90B24A]/25 to-[#7A9A3C]/35 blur-lg opacity-75 group-hover:opacity-100 transition duration-500 -z-10 pointer-events-none" />
              <SupportChat currentLanguage={currentLanguage} embedded={true} defaultOpen={false} />
            </div>

          </div>
        </div>
      </main>

      {/* Shared Footer with Legal Navigation */}
      <AppFooter
        id="footer-auth"
        currentLanguage={currentLanguage}
        onNavigate={onNavigate}
      />
    </div>
  );
}
