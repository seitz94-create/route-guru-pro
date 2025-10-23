import { useState, useEffect } from 'react';
import { Navigation } from '@/components/Navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { TrendingUp, Target, Apple, Activity, Sparkles } from 'lucide-react';

const Training = () => {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [insights, setInsights] = useState('');
  const [profile, setProfile] = useState<any>(null);
  const [sessions, setSessions] = useState<any[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const [profileRes, sessionsRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('training_sessions').select('*').eq('user_id', user.id).order('session_date', { ascending: false }).limit(10)
      ]);
      
      if (profileRes.data) setProfile(profileRes.data);
      if (sessionsRes.data) setSessions(sessionsRes.data);
    }
  };

  const getInsights = async (type: 'analyze' | 'goals' | 'nutrition') => {
    setLoading(true);
    setInsights('');

    try {
      const { data, error } = await supabase.functions.invoke('ai-training-insights', {
        body: {
          analysisType: type,
          userData: { profile, sessions }
        }
      });

      if (error) throw error;
      if (data.error) {
        toast.error(data.error);
        return;
      }

      setInsights(data.insights);
      toast.success('AI insights generated!');
    } catch (error: any) {
      console.error('Error getting insights:', error);
      toast.error('Failed to generate insights');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="container mx-auto px-4 pt-24 pb-20">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold mb-8 text-foreground">{t('training.title')}</h1>
          
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <Card className="shadow-card hover:shadow-elevated transition-shadow cursor-pointer">
              <CardHeader>
                <TrendingUp className="w-10 h-10 text-primary mb-4" />
                <CardTitle>{t('training.analyze')}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  Get AI-powered insights into your training patterns and performance trends
                </p>
                <Button 
                  className="w-full" 
                  onClick={() => getInsights('analyze')}
                  disabled={loading}
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  {loading ? 'Analyzing...' : 'Analyze Now'}
                </Button>
              </CardContent>
            </Card>
            
            <Card className="shadow-card hover:shadow-elevated transition-shadow cursor-pointer">
              <CardHeader>
                <Target className="w-10 h-10 text-secondary mb-4" />
                <CardTitle>{t('training.goals')}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  Set and track your cycling objectives with personalized recommendations
                </p>
                <Button 
                  className="w-full"
                  onClick={() => getInsights('goals')}
                  disabled={loading}
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  {loading ? 'Generating...' : 'Set Goals'}
                </Button>
              </CardContent>
            </Card>
            
            <Card className="shadow-card hover:shadow-elevated transition-shadow cursor-pointer">
              <CardHeader>
                <Apple className="w-10 h-10 text-accent mb-4" />
                <CardTitle>{t('training.nutrition')}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  Optimize your diet for better performance and recovery
                </p>
                <Button 
                  className="w-full"
                  onClick={() => getInsights('nutrition')}
                  disabled={loading}
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  {loading ? 'Loading...' : 'Get Tips'}
                </Button>
              </CardContent>
            </Card>
            
            <Card className="shadow-card hover:shadow-elevated transition-shadow cursor-pointer">
              <CardHeader>
                <Activity className="w-10 h-10 text-primary mb-4" />
                <CardTitle>Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  View your latest rides and training sessions
                </p>
                <Button className="w-full">View Activity</Button>
              </CardContent>
            </Card>
          </div>
          
          {insights && (
            <Card className="shadow-elevated mb-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary" />
                  AI Training Insights
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm max-w-none dark:prose-invert">
                  <div className="whitespace-pre-wrap text-muted-foreground">
                    {insights}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="shadow-elevated">
            <CardHeader>
              <CardTitle>Training Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 text-muted-foreground">
                <p>
                  Track your recent training sessions and monitor your progress towards your goals.
                </p>
                {sessions.length > 0 ? (
                  <div className="space-y-2">
                    <h3 className="font-semibold text-foreground">Recent Sessions</h3>
                    {sessions.slice(0, 5).map((session) => (
                      <div key={session.id} className="p-3 border rounded-lg">
                        <div className="flex justify-between items-center">
                          <span className="text-sm">
                            {new Date(session.session_date).toLocaleDateString()}
                          </span>
                          <div className="text-sm space-x-4">
                            {session.distance_km && <span>{session.distance_km} km</span>}
                            {session.duration_minutes && <span>{session.duration_minutes} min</span>}
                            {session.avg_power && <span>{session.avg_power}W</span>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center py-8">
                    No training sessions yet. Connect your device to start tracking!
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Training;