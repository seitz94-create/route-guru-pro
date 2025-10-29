import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

const StravaCallback = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get the authorization code from URL
        const params = new URLSearchParams(window.location.search);
        const code = params.get('code');
        const error = params.get('error');

        if (error) {
          throw new Error('Strava authorization denied');
        }

        if (!code) {
          throw new Error('No authorization code received');
        }

        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          throw new Error('Not authenticated');
        }

        // Exchange code for tokens via edge function
        const { data, error: callbackError } = await supabase.functions.invoke('strava-oauth-callback', {
          body: {
            code,
            userId: user.id,
          },
        });

        if (callbackError) throw callbackError;

        if (data.success) {
          setStatus('success');
          toast.success('Strava forbundet! 🚴‍♂️');
          
          // Redirect to profile after 2 seconds
          setTimeout(() => {
            navigate('/profile');
          }, 2000);
        } else {
          throw new Error('Failed to connect Strava');
        }
      } catch (error: any) {
        console.error('Strava callback error:', error);
        setStatus('error');
        toast.error(error.message || 'Kunne ikke forbinde Strava');
        
        // Redirect to profile after 3 seconds
        setTimeout(() => {
          navigate('/profile');
        }, 3000);
      }
    };

    handleCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6">
        {status === 'loading' && (
          <>
            <Loader2 className="h-16 w-16 animate-spin text-primary mx-auto" />
            <h1 className="text-2xl font-bold text-foreground">Forbinder med Strava...</h1>
            <p className="text-muted-foreground">Et øjeblik, vi forbinder din konto</p>
          </>
        )}
        
        {status === 'success' && (
          <>
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
            <h1 className="text-2xl font-bold text-foreground">Succes!</h1>
            <p className="text-muted-foreground">Din Strava konto er nu forbundet. Du bliver omdirigeret...</p>
          </>
        )}
        
        {status === 'error' && (
          <>
            <XCircle className="h-16 w-16 text-red-500 mx-auto" />
            <h1 className="text-2xl font-bold text-foreground">Noget gik galt</h1>
            <p className="text-muted-foreground">Kunne ikke forbinde Strava. Prøv igen...</p>
          </>
        )}
      </div>
    </div>
  );
};

export default StravaCallback;
