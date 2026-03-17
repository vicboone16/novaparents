import { useEffect, useState } from 'react';
import { checkHandshake } from '@/lib/dal';

type GuardStatus = 'loading' | 'valid' | 'invalid' | 'error';

export function useBackendGuard() {
  const [status, setStatus] = useState<GuardStatus>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    checkHandshake()
      .then(({ appSlug }) => {
        if (appSlug === 'behavior_decoded') {
          setStatus('valid');
        } else {
          setErrorMessage('Wrong backend connected.');
          setStatus('invalid');
        }
      })
      .catch((err) => {
        console.error('Handshake error:', err);
        setErrorMessage('Unable to verify backend connection.');
        setStatus('error');
      });
  }, []);

  return { status, errorMessage };
}
