import { InfoLayout } from '../components/InfoLayout';
import { useSettings } from '../context/SettingsContext';
import { renderBody } from '../utils/body';

export function Envios() {
  const { settings } = useSettings();
  const { title, subtitle, body } = settings.pages.envios;

  return (
    <InfoLayout title={title} subtitle={subtitle}>
      {renderBody(body)}
    </InfoLayout>
  );
}
