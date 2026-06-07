import React, { useState } from 'react';
import { LogIn, UserPlus, Eye, EyeOff, ShieldAlert, CheckCircle, Languages } from 'lucide-react';
import { LanguageCode, User, UserRole } from '../types';
import { loginUser, registerUser, verifyUserCode, getUsers } from '../db';
import { translations } from '../translations';

interface WelcomeScreenProps {
  currentLanguage: LanguageCode;
  onLoginSuccess: (user: User) => void;
  setLanguage: (lang: LanguageCode) => void;
}

export default function WelcomeScreen({ currentLanguage, onLoginSuccess, setLanguage }: WelcomeScreenProps) {
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  
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

  // Handles clicking on Demo credentials for ease of testing
  const handleQuickLogin = (email: string) => {
    setLoginEmail(email);
    setLoginPassword('admin123');
    setLoginError('');
  };

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
        if (!user.isVerified && user.role === 'Client') {
          // Switch to verification code view if somehow not verified
          setVerifyingEmail(user.email);
          setVerificationPending(true);
          setIsAuthenticating(false);
          return;
        }
        onLoginSuccess(user);
      } else {
        setLoginError(
          currentLanguage === 'en'
            ? 'Invalid email or password combination. Try credentials listed below.'
            : currentLanguage === 'ru'
            ? 'Неверный адрес почты или пароль. Попробуйте тестовые аккаунты.'
            : 'Identifiants incorrects. Veuillez utiliser les comptes de démonstration.'
        );
      }
    } catch (err: any) {
      setLoginError(err.message || 'Authentication failed');
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
    <div id="card-welcome-container" className="flex min-h-screen flex-col bg-[#111827] text-gray-100 font-sans selection:bg-[#65a30d]/40 selection:text-white">
      {/* Top Banner Navigation (Title & Lang Selector) */}
      <header id="header-auth-top" className="flex items-center justify-between border-b border-gray-800 bg-[#1f2937]/40 px-6 py-4 md:px-12">
        <div className="flex items-center space-x-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#65a30d] text-white shadow-lg saturate-120 p-1">
            <svg 
              viewBox="0 0 100 100" 
              className="h-full w-full" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2.5" 
              strokeLinecap="round" 
              strokeLinejoin="round"
              id="brand-logo-svg"
            >
              {/* Document Base */}
              <path d="M22 14h42l18 18v52a4 4 0 0 1-4 4H26a4 4 0 0 1-4-4V18a4 4 0 0 1 4-4z" />
              {/* Flap */}
              <path d="M64 14v18h18" />
              
              {/* Checklist on the left */}
              <path d="M29 27l2.5 2.5 5.5-5.5" strokeWidth="3" stroke="#a2e635" />
              <path d="M29 41l2.5 2.5 5.5-5.5" strokeWidth="3" stroke="#a2e635" />
              <path d="M29 55l2.5 2.5 5.5-5.5" strokeWidth="3" stroke="#a2e635" />
              <path d="M29 69l2.5 2.5 5.5-5.5" strokeWidth="3" stroke="#a2e635" />
              
              {/* Horizontal line pills */}
              <rect x="58" y="34" width="16" height="5" rx="2.5" strokeWidth="1.5" />
              <rect x="58" y="44" width="16" height="5" rx="2.5" strokeWidth="1.5" />
              <rect x="58" y="54" width="10" height="5" rx="2.5" strokeWidth="1.5" />

              {/* Minaret Tower base */}
              <path d="M47 84l1-38h6l1 38" />
              {/* Balcony/slots */}
              <path d="M45 46h10v-6H45v6z" rx="1" strokeWidth="1.5" />
              <line x1="48" y1="42" x2="48" y2="44" strokeWidth="1" />
              <line x1="50" y1="42" x2="50" y2="44" strokeWidth="1" />
              <line x1="52" y1="42" x2="52" y2="44" strokeWidth="1" />
              {/* Tower Spire */}
              <path d="M47 40c0-4 3-5 3-9 0 4 3 5 3 9" />
              <circle cx="50" cy="27" r="1" fill="currentColor" stroke="none" />

              {/* Mosque Dome */}
              <path d="M51 84c0-12 7-18 15-18s15 6 15 18H51z" fill="#65a30d" />
              <line x1="66" y1="66" x2="66" y2="60" strokeWidth="2" />
              {/* Crescent Moon */}
              <path d="M68.5 59.5a2.5 2.5 0 1 1-1-3.5 2 2 0 1 0 1 3.5" fill="currentColor" stroke="none" />
            </svg>
          </div>
          <span className="text-xl font-bold tracking-tight text-white select-none">
            Regist<span className="text-[#a2e635]">App</span>
          </span>
        </div>

        {/* Translation Switcher Dropdown */}
        <div className="flex items-center space-x-2">
          <Languages className="h-4 w-4 text-gray-400" id="icon-auth-lang" />
          <select
            id="select-auth-language"
            value={currentLanguage}
            onChange={(e) => setLanguage(e.target.value as LanguageCode)}
            className="rounded-lg border border-gray-700 bg-[#1f2937] px-3 py-1.5 text-xs text-gray-300 outline-none focus:border-[#65a30d] transition"
          >
            <option value="en">English (EN)</option>
            <option value="ru">Русский (RU)</option>
            <option value="fr">Français (FR)</option>
          </select>
        </div>
      </header>

      {/* Main Container */}
      <main id="main-auth-layout" className="flex flex-1 flex-col items-center justify-center px-4 py-12 md:py-16">
        <div id="card-auth-form-card" className="w-full max-w-md rounded-2xl border border-gray-800 bg-[#1f2937]/60 p-6 shadow-2xl backdrop-blur-md md:p-8">
          
          {/* Email Verification Form pending flow */}
          {verificationPending ? (
            <div id="section-verification-workflow" className="space-y-6">
              <div className="text-center">
                <CheckCircle className="mx-auto h-12 w-12 text-[#65a30d] animate-bounce" id="icon-verification-mail-sent" />
                <h3 className="mt-4 text-lg font-bold text-gray-100">{t('confirmCodeTitle')}</h3>
                <p className="mt-2 text-xs text-gray-400 leading-relaxed">{t('confirmCodeDesc')}</p>
                <div className="mt-1 font-semibold text-[#a2e635] text-xs">
                  {currentLanguage === 'en' ? 'To email:' : currentLanguage === 'ru' ? 'На почту:' : 'Vers email:'} <span className="text-white">{verifyingEmail}</span>
                </div>
              </div>

              {/* Secure Notification Box containing generated code to bypass physical mailbox block in development */}
              <div id="alert-hint-code" className="rounded-xl border border-dashed border-[#65a30d]/30 bg-[#65a30d]/10 p-4">
                <div className="flex items-center space-x-2 text-[#a2e635] text-xs font-semibold">
                  <span>ℹ️ SECURITY SIMULATOR:</span>
                </div>
                <p className="mt-1 text-[11px] text-gray-450">
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
                    className="w-full rounded-xl border border-gray-800 bg-[#111827] p-3 text-center text-lg font-mono tracking-widest text-[#a2e635] outline-none focus:border-[#65a30d] transition"
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
                  className="w-full rounded-xl bg-[#65a30d] py-3 text-sm font-semibold text-[#111827] hover:bg-[#4d7c0f] hover:text-white transition-all duration-300"
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
                  className="w-full text-center text-xs text-gray-400 hover:text-gray-200 transition"
                >
                  {t('back')}
                </button>
              </form>
            </div>
          ) : (
            <>
              {/* Tab headers */}
              <div id="tabs-auth-control" className="flex border-b border-gray-800 pb-4 mb-6">
                <button
                  id="btn-tab-login"
                  onClick={() => {
                    setActiveTab('login');
                    setLoginError('');
                  }}
                  className={`flex flex-1 items-center justify-center py-2 text-sm font-semibold border-b-2 transition ${
                    activeTab === 'login' ? 'border-[#65a30d] text-[#a2e635]' : 'border-transparent text-gray-400 hover:text-gray-200'
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
                  className={`flex flex-1 items-center justify-center py-2 text-sm font-semibold border-b-2 transition ${
                    activeTab === 'register' ? 'border-[#65a30d] text-[#a2e635]' : 'border-transparent text-gray-400 hover:text-gray-200'
                  }`}
                >
                  <UserPlus className="mr-2 h-4 w-4" />
                  {t('registerBtn')}
                </button>
              </div>

              {/* Login Form Panel */}
              {activeTab === 'login' && (
                <div id="panel-login-tab">
                  <h2 className="text-xl font-bold text-center text-white mb-6">{t('loginTitle')}</h2>
                  
                  <form id="form-login-payload" onSubmit={handleLoginSubmit} className="space-y-4">
                    <div>
                      <label htmlFor="input-login-email" className="block text-xs font-medium text-gray-400 mb-1">{t('emailLabel')}</label>
                      <input
                        id="input-login-email"
                        type="email"
                        required
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        placeholder="client@registapp.uz"
                        className="w-full rounded-xl border border-gray-800 bg-[#111827] px-4 py-2.5 text-sm text-gray-100 placeholder-gray-600 outline-none focus:border-[#65a30d] transition"
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
                          className="w-full rounded-xl border border-gray-800 bg-[#111827] pl-4 pr-10 py-2.5 text-sm text-gray-100 placeholder-gray-600 outline-none focus:border-[#65a30d] transition"
                        />
                        <button
                          id="btn-toggle-login-password"
                          type="button"
                          onClick={() => setShowLoginPassword(!showLoginPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
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
                      className="w-full rounded-xl bg-[#65a30d] py-3 text-sm font-semibold text-[#111827] saturate-125 select-none hover:bg-[#4d7c0f] hover:text-white active:scale-98 transition duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isAuthenticating ? (currentLanguage === 'ru' ? 'Вход...' : currentLanguage === 'fr' ? 'Connexion en cours...' : 'Signing in...') : t('loginBtn')}
                    </button>
                  </form>


                </div>
              )}

              {/* Registration Form Panel */}
              {activeTab === 'register' && (
                <div id="panel-register-tab">
                  <h2 className="text-xl font-bold text-center text-white mb-6">{t('registerTitle')}</h2>
                  
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
                          placeholder="Said"
                          className="w-full rounded-xl border border-gray-800 bg-[#111827] px-3 py-2 text-xs text-gray-100 placeholder-gray-750 outline-none focus:border-[#65a30d] transition"
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
                          placeholder="Tulyaganov"
                          className="w-full rounded-xl border border-gray-800 bg-[#111827] px-3 py-2 text-xs text-gray-100 placeholder-gray-750 outline-none focus:border-[#65a30d] transition"
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
                        placeholder="you@domain.com"
                        className="w-full rounded-xl border border-gray-800 bg-[#111827] px-4 py-2 text-xs text-gray-100 placeholder-gray-750 outline-none focus:border-[#65a30d] transition"
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
                          placeholder="Create high-strength password"
                          className="w-full rounded-xl border border-gray-800 bg-[#111827] pl-4 pr-10 py-2 text-xs text-gray-100 placeholder-gray-750 outline-none focus:border-[#65a30d] transition"
                        />
                        <button
                          id="btn-toggle-reg-password"
                          type="button"
                          onClick={() => setShowRegPassword(!showRegPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
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
                      className="w-full rounded-xl bg-[#65a30d] py-3 text-sm font-semibold text-[#111827] hover:bg-[#4d7c0f] hover:text-white transition duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isAuthenticating ? (currentLanguage === 'ru' ? 'Регистрация...' : currentLanguage === 'fr' ? 'Création...' : 'Creating Account...') : t('registerBtn')}
                    </button>
                  </form>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer id="footer-auth" className="border-t border-gray-800 bg-[#111827] py-6 text-center text-xs text-gray-500">
        <p>{t('copyrightText')}</p>
        <p className="mt-1">Tashkent Unified Tourist Portal, UTC+5.</p>
      </footer>
    </div>
  );
}
