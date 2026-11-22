export interface LegalSection {
  number: string;
  title: string;
  paragraphs?: string[];
  bullets?: Array<{
    boldPrefix?: string;
    text: string;
  }>;
}

export interface LegalDocument {
  title: string;
  subtitle: string;
  updatedAt: string;
  sections: LegalSection[];
}

export const LEGAL_DOCS: Record<'terms' | 'privacy', LegalDocument> = {
  terms: {
    title: 'Termos de Uso — VitriMini',
    subtitle:
      'Condições gerais de contratação, planos pré-pagos e uso da plataforma SaaS (Versão 1.1)',
    updatedAt: 'Novembro de 2026',
    sections: [
      {
        number: '1',
        title: 'Identificação, Aceite e Natureza do Serviço (SaaS)',
        paragraphs: [
          'A VitriMini é uma plataforma de software como serviço (SaaS) operada por Antonio Gabriel Gomes Falcão do Nascimento (marca NeoDevZone), doravante denominada "VitriMini" ou "Plataforma". Ao criar uma conta, utilizar o período de teste gratuito, publicar uma vitrine ou realizar um pedido, o usuário ("Lojista" ou "Comprador", conforme aplicável) declara ter lido, compreendido e aceitado integralmente estes Termos de Uso.',
          'A VitriMini atua exclusivamente como fornecedora de software para criação de catálogo digital e organização de pedidos, não sendo intermediadora financeira, instituição de pagamento, marketplace, transportadora, fornecedora ou vendedora dos produtos anunciados nas vitrines, e cobrando 0% (zero por cento) de comissão sobre as vendas realizadas pelos Lojistas.',
        ],
      },
      {
        number: '2',
        title: 'Período de Teste Gratuito e Planos Pré-Pagos via Pix',
        paragraphs: [
          'A utilização da VitriMini para publicação de vitrines opera no modelo pré-pago via Pix, sem fidelidade, sem exigência de cartão de crédito para assinatura da plataforma e sem renovação ou cobrança recorrente automática. Os valores vigentes exibidos na interface da plataforma no momento da contratação prevalecem em caso de campanhas ou promoções:',
        ],
        bullets: [
          {
            boldPrefix: 'Teste Gratuito de 15 Dias (1ª Vitrine):',
            text: 'Ao criar sua primeira vitrine, o Lojista tem direito a um período único de avaliação gratuita de 15 (quinze) dias corridos com acesso aos recursos da plataforma, sem necessidade de informar cartão de crédito e sem cobrança automática ao término do prazo.',
          },
          {
            boldPrefix: 'Plano Essencial (R$ 24,90 por 90 dias):',
            text: 'Libera a vitrine pública por 90 (noventa) dias corridos, incluindo produtos ilimitados, carrinho com envio organizado para o WhatsApp, cálculo de sinal via Pix manual do Lojista, link de acompanhamento de pedido em tempo real e painel de gestão.',
          },
          {
            boldPrefix: 'Plano Pro Trimestral (R$ 39,90 por 90 dias):',
            text: 'Inclui todos os recursos do Plano Essencial por 90 (noventa) dias corridos, acrescidos da integração direta com a conta Mercado Pago do próprio Lojista para recebimento online automático via Pix e Cartão com baixa automática de pagamento no painel.',
          },
          {
            boldPrefix: 'Plano Pro Anual (R$ 99,90 por 365 dias):',
            text: 'Inclui todos os recursos do Plano Pro pelo período de 365 (trezentos e sessenta e cinco) dias corridos mediante pagamento único pré-pago via Pix.',
          },
        ],
      },
      {
        number: '3',
        title: 'Regras de Renovação, Upgrade de Plano e Exclusão após Carência',
        bullets: [
          {
            boldPrefix: 'Sem Renovação Automática:',
            text: 'Nenhum plano possui cobrança recorrente automática. O Lojista decide livremente se e quando deseja renovar sua vitrine mediante geração e pagamento de um novo Pix.',
          },
          {
            boldPrefix: 'Soma Integral de Prazo e Regra de Upgrade:',
            text: 'Quando o Lojista renova sua vitrine antes do vencimento (inclusive durante os 15 dias de teste gratuito), os novos dias contratados são somados integralmente à data de expiração vigente. Ao realizar upgrade do Plano Essencial para o Plano Pro antes do vencimento, os recursos do Plano Pro são liberados imediatamente para toda a vitrine e os novos dias contratados (90 ou 365 dias) são somados integralmente ao saldo de dias restantes.',
          },
          {
            boldPrefix: 'Expiração e Carência de 30 Dias:',
            text: 'Encerrado o prazo de vigência sem renovação, a vitrine entra em status expirado (ficando indisponível para novos pedidos públicos) pelo período de carência de 30 (trinta) dias corridos, permanecendo acessível no painel do Lojista para reativação.',
          },
          {
            boldPrefix: 'Exclusão Definitiva:',
            text: 'Caso a vitrine não seja renovada após os 30 (trinta) dias corridos de carência, o catálogo, seus produtos, pedidos vinculados e imagens armazenadas serão excluídos de forma permanente e irreversível dos servidores.',
          },
        ],
      },
      {
        number: '4',
        title: 'Política de Cancelamento e Reembolso da Assinatura',
        paragraphs: [
          'Em conformidade com o art. 49 do Código de Defesa do Consumidor (Lei nº 8.078/1990), o Lojista poderá exercer o direito de arrependimento e solicitar o reembolso integral do valor pago pela assinatura da plataforma em até 7 (sete) dias corridos contados da confirmação do pagamento inicial, desde que não haja uso abusivo, fraude ou violação destes Termos.',
          'A solicitação deve ser enviada pelo e-mail titular da conta para suporte@vitrimini.com.br. Efetuado o estorno, a vitrine correspondente é imediatamente desativada. Após o prazo legal de 7 (sete) dias corridos da contratação, em renovações subsequentes de serviço já utilizado ou em caso de bloqueio por violação destes Termos de Uso, não haverá reembolso total ou proporcional de dias não utilizados.',
        ],
      },
      {
        number: '5',
        title: 'Pagamentos Diretos ao Lojista (Mercado Pago e Pix) e Blindagem de Responsabilidade',
        paragraphs: [
          'Toda relação comercial de compra e venda de produtos ou encomendas ocorre única e exclusivamente entre o Lojista titular da vitrine e o Consumidor final.',
        ],
        bullets: [
          {
            boldPrefix: 'Integração Direta Mercado Pago (Plano Pro):',
            text: 'No Plano Pro, a conexão via OAuth com o Mercado Pago vincula a vitrine diretamente à conta Mercado Pago de titularidade do Lojista. Os valores pagos pelos compradores (via Pix ou Cartão) são processados pelo Mercado Pago e creditados diretamente na conta do Lojista, sem transitar por contas bancárias da VitriMini.',
          },
          {
            boldPrefix: 'Responsabilidade Exclusiva do Lojista (CDC e Estornos):',
            text: 'O Lojista é o único e exclusivo responsável pela existência, qualidade, segurança, higiene, prazos de preparo, entrega, veracidade das informações e preços, cumprimento do Código de Defesa do Consumidor (CDC), emissão de notas fiscais, atendimento pós-venda, mediações, contestações (chargebacks) e pela execução integral de estornos ou reembolsos aos seus clientes em caso de cancelamento, desistência ou falha na prestação do pedido.',
          },
          {
            boldPrefix: 'Isenção da VitriMini em Transações de Vitrines:',
            text: 'A VitriMini não retém valores de vendas dos Lojistas, não possui acesso para movimentar saldo das contas dos Lojistas e não responde solidária ou subsidiariamente por inadimplência, atrasos de entrega, vícios de produtos ou desacordos comerciais entre Lojistas e Compradores.',
          },
        ],
      },
      {
        number: '6',
        title: 'Uso Aceitável, Proibições e Suspensão Imediata',
        paragraphs: [
          'É estritamente proibido utilizar a VitriMini para anunciar, comercializar ou divulgar:',
        ],
        bullets: [
          {
            text: 'Produtos ilícitos, contrabandeados, falsificados, pirateados, roubados ou que violem direitos autorais, marcas registradas e propriedade intelectual de terceiros;',
          },
          {
            text: 'Substâncias entorpecentes, medicamentos controlados, armas, munições, explosivos ou itens de venda proibida ou restrita pela legislação brasileira;',
          },
          {
            text: 'Golpes financeiros, esquemas fraudulentos, phishing, rifas ilegais, jogos de azar ou vitrines falsas criadas com o intuito de lesar consumidores;',
          },
          {
            text: 'Conteúdo discriminatório, difamatório, pornográfico ou que incite violência ou ódio.',
          },
        ],
      },
      {
        number: '7',
        title: 'Prerrogativa de Suspensão e Cooperação Legal',
        paragraphs: [
          'A constatação de indícios de fraude, golpe ou violação da cláusula de Uso Aceitável autoriza a VitriMini a suspender ou excluir a vitrine e a conta do usuário imediatamente, sem necessidade de aviso prévio e sem direito a qualquer reembolso, além de preservar registros técnicos e cooperar integralmente com autoridades policiais, Ministério Público e Poder Judiciário mediante requisição legal.',
        ],
      },
      {
        number: '8',
        title: 'Disponibilidade do Serviço ("Como Está") e Serviços de Terceiros',
        paragraphs: [
          'A plataforma VitriMini é fornecida "como está" (as is) e "conforme disponível", empregando boas práticas técnicas de segurança e estabilidade, mas sem garantia de disponibilidade ininterrupta. Poderão ocorrer manutenções programadas ou emergenciais.',
          'A VitriMini não se responsabiliza por lucros cessantes, perdas indiretas ou indisponibilidades decorrentes de falhas em serviços de terceiros fora de seu controle direto, incluindo, sem limitação, instabilidades nas APIs do Mercado Pago, no aplicativo WhatsApp (Meta), em operadoras de telecomunicações, no sistema Pix do Banco Central ou em provedores globais de infraestrutura em nuvem.',
        ],
      },
      {
        number: '9',
        title: 'Cadastro, Segurança da Conta e Foro',
        paragraphs: [
          'O usuário é responsável pela exatidão de seus dados cadastrais e pelo sigilo de sua senha de acesso. Para dirimir quaisquer controvérsias oriundas destes Termos, fica eleito o foro da Comarca de Feira de Santana – BA, com renúncia a qualquer outro, por mais privilegiado que seja. Canal oficial de atendimento: suporte@vitrimini.com.br.',
        ],
      },
    ],
  },
  privacy: {
    title: 'Política de Privacidade (LGPD) — VitriMini',
    subtitle:
      'Transparência sobre o tratamento, segurança e proteção de dados pessoais (Versão 1.1)',
    updatedAt: 'Novembro de 2026',
    sections: [
      {
        number: '1',
        title: 'Papéis na LGPD: Controlador da Plataforma x Controlador da Vitrine',
        paragraphs: [
          'Esta Política de Privacidade descreve como os dados pessoais são tratados na plataforma VitriMini em conformidade com a Lei Geral de Proteção de Dados Pessoais (Lei nº 13.709/2018 – LGPD), diferenciando claramente as responsabilidades de cada agente:',
        ],
        bullets: [
          {
            boldPrefix: 'VitriMini como Controladora:',
            text: 'A VitriMini (operada por Antonio Gabriel Gomes Falcão do Nascimento – NeoDevZone) atua como Controladora dos dados pessoais referentes ao cadastro e autenticação das contas de Lojistas e das contas de acesso de Clientes na plataforma, bem como dos registros de assinatura e logs de segurança do sistema.',
          },
          {
            boldPrefix: 'Lojista Vendedor como Controlador Autônomo:',
            text: 'Cada Lojista titular de uma vitrine atua como Controlador autônomo e independente dos dados pessoais de entrega, contato e histórico de pedidos realizados pelos consumidores finais em sua respectiva vitrine, cabendo exclusivamente ao Lojista utilizar tais dados apenas para o atendimento, preparo, entrega e cumprimento de obrigações legais da encomenda, em estrita observância à LGPD. Nessa relação específica de gestão dos pedidos da loja, a VitriMini atua apenas como Operadora tecnológica da infraestrutura.',
          },
        ],
      },
      {
        number: '2',
        title: 'Dados Pessoais Coletados e Finalidades',
        bullets: [
          {
            boldPrefix: 'Dados de Cadastro e Conta (Lojistas e Clientes):',
            text: 'Nome, endereço de e-mail, número de telefone/WhatsApp e senha de acesso (armazenada exclusivamente sob criptografia irreversível com algoritmo de hash bcrypt). Finalidade: identificação, autenticação segura, recuperação de senha, gestão de vitrines e visualização do histórico de pedidos.',
          },
          {
            boldPrefix: 'Logs de Aceite Jurídico e Segurança:',
            text: 'Data e hora exatas (timestamps) de aceite dos Termos de Uso e da Política de Privacidade, versão do documento aceito (termsVersion) e tokens de sessão (Refresh Tokens armazenados em hash SHA-256 via cookie HttpOnly). Finalidade: comprovação legal de consentimento, prevenção a fraudes e segurança de sessão.',
          },
          {
            boldPrefix: 'Dados de Pedidos nas Vitrines:',
            text: 'Nome do comprador, telefone/WhatsApp, modalidade de recebimento, endereço de entrega (quando aplicável), data/turno escolhido, itens do pedido, forma de pagamento e observações. Finalidade: viabilizar o recebimento do pedido pelo Lojista no painel e no WhatsApp e gerar o link de acompanhamento (/pedido/:codigo — onde telefone e endereço são ocultados publicamente para proteção da privacidade).',
          },
          {
            boldPrefix: 'Metadados Técnicos de Pagamento e Tokens Criptografados:',
            text: 'A VitriMini NÃO coleta nem armazena números de cartão de crédito, códigos CVV ou senhas bancárias. Para pagamentos via Pix ou Cartão processados pelo Mercado Pago, armazenamos apenas metadados técnicos (ID da transação, status, valor e data). No Plano Pro, os tokens OAuth de integração com o Mercado Pago do Lojista são armazenados criptografados em repouso (AES-256-GCM).',
          },
        ],
      },
      {
        number: '3',
        title: 'Cookies e Ausência de Rastreamento Publicitário',
        paragraphs: [
          'A VitriMini utiliza exclusivamente cookies e armazenamento local estritamente necessários para manter a sessão autenticada do usuário (cookie HttpOnly seguro) e o funcionamento técnico do carrinho de compras. Não comercializamos dados pessoais nem utilizamos cookies de redes de anúncios comportamentais de terceiros.',
        ],
      },
      {
        number: '4',
        title: 'Operadores e Subcontratados Essenciais',
        paragraphs: [
          'Para prover o serviço com segurança e alta disponibilidade, compartilhamos apenas os dados estritamente necessários com operadores e subcontratados de infraestrutura tecnológica:',
        ],
        bullets: [
          {
            boldPrefix: 'Hospedagem e Banco de Dados em Nuvem:',
            text: 'Provedores de servidores de aplicação, borda (CDN) e banco de dados relacional gerenciado (como Render, Cloudflare e Supabase/PostgreSQL) para execução segura do sistema.',
          },
          {
            boldPrefix: 'Armazenamento de Imagens:',
            text: 'Serviço de armazenamento em nuvem (Cloudflare R2 / CDN) exclusivamente para hospedar as logos e fotos de produtos publicadas pelos Lojistas.',
          },
          {
            boldPrefix: 'Envio de E-mails Transacionais:',
            text: 'Provedor de mensageria transacional (Brevo) para envio de e-mails de boas-vindas, recuperação de senha e avisos operacionais da conta.',
          },
          {
            boldPrefix: 'Processamento de Pagamentos:',
            text: 'Mercado Pago, responsável pelo processamento financeiro dos pagamentos via Pix de ativação/renovação de planos da plataforma e, quando habilitado pelo Lojista no Plano Pro, pelo processamento direto dos pagamentos online dos pedidos da vitrine.',
          },
        ],
      },
      {
        number: '5',
        title: 'Retenção, Segurança da Informação e Eliminação de Dados',
        paragraphs: [
          'Empregamos tráfego criptografado via HTTPS/TLS, senhas com hash bcrypt, criptografia AES-256-GCM para credenciais de integração, controle de taxa de requisições (rate limiting) e isolamento de acesso autenticado.',
          'Os dados das vitrines permanecem armazenados enquanto o catálogo estiver ativo ou dentro do período de carência de 30 (trinta) dias após o vencimento. Decorrido o prazo de carência sem renovação, os dados da vitrine, produtos, pedidos vinculados e imagens são permanentemente eliminados, ressalvada a guarda de registros mínimos necessários para cumprimento de obrigação legal, regulatória ou exercício regular de direitos em processo (art. 16 da LGPD).',
        ],
      },
      {
        number: '6',
        title: 'Direitos do Titular dos Dados e Canal de Contato',
        paragraphs: [
          'Nos termos do art. 18 da LGPD, o titular dos dados pessoais tem direito a solicitar, a qualquer momento e mediante requisição gratuita: (i) confirmação da existência de tratamento e acesso aos dados; (ii) correção de dados incompletos, inexatos ou desatualizados; (iii) anonimização, bloqueio ou eliminação de dados desnecessários ou tratados em desconformidade; (iv) exclusão de sua conta na plataforma; e (v) informações sobre o compartilhamento e revogação de consentimento.',
          'Para exercer seus direitos ou esclarecer dúvidas sobre privacidade e proteção de dados, entre em contato pelo canal oficial do Encarregado pelo Tratamento de Dados Pessoais (DPO): suporte@vitrimini.com.br.',
        ],
      },
    ],
  },
};
