/**
 * useParentChild — resolves the active child ID and name.
 * Checks StudentOverrideContext first (admin preview), then falls back
 * to the normal UserAccessContext.
 */

import { useStudentOverride } from '@/contexts/StudentOverrideContext';
import { useUserAccess } from '@/contexts/UserAccessContext';

export function useParentChild() {
  const override = useStudentOverride();
  const { data: access } = useUserAccess();

  if (override) {
    return { childId: override.studentId, childName: override.studentName };
  }

  return {
    childId: access?.visibleStudentIds?.[0] ?? null,
    childName: access?.students?.[0]?.first_name || 'your child',
  };
}
