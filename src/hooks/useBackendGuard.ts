import { useEffect, useState, useCallback } from 'react';
import { checkHandshake } from '@/lib/dal';

type GuardStatus = 'loading' | 'valid' | 'invalid' | 'error';

export function useBackendGuard() {
  const [status, setStatus] = useState<GuardStatus>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  const run = useCallback(() => {
    setStatus('loading');
    setErrorMessage('');
    checkHandshake()
      .then(({ appSlug }) => {
        if (appSlug === 'behaviordecoded' || appSlug === 'behavior_decoded') {
          setStatus('valid');
        } else {
          setErrorMessage('Wrong backend connected.');
          setStatus('invalid');
        }
      })
      .catch((err) => {
        console.error('Handshake error:', err);
        setErrorMessage(err?.message || 'Unable to verify backend connection.');
        setStatus('error');
      });
  }, []);

  useEffect(() => {
    run();
  }, [run]);

  return { status, errorMessage, retry: run };
}
