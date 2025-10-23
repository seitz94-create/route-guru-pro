import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';
import { Navigation } from '@/components/Navigation';
import { useNavigate } from 'react-router-dom';
import { Route, TrendingUp, Users, MapPin, Award, Zap } from 'lucide-react';
import heroCyclist from '@/assets/hero-cyclist.jpg';
import gravelCyclist from '@/assets/gravel-cyclist.jpg';
import mtbCyclist from '@/assets/mtb-cyclist.jpg';
const Index = () => {
  const {
    t
  } = useLanguage();
  const navigate = useNavigate();
  const features = [{
    icon: <Route className="w-8 h-8 text-primary" />,
    title: 'Smart Route Planning',
    description: 'AI-powered route discovery with customizable distance, elevation, and terrain preferences'
  }, {
    icon: <TrendingUp className="w-8 h-8 text-secondary" />,
    title: 'Training Analysis',
    description: 'Comprehensive performance tracking with insights from your cycling computer data'
  }, {
    icon: <Zap className="w-8 h-8 text-accent" />,
    title: 'Performance Optimization',
    description: 'Personalized nutrition and training recommendations based on your goals'
  }, {
    icon: <Users className="w-8 h-8 text-primary" />,
    title: 'Community Features',
    description: 'Share routes, join challenges, and connect with fellow cyclists'
  }, {
    icon: <MapPin className="w-8 h-8 text-secondary" />,
    title: 'Device Integration',
    description: 'Seamless sync with Garmin and Wahoo cycle computers'
  }, {
    icon: <Award className="w-8 h-8 text-accent" />,
    title: 'Goal Tracking',
    description: 'Set objectives and monitor your progress with intelligent feedback'
  }];
  return <div className="min-h-screen bg-background">
      <Navigation />
      
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
        <div className="absolute inset-0 z-0" style={{
        backgroundImage: `url(${heroCyclist})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }}>
          <div className="absolute inset-0 bg-gradient-to-br from-background/95 via-background/90 to-background/80" />
        </div>
        
        <div className="container relative z-10 mx-auto px-4 text-center py-20">
          <h1 className="text-5xl md:text-7xl font-bold mb-6 animate-fade-in">
            Din digitale træningspartner
          </h1>
          <p className="text-xl md:text-2xl mb-4 max-w-3xl mx-auto text-muted-foreground">
            Bygget til passionerede cyklister
          </p>
          <p className="text-lg mb-10 max-w-2xl mx-auto text-muted-foreground">
            Find ruter, sæt mål og nå dem – med AI på dit hold
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Button size="lg" onClick={() => navigate('/auth')} className="bg-primary text-primary-foreground hover:bg-primary-hover font-semibold shadow-glow">
              Opret gratis profil
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate('/routes')}>
              Find ruter i dit område
            </Button>
          </div>
          
          <div className="mt-16 flex justify-center gap-8 items-center opacity-60">
            <span className="text-sm">Integreret med:</span>
            <span className="font-semibold">Garmin</span>
            <span className="font-semibold">Wahoo</span>
            <span className="font-semibold">Strava</span>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-card/50">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-bold text-center mb-4 text-foreground">
            Alt hvad du har brug for
          </h2>
          <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
            Fra ruteplanlægning til træningsindsigter – vi gør dig til en bedre cyklist
          </p>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => <Card key={index} className="p-6 hover:shadow-elevated hover:border-primary/50 transition-all bg-card group">
                <div className="mb-4 group-hover:scale-110 transition-transform">{feature.icon}</div>
                <h3 className="text-xl font-semibold mb-2 text-card-foreground">{feature.title}</h3>
                <p className="text-muted-foreground text-sm">{feature.description}</p>
              </Card>)}
          </div>
        </div>
      </section>

      {/* Disciplines Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-bold text-center mb-4 text-foreground">
            Alle cykeldiscipliner
          </h2>
          <p className="text-center text-muted-foreground mb-12">
            Road, Gravel, MTB – vi understøtter din passion
          </p>
          
          <div className="grid md:grid-cols-3 gap-6">
            <Card className="overflow-hidden group cursor-pointer border-2 hover:border-primary transition-all">
              <div className="relative h-64">
                <img src={heroCyclist} alt="Road Cycling" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                <div className="absolute inset-0 bg-gradient-to-t from-background/90 to-transparent flex items-end">
                  <h3 className="text-2xl font-bold p-6">Landevej</h3>
                </div>
              </div>
            </Card>
            
            <Card className="overflow-hidden group cursor-pointer border-2 hover:border-accent transition-all">
              <div className="relative h-64">
                <img src={gravelCyclist} alt="Gravel Cycling" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                <div className="absolute inset-0 bg-gradient-to-t from-background/90 to-transparent flex items-end">
                  <h3 className="text-2xl font-bold p-6">Gravel</h3>
                </div>
              </div>
            </Card>
            
            <Card className="overflow-hidden group cursor-pointer border-2 hover:border-secondary transition-all">
              <div className="relative h-64">
                <img src={mtbCyclist} alt="Mountain Biking" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                <div className="absolute inset-0 bg-gradient-to-t from-background/90 to-transparent flex items-end">
                  <h3 className="text-2xl font-bold p-6">Mountain Bike</h3>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-secondary/20 to-accent/20" />
        <div className="container relative mx-auto px-4 text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Klar til at forbedre din cykling?
          </h2>
          <p className="text-xl mb-8 max-w-2xl mx-auto text-muted-foreground">
            Bliv en del af tusindvis af cyklister der træner smartere med AI
          </p>
          <div className="flex gap-4 justify-center">
            <Button size="lg" onClick={() => navigate('/auth')} className="bg-primary text-primary-foreground hover:bg-primary-hover font-semibold shadow-glow">
              Kom i gang gratis
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate('/subscription')}>
              Se priser
            </Button>
          </div>
        </div>
      </section>
    </div>;
};
export default Index;