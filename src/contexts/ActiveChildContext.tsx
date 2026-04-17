/**
 * ActiveChildContext
 * ──────────────────
 * Tracks the currently selected child for parents who have multiple children
 * enrolled.  Persisted in sessionStorage so the choice survives page navigations
 * but resets when the browser session ends (intentional — different children
 * may be relevant across different sessions).
 *
 * Used by useParentChild() which checks this context before falling back to
 * visibleStudentIds[0] from UserAccessContext.
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import { useUserAccess } from '@/contexts/UserAccessContext';

interface ActiveChildContextValue {
  activeChildId: string | null;
  activeChildName: string;
  setActiveChild: (id: string, name: string) => void;
}

const ActiveChildCtx = createContext<ActiveChildContextValue>({
  activeChildId: null,
  activeChildName: 'your child',
  setActiveChild: () => {},
});

export function useActiveChild() {
  return useContext(ActiveChildCtx);
}

const SESSION_KEY = 'bd_active_child_id';

export function ActiveChildProvider({ children }: { children: ReactNode }) {
  const { data: access } = useUserAccess();
  const [activeChildId, setActiveChildId] = useState<string | null>(null);
  const [activeChildName, setActiveChildName] = useState('your child');

  // Initialise from sessionStorage, validated against the current student list.
  useEffect(() => {
    if (!access?.students?.length) return;

    const saved = sessionStorage.getItem(SESSION_KEY);
    const match = access.students.find(s => s.id === saved);

    if (match) {
      setActiveChildId(match.id);
      setActiveChildName(match.first_name || 'your child');
    } else {
      // Default to first student
      const first = access.students[0];
      setActiveChildId(first.id);
      setActiveChildName(first.first_name || 'your child');
    }
  }, [access?.students]);

  const setActiveChild = useCallback((id: string, name: string) => {
    setActiveChildId(id);
    setActiveChildName(name);
    sessionStorage.setItem(SESSION_KEY, id);
  }, []);

  return (
    <ActiveChildCtx.Provider value={{ activeChildId, activeChildName, setActiveChild }}>
      {children}
    </ActiveChildCtx.Provider>
  );
}
