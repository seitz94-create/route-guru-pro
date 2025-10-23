import { useState } from 'react';
import { Navigation } from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from 'sonner';
import { Download, Send } from 'lucide-react';

const Routes = () => {
  const { t } = useLanguage();
  const [distance, setDistance] = useState('50');
  const [elevation, setElevation] = useState('500');
  const [terrain, setTerrain] = useState('road');
  const [searching, setSearching] = useState(false);

  const handleFindRoutes = async () => {
    setSearching(true);
    
    // Simulate route search
    setTimeout(() => {
      toast.success('Routes found! Feature coming soon with AI integration.');
      setSearching(false);
    }, 1500);
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
              
              <Button 
                onClick={handleFindRoutes} 
                className="w-full"
                disabled={searching}
              >
                {searching ? 'Searching...' : t('routes.search')}
              </Button>
            </CardContent>
          </Card>
          
          {/* Sample Route Results */}
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold text-foreground">Available Routes</h2>
            
            {[1, 2, 3].map((i) => (
              <Card key={i} className="shadow-card hover:shadow-elevated transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold mb-2 text-card-foreground">
                        Scenic Loop #{i}
                      </h3>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <p>Distance: {distance} km</p>
                        <p>Elevation: {elevation} m</p>
                        <p>Terrain: {terrain}</p>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline">
                        <Download className="w-4 h-4 mr-2" />
                        {t('routes.download')}
                      </Button>
                      <Button size="sm">
                        <Send className="w-4 h-4 mr-2" />
                        {t('routes.garmin')}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Routes;