import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, Navigation, MapPin, Mountain, Clock, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface Route {
  name: string;
  description: string;
  distance: number;
  elevation: number;
  difficulty: string;
  estimatedTime: string;
  highlights: string[];
  safetyNotes: string;
  startPoint: string;
  terrain: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
}

interface RouteCardProps {
  route: Route;
}

const RouteCard = ({ route }: RouteCardProps) => {
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case 'easy':
        return 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20';
      case 'moderate':
        return 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20';
      case 'hard':
        return 'bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20';
      case 'expert':
        return 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const handleExportGPX = () => {
    toast.info('GPX export coming soon! This feature will generate a downloadable GPX file.');
  };

  const handleExportToDevice = (device: string) => {
    toast.info(`${device} integration coming soon! This will sync directly to your device.`);
  };

  // Generate static map URL using OpenStreetMap tiles
  const mapUrl = route.coordinates 
    ? `https://staticmap.openstreetmap.de/staticmap.php?center=${route.coordinates.lat},${route.coordinates.lng}&zoom=13&size=400x200&maptype=mapnik&markers=${route.coordinates.lat},${route.coordinates.lng},red`
    : `https://via.placeholder.com/400x200/1a1a1a/ffffff?text=${encodeURIComponent(route.name)}`;

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      <div className="relative h-48 bg-muted overflow-hidden">
        <img 
          src={mapUrl} 
          alt={`Map of ${route.name}`}
          className="w-full h-full object-cover"
        />
        <div className="absolute top-3 right-3">
          <Badge className={getDifficultyColor(route.difficulty)}>
            {route.difficulty}
          </Badge>
        </div>
      </div>
      
      <CardHeader>
        <CardTitle className="flex items-start justify-between gap-2">
          <span>{route.name}</span>
        </CardTitle>
        <CardDescription>{route.description}</CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-2 text-sm">
            <Navigation className="w-4 h-4 text-primary" />
            <span className="font-semibold">{route.distance} km</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Mountain className="w-4 h-4 text-primary" />
            <span className="font-semibold">{route.elevation} m</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Clock className="w-4 h-4 text-primary" />
            <span>{route.estimatedTime}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="w-4 h-4 text-primary" />
            <span className="truncate">{route.startPoint}</span>
          </div>
        </div>

        {route.highlights && route.highlights.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold mb-2">Highlights</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              {route.highlights.map((highlight, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>{highlight}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {route.safetyNotes && (
          <div className="flex gap-2 p-3 bg-muted rounded-md">
            <AlertCircle className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground">{route.safetyNotes}</p>
          </div>
        )}

        <div className="pt-2 space-y-2">
          <div className="flex gap-2">
            <Button 
              variant="default" 
              className="flex-1"
              onClick={handleExportGPX}
            >
              <Download className="w-4 h-4 mr-2" />
              Export GPX
            </Button>
          </div>
          
          <div className="grid grid-cols-2 gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => handleExportToDevice('Garmin')}
            >
              Garmin
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => handleExportToDevice('Wahoo')}
            >
              Wahoo
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default RouteCard;
