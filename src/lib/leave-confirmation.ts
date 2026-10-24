import { createContext, useContext } from 'react';

export interface DraftState { dirty: boolean; saving: boolean }
export const LeaveConfirmationContext = createContext<{
  register: (read: () => DraftState, onLeave: () => void) => () => void;
  confirmLeave: () => Promise<boolean>;
} | null>(null);

export function useLeaveConfirmation() {
  const context = useContext(LeaveConfirmationContext);
  if (!context) throw new Error('Missing LeaveConfirmationProvider');
  return context;
}
