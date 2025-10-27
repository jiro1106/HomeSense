import React, { createContext, useContext, useState, ReactNode } from 'react';

interface BillContextType {
  monthlyBill: number | null;
  isLoadingBill: boolean;
  billError: string | null;
  updateBillData: (bill: number | null, loading: boolean, error: string | null) => void;
}

const BillContext = createContext<BillContextType | undefined>(undefined);

export const BillProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [monthlyBill, setMonthlyBill] = useState<number | null>(null);
  const [isLoadingBill, setIsLoadingBill] = useState(false);
  const [billError, setBillError] = useState<string | null>(null);

  const updateBillData = (bill: number | null, loading: boolean, error: string | null) => {
    setMonthlyBill(bill);
    setIsLoadingBill(loading);
    setBillError(error);
  };

  return (
    <BillContext.Provider value={{
      monthlyBill,
      isLoadingBill,
      billError,
      updateBillData
    }}>
      {children}
    </BillContext.Provider>
  );
};

export const useBillContext = () => {
  const context = useContext(BillContext);
  if (context === undefined) {
    throw new Error('useBillContext must be used within a BillProvider');
  }
  return context;
};
