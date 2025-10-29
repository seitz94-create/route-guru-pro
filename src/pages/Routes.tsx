import { useState, useEffect } from 'react';
import { Navigation } from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Sparkles, Lock } from 'lucide-react';
import RouteCard from '@/components/RouteCard';
import { useNavigate } from 'react-router-dom';

const Routes = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [distance, setDistance] = useState('50');
  const [elevation, setElevation] = useState<'flat' | 'hilly' | 'mountainous'>('hilly');
  const [terrain, setTerrain] = useState('road');
  const [direction, setDirection] = useState('none');
  const [routeType, setRouteType] = useState<'loop' | 'point-to-point'>('loop');
  const [startLocation, setStartLocation] = useState('');
  const [endLocation, setEndLocation] = useState('');
  const [searching, setSearching] = useState(false);
  const [routes, setRoutes] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      if (data) {
        setProfile(data);
        const plan = data.subscription_plan || 'free';
        setHasAccess(plan === 'premium' || plan === 'pro');
      }
    }
  };

  const handleFindRoutes = async () => {
    if (!hasAccess) {
      toast.error('AI ruteforslag kræver Premium eller Pro abonnement');
      return;
    }

    setSearching(true);
    setRoutes([]);
    
    try {
      const { data, error } = await supabase.functions.invoke('ai-route-suggestions', {
        body: {
          preferences: {
            distance: parseInt(distance),
            elevation,
            terrain,
            direction,
            routeType,
            startLocation: startLocation || profile?.location,
            endLocation: routeType === 'point-to-point' ? endLocation : startLocation
          },
          userProfile: profile
        }
      });

      if (error) throw error;

      if (data.error) {
        toast.error(data.error);
        return;
      }

      setRoutes(data.routes || []);
      toast.success(`Found ${data.routes?.length || 0} personalized routes!`);
    } catch (error: any) {
      console.error('Error getting route suggestions:', error);
      toast.error('Failed to generate route suggestions. Please try again.');
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="container mx-auto px-4 pt-24 pb-20">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold mb-8 text-foreground">{t('routes.title')}</h1>
          
          <Card className="mb-8 shadow-card">
            <CardHeader>
              <CardTitle>Route Preferences</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="routeType">Rute Type</Label>
                <Select value={routeType} onValueChange={(value: 'loop' | 'point-to-point') => setRouteType(value)}>
                  <SelectTrigger id="routeType">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="loop">Rundtur (loop)</SelectItem>
                    <SelectItem value="point-to-point">Punkt-til-punkt</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="startLocation">Startsted</Label>
                  <Input
                    id="startLocation"
                    placeholder="f.eks. Roskilde, København"
                    value={startLocation}
                    onChange={(e) => setStartLocation(e.target.value)}
                  />
                </div>
                
                {routeType === 'point-to-point' && (
                  <div className="space-y-2">
                    <Label htmlFor="endLocation">Slutsted</Label>
                    <Input
                      id="endLocation"
                      placeholder="f.eks. Aarhus, Odense"
                      value={endLocation}
                      onChange={(e) => setEndLocation(e.target.value)}
                    />
                  </div>
                )}
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="distance">{t('routes.distance')} (km)</Label>
                  <Input
                    id="distance"
                    type="number"
                    min="20"
                    max="500"
                    value={distance}
                    onChange={(e) => setDistance(e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="elevation">Højdemeter Niveau</Label>
                  <Select value={elevation} onValueChange={(value: 'flat' | 'hilly' | 'mountainous') => setElevation(value)}>
                    <SelectTrigger id="elevation">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="flat">Fladt (minimum stigning)</SelectItem>
                      <SelectItem value="hilly">Bakket (moderat stigning)</SelectItem>
                      <SelectItem value="mountainous">Bjergagtigt (maksimal stigning)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="terrain">{t('routes.terrain')}</Label>
                <Select value={terrain} onValueChange={setTerrain}>
                  <SelectTrigger id="terrain">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="road">{t('routes.road')}</SelectItem>
                    <SelectItem value="gravel">{t('routes.gravel')}</SelectItem>
                    <SelectItem value="mtb">{t('routes.mtb')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="direction">Retning (valgfri)</Label>
                <Select value={direction} onValueChange={setDirection}>
                  <SelectTrigger id="direction">
                    <SelectValue placeholder="Vælg retning" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Ingen præference</SelectItem>
                    <SelectItem value="north">Nord</SelectItem>
                    <SelectItem value="south">Syd</SelectItem>
                    <SelectItem value="east">Øst</SelectItem>
                    <SelectItem value="west">Vest</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <Button 
                onClick={handleFindRoutes} 
                className="w-full"
                disabled={searching || !hasAccess}
              >
                <Sparkles className="w-4 h-4 mr-2" />
                {!hasAccess ? (
                  <>
                    <Lock className="w-4 h-4 mr-2" />
                    Kræver Premium/Pro
                  </>
                ) : searching ? 'Genererer AI Forslag...' : 'Få AI Ruteforslag'}
              </Button>
              
              {!hasAccess && (
                <div className="text-center pt-4">
                  <p className="text-sm text-muted-foreground mb-3">
                    AI-drevne ruteforslag kræver Premium eller Pro abonnement
                  </p>
                  <Button variant="link" onClick={() => navigate('/subscription')}>
                    Se Abonnementer →
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
          
          {routes.length > 0 && (
            <div className="space-y-6">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                <h2 className="text-2xl font-bold">AI-Powered Route Suggestions</h2>
              </div>
              
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {routes.map((route, index) => (
                  <RouteCard key={index} route={route} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Routes;