export interface LandingFaqItem {
  question: string;
  answer: string;
}

export const LANDING_FAQ_ITEMS: LandingFaqItem[] = [
  {
    question: 'Tem mensalidade ou cobrança automática depois dos 90 dias?',
    answer:
      'Não. O pagamento de R$ 24,90 é feito uma única vez via Pix e libera sua vitrine por 90 dias corridos. Não pedimos cartão de crédito e nunca fazemos cobranças automáticas.',
  },
  {
    question: 'Vocês cobram alguma taxa sobre as encomendas que eu vender?',
    answer:
      'Zero comissão. Todo o valor das suas vendas e o sinal pago pelos seus clientes caem diretamente na sua conta usando a sua própria chave Pix.',
  },
  {
    question:
      'Como meu cliente acompanha o status do pedido? Precisa baixar app?',
    answer:
      'Não precisa baixar nenhum aplicativo. Assim que você registra ou atualiza o pedido, um link exclusivo de acompanhamento em tempo real é gerado para o cliente ver cada etapa direto no navegador.',
  },
  {
    question:
      'Consigo alterar preços ou marcar um produto como esgotado depois de publicar?',
    answer:
      'Sim. Você pode pausar itens esgotados em 1 toque, mudar preços, atualizar datas e turnos de entrega ou adicionar novos produtos quando quiser pelo painel da vitrine.',
  },
  {
    question:
      'Existe limite de quantos produtos posso cadastrar na minha vitrine?',
    answer:
      'Não há limite. Você pode cadastrar quantos doces, marmitas, peças ou produtos sob encomenda desejar, todos com foto, descrição e preço.',
  },
  {
    question: 'Posso testar a vitrine antes de pagar os R$ 24,90?',
    answer:
      'Sim. Você monta sua vitrine completa, escolhe a cor da marca, cadastra os produtos e testa tudo gratuitamente. O pagamento único via Pix só é feito quando você decidir publicar.',
  },
];
