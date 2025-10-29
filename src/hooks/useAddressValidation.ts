import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type ValidationStatus = 'idle' | 'validating' | 'valid' | 'invalid';

export const useAddressValidation = (address: string, debounceMs: number = 800) => {
  const [status, setStatus] = useState<ValidationStatus>('idle');
  const [validatedAddress, setValidatedAddress] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    if (!address || address.trim().length === 0) {
      setStatus('idle');
      setValidatedAddress('');
      setErrorMessage('');
      return;
    }

    setStatus('validating');
    const timer = setTimeout(async () => {
      try {
        const { data, error } = await supabase.functions.invoke('geocode-location', {
          body: { location: address }
        });

        if (error) throw error;

        if (data.error) {
          setStatus('invalid');
          setErrorMessage('Kunne ikke finde adressen. Prøv at tilføje by og land (f.eks. "Roskilde, Denmark")');
          setValidatedAddress('');
        } else {
          setStatus('valid');
          setValidatedAddress(data.displayName || address);
          setErrorMessage('');
        }
      } catch (err) {
        setStatus('invalid');
        setErrorMessage('Kunne ikke validere adressen');
        setValidatedAddress('');
      }
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [address, debounceMs]);

  return { status, validatedAddress, errorMessage };
};
