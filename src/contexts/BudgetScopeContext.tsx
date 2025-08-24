import { createContext, useState, useContext, ReactNode } from 'react';

type BudgetScope = string | 'personal';

interface BudgetScopeContextType {
  scope: BudgetScope;
  setScope: (scope: BudgetScope) => void;
}

const BudgetScopeContext = createContext<BudgetScopeContextType | undefined>(undefined);

export const BudgetScopeProvider = ({ children }: { children: ReactNode }) => {
  const [scope, setScope] = useState<BudgetScope>('personal');

  return (
    <BudgetScopeContext.Provider value={{ scope, setScope }}>
      {children}
    </BudgetScopeContext.Provider>
  );
};

export const useBudgetScope = () => {
  const context = useContext(BudgetScopeContext);
  if (context === undefined) {
    throw new Error('useBudgetScope must be used within a BudgetScopeProvider');
  }
  return context;
};
