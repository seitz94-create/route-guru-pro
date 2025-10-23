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

interface LeaderboardEntry {
  user_id: string;
  full_name: string;
  total_distance: number;
  total_elevation: number;
  total_rides: number;
  points: number;
}

const Community = () => {
  const { t } = useLanguage();
  const [user, setUser] = useState<any>(null);
  const [challenges, setChallenges] = useState<any[]>([]);
  const [friends, setFriends] = useState<any[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
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
      const [challengesRes, friendsRes, sessionsRes] = await Promise.all([
        supabase
          .from('challenges')
          .select('*, challenge_participants(count)')
          .eq('is_public', true)
          .order('created_at', { ascending: false }),
        supabase
          .from('user_relationships')
          .select('following_id, profiles!user_relationships_following_id_fkey(full_name)')
          .eq('follower_id', user?.id || ''),
        supabase
          .from('training_sessions')
          .select('user_id, distance_km, elevation_m, profiles(full_name)')
      ]);

      if (challengesRes.data) setChallenges(challengesRes.data);
      if (friendsRes.data) setFriends(friendsRes.data);
      
      // Calculate leaderboard
      if (sessionsRes.data) {
        const userStats = new Map<string, LeaderboardEntry>();
        
        sessionsRes.data.forEach((session: any) => {
          const userId = session.user_id;
          if (!userStats.has(userId)) {
            userStats.set(userId, {
              user_id: userId,
              full_name: session.profiles?.full_name || 'Anonymous',
              total_distance: 0,
              total_elevation: 0,
              total_rides: 0,
              points: 0
            });
          }
          
          const stats = userStats.get(userId)!;
          stats.total_distance += Number(session.distance_km || 0);
          stats.total_elevation += Number(session.elevation_m || 0);
          stats.total_rides += 1;
          
          // Points calculation:
          // 1 point per km
          // 5 points per 100m elevation
          // 10 points per ride completed
          stats.points = Math.round(
            stats.total_distance + 
            (stats.total_elevation / 100) * 5 + 
            stats.total_rides * 10
          );
        });
        
        const sortedLeaderboard = Array.from(userStats.values())
          .sort((a, b) => b.points - a.points)
          .slice(0, 50);
        
        setLeaderboard(sortedLeaderboard);
      }
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
          
          <Tabs defaultValue="leaderboard" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="leaderboard">
                <Trophy className="w-4 h-4 mr-2" />
                Rangliste
              </TabsTrigger>
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

            <TabsContent value="leaderboard" className="space-y-4">
              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Trophy className="w-6 h-6 text-primary" />
                    Top 50 Cyklister
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-2">
                    Point system: 1 point pr. km + 5 point pr. 100m stigning + 10 point pr. tur
                  </p>
                </CardHeader>
                <CardContent>
                  {leaderboard.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      Ingen data endnu. Start med at køre!
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {leaderboard.map((entry, index) => (
                        <div 
                          key={entry.user_id} 
                          className={`flex items-center gap-4 p-4 rounded-lg border ${
                            index === 0 ? 'bg-primary/10 border-primary' :
                            index === 1 ? 'bg-secondary/10 border-secondary' :
                            index === 2 ? 'bg-accent/10 border-accent' :
                            'bg-muted/50'
                          }`}
                        >
                          <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                            index === 0 ? 'bg-primary text-primary-foreground' :
                            index === 1 ? 'bg-secondary text-secondary-foreground' :
                            index === 2 ? 'bg-accent text-accent-foreground' :
                            'bg-background text-foreground'
                          }`}>
                            {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : index + 1}
                          </div>
                          <div className="flex-1">
                            <div className="font-semibold">{entry.full_name}</div>
                            <div className="text-sm text-muted-foreground space-x-4">
                              <span>🚴 {entry.total_rides} ture</span>
                              <span>📍 {Math.round(entry.total_distance)} km</span>
                              <span>⛰️ {Math.round(entry.total_elevation)} m</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold text-primary">{entry.points}</div>
                            <div className="text-xs text-muted-foreground">point</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

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
