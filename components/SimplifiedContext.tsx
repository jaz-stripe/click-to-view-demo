import React, { createContext, useState, useContext, useEffect } from 'react';

type SimplifiedContextType = {
  isSimplified: boolean;
  toggleSimplified: () => void;
};

const SimplifiedContext = createContext<SimplifiedContextType | undefined>(undefined);

export const SimplifiedProvider: React.FC = ({ children }) => {
  const [isSimplified, setIsSimplified] = useState(false);

  useEffect(() => {
    const savedSimplified = localStorage.getItem('isSimplified');
    if (savedSimplified !== null) {
      setIsSimplified(JSON.parse(savedSimplified));
    }
  }, []);

  const toggleSimplified = () => {
    const newValue = !isSimplified;
    setIsSimplified(newValue);
    localStorage.setItem('isSimplified', JSON.stringify(newValue));
  };

  return (
    <SimplifiedContext.Provider value={{ isSimplified, toggleSimplified }}>
      {children}
    </SimplifiedContext.Provider>
  );
};

export const useSimplified = () => {
  const context = useContext(SimplifiedContext);
  if (context === undefined) {
    throw new Error('useSimplified must be used within a SimplifiedProvider');
  }
  return context;
};
