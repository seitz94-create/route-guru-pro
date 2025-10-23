import { useState, useEffect, useRef } from 'react';
import { Navigation } from '@/components/Navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Send, Bot, User } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const Training = () => {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'Hej! Jeg er din digitale træningspartner. Jeg kan hjælpe dig med at analysere din træning, sætte mål og give ernæringsråd. Hvad vil du gerne vide?',
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [profile, setProfile] = useState<any>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      role: 'user',
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('ai-training-insights', {
        body: {
          analysisType: 'chat',
          message: input,
          userData: { profile, sessions }
        }
      });

      if (error) throw error;
      if (data.error) {
        toast.error(data.error);
        return;
      }

      const assistantMessage: Message = {
        role: 'assistant',
        content: data.insights,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error: any) {
      console.error('Error getting insights:', error);
      toast.error('Kunne ikke få svar fra træningspartneren');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="container mx-auto px-4 pt-24 pb-20">
        <div className="max-w-5xl mx-auto">
          <div className="mb-8 text-center">
            <h1 className="text-4xl font-bold mb-2 text-foreground">Din AI Træningspartner</h1>
            <p className="text-muted-foreground">Chat med din personlige træningsassistent – få analyser, råd og motivation</p>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Chat Section */}
            <Card className="lg:col-span-2 shadow-elevated flex flex-col h-[600px]">
              <CardHeader className="border-b">
                <CardTitle className="flex items-center gap-2">
                  <Bot className="w-5 h-5 text-primary" />
                  Chat med Træningspartner
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col p-0">
                <ScrollArea className="flex-1 p-6" ref={scrollRef}>
                  <div className="space-y-4">
                    {messages.map((message, index) => (
                      <div
                        key={index}
                        className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        {message.role === 'assistant' && (
                          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                            <Bot className="w-5 h-5 text-primary" />
                          </div>
                        )}
                        <div
                          className={`max-w-[80%] rounded-lg p-4 ${
                            message.role === 'user'
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted'
                          }`}
                        >
                          <p className="whitespace-pre-wrap">{message.content}</p>
                          <span className="text-xs opacity-70 mt-2 block">
                            {message.timestamp.toLocaleTimeString('da-DK', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                        {message.role === 'user' && (
                          <div className="w-8 h-8 rounded-full bg-secondary/20 flex items-center justify-center flex-shrink-0">
                            <User className="w-5 h-5 text-secondary" />
                          </div>
                        )}
                      </div>
                    ))}
                    {loading && (
                      <div className="flex gap-3 justify-start">
                        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                          <Bot className="w-5 h-5 text-primary animate-pulse" />
                        </div>
                        <div className="bg-muted rounded-lg p-4">
                          <div className="flex gap-1">
                            <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                            <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                            <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </ScrollArea>
                <div className="p-4 border-t">
                  <div className="flex gap-2">
                    <Input
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                      placeholder="Skriv din besked..."
                      disabled={loading}
                      className="flex-1"
                    />
                    <Button
                      onClick={handleSendMessage}
                      disabled={loading || !input.trim()}
                      size="icon"
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Stats Sidebar */}
            <div className="space-y-6">
              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle className="text-lg">Dine Seneste Ture</CardTitle>
                </CardHeader>
                <CardContent>
                  {sessions.length > 0 ? (
                    <div className="space-y-3">
                      {sessions.slice(0, 5).map((session) => (
                        <div key={session.id} className="p-3 bg-muted rounded-lg">
                          <div className="text-sm font-medium mb-1">
                            {new Date(session.session_date).toLocaleDateString('da-DK')}
                          </div>
                          <div className="text-xs text-muted-foreground space-y-1">
                            {session.distance_km && <div>📍 {session.distance_km} km</div>}
                            {session.duration_minutes && <div>⏱️ {session.duration_minutes} min</div>}
                            {session.avg_power && <div>⚡ {session.avg_power}W</div>}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Ingen træningssessioner endnu
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle className="text-lg">Hurtige Spørgsmål</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button
                    variant="outline"
                    className="w-full justify-start text-sm"
                    onClick={() => setInput('Analyser min seneste træning')}
                    disabled={loading}
                  >
                    📊 Analyser min træning
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-sm"
                    onClick={() => setInput('Giv mig en ugeplan')}
                    disabled={loading}
                  >
                    📅 Lav en ugeplan
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-sm"
                    onClick={() => setInput('Hvad skal jeg spise før en lang tur?')}
                    disabled={loading}
                  >
                    🍎 Ernæringsråd
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-sm"
                    onClick={() => setInput('Hvordan forbedrer jeg min FTP?')}
                    disabled={loading}
                  >
                    💪 Forbedre performance
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Training;