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
import { Sparkles, Lock, Loader2, CheckCircle, XCircle, MapPin } from 'lucide-react';
import RouteCard from '@/components/RouteCard';
import { useNavigate } from 'react-router-dom';
import { useAddressValidation } from '@/hooks/useAddressValidation';

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
  const [useHomeAddress, setUseHomeAddress] = useState(false);
  const [searching, setSearching] = useState(false);
  const [routes, setRoutes] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [hasAccess, setHasAccess] = useState(false);

  const { status: startStatus, validatedAddress: validatedStart, errorMessage: startError } = 
    useAddressValidation(useHomeAddress ? '' : startLocation, 1000);
  const { status: endStatus, validatedAddress: validatedEnd, errorMessage: endError } = 
    useAddressValidation(routeType === 'point-to-point' ? endLocation : '', 1000);

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
        .maybeSingle();
      if (data) {
        setProfile(data);
        const plan = data.subscription_plan || 'free';
        setHasAccess(plan === 'premium' || plan === 'pro');
        
        // If user has a home address and useHomeAddress is checked, set it
        if (data.location && useHomeAddress) {
          setStartLocation(data.location);
        }
      }
    }
  };

  // Update start location when useHomeAddress changes
  useEffect(() => {
    if (useHomeAddress && profile?.location) {
      setStartLocation(profile.location);
    } else if (!useHomeAddress && startLocation === profile?.location) {
      setStartLocation('');
    }
  }, [useHomeAddress, profile?.location]);

  const handleFindRoutes = async () => {
    if (!hasAccess) {
      toast.error('AI ruteforslag kræver Premium eller Pro abonnement');
      return;
    }

    // Validate and normalize start location
    const finalStartLocation = useHomeAddress ? profile?.location : startLocation;
    if (!finalStartLocation || finalStartLocation.trim().length === 0) {
      toast.error('Angiv venligst et startsted');
      return;
    }

    // Check validation status
    if (!useHomeAddress && startStatus === 'invalid') {
      toast.error('Angiv venligst en gyldig startadresse');
      return;
    }

    if (routeType === 'point-to-point' && endStatus === 'invalid') {
      toast.error('Angiv venligst en gyldig slutadresse');
      return;
    }

    // Normalize address for better geocoding when no commas are present
    const normalizeLocation = (loc: string) => {
      const base = String(loc || '').trim();
      if (!base) return base;
      const hasCountry = /(?:denmark|danmark)/i.test(base);
      if (base.includes(',')) {
        // Ensure country is present even when address already has components
        return hasCountry ? base : `${base}, Denmark`;
      }
      const tokens = base.split(/\s+/).filter(Boolean);
      if (tokens.length >= 2) {
        const lastTwo = tokens.slice(-2).join(' ');
        return hasCountry ? lastTwo : `${lastTwo}, Denmark`;
      }
      return hasCountry ? base : `${base}, Denmark`;
    };

    const startForApi = normalizeLocation(finalStartLocation);
    console.log('[Routes] Using start location for API:', startForApi);

    // Validate end location for point-to-point routes
    if (routeType === 'point-to-point' && (!endLocation || endLocation.trim().length === 0)) {
      toast.error('Angiv venligst et slutsted for punkt-til-punkt ruter');
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
            startLocation: startForApi,
            endLocation: routeType === 'point-to-point' ? endLocation : startForApi
          },
          userProfile: profile
        }
      });

      if (error) throw error;

      if (data.error) {
        const msg = String(data.error);
        if (/start location/i.test(msg)) {
          toast.error('Kunne ikke finde startsted. Prøv en større by eller tilføj ", Denmark".');
        } else {
          toast.error(msg);
        }
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

              <div className="space-y-4">
                <div className="flex items-center space-x-2 pb-2">
                  <Checkbox 
                    id="useHomeAddress" 
                    checked={useHomeAddress}
                    onCheckedChange={(checked) => setUseHomeAddress(checked as boolean)}
                    disabled={!profile?.location}
                  />
                  <Label 
                    htmlFor="useHomeAddress" 
                    className={`cursor-pointer ${!profile?.location ? 'text-muted-foreground' : ''}`}
                  >
                    Start fra min hjemmeadresse
                    {!profile?.location && ' (angiv adresse i profil først)'}
                  </Label>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="startLocation">Startsted</Label>
                    <div className="relative">
                      <Input
                        id="startLocation"
                        placeholder="f.eks. Roskilde, Denmark"
                        value={startLocation}
                        onChange={(e) => setStartLocation(e.target.value)}
                        disabled={useHomeAddress}
                        className={
                          useHomeAddress ? 'bg-muted pr-10' :
                          startStatus === 'invalid' ? 'border-red-500 pr-10' :
                          startStatus === 'valid' ? 'border-green-500 pr-10' : 'pr-10'
                        }
                      />
                      {!useHomeAddress && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          {startStatus === 'validating' && (
                            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                          )}
                          {startStatus === 'valid' && (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          )}
                          {startStatus === 'invalid' && (
                            <XCircle className="h-4 w-4 text-red-500" />
                          )}
                        </div>
                      )}
                    </div>
                    {!useHomeAddress && startStatus === 'valid' && validatedStart && (
                      <p className="text-xs text-green-600 flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {validatedStart}
                      </p>
                    )}
                    {!useHomeAddress && startStatus === 'invalid' && startError && (
                      <p className="text-xs text-red-600">{startError}</p>
                    )}
                  </div>
                  
                  {routeType === 'point-to-point' && (
                    <div className="space-y-2">
                      <Label htmlFor="endLocation">Slutsted</Label>
                      <div className="relative">
                        <Input
                          id="endLocation"
                          placeholder="f.eks. Aarhus, Denmark"
                          value={endLocation}
                          onChange={(e) => setEndLocation(e.target.value)}
                          className={
                            endStatus === 'invalid' ? 'border-red-500 pr-10' :
                            endStatus === 'valid' ? 'border-green-500 pr-10' : 'pr-10'
                          }
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          {endStatus === 'validating' && (
                            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                          )}
                          {endStatus === 'valid' && (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          )}
                          {endStatus === 'invalid' && (
                            <XCircle className="h-4 w-4 text-red-500" />
                          )}
                        </div>
                      </div>
                      {endStatus === 'valid' && validatedEnd && (
                        <p className="text-xs text-green-600 flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {validatedEnd}
                        </p>
                      )}
                      {endStatus === 'invalid' && endError && (
                        <p className="text-xs text-red-600">{endError}</p>
                      )}
                    </div>
                  )}
                </div>
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