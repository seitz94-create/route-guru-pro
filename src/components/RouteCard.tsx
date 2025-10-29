import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, Navigation, MapPin, Mountain, Clock, AlertCircle, Activity } from 'lucide-react';
import { toast } from 'sonner';
import RouteMap from '@/components/RouteMap';
import { supabase } from '@/integrations/supabase/client';
import { useState } from 'react';

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
  path?: Array<{
    lat: number;
    lng: number;
  }>;
  gpxData?: string;
}

interface RouteCardProps {
  route: Route;
}

const RouteCard = ({ route }: RouteCardProps) => {
  const [uploadingToStrava, setUploadingToStrava] = useState(false);

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

  const handleDownloadGPX = () => {
    if (!route.gpxData) {
      toast.error('GPX data ikke tilgængelig for denne rute');
      return;
    }

    try {
      // Create a blob from the GPX data
      const blob = new Blob([route.gpxData], { type: 'application/gpx+xml' });
      const url = URL.createObjectURL(blob);
      
      // Create a temporary download link
      const a = document.createElement('a');
      a.href = url;
      a.download = `${route.name.toLowerCase().replace(/\s+/g, '-')}.gpx`;
      document.body.appendChild(a);
      a.click();
      
      // Cleanup
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success('GPX fil downloadet! Importer den i Garmin Connect eller Wahoo app');
    } catch (error) {
      console.error('Error downloading GPX:', error);
      toast.error('Kunne ikke downloade GPX fil');
    }
  };

  const handleUploadToStrava = async () => {
    if (!route.gpxData) {
      toast.error('GPX data ikke tilgængelig for denne rute');
      return;
    }

    setUploadingToStrava(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Du skal være logget ind');
        return;
      }

      const { data, error } = await supabase.functions.invoke('upload-to-strava', {
        body: {
          routeName: route.name,
          gpxData: route.gpxData,
          description: route.description,
          distance: route.distance,
          activityType: 'Ride',
        },
      });

      if (error) throw error;

      if (data.success) {
        toast.success('Rute uploadet til Strava! 🚴‍♂️');
      }
    } catch (error: any) {
      console.error('Error uploading to Strava:', error);
      if (error.message?.includes('not connected')) {
        toast.error('Forbind din Strava konto i Profil først');
      } else {
        toast.error('Kunne ikke uploade til Strava');
      }
    } finally {
      setUploadingToStrava(false);
    }
  };

  // Generate static map URL using OpenStreetMap tiles
  const mapUrl = route.coordinates 
    ? `https://staticmap.openstreetmap.de/staticmap.php?center=${route.coordinates.lat},${route.coordinates.lng}&zoom=13&size=400x200&maptype=mapnik&markers=${route.coordinates.lat},${route.coordinates.lng},red`
    : `https://via.placeholder.com/400x200/1a1a1a/ffffff?text=${encodeURIComponent(route.name)}`;

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      <div className="relative h-48 overflow-hidden">
        {route.coordinates ? (
          <RouteMap 
            lat={route.coordinates.lat} 
            lng={route.coordinates.lng}
            path={route.path}
          />
        ) : (
          <div className="w-full h-48 bg-muted flex items-center justify-center text-xs text-muted-foreground">
            Intet kort tilgængeligt
          </div>
        )}
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
          <Button 
            variant="default" 
            className="w-full"
            onClick={handleDownloadGPX}
            disabled={!route.gpxData}
          >
            <Download className="w-4 h-4 mr-2" />
            Download GPX til Garmin/Wahoo
          </Button>
          
          <Button 
            variant="outline" 
            className="w-full border-orange-500/20 hover:bg-orange-500/10"
            onClick={handleUploadToStrava}
            disabled={!route.gpxData || uploadingToStrava}
          >
            <Activity className="w-4 h-4 mr-2" />
            {uploadingToStrava ? 'Uploader...' : 'Upload til Strava'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default RouteCard;
