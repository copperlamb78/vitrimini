export interface LegalSection {
  number: string;
  title: string;
  paragraphs?: string[];
  bullets?: Array<{
    boldPrefix?: string;
    text: string;
  }>;
  table?: {
    headers: string[];
    rows: string[][];
  };
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
      'Condições gerais de contratação avulsa ou recorrente, uso da plataforma SaaS e Acordo de Tratamento de Dados (Versão 2.3)',
    updatedAt: '25 de novembro de 2026',
    sections: [
      {
        number: '1',
        title: 'Identificação do Fornecedor (Decreto nº 7.962/2013)',
        paragraphs: [
          'Em cumprimento ao art. 2º do Decreto nº 7.962/2013, a plataforma de software como serviço (SaaS) VitriMini apresenta seus dados completos de identificação e atendimento:',
        ],
        table: {
          headers: ['Informação', 'Detalhamento'],
          rows: [
            [
              'Responsável pela Plataforma',
              'Antonio Gabriel Gomes Falcão do Nascimento (operando a plataforma VitriMini / NeoDevZone como pessoa física)',
            ],
            ['CPF', '094.580.405-90'],
            [
              'Endereço comercial / correspondência',
              'Feira de Santana – BA (CEP 44085-370) — endereço completo para correspondência fornecido mediante solicitação pelo canal suporte@vitrimini.com.br',
            ],
            [
              'Canal oficial de atendimento e suporte',
              'suporte@vitrimini.com.br',
            ],
          ],
        },
      },
      {
        number: '2',
        title: 'Objeto, Aceite, Distinção de Usuários e Legislação',
        paragraphs: [
          'A VitriMini fornece exclusivamente infraestrutura tecnológica SaaS para criação de vitrines digitais, gestão de pedidos, resumo financeiro, hub de links (VitriLink) e integração opcional de checkout com o Mercado Pago. Estes Termos aplicam-se a três situações distintas:',
        ],
        bullets: [
          {
            boldPrefix: 'Lojista na criação de conta:',
            text: 'Ao criar uma conta, o Lojista manifesta aceite expresso a estes Termos e à Política de Privacidade, com registro eletrônico no banco de dados contendo identificador do usuário, data, hora e versão aceita.',
          },
          {
            boldPrefix: 'Lojista na contratação de plano pago:',
            text: 'Ao contratar um ciclo pago após ou durante o período de avaliação, o Lojista adere às condições comerciais, prazos e regras de upgrade vigentes na tela de contratação.',
          },
          {
            boldPrefix: 'Comprador final em vitrine de terceiro:',
            text: 'Ao navegar e enviar um pedido em uma vitrine publicada na VitriMini, o Comprador final realiza relação comercial de compra e venda direta e exclusiva com o Lojista titular da respectiva vitrine, utilizando a plataforma apenas como meio tecnológico de catálogo e pedido.',
          },
          {
            boldPrefix: 'Legislação aplicável:',
            text: 'Estes Termos são regidos pelo Código Civil (Lei nº 10.406/2002), pelo Marco Civil da Internet (Lei nº 12.965/2014) e pelo Código de Defesa do Consumidor (Lei nº 8.078/1990 – CDC). A eventual caracterização do Lojista como consumidor perante a VitriMini depende das circunstâncias concretas da contratação, enquanto o Comprador final relaciona-se comercialmente como consumidor diretamente perante o Lojista vendedor.',
          },
        ],
      },
      {
        number: '3',
        title: 'Conta, Idade Mínima e Segurança',
        paragraphs: [
          'O cadastro e a contratação de planos na VitriMini destinam-se a pessoas com capacidade civil plena, nos termos do Código Civil (maiores de 18 anos ou devidamente representadas/assistidas na forma da lei). O Lojista compromete-se a fornecer informações verdadeiras e atualizadas, incluindo nome, e-mail, WhatsApp, chave Pix, slug da vitrine e dados operacionais.',
          'A recuperação de acesso à conta ocorre pelo e-mail cadastrado. A VitriMini aplica bloqueio preventivo de sessões ou credenciais diante de indícios concretos de comprometimento, e o Lojista responde pela guarda de sua senha e pelas permissões OAuth concedidas à sua conta do Mercado Pago, sem prejuízo da responsabilidade legal da própria VitriMini caso ocorra falha de segurança comprovadamente imputável à plataforma.',
        ],
      },
      {
        number: '4',
        title: 'Planos, Avaliação Gratuita (15 dias), Modalidades de Pagamento e Upgrade',
        paragraphs: [
          'Na criação da primeira vitrine, o Lojista conta com um período único de avaliação gratuita de 15 (quinze) dias corridos, sem exigência de cartão prévio, sem cobrança automática e sem geração de qualquer dívida ao término do teste. A continuidade em plano pago depende sempre de contratação expressa pelo Lojista.',
        ],
        bullets: [
          {
            boldPrefix: 'Planos vigentes:',
            text: 'A VitriMini oferece os planos Essencial Mensal (R$ 9,90/mês), Pro Mensal (R$ 14,90/mês) e Pro Anual (R$ 149,00/ano), cujas funcionalidades e limites constam na tela de contratação.',
          },
          {
            boldPrefix: 'Regra de renovação por aniversário no calendário:',
            text: 'A validade e a cobrança de cada ciclo seguem a data de aniversário no calendário: o vencimento ou a renovação ocorre sempre no mesmo dia do mês da contratação (ou no mesmo dia e mês do ano seguinte, no plano anual). Em meses mais curtos, a data é ajustada automaticamente para o último dia válido do mês (por exemplo, contratação em 31/01 vence ou renova em 28/02, ou 29/02 em anos bissextos).',
          },
          {
            boldPrefix: 'Pix Avulso (pagamento único por ciclo):',
            text: 'O Lojista pode escolher o pagamento via Pix Avulso em qualquer plano (Essencial Mensal, Pro Mensal ou Pro Anual), realizando pagamento único por ciclo via Mercado Pago, sem renovação automática e sem débito automático recorrente.',
          },
          {
            boldPrefix: 'Assinatura Recorrente via Cartão de Crédito (Mercado Pago):',
            text: 'O Lojista também pode optar pela assinatura recorrente com Cartão de Crédito via Mercado Pago (/preapproval), mediante autorização expressa da recorrência antes da confirmação do checkout. A cobrança renova automaticamente conforme o ciclo contratado (mensal ou anual, respeitando a regra de aniversário no calendário) e permite cancelamento imediato direto pelo painel a qualquer momento, sem multa, bloqueando futuras cobranças e mantendo o acesso até o fim do ciclo já pago.',
          },
          {
            boldPrefix: 'Regra de Upgrade, Troca de Modalidade e Cancelamento Automático da Assinatura Anterior:',
            text: 'Ao realizar upgrade do Plano Essencial para o Plano Pro antes do término do ciclo vigente, o Lojista paga o valor integral do novo ciclo contratado e recebe imediatamente os recursos do Plano Pro, somando-se o novo ciclo (1 mês ou 1 ano) à data de vencimento restante do ciclo anterior. Em qualquer upgrade ou troca de modalidade (inclusive migração entre Cartão Recorrente e Pix Avulso), eventual assinatura recorrente anterior ativa no Mercado Pago é cancelada automaticamente após a confirmação do novo pagamento, evitando cobrança dupla.',
          },
        ],
      },
      {
        number: '5',
        title: 'Expiração, Retenção e Exclusão de Dados (30 dias)',
        paragraphs: [
          'Encerrado o período de avaliação gratuita ou o ciclo contratado sem nova contratação ou renovação, a vitrine pública é desativada e entra em período de carência de 30 (trinta) dias corridos, mantendo os dados acessíveis no painel apenas para eventual reativação.',
          'Decorridos 30 (trinta) dias corridos após a expiração sem renovação, uma rotina automatizada remove os dados operacionais da vitrine, o catálogo de produtos, os pedidos vinculados e as imagens armazenadas no Cloudflare R2, ressalvadas as hipóteses legais de conservação para cumprimento de obrigação legal ou regulatória, exercício regular de direitos (art. 16 da LGPD) e os ciclos técnicos de eliminação de backups dos provedores de nuvem.',
        ],
      },
      {
        number: '6',
        title: 'Direito de Arrependimento (Art. 49 do CDC) e Cancelamento',
        bullets: [
          {
            boldPrefix: 'Cancelamento conforme a modalidade contratada:',
            text: 'No Pix Avulso, não há renovação automática: caso não deseje continuar, basta não contratar um novo ciclo ao final do prazo vigente. Na Assinatura Recorrente via Cartão de Crédito, o Lojista realiza o cancelamento direto pelo painel da VitriMini a qualquer momento, sem multa, com bloqueio imediato de futuras cobranças e manutenção integral do acesso até o término do período já pago.',
          },
          {
            boldPrefix: 'Direito de Arrependimento (Art. 49 do CDC):',
            text: 'Nos termos do art. 49 do Código de Defesa do Consumidor, o Lojista pode exercer o direito de arrependimento e solicitar o reembolso integral em até 7 (sete) dias corridos contados da contratação do plano pago, diretamente pelo painel ou enviando mensagem pelo e-mail titular da conta para suporte@vitrimini.com.br. Solicitações enviadas em finais de semana ou feriados dentro do prazo de 7 (sete) dias corridos preservam integralmente a tempestividade do pedido para análise e processamento do estorno no próximo dia útil. Efetuado o reembolso, eventual assinatura recorrente vinculada é cancelada e a vitrine do ciclo estornado é desativada.',
          },
        ],
      },
      {
        number: '7',
        title: 'Relação Lojista-Comprador, 0% de Comissão e Mercado Pago',
        paragraphs: [
          'A VitriMini cobra 0% (zero por cento) de comissão sobre as vendas realizadas nas vitrines. Os pagamentos efetuados pelos Compradores finais — seja diretamente na chave Pix informada pelo Lojista ou por meio da conta Mercado Pago conectada via OAuth no Plano Pro — são creditados 100% diretamente na conta do Lojista, sem transitar pela VitriMini.',
          'Em razão disso, eventuais estornos, cancelamentos de compra e contestações (chargebacks) ocorrem integralmente na conta do Lojista. A VitriMini não participa da fabricação, estoque, qualidade, higiene, entrega, emissão de notas fiscais ou tributação dos itens anunciados pelo Lojista; contudo, em observância ao art. 51 do CDC, responde normalmente pelo funcionamento técnico da plataforma e pela segurança dos dados sob sua custódia nos termos da legislação brasileira.',
        ],
      },
      {
        number: '8',
        title: 'Uso Aceitável, Propriedade Intelectual, Disponibilidade e Foro',
        bullets: [
          {
            boldPrefix: 'Uso Aceitável e Denúncias:',
            text: 'É proibido utilizar a plataforma para comercializar produtos ilícitos, falsificados ou restritos por lei, praticar fraudes ou phishing, realizar varreduras/enumeração automatizada ou violar direitos autorais e marcas de terceiros. Denúncias de violação podem ser enviadas a suporte@vitrimini.com.br.',
          },
          {
            boldPrefix: 'Suspensão Preventiva e Contestação:',
            text: 'Diante de indícios concretos de fraude, ilegalidade ou risco técnico à plataforma, a VitriMini pode suspender preventivamente a conta ou vitrine afetada, assegurando ao Lojista o direito de contestação e esclarecimento pelo canal suporte@vitrimini.com.br.',
          },
          {
            boldPrefix: 'Propriedade Intelectual:',
            text: 'A marca VitriMini, seu código-fonte, layout e design system pertencem exclusivamente à operadora da plataforma. O Lojista mantém a titularidade integral sobre suas marcas, fotos, textos e links, concedendo à VitriMini licença limitada e não exclusiva estritamente necessária à hospedagem e exibição da vitrine e do VitriLink.',
          },
          {
            boldPrefix: 'Disponibilidade e Foro:',
            text: 'A plataforma opera em infraestrutura em nuvem sujeita a janelas de manutenção técnica e indisponibilidades causadas por serviços de terceiros (como Mercado Pago, WhatsApp, sistema Pix ou operadoras de telecomunicações), sem afastar a responsabilidade própria da VitriMini por falhas do serviço nos limites da lei. Fica eleito o foro da Comarca de Feira de Santana – BA para dirimir controvérsias, ressalvado expressamente o foro de domicílio assegurado por lei ao consumidor quando aplicável.',
          },
        ],
      },
      {
        number: '9',
        title: 'Anexo — Acordo de Tratamento de Dados (DPA)',
        paragraphs: [
          'Este Anexo integra os Termos de Uso e disciplina o tratamento de dados pessoais de Compradores finais realizado pela VitriMini na qualidade de Operadora, em nome do Lojista (Controlador), no contexto dos pedidos registrados nas vitrines:',
        ],
        bullets: [
          {
            boldPrefix: 'Objeto e Finalidades Autorizadas:',
            text: 'A VitriMini trata os dados dos pedidos exclusivamente conforme as instruções documentadas do Lojista nestes Termos, para viabilizar o registro do pedido, a exibição no painel administrativo, o envio organizado para WhatsApp, o link de acompanhamento pelo comprador e a atualização de status de pagamento via Mercado Pago.',
          },
          {
            boldPrefix: 'Confidencialidade e Medidas Técnicas:',
            text: 'O acesso aos dados é restrito ao estritamente necessário para a operação e suporte técnico solicitado, aplicando-se medidas como criptografia em trânsito (HTTPS/TLS), hash bcrypt em senhas, SHA-256 em tokens de sessão, AES-256-GCM em tokens OAuth do Mercado Pago e controle de acesso.',
          },
          {
            boldPrefix: 'Suboperadores Autorizados:',
            text: 'O Lojista autoriza o uso dos suboperadores essenciais descritos na Política de Privacidade (Supabase, Render, Cloudflare, Mercado Pago, Brevo e Zoho Mail), mantidos sob obrigações contratuais compatíveis com a LGPD.',
          },
          {
            boldPrefix: 'Incidentes e Eliminação:',
            text: 'A VitriMini comunica ao Lojista, sem demora injustificada, incidentes de segurança confirmados que afetem dados pessoais dos pedidos sob sua operação. Encerrado o ciclo da vitrine e transcorrido o prazo de carência de 30 (trinta) dias sem renovação, os dados operacionais e imagens são eliminados automaticamente, ressalvadas as hipóteses do art. 16 da LGPD e os ciclos técnicos de eliminação de backups.',
          },
        ],
      },
    ],
  },
  privacy: {
    title: 'Política de Privacidade (LGPD) — VitriMini',
    subtitle:
      'Transparência sobre o tratamento, bases legais, cookies, suboperadores e proteção de dados pessoais (Versão 2.3)',
    updatedAt: '25 de novembro de 2026',
    sections: [
      {
        number: '1',
        title: 'Papéis de Controlador e Operadora e Enquadramento ANPD',
        paragraphs: [
          'Esta Política de Privacidade descreve como os dados pessoais são tratados na VitriMini em conformidade com a Lei Geral de Proteção de Dados Pessoais (Lei nº 13.709/2018 – LGPD):',
        ],
        bullets: [
          {
            boldPrefix: 'VitriMini como Controladora:',
            text: 'A VitriMini (operada por Antonio Gabriel Gomes Falcão do Nascimento – NeoDevZone) atua como Controladora dos dados cadastrais dos Lojistas, credenciais de autenticação, registros de contratação de planos, logs técnicos de segurança própria e uso do VitriLink.',
          },
          {
            boldPrefix: 'Lojista como Controlador e VitriMini como Operadora:',
            text: 'Nos pedidos realizados nas vitrines, cada Lojista atua como Controlador autônomo dos dados dos Compradores finais, definindo as finalidades de atendimento, preparo e entrega. A VitriMini atua como Operadora desses dados, ressalvada sua atuação autônoma para proteção da segurança da infraestrutura e prevenção a fraudes contra a própria plataforma.',
          },
          {
            boldPrefix: 'Agente de Tratamento de Pequeno Porte (Resolução CD/ANPD nº 2/2022):',
            text: 'A VitriMini enquadra-se como agente de tratamento de pequeno porte nos termos da Resolução CD/ANPD nº 2/2022, estando dispensada da indicação formal de Encarregado pelo Tratamento de Dados Pessoais (DPO), mantendo canal direto e permanente de atendimento aos titulares pelo e-mail suporte@vitrimini.com.br.',
          },
        ],
      },
      {
        number: '2',
        title: 'Dados Coletados, Chave Pix, Finalidades e Bases Legais (Art. 7º da LGPD)',
        bullets: [
          {
            boldPrefix: 'Dados cadastrais e operacionais do Lojista (Execução de Contrato — Art. 7º, V):',
            text: 'Nome, e-mail, telefone/WhatsApp, senha (em hash bcrypt), slug da vitrine, endereço/turnos de atendimento, links configurados no VitriLink, imagens enviadas ao Cloudflare R2 e registro eletrônico do aceite dos Termos (usuário, data, hora e versão). Finalidade: criação da conta, autenticação, operação da vitrine e suporte.',
          },
          {
            boldPrefix: 'Chave Pix do Lojista (Execução de Contrato — Art. 7º, V):',
            text: 'A chave Pix cadastrada (que pode constituir dado pessoal, como CPF, e-mail ou número de telefone) é utilizada exclusivamente para exibição na vitrine e cálculo de sinal ao comprador, viabilizando o recebimento direto na conta do Lojista.',
          },
          {
            boldPrefix: 'Credenciais OAuth, assinaturas e transações de planos (Execução de Contrato — Art. 7º, V e Obrigação Legal — Art. 7º, II):',
            text: 'Tokens OAuth de integração com o Mercado Pago (criptografados em repouso), identificador da assinatura recorrente (mpPreapprovalId), status da assinatura e histórico técnico de cobranças dos planos (CatalogPayment, com identificador de gateway, status, valor e data). Finalidade: integração de checkout no Plano Pro, gestão de vigência/renovação de planos e cumprimento de obrigações legais/fiscais.',
          },
          {
            boldPrefix: 'Dados de pedidos de Compradores finais (Execução de Contrato pelo Lojista — Art. 7º, V):',
            text: 'Nome, telefone/WhatsApp, modalidade (entrega ou retirada), endereço de entrega quando aplicável, data/turno, itens do pedido, forma de pagamento e observações. Orienta-se expressamente que o Lojista e os compradores evitem inserir dados pessoais desnecessários ou sensíveis no campo de observações.',
          },
          {
            boldPrefix: 'Metadados técnicos transitórios de segurança (Legítimo Interesse — Art. 7º, IX):',
            text: 'Dados transitórios em memória para rate limiting e prevenção contra abusos e enumeração automatizada, com salvaguardas de minimização. A aplicação não grava tabela própria de logs históricos de acesso contendo endereço IP + data/hora no banco de dados.',
          },
        ],
      },
      {
        number: '3',
        title: 'Segurança Técnica e Delimitação PCI-DSS',
        paragraphs: [
          'A VitriMini adota controles técnicos proporcionais ao risco do serviço: senhas armazenadas exclusivamente com hash criptográfico bcrypt, refresh tokens protegidos com hash SHA-256 em cookies HttpOnly com atributos Secure e SameSite, tokens OAuth do Mercado Pago criptografados em repouso com AES-256-GCM, tráfego sob HTTPS/TLS e proteção por rate limiting.',
          'A VitriMini não possui certificação PCI-DSS própria e não coleta nem armazena números de cartão de crédito ou códigos de segurança (CVV) em seus servidores. Tanto no Pix Avulso quanto na Assinatura Recorrente via Cartão de Crédito, a VitriMini redireciona o Lojista para o checkout hospedado do Mercado Pago (init_point), armazenando exclusivamente o identificador da assinatura (mpPreapprovalId), o status e o histórico técnico de cobranças (CatalogPayment), além dos tokens OAuth e identificadores de transação nas vitrines conectadas ao Plano Pro.',
        ],
      },
      {
        number: '4',
        title: 'Cookies, Armazenamento Local e Ausência de Rastreamento Publicitário',
        paragraphs: [
          'A VitriMini não utiliza cookies publicitários nem scripts de analytics ou pixels de rastreamento (tais como Google Analytics, Meta Pixel ou equivalentes). Empregam-se apenas mecanismos estritamente necessários ao funcionamento e à segurança da aplicação:',
        ],
        bullets: [
          {
            boldPrefix: 'Cookies HttpOnly estritamente necessários:',
            text: 'vitrimini_refresh_token (manutenção segura da sessão autenticada) e mp_oauth_nonce (validação criptográfica de estado durante o fluxo OAuth do Mercado Pago).',
          },
          {
            boldPrefix: 'localStorage:',
            text: 'vitrimini_has_session (sinalizador local de sessão, permanecendo o access token JWT exclusivamente em memória), vitrimini_draft_v1 (rascunho temporário na criação da vitrine) e vitrimini_order_sound (preferência de alerta sonoro no painel).',
          },
          {
            boldPrefix: 'sessionStorage:',
            text: 'vitrimini_mp_invite_dismissed_<catalogId> (registro temporário de dispensa do aviso de conexão com o Mercado Pago na sessão do painel).',
          },
          {
            boldPrefix: 'Carrinho do comprador:',
            text: 'Mantido exclusivamente em memória React durante a navegação na vitrine, sem persistência no armazenamento do navegador.',
          },
        ],
      },
      {
        number: '5',
        title: 'Suboperadores e Transferência Internacional de Dados',
        paragraphs: [
          'A VitriMini não vende nem comercializa dados pessoais. O compartilhamento ocorre apenas com provedores essenciais à operação técnica do serviço. Fornecedores com infraestrutura global ou internacional operam sob cláusulas contratuais e termos de proteção de dados compatíveis com a LGPD e com a Resolução CD/ANPD nº 19/2024:',
        ],
        table: {
          headers: ['Suboperador', 'Finalidade do Tratamento', 'Infraestrutura / Transferência'],
          rows: [
            [
              'Supabase',
              'Banco de dados relacional PostgreSQL para contas, vitrines e pedidos',
              'Região Brasil',
            ],
            [
              'Render',
              'Hospedagem da API e execução dos serviços de backend',
              'Infraestrutura internacional (cláusulas compatíveis com a LGPD / Res. ANPD nº 19/2024)',
            ],
            [
              'Cloudflare',
              'DNS, CDN/Pages, proteção de borda e armazenamento de imagens (R2)',
              'Rede global / internacional (cláusulas compatíveis com a LGPD / Res. ANPD nº 19/2024)',
            ],
            [
              'Mercado Pago',
              'Processamento de pagamentos e integração OAuth das vitrines Pro',
              'Infraestrutura regional/global conforme termos do intermediador',
            ],
            [
              'Brevo',
              'Envio de e-mails transacionais (confirmação de conta e recuperação de senha)',
              'Infraestrutura internacional (cláusulas compatíveis com a LGPD / Res. ANPD nº 19/2024)',
            ],
            [
              'Zoho Mail',
              'Atendimento oficial aos usuários e titulares via suporte@vitrimini.com.br',
              'Infraestrutura internacional (cláusulas compatíveis com a LGPD / Res. ANPD nº 19/2024)',
            ],
          ],
        },
      },
      {
        number: '6',
        title: 'Retenção, Exclusão, Direitos dos Titulares (Art. 18) e Incidentes',
        bullets: [
          {
            boldPrefix: 'Retenção e Exclusão por Categoria:',
            text: 'Dados cadastrais, da vitrine e de pedidos permanecem ativos durante a vigência do uso e pelo prazo de carência de 30 (trinta) dias corridos após a expiração sem renovação, após o qual rotina automatizada remove os dados operacionais da vitrine, pedidos e imagens no Cloudflare R2. Registros efêmeros em memória de segurança expiram automaticamente em curto intervalo. Conservam-se apenas dados exigidos por obrigação legal ou exercício regular de direitos (art. 16 da LGPD) e os backups técnicos dos provedores de nuvem até o cumprimento de seus ciclos automáticos de eliminação.',
          },
          {
            boldPrefix: 'Direitos dos Titulares (Art. 18 da LGPD):',
            text: 'O titular pode solicitar confirmação de tratamento, acesso, correção, anonimização, bloqueio, eliminação, portabilidade, informação sobre compartilhamento e revogação de consentimento pelo e-mail suporte@vitrimini.com.br. As requisições são atendidas em até 15 (quinze) dias (ou mediante confirmação simplificada imediata, quando aplicável). Para pedidos em vitrines específicas, a VitriMini encaminha ou orienta o atendimento junto ao respectivo Lojista Controlador.',
          },
          {
            boldPrefix: 'Comunicação de Incidentes (Resolução CD/ANPD nº 15/2024):',
            text: 'Na hipótese de incidente de segurança com risco ou dano relevante aos titulares, a VitriMini comunica a ANPD, os titulares afetados e os Lojistas controladores nos termos da Resolução CD/ANPD nº 15/2024, observando o prazo legal de 3 (três) dias úteis quando aplicável.',
          },
        ],
      },
    ],
  },
};
