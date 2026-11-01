import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { api } from './api.js';

const DEFAULTS = {
  shop_name: 'Пчелна къща',
  phone: '',
  email: '',
  shipping_cents: 590,
  free_shipping_from_cents: 5000,
  announcement: '',
};

const SettingsContext = createContext({ ...DEFAULTS, setSettings: () => {} });

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(DEFAULTS);

  useEffect(() => {
    api.get('/api/settings').then(setSettings).catch(() => {});
  }, []);

  const value = useMemo(() => ({ ...settings, setSettings }), [settings]);
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export const useSettings = () => useContext(SettingsContext);
