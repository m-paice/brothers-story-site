import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { fetchSettings, DEFAULT_SETTINGS } from '../lib/settings';
import { useTenant } from './TenantContext';
import type { StoreSettings } from '../types/settings';

interface SettingsContextValue {
  settings: StoreSettings;
  loading: boolean;
  reload: () => void;
}

const SettingsContext = createContext<SettingsContextValue>({
  settings: DEFAULT_SETTINGS,
  loading: false,
  reload: () => {},
});

export function SettingsProvider({ children }: { children: ReactNode }) {
  const { storeId } = useTenant();
  const [settings, setSettings] = useState<StoreSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    setLoading(true);
    fetchSettings(storeId ?? undefined)
      .then(setSettings)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [storeId, tick]);

  return (
    <SettingsContext.Provider
      value={{ settings, loading, reload: () => setTick((t) => t + 1) }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export const useSettings = () => useContext(SettingsContext);
