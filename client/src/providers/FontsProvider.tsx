import React, { ReactNode, createContext, useContext, useMemo } from 'react';
import { useAppFonts } from '../theme/useAppFonts';

const FontsContext = createContext(false);

export const useFontsReady = () => useContext(FontsContext);

export const FontsProvider = ({ children }: { children: ReactNode }) => {
  const fontsLoaded = useAppFonts();
  const value = useMemo(() => fontsLoaded, [fontsLoaded]);

  return <FontsContext.Provider value={value}>{children}</FontsContext.Provider>;
};
