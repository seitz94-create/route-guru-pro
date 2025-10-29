import { useState, useEffect } from 'react';
import { Navigation } from '@/components/Navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Crown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Profile = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState({
    full_name: '',
    location: '',
    cycling_discipline: 'road',
    experience_level: 'intermediate',
    weekly_training_hours: 5,
    ftp: 0,
    weight_kg: 0,
    subscription_plan: 'free',
  });

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
      if (data) {
        setProfile({
          full_name: data.full_name || '',
          location: data.location || '',
          cycling_discipline: data.cycling_discipline || 'road',
          experience_level: data.experience_level || 'intermediate',
          weekly_training_hours: data.weekly_training_hours || 5,
          ftp: data.ftp || 0,
          weight_kg: data.weight_kg || 0,
          subscription_plan: data.subscription_plan || 'free',
        });
      }
    } catch (error: any) {
      console.error('Error loading profile:', error);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          ...profile,
        });

      if (error) throw error;
      
      toast.success('Profile updated successfully!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="container mx-auto px-4 pt-24 pb-20">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-4xl font-bold mb-8 text-foreground">{t('profile.title')}</h1>
          
          <Card className="shadow-card mb-6 bg-gradient-to-br from-primary/10 to-accent/10 border-primary/20">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Crown className="h-5 w-5 text-primary" />
                  Dit Abonnement
                </CardTitle>
                <Badge 
                  variant={profile.subscription_plan === 'pro' ? 'default' : profile.subscription_plan === 'premium' ? 'secondary' : 'outline'}
                  className="text-sm"
                >
                  {profile.subscription_plan === 'free' ? 'Gratis' : profile.subscription_plan === 'premium' ? 'Premium' : 'Pro'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                {profile.subscription_plan === 'free' && 'Du har vores gratis plan. Opgrader for at få adgang til AI træningsråd og avancerede funktioner.'}
                {profile.subscription_plan === 'premium' && 'Du har Premium-planen med AI træningsråd og Garmin/Wahoo sync.'}
                {profile.subscription_plan === 'pro' && 'Du har Pro-planen med alle funktioner inkluderet!'}
              </p>
              <Button 
                variant="outline" 
                onClick={() => navigate('/subscription')}
                className="w-full"
              >
                {profile.subscription_plan === 'free' ? 'Opgrader Abonnement' : 'Se Abonnementer'}
              </Button>
            </CardContent>
          </Card>
          
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name">{t('profile.name')}</Label>
                <Input
                  id="name"
                  value={profile.full_name}
                  onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="location">{t('profile.location')}</Label>
                <Input
                  id="location"
                  value={profile.location}
                  onChange={(e) => setProfile({ ...profile, location: e.target.value })}
                  placeholder="City, Country"
                />
              </div>
              
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="discipline">{t('profile.discipline')}</Label>
                  <Select 
                    value={profile.cycling_discipline} 
                    onValueChange={(value) => setProfile({ ...profile, cycling_discipline: value })}
                  >
                    <SelectTrigger id="discipline">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="road">Road</SelectItem>
                      <SelectItem value="gravel">Gravel</SelectItem>
                      <SelectItem value="mtb">Mountain Bike</SelectItem>
                      <SelectItem value="mixed">Mixed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="experience">{t('profile.experience')}</Label>
                  <Select 
                    value={profile.experience_level} 
                    onValueChange={(value) => setProfile({ ...profile, experience_level: value })}
                  >
                    <SelectTrigger id="experience">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="beginner">Beginner</SelectItem>
                      <SelectItem value="intermediate">Intermediate</SelectItem>
                      <SelectItem value="advanced">Advanced</SelectItem>
                      <SelectItem value="professional">Professional</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="grid md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="hours">Weekly Training Hours</Label>
                  <Input
                    id="hours"
                    type="number"
                    min="0"
                    max="40"
                    value={profile.weekly_training_hours}
                    onChange={(e) => setProfile({ ...profile, weekly_training_hours: parseInt(e.target.value) || 0 })}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="ftp">FTP (watts)</Label>
                  <Input
                    id="ftp"
                    type="number"
                    min="0"
                    value={profile.ftp}
                    onChange={(e) => setProfile({ ...profile, ftp: parseInt(e.target.value) || 0 })}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="weight">Weight (kg)</Label>
                  <Input
                    id="weight"
                    type="number"
                    min="0"
                    step="0.1"
                    value={profile.weight_kg}
                    onChange={(e) => setProfile({ ...profile, weight_kg: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>
              
              <Button onClick={handleSave} className="w-full" disabled={loading}>
                {loading ? 'Saving...' : t('profile.save')}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Profile;