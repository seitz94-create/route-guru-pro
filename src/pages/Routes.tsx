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
import { Sparkles } from 'lucide-react';
import RouteCard from '@/components/RouteCard';

const Routes = () => {
  const { t } = useLanguage();
  const [distance, setDistance] = useState('50');
  const [elevation, setElevation] = useState('500');
  const [terrain, setTerrain] = useState('road');
  const [direction, setDirection] = useState('');
  const [roadType, setRoadType] = useState('mixed');
  const [avoidTraffic, setAvoidTraffic] = useState(true);
  const [searching, setSearching] = useState(false);
  const [routes, setRoutes] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);

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
      setProfile(data);
    }
  };

  const handleFindRoutes = async () => {
    setSearching(true);
    setRoutes([]);
    
    try {
      const { data, error } = await supabase.functions.invoke('ai-route-suggestions', {
        body: {
          preferences: {
            distance,
            elevation,
            terrain,
            direction,
            roadType,
            avoidTraffic
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
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="distance">{t('routes.distance')}</Label>
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
                  <Label htmlFor="elevation">{t('routes.elevation')}</Label>
                  <Input
                    id="elevation"
                    type="number"
                    min="0"
                    max="5000"
                    value={elevation}
                    onChange={(e) => setElevation(e.target.value)}
                  />
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
                <Label htmlFor="direction">Preferred Direction</Label>
                <Input
                  id="direction"
                  placeholder="e.g., North, towards mountains"
                  value={direction}
                  onChange={(e) => setDirection(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="roadType">Road Type</Label>
                <Select value={roadType} onValueChange={setRoadType}>
                  <SelectTrigger id="roadType">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mixed">Mixed</SelectItem>
                    <SelectItem value="quiet">Quiet roads</SelectItem>
                    <SelectItem value="scenic">Scenic routes</SelectItem>
                    <SelectItem value="popular">Popular cycling routes</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="avoidTraffic"
                  checked={avoidTraffic}
                  onCheckedChange={(checked) => setAvoidTraffic(checked as boolean)}
                />
                <Label htmlFor="avoidTraffic" className="cursor-pointer">
                  Avoid high-traffic roads
                </Label>
              </div>
              
              <Button 
                onClick={handleFindRoutes} 
                className="w-full"
                disabled={searching}
              >
                <Sparkles className="w-4 h-4 mr-2" />
                {searching ? 'Generating AI Suggestions...' : 'Get AI Route Suggestions'}
              </Button>
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