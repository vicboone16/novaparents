/**
 * useParentChild — resolves the active child ID and name.
 *
 * Priority order:
 *  1. StudentOverrideContext  — admin preview with an injected student
 *  2. ActiveChildContext      — parent's own selection when they have multiple children
 *  3. UserAccessContext       — first visible student (single-child fallback)
 */

import { useStudentOverride } from '@/contexts/StudentOverrideContext';
import { useUserAccess } from '@/contexts/UserAccessContext';
import { useActiveChild } from '@/contexts/ActiveChildContext';

export function useParentChild() {
  const override = useStudentOverride();
  const { data: access } = useUserAccess();
  const { activeChildId, activeChildName } = useActiveChild();

  // Admin preview takes precedence over everything
  if (override) {
    return { childId: override.studentId, childName: override.studentName };
  }

  // Use the actively selected child (set by the child switcher in ParentLayout)
  if (activeChildId) {
    return { childId: activeChildId, childName: activeChildName };
  }

  // Single-child / uninitialized fallback
  return {
    childId: access?.visibleStudentIds?.[0] ?? null,
    childName: access?.students?.[0]?.first_name || 'your child',
  };
}
