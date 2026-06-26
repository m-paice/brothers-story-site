import { InfoLayout } from '../components/InfoLayout';
import { WHATSAPP_URL } from '../data/navigation';

export function Trocas() {
  return (
    <InfoLayout
      title="Trocas e devoluções"
      subtitle="Comprou e não serviu? A gente resolve."
    >
      <p>
        Queremos que você fique satisfeito com a sua compra. Se a peça não
        serviu ou você mudou de ideia, é possível trocar ou devolver seguindo as
        condições abaixo.
      </p>

      <h2>Prazo</h2>
      <p>
        Você tem até <strong>7 dias corridos</strong> após o recebimento para
        solicitar a devolução por arrependimento, conforme o Código de Defesa do
        Consumidor (art. 49). Para trocas de tamanho, o prazo é de{' '}
        <strong>30 dias</strong> a partir do recebimento.
      </p>

      <h2>Condições</h2>
      <ul>
        <li>A peça deve estar sem uso, com etiqueta e na embalagem original.</li>
        <li>Não pode apresentar sinais de uso, lavagem ou cheiro de perfume.</li>
        <li>Recomendamos guardar a nota e a embalagem até confirmar o caimento.</li>
      </ul>

      <h2>Como solicitar</h2>
      <p>
        Fale com a gente pelo{' '}
        <a href={WHATSAPP_URL} target="_blank" rel="noreferrer">
          WhatsApp
        </a>{' '}
        informando o número do pedido e o motivo da troca ou devolução. Nossa
        equipe orienta o passo a passo e os detalhes do envio.
      </p>
    </InfoLayout>
  );
}
