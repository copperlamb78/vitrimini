export interface LandingFaqItem {
  question: string;
  answer: string;
}

export const LANDING_FAQ_ITEMS: LandingFaqItem[] = [
  {
    question: 'Como funcionam os 15 dias grátis sem cartão na primeira vitrine?',
    answer:
      'Ao criar sua primeira vitrine na VitriMini, ela já entra no ar imediatamente por 15 dias grátis, sem precisar cadastrar cartão de crédito e sem cobrança automática ao final do teste. Se quiser continuar depois desse prazo, basta escolher um plano na tela de assinatura.',
  },
  {
    question: 'Quais são os planos e como posso pagar?',
    answer:
      'Você escolhe entre Essencial (R$ 9,90/mês), Pro Mensal (R$ 14,90/mês) ou Pro Anual (R$ 149,00/ano, com 2 meses grátis). Pode pagar no Pix (sem renovação automática) ou no Cartão de Crédito (com renovação mensal ou anual e cancelamento direto no painel, sem multa).',
  },
  {
    question: 'Como funciona a data de vencimento dos planos?',
    answer:
      'A cobrança ou vencimento acontece todo mês ou ano no mesmo dia em que você contratou. Se assinar no dia 15, por exemplo, o próximo vencimento será no dia 15 do mês seguinte (no mensal) ou do ano seguinte (no anual).',
  },
  {
    question:
      'Se eu assinar um plano antes de acabar os 15 dias grátis, eu perco os dias que faltavam?',
    answer:
      'De jeito nenhum! O tempo do plano é somado a partir da data em que seus 15 dias grátis iam vencer — ao contratar um plano mensal, por exemplo, você aproveita os dias restantes do teste somados ao novo período completo no ar.',
  },
  {
    question: 'Vocês cobram alguma comissão sobre as vendas da minha vitrine?',
    answer:
      'Zero comissão. Todo o valor das suas vendas vai 100% para você, direto na sua conta pela sua própria chave Pix ou pela sua conta do Mercado Pago conectada no Plano Pro.',
  },
  {
    question: 'O que vem no Plano Pro com VitriLink e Mercado Pago?',
    answer:
      'Por apenas R$ 5,00 a mais por mês em relação ao Essencial, o Plano Pro libera o VitriLink (sua página de links para a bio do Instagram e TikTok com capa e cartões com foto) e a integração direta com o Mercado Pago para receber via Pix e Cartão de Crédito com confirmação e baixa automática no painel.',
  },
  {
    question:
      'Como meu cliente acompanha o status do pedido? Precisa baixar app?',
    answer:
      'Não precisa baixar nenhum aplicativo. Assim que o pedido é feito, um link exclusivo de acompanhamento em tempo real é gerado para o cliente ver cada etapa (Recebido, Em preparo, Pronto ou Saiu para entrega) direto no navegador.',
  },
  {
    question:
      'Consigo alterar preços, datas e turnos ou marcar um produto como esgotado?',
    answer:
      'Sim. Pelo painel da vitrine você pode pausar itens esgotados em 1 toque, mudar preços, configurar agendamento por data e turno para entregas ou retiradas e adicionar novos produtos quando quiser.',
  },
  {
    question:
      'Existe limite de quantos produtos posso cadastrar na minha vitrine?',
    answer:
      'Não há limite. Você pode cadastrar quantos doces, marmitas, roupas, kits ou produtos sob encomenda desejar, todos com foto, descrição e preço.',
  },
];
