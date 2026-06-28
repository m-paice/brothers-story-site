import { useEffect } from 'react';
import { InfoLayout } from '../components/InfoLayout';
import { useSettings } from '../context/SettingsContext';
import { renderBody } from '../utils/body';

export function Envios() {
  const { settings } = useSettings();
  const { title, subtitle, body } = settings.pages.envios;

  useEffect(() => {
    document.title = `${title} — Brothers Story`;
    return () => {
      document.title = 'Brothers Story — Moda Masculina';
    };
  }, [title]);

  return (
    <InfoLayout title={title} subtitle={subtitle}>
      {renderBody(body)}
    </InfoLayout>
  );
}
