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
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2 font-bold text-xl text-primary hover:opacity-80 transition-opacity">
            <Bike className="w-6 h-6" />
            <span>CyclePro</span>
          </Link>

          <div className="flex items-center gap-6">
            {user && (
              <>
                <Link 
                  to="/routes" 
                  className="flex items-center gap-2 text-foreground hover:text-primary transition-colors"
                >
                  <Route className="w-4 h-4" />
                  <span className="hidden sm:inline">{t('nav.routes')}</span>
                </Link>
                <Link 
                  to="/training" 
                  className="flex items-center gap-2 text-foreground hover:text-primary transition-colors"
                >
                  <TrendingUp className="w-4 h-4" />
                  <span className="hidden sm:inline">{t('nav.training')}</span>
                </Link>
                <Link 
                  to="/community" 
                  className="flex items-center gap-2 text-foreground hover:text-primary transition-colors"
                >
                  <Users className="w-4 h-4" />
                  <span className="hidden sm:inline">Community</span>
                </Link>
                <Link 
                  to="/profile" 
                  className="flex items-center gap-2 text-foreground hover:text-primary transition-colors"
                >
                  <User className="w-4 h-4" />
                  <span className="hidden sm:inline">{t('nav.profile')}</span>
                </Link>
              </>
            )}

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLanguage('en')}
                className={language === 'en' ? 'bg-muted' : ''}
              >
                🇬🇧
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLanguage('da')}
                className={language === 'da' ? 'bg-muted' : ''}
              >
                🇩🇰
              </Button>
            </div>

            {user ? (
              <Button onClick={handleLogout} variant="outline" size="sm">
                {t('nav.logout')}
              </Button>
            ) : (
              <Button onClick={() => navigate('/auth')} size="sm">
                {t('nav.login')}
              </Button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};