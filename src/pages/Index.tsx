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
  const { t } = useLanguage();
  const navigate = useNavigate();

  const features = [
    {
      icon: <Route className="w-8 h-8 text-primary" />,
      title: 'Smart Route Planning',
      description: 'AI-powered route discovery with customizable distance, elevation, and terrain preferences',
    },
    {
      icon: <TrendingUp className="w-8 h-8 text-secondary" />,
      title: 'Training Analysis',
      description: 'Comprehensive performance tracking with insights from your cycling computer data',
    },
    {
      icon: <Zap className="w-8 h-8 text-accent" />,
      title: 'Performance Optimization',
      description: 'Personalized nutrition and training recommendations based on your goals',
    },
    {
      icon: <Users className="w-8 h-8 text-primary" />,
      title: 'Community Features',
      description: 'Share routes, join challenges, and connect with fellow cyclists',
    },
    {
      icon: <MapPin className="w-8 h-8 text-secondary" />,
      title: 'Device Integration',
      description: 'Seamless sync with Garmin and Wahoo cycle computers',
    },
    {
      icon: <Award className="w-8 h-8 text-accent" />,
      title: 'Goal Tracking',
      description: 'Set objectives and monitor your progress with intelligent feedback',
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      {/* Hero Section */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden">
        <div 
          className="absolute inset-0 z-0"
          style={{
            backgroundImage: `url(${heroCyclist})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-primary/80 via-primary/60 to-secondary/70" />
        </div>
        
        <div className="container relative z-10 mx-auto px-4 text-center text-white">
          <h1 className="text-5xl md:text-7xl font-bold mb-6 animate-fade-in">
            {t('hero.title')}
          </h1>
          <p className="text-xl md:text-2xl mb-8 max-w-3xl mx-auto text-white/95">
            {t('hero.subtitle')}
          </p>
          <div className="flex gap-4 justify-center">
            <Button 
              size="lg" 
              onClick={() => navigate('/auth')}
              className="bg-white text-primary hover:bg-white/90 font-semibold"
            >
              {t('hero.cta')}
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
              className="border-white text-white hover:bg-white/10"
            >
              {t('hero.learn')}
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-bold text-center mb-12 text-foreground">
            Everything You Need to Excel
          </h2>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <Card 
                key={index} 
                className="p-6 hover:shadow-elevated transition-shadow bg-card"
              >
                <div className="mb-4">{feature.icon}</div>
                <h3 className="text-xl font-semibold mb-2 text-card-foreground">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Disciplines Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-bold text-center mb-12 text-foreground">
            All Cycling Disciplines
          </h2>
          
          <div className="grid md:grid-cols-3 gap-6">
            <Card className="overflow-hidden group cursor-pointer">
              <div className="relative h-64">
                <img 
                  src={heroCyclist} 
                  alt="Road Cycling" 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-primary/80 to-transparent flex items-end">
                  <h3 className="text-2xl font-bold text-white p-6">Road Cycling</h3>
                </div>
              </div>
            </Card>
            
            <Card className="overflow-hidden group cursor-pointer">
              <div className="relative h-64">
                <img 
                  src={gravelCyclist} 
                  alt="Gravel Cycling" 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-accent/80 to-transparent flex items-end">
                  <h3 className="text-2xl font-bold text-white p-6">Gravel</h3>
                </div>
              </div>
            </Card>
            
            <Card className="overflow-hidden group cursor-pointer">
              <div className="relative h-64">
                <img 
                  src={mtbCyclist} 
                  alt="Mountain Biking" 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-secondary/80 to-transparent flex items-end">
                  <h3 className="text-2xl font-bold text-white p-6">Mountain Bike</h3>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-primary to-secondary">
        <div className="container mx-auto px-4 text-center text-white">
          <h2 className="text-4xl font-bold mb-6">
            Ready to Elevate Your Cycling?
          </h2>
          <p className="text-xl mb-8 max-w-2xl mx-auto text-white/95">
            Join thousands of cyclists who are training smarter, not harder
          </p>
          <Button 
            size="lg"
            onClick={() => navigate('/auth')}
            className="bg-white text-primary hover:bg-white/90 font-semibold"
          >
            Start Your Journey
          </Button>
        </div>
      </section>
    </div>
  );
};

export default Index;