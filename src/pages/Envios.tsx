import { InfoLayout } from '../components/InfoLayout';

export function Envios() {
  return (
    <InfoLayout
      title="Envios"
      subtitle="Como e quando o seu pedido chega."
    >
      <p>
        Enviamos para todo o Brasil. Assim que o seu pedido é confirmado pela
        nossa equipe, ele é preparado e despachado, e você recebe o código de
        rastreamento para acompanhar a entrega.
      </p>

      <h2>Frete e prazos</h2>
      <ul>
        <li>
          <strong>Frete grátis</strong> em pedidos a partir de R$ 300,00.
        </li>
        <li>
          Abaixo desse valor, o frete padrão é de R$ 24,90.
        </li>
        <li>
          O prazo de entrega varia conforme a sua região e é informado na
          confirmação do pedido.
        </li>
      </ul>

      <h2>Como funciona</h2>
      <p>
        Nesta etapa, o pedido feito no site é uma solicitação: nossa equipe
        confirma a disponibilidade das peças e combina com você a forma de
        pagamento e o envio. Só depois da confirmação o produto é separado e
        postado.
      </p>

      <h2>Acompanhamento</h2>
      <p>
        Após o despacho, enviamos o código de rastreamento pelo WhatsApp. Se
        tiver qualquer dúvida sobre o status da entrega, é só falar com a gente.
      </p>
    </InfoLayout>
  );
}
