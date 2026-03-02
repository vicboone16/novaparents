import { useEffect, useState } from 'react';
import { checkHandshake, checkAppAccess } from '@/lib/dal';

type GuardStatus = 'loading' | 'valid' | 'no_access' | 'invalid' | 'error';

export function useBackendGuard() {
  const [status, setStatus] = useState<GuardStatus>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [appRole, setAppRole] = useState<string | null>(null);

  useEffect(() => {
    checkHandshake()
      .then(({ appSlug }) => {
        if (appSlug === 'behaviordecoded') {
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

  return { status, errorMessage, appRole, checkAccess };

  async function checkAccess() {
    const { hasAccess, role } = await checkAppAccess();
    setAppRole(role);
    if (!hasAccess) {
      setErrorMessage('Your account does not have access to Behavior Decoded. Please contact your agency administrator.');
      setStatus('no_access');
    }
    return hasAccess;
  }
}
