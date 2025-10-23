import { Navigation } from '@/components/Navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { TrendingUp, Target, Apple, Activity } from 'lucide-react';

const Training = () => {
  const { t } = useLanguage();

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
                <Button className="w-full">Analyze Now</Button>
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
                <Button className="w-full">Set Goals</Button>
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
                <Button className="w-full">Get Tips</Button>
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
          
          <Card className="shadow-elevated">
            <CardHeader>
              <CardTitle>Training Insights</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 text-muted-foreground">
                <p>
                  Your AI training partner will analyze your cycling data from Garmin or Wahoo 
                  to provide personalized recommendations.
                </p>
                <p>
                  Connect your device to unlock:
                </p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Performance trend analysis</li>
                  <li>Training load optimization</li>
                  <li>Recovery recommendations</li>
                  <li>Nutrition timing suggestions</li>
                  <li>Race preparation plans</li>
                </ul>
                <Button className="mt-4">Connect Device</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Training;