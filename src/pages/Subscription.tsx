import { Navigation } from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

const Subscription = () => {
  const navigate = useNavigate();
  const [currentPlan, setCurrentPlan] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    loadCurrentPlan();
  }, []);

  const loadCurrentPlan = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsLoggedIn(false);
        return;
      }

      setIsLoggedIn(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('subscription_plan')
        .eq('id', user.id)
        .single();

      if (data) {
        setCurrentPlan(data.subscription_plan || 'free');
      }
    } catch (error) {
      console.error('Error loading plan:', error);
    }
  };

  const plans = [
    {
      name: 'Free',
      price: '0 kr',
      period: '',
      description: 'Kom i gang med det basale',
      features: [
        'Basisk ruteplanlægger',
        'Profil og indstillinger',
        'Adgang til community',
        'Rutesøgning',
      ],
      cta: 'Kom i gang gratis',
      variant: 'outline' as const,
      planKey: 'free' as const,
    },
    {
      name: 'Premium',
      price: '59 kr',
      period: '/md',
      description: 'For seriøse cyklister',
      features: [
        'Alt i Free',
        'AI træningsrådgivning',
        'Garmin & Wahoo sync',
        'Avancerede ruteanalyser',
        'Træningsindsigter',
        'Ugentlige træningsplaner',
      ],
      cta: 'Start gratis prøveperiode',
      variant: 'default' as const,
      popular: true,
      planKey: 'premium' as const,
    },
    {
      name: 'Pro',
      price: '99 kr',
      period: '/md',
      description: 'Maksimal performance',
      features: [
        'Alt i Premium',
        'Personlig AI coach',
        'Ernæringsplaner',
        'Community events',
        'Eksklusive challenges',
        'Præstationsanalyse',
        'Prioriteret support',
      ],
      cta: 'Gå Pro',
      variant: 'secondary' as const,
      planKey: 'pro' as const,
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="container mx-auto px-4 pt-24 pb-20">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Vælg din plan
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Fra hobbyist til professionel – vi har en plan der passer til dine ambitioner
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mb-12">
            {plans.map((plan, index) => {
              const isCurrentPlan = isLoggedIn && plan.planKey === currentPlan;
              
              // Determine if this is a downgrade
              const planHierarchy = { free: 0, premium: 1, pro: 2 };
              const currentPlanValue = planHierarchy[currentPlan as keyof typeof planHierarchy] || 0;
              const targetPlanValue = planHierarchy[plan.planKey];
              const isDowngrade = isLoggedIn && targetPlanValue < currentPlanValue;
              
              return (
                <Card 
                  key={index} 
                  className={`relative ${plan.popular && !isDowngrade ? 'border-primary shadow-elevated' : ''} ${isCurrentPlan ? 'border-2 border-primary bg-primary/5' : ''}`}
                >
                  {plan.popular && !isCurrentPlan && !isDowngrade && (
                    <div className="absolute -top-4 left-0 right-0 flex justify-center">
                      <span className="bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-semibold">
                        Mest populær
                      </span>
                    </div>
                  )}
                  {isCurrentPlan && (
                    <div className="absolute -top-4 left-0 right-0 flex justify-center">
                      <Badge className="bg-accent text-accent-foreground px-4 py-1 text-sm font-semibold">
                        Din nuværende plan
                      </Badge>
                    </div>
                  )}
                
                <CardHeader className="pb-8 pt-8">
                  <CardTitle className="text-2xl mb-2">{plan.name}</CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                  <div className="mt-4">
                    <span className="text-4xl font-bold">{plan.price}</span>
                    <span className="text-muted-foreground">{plan.period}</span>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-6">
                  <ul className="space-y-3">
                    {plan.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-start gap-3">
                        <Check className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  
                  <Button 
                    className="w-full" 
                    variant={isCurrentPlan || isDowngrade ? 'outline' : plan.variant}
                    onClick={() => navigate('/auth')}
                    disabled={isCurrentPlan || isDowngrade}
                  >
                    {isCurrentPlan ? 'Din nuværende plan' : isDowngrade ? 'Ikke tilgængelig' : plan.cta}
                  </Button>
                </CardContent>
              </Card>
              );
            })}
          </div>

          <div className="text-center space-y-4">
            <p className="text-sm text-muted-foreground">
              Alle betalte planer inkluderer 14 dages gratis prøveperiode. Ingen binding.
            </p>
            <div className="flex justify-center gap-6 text-sm text-muted-foreground">
              <span>✓ Annullér når som helst</span>
              <span>✓ Sikker betaling</span>
              <span>✓ 30 dages returret</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Subscription;
