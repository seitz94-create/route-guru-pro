import { useState, useEffect } from 'react';
import { Navigation } from '@/components/Navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Users, Trophy, Heart, Search } from 'lucide-react';

const Community = () => {
  const { t } = useLanguage();
  const [user, setUser] = useState<any>(null);
  const [challenges, setChallenges] = useState<any[]>([]);
  const [friends, setFriends] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkUser();
    loadData();
  }, []);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
  };

  const loadData = async () => {
    try {
      const [challengesRes, friendsRes] = await Promise.all([
        supabase
          .from('challenges')
          .select('*, challenge_participants(count)')
          .eq('is_public', true)
          .order('created_at', { ascending: false }),
        supabase
          .from('user_relationships')
          .select('following_id, profiles!user_relationships_following_id_fkey(full_name)')
          .eq('follower_id', user?.id || '')
      ]);

      if (challengesRes.data) setChallenges(challengesRes.data);
      if (friendsRes.data) setFriends(friendsRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const joinChallenge = async (challengeId: string) => {
    if (!user) {
      toast.error('Please sign in to join challenges');
      return;
    }

    try {
      const { error } = await supabase
        .from('challenge_participants')
        .insert({ challenge_id: challengeId, user_id: user.id });

      if (error) throw error;
      toast.success('Joined challenge!');
      loadData();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="container mx-auto px-4 pt-24 pb-20">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-4xl font-bold mb-8 text-foreground">Community</h1>
          
          <Tabs defaultValue="challenges" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="challenges">
                <Trophy className="w-4 h-4 mr-2" />
                Challenges
              </TabsTrigger>
              <TabsTrigger value="friends">
                <Users className="w-4 h-4 mr-2" />
                Friends
              </TabsTrigger>
              <TabsTrigger value="routes">
                <Heart className="w-4 h-4 mr-2" />
                Popular Routes
              </TabsTrigger>
            </TabsList>

            <TabsContent value="challenges" className="space-y-4">
              <div className="flex gap-4 mb-6">
                <Input
                  placeholder="Search challenges..."
                  className="flex-1"
                />
                <Button>
                  <Search className="w-4 h-4 mr-2" />
                  Search
                </Button>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                {challenges.map((challenge) => (
                  <Card key={challenge.id} className="shadow-card hover:shadow-elevated transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-xl">{challenge.name}</CardTitle>
                          <p className="text-sm text-muted-foreground mt-1">
                            {challenge.description}
                          </p>
                        </div>
                        <Badge variant="secondary">{challenge.challenge_type}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Target:</span>
                          <span className="font-semibold">{challenge.target_value} km</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Participants:</span>
                          <span className="font-semibold">
                            {challenge.challenge_participants?.[0]?.count || 0}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Ends:</span>
                          <span className="font-semibold">
                            {new Date(challenge.end_date).toLocaleDateString()}
                          </span>
                        </div>
                        <Button 
                          className="w-full mt-4" 
                          onClick={() => joinChallenge(challenge.id)}
                        >
                          Join Challenge
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="friends" className="space-y-4">
              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle>Your Network</CardTitle>
                </CardHeader>
                <CardContent>
                  {friends.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">
                      No friends yet. Start connecting with other cyclists!
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {friends.map((friend) => (
                        <div key={friend.following_id} className="flex items-center justify-between p-3 border rounded-lg">
                          <span className="font-medium">
                            {friend.profiles?.full_name || 'Cyclist'}
                          </span>
                          <Button variant="outline" size="sm">View Profile</Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="routes" className="space-y-4">
              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle>Popular Routes</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-center py-8">
                    Coming soon: Browse and save popular routes from the community
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default Community;
