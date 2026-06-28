import { InfoLayout } from '../components/InfoLayout';
import { useSettings } from '../context/SettingsContext';
import { renderBody } from '../utils/body';

export function Trocas() {
  const { settings } = useSettings();
  const { title, subtitle, body } = settings.pages.trocas;

  return (
    <InfoLayout title={title} subtitle={subtitle}>
      {renderBody(body)}
    </InfoLayout>
  );
}
