import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

type HandshakeStatus = 'loading' | 'valid' | 'invalid' | 'error';

export function useBackendGuard() {
  const [status, setStatus] = useState<HandshakeStatus>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    async function checkHandshake() {
      try {
        const { data, error } = await (supabase as any)
          .from('app_handshake')
          .select('app_slug')
          .eq('id', 1)
          .single();

        if (error) {
          console.error('Handshake error:', error);
          setErrorMessage('Unable to verify backend connection.');
          setStatus('error');
          return;
        }

        if ((data as any)?.app_slug === 'novatrack') {
          setStatus('valid');
        } else {
          setErrorMessage('Wrong backend connected.');
          setStatus('invalid');
        }
      } catch (err) {
        console.error('Handshake exception:', err);
        setErrorMessage('Unable to verify backend connection.');
        setStatus('error');
      }
    }

    checkHandshake();
  }, []);

  return { status, errorMessage };
}
