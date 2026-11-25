export interface LandingFaqItem {
  question: string;
  answer: string;
}

export const LANDING_FAQ_ITEMS: LandingFaqItem[] = [
  {
    question: 'Como funcionam os 15 dias grátis na primeira vitrine?',
    answer:
      'Ao criar sua primeira vitrine na VitriMini, ela já entra no ar imediatamente por 15 dias grátis para você testar na prática com seus clientes. Se quiser continuar depois desse prazo, basta escolher um dos planos disponíveis na tela de assinatura.',
  },
  {
    question: 'Como funcionam a contratação, os meios de pagamento e a renovação dos planos?',
    answer:
      'A contratação pode ser feita nas modalidades avulsa ou recorrente, conforme os meios de pagamento disponíveis na tela de assinatura no momento da contratação. Caso opte pela assinatura recorrente, o cancelamento é simples e pode ser feito a qualquer momento pelo próprio painel, sem multa.',
  },
  {
    question: 'Se eu assinar um plano antes de acabar os 15 dias grátis, eu perco os dias que faltavam?',
    answer:
      'De jeito nenhum! O tempo do plano é somado a partir da data em que seus 15 dias grátis iam vencer — em um plano de 90 dias, por exemplo, você aproveita até 105 dias no ar.',
  },
  {
    question: 'Vocês cobram alguma taxa sobre as encomendas que eu vender?',
    answer:
      'Zero comissão. Todo o valor das suas vendas e o pagamento antecipado feito pelos seus clientes caem diretamente na sua conta usando a sua própria chave Pix ou Mercado Pago.',
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
