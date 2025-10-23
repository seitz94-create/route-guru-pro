import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { Bike, User, Route, TrendingUp, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useEffect, useState } from 'react';
import { User as SupabaseUser } from '@supabase/supabase-js';

export const Navigation = () => {
  const { language, setLanguage, t } = useLanguage();
  const navigate = useNavigate();
  const [user, setUser] = useState<SupabaseUser | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  return (
    <nav className="sticky top-0 left-0 right-0 z-50 bg-background/98 backdrop-blur-md border-b border-border">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2 font-bold text-lg text-foreground hover:text-primary transition-colors">
            <Bike className="w-6 h-6 text-primary" />
            <span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
              TrainingPartner
            </span>
          </Link>

          <div className="flex items-center gap-1 md:gap-4">
            <Link 
              to="/" 
              className="px-3 py-2 text-sm font-medium text-foreground hover:text-primary transition-colors"
            >
              Home
            </Link>
            <Link 
              to="/routes" 
              className="px-3 py-2 text-sm font-medium text-foreground hover:text-primary transition-colors"
            >
              <span className="hidden md:inline">Find Rute</span>
              <span className="md:hidden">Ruter</span>
            </Link>
            {user && (
              <>
                <Link 
                  to="/training" 
                  className="px-3 py-2 text-sm font-medium text-foreground hover:text-primary transition-colors"
                >
                  <span className="hidden md:inline">Træningspartner</span>
                  <span className="md:hidden">Træning</span>
                </Link>
                <Link 
                  to="/community" 
                  className="px-3 py-2 text-sm font-medium text-foreground hover:text-primary transition-colors"
                >
                  Community
                </Link>
                <Link 
                  to="/profile" 
                  className="px-3 py-2 text-sm font-medium text-foreground hover:text-primary transition-colors"
                >
                  Profil
                </Link>
                <Link 
                  to="/subscription" 
                  className="px-3 py-2 text-sm font-medium text-foreground hover:text-primary transition-colors"
                >
                  <span className="hidden md:inline">Abonnement</span>
                  <span className="md:hidden">Pro</span>
                </Link>
              </>
            )}

            <div className="flex items-center gap-1 ml-2 border-l border-border pl-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLanguage('da')}
                className={language === 'da' ? 'bg-muted' : ''}
              >
                🇩🇰
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLanguage('en')}
                className={language === 'en' ? 'bg-muted' : ''}
              >
                🇬🇧
              </Button>
            </div>

            {user ? (
              <Button onClick={handleLogout} variant="outline" size="sm" className="ml-2">
                Log ud
              </Button>
            ) : (
              <Button onClick={() => navigate('/auth')} size="sm" className="ml-2 bg-primary text-primary-foreground hover:bg-primary-hover">
                Log ind
              </Button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};