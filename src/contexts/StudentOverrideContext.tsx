/**
 * StudentOverrideContext
 * ──────────────────────
 * Allows admin preview to inject a specific student ID / name
 * that parent pages will use instead of the access context default.
 */

import { createContext, useContext, type ReactNode } from 'react';

interface StudentOverride {
  studentId: string;
  studentName: string;
}

const StudentOverrideCtx = createContext<StudentOverride | null>(null);

export function useStudentOverride() {
  return useContext(StudentOverrideCtx);
}

export function StudentOverrideProvider({
  studentId,
  studentName,
  children,
}: StudentOverride & { children: ReactNode }) {
  return (
    <StudentOverrideCtx.Provider value={{ studentId, studentName }}>
      {children}
    </StudentOverrideCtx.Provider>
  );
}
