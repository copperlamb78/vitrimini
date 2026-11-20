export interface LandingFaqItem {
  question: string;
  answer: string;
}

export const LANDING_FAQ_ITEMS: LandingFaqItem[] = [
  {
    question: 'Como funcionam os 15 dias grátis na primeira vitrine?',
    answer:
      'Ao criar sua primeira vitrine na VitriMini, ela já entra no ar imediatamente por 15 dias grátis — sem precisar cadastrar cartão de crédito e sem cobrança automática. Se quiser continuar depois desse prazo, basta renovar por R$ 24,90 via Pix para garantir mais 90 dias.',
  },
  {
    question: 'Tem mensalidade ou cobrança automática depois dos 15 dias ou dos 90 dias?',
    answer:
      'Não. Não pedimos cartão de crédito e nunca fazemos cobranças automáticas. Quando quiser continuar com a vitrine no ar, você faz um pagamento único de R$ 24,90 via Pix e libera mais 90 dias corridos.',
  },
  {
    question: 'Se eu pagar os R$ 24,90 antes de acabar os 15 dias grátis, eu perco os dias que faltavam?',
    answer:
      'De jeito nenhum! Os 90 dias são somados a partir da data em que seus 15 dias grátis iam vencer, então você aproveita até 105 dias no ar.',
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
];
