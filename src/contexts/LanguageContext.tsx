import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Language = 'en' | 'da';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const translations = {
  en: {
    // Navigation
    'nav.routes': 'Routes',
    'nav.training': 'Training',
    'nav.profile': 'Profile',
    'nav.community': 'Community',
    'nav.login': 'Login',
    'nav.logout': 'Logout',
    
    // Hero
    'hero.title': 'Your Digital Training Partner',
    'hero.subtitle': 'AI-powered route planning, training analysis, and performance optimization for passionate cyclists',
    'hero.cta': 'Get Started',
    'hero.learn': 'Learn More',
    
    // Route Finder
    'routes.title': 'Find Your Perfect Route',
    'routes.distance': 'Distance (km)',
    'routes.elevation': 'Elevation (m)',
    'routes.terrain': 'Terrain Type',
    'routes.road': 'Road',
    'routes.gravel': 'Gravel',
    'routes.mtb': 'Mountain Bike',
    'routes.search': 'Find Routes',
    'routes.download': 'Download GPX',
    'routes.garmin': 'Send to Garmin',
    
    // Training
    'training.title': 'AI Training Partner',
    'training.analyze': 'Analyze Performance',
    'training.goals': 'Set Goals',
    'training.nutrition': 'Nutrition Tips',
    
    // Profile
    'profile.title': 'Your Profile',
    'profile.name': 'Full Name',
    'profile.location': 'Location',
    'profile.discipline': 'Cycling Discipline',
    'profile.experience': 'Experience Level',
    'profile.save': 'Save Profile',
    
    // Auth
    'auth.signup': 'Sign Up',
    'auth.login': 'Login',
    'auth.email': 'Email',
    'auth.password': 'Password',
    'auth.confirmPassword': 'Confirm Password',
    'auth.fullName': 'Full Name',
    'auth.createAccount': 'Create Account',
    'auth.haveAccount': 'Already have an account?',
    'auth.noAccount': "Don't have an account?",
  },
  da: {
    // Navigation
    'nav.routes': 'Ruter',
    'nav.training': 'Træning',
    'nav.profile': 'Profil',
    'nav.community': 'Fællesskab',
    'nav.login': 'Log ind',
    'nav.logout': 'Log ud',
    
    // Hero
    'hero.title': 'Din Digitale Træningspartner',
    'hero.subtitle': 'AI-drevet ruteplanlægning, træningsanalyse og præstationsoptimering for passionerede cyklister',
    'hero.cta': 'Kom i gang',
    'hero.learn': 'Lær mere',
    
    // Route Finder
    'routes.title': 'Find din perfekte rute',
    'routes.distance': 'Afstand (km)',
    'routes.elevation': 'Stigning (m)',
    'routes.terrain': 'Terræntype',
    'routes.road': 'Landevej',
    'routes.gravel': 'Grus',
    'routes.mtb': 'Mountainbike',
    'routes.search': 'Find ruter',
    'routes.download': 'Download GPX',
    'routes.garmin': 'Send til Garmin',
    
    // Training
    'training.title': 'AI Træningspartner',
    'training.analyze': 'Analyser præstation',
    'training.goals': 'Sæt mål',
    'training.nutrition': 'Ernæringstips',
    
    // Profile
    'profile.title': 'Din profil',
    'profile.name': 'Fulde navn',
    'profile.location': 'Placering',
    'profile.discipline': 'Cykeldisciplin',
    'profile.experience': 'Erfaringsniveau',
    'profile.save': 'Gem profil',
    
    // Auth
    'auth.signup': 'Tilmeld',
    'auth.login': 'Log ind',
    'auth.email': 'E-mail',
    'auth.password': 'Adgangskode',
    'auth.confirmPassword': 'Bekræft adgangskode',
    'auth.fullName': 'Fulde navn',
    'auth.createAccount': 'Opret konto',
    'auth.haveAccount': 'Har du allerede en konto?',
    'auth.noAccount': 'Har du ikke en konto?',
  },
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem('preferred-language');
    return (saved === 'da' || saved === 'en') ? saved : 'en';
  });

  useEffect(() => {
    localStorage.setItem('preferred-language', language);
  }, [language]);

  const t = (key: string): string => {
    return translations[language][key as keyof typeof translations['en']] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
};