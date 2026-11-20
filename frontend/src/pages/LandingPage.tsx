import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Store,
  Sparkles,
  Eye,
  XCircle,
  CheckCircle2,
  Palette,
  Share2,
  MessageCircle,
  Wallet,
  CalendarClock,
  PackageCheck,
  Check,
  ChevronDown,
  ArrowRight,
  LogIn,
  LogOut,
  Calendar,
  Plus,
  Radar,
  BarChart3,
  CakeSlice,
  UtensilsCrossed,
  Shirt,
  Scissors,
  ShoppingBag,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { DemoStoreModal } from '../components/DemoStoreModal';
import { Footer } from '../components/Footer';
import { applyPageSeo } from '../utils/seo';
import { LANDING_FAQ_ITEMS } from '../data/landingFaq';
import logoVitriMini from '../assets/logo-vitrimini.png';

interface RevealProps {
  children: React.ReactNode;
  className?: string;
  delayMs?: number;
}

function Reveal({ children, className = '', delayMs = 0 }: RevealProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delayMs}ms` }}
      className={`transition-all duration-700 ease-out ${
        visible ? 'translate-y-0 opacity-100' : 'translate-y-5 opacity-0'
      } ${className}`}
    >
      {children}
    </div>
  );
}

const HOW_IT_WORKS_STEPS = [
  {
    step: '01',
    icon: Palette,
    title: 'Crie sua vitrine em minutos',
    description:
      'Adicione sua logo, escolha a cor da marca, configure datas e turnos de entrega ou retirada e cadastre produtos ilimitados.',
  },
  {
    step: '02',
    icon: Share2,
    title: 'Compartilhe na bio ou WhatsApp',
    description:
      'Publique com Pix único de R$ 24,90 por 90 dias e coloque o link leve da sua vitrine na bio do Instagram e nas conversas.',
  },
  {
    step: '03',
    icon: MessageCircle,
    title: 'Receba pedidos organizados',
    description:
      'O cliente monta o carrinho, vê o sinal no Pix e envia tudo pronto no WhatsApp — com link de acompanhamento em tempo real.',
  },
];

const FEATURES = [
  {
    icon: MessageCircle,
    title: 'Pedidos organizados no WhatsApp',
    description:
      'Receba nome do cliente, itens, quantidades, data/turno escolhido, entrega ou retirada e valor do sinal já calculados.',
  },
  {
    icon: Radar,
    title: 'Acompanhamento em tempo real',
    description:
      'Gere um link exclusivo (/pedido/codigo) para o cliente acompanhar cada etapa do pedido direto no navegador, sem baixar app.',
  },
  {
    icon: CalendarClock,
    title: 'Datas, turnos recorrentes e entrega',
    description:
      'Controle quando aceita encomendas com agenda de datas, turnos recorrentes e opção de retirada no local ou entrega.',
  },
  {
    icon: Wallet,
    title: 'Sinal automático via Pix',
    description:
      'Calcula 50% (ou a porcentagem que você definir) e exibe sua própria chave Pix na hora, com 0% de comissão da plataforma.',
  },
  {
    icon: BarChart3,
    title: 'Painel financeiro simples e marca própria',
    description:
      'Acompanhe pedidos e faturamento no painel, pause itens esgotados em 1 toque e personalize a vitrine com a cor da sua marca.',
  },
  {
    icon: PackageCheck,
    title: 'Botão "Esgotado" em 1 clique',
    description:
      'Acabou um item ou lotou a produção? Pause em segundos sem apagar foto nem perder o cadastro do produto.',
  },
];

const NICHES = [
  {
    icon: CakeSlice,
    title: 'Confeitarias & Docerias',
    description:
      'Bolos sob encomenda, kits de festa, docinhos e cardápios sazonais com sinal no Pix garantido.',
  },
  {
    icon: UtensilsCrossed,
    title: 'Marmitarias & Lanchonetes',
    description:
      'Cardápio do dia ou da semana com escolha de turno, retirada ou entrega sem bagunça no WhatsApp.',
  },
  {
    icon: Shirt,
    title: 'Lojas de Roupas & Acessórios',
    description:
      'Catálogo online leve para colocar na bio do Instagram e receber pedidos prontos com tamanho e peça.',
  },
  {
    icon: Scissors,
    title: 'Artesanato & Sob Encomenda',
    description:
      'Peças personalizadas com prazo de produção, datas disponíveis e acompanhamento de status.',
  },
];

const VALUE_BENEFITS = [
  'Produtos ilimitados com foto, descrição e preço',
  '0% de comissão sobre suas vendas (o Pix cai direto na sua conta)',
  'Link de acompanhamento do pedido em tempo real para o cliente',
  'Painel com gestão de pedidos, datas/turnos e resumo financeiro',
  'Sem mensalidade, sem cartão e sem renovação automática',
];

export function LandingPage() {
  const { user, loading: authLoading, logout } = useAuth();
  const [demoOpen, setDemoOpen] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  useEffect(() => {
    applyPageSeo({
      title: 'VitriMini | Catálogo Online e Pedidos pelo WhatsApp',
      description:
        'Crie sua vitrine digital e catálogo online com pedidos organizados no WhatsApp, sinal no Pix e 0% de comissão. Pague R$ 24,90 uma vez e use por 90 dias.',
      canonicalPath: '/',
      jsonLd: [
        {
          '@context': 'https://schema.org',
          '@type': 'Organization',
          name: 'VitriMini',
          url: 'https://vitrimini.com.br/',
          logo: 'https://vitrimini.com.br/og-cover.png',
        },
        {
          '@context': 'https://schema.org',
          '@type': 'SoftwareApplication',
          name: 'VitriMini',
          applicationCategory: 'BusinessApplication',
          operatingSystem: 'Web',
          inLanguage: 'pt-BR',
          url: 'https://vitrimini.com.br/',
          description:
            'Criador de vitrines digitais e catálogos online com pedidos organizados no WhatsApp, acompanhamento em tempo real e cálculo automático de sinal via Pix.',
          offers: {
            '@type': 'Offer',
            price: '24.90',
            priceCurrency: 'BRL',
            availability: 'https://schema.org/InStock',
          },
        },
        {
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: LANDING_FAQ_ITEMS.map((item) => ({
            '@type': 'Question',
            name: item.question,
            acceptedAnswer: {
              '@type': 'Answer',
              text: item.answer,
            },
          })),
        },
      ],
    });
  }, []);

  const firstName = user?.name.split(' ')[0] || '';

  return (
    <div className="min-h-screen bg-white text-zinc-900 scroll-smooth">
      {/* A. Navbar Fixa e Minimalista */}
      <header className="sticky top-0 z-40 border-b border-zinc-200 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3.5">
          <Link to="/" className="flex cursor-pointer items-center gap-2.5">
            <img
              src={logoVitriMini}
              alt="VitriMini"
              decoding="async"
              fetchPriority="high"
              className="h-8 w-auto object-contain sm:h-9"
            />
          </Link>

          <nav
            aria-label="Navegação principal"
            className="hidden items-center gap-6 text-xs font-semibold text-zinc-600 md:flex"
          >
            <a
              href="#como-funciona"
              className="cursor-pointer transition hover:text-rose-600"
            >
              Como funciona
            </a>
            <a
              href="#recursos"
              className="cursor-pointer transition hover:text-rose-600"
            >
              Diferenciais
            </a>
            <a
              href="#nichos"
              className="cursor-pointer transition hover:text-rose-600"
            >
              Para quem é
            </a>
            <a
              href="#valor"
              className="cursor-pointer transition hover:text-rose-600"
            >
              Valor
            </a>
            <a
              href="#duvidas"
              className="cursor-pointer transition hover:text-rose-600"
            >
              Dúvidas
            </a>
          </nav>

          <div className="flex items-center gap-2">
            {authLoading ? (
              <div className="h-8 w-28 animate-pulse rounded-xl bg-zinc-200/70" />
            ) : user ? (
              <>
                <span className="hidden text-xs font-semibold text-zinc-600 lg:inline">
                  Olá, <strong className="text-zinc-900">{firstName}</strong>
                </span>
                <Link
                  to="/meus-pedidos"
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-50 hover:text-zinc-900"
                >
                  <ShoppingBag className="h-3.5 w-3.5 text-zinc-500" />
                  <span className="hidden sm:inline">Meus Pedidos</span>
                </Link>
                <Link
                  to="/minhas-vitrines"
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-bold text-zinc-800 transition hover:bg-zinc-100"
                >
                  <Store className="h-3.5 w-3.5 text-rose-600" />
                  Minhas Vitrines
                </Link>
                <button
                  type="button"
                  onClick={logout}
                  title="Sair da conta"
                  className="inline-flex cursor-pointer items-center gap-1 rounded-xl border border-zinc-200 bg-white px-2.5 py-2 text-xs font-semibold text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-900"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Sair</span>
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/entrar"
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-100"
                >
                  <LogIn className="h-3.5 w-3.5 text-zinc-500" />
                  Entrar
                </Link>
                <Link
                  to="/criar"
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-rose-600 px-3.5 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-rose-700"
                >
                  Criar vitrine
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main>
        {/* B. Hero Section (sem Reveal bloqueando LCP) */}
        <section className="border-b border-zinc-200 bg-gradient-to-b from-zinc-50/70 to-white py-12 sm:py-18">
          <div className="mx-auto max-w-6xl px-4">
            <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-12 lg:gap-12">
              {/* Texto e CTAs */}
              <div className="vm-hero-enter space-y-6 lg:col-span-6">
                <div className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-3.5 py-1.5 text-xs font-bold text-rose-700">
                  <Sparkles className="h-3.5 w-3.5 text-rose-600" />
                  <span>0% de comissão • Sem mensalidade • Pronta em 2 minutos</span>
                </div>

                <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 sm:text-4xl lg:text-[2.65rem] lg:leading-[1.12]">
                  Catálogo Online e Vitrine Digital com Pedidos no WhatsApp
                </h1>

                <p className="text-base leading-relaxed text-zinc-600">
                  Chega de mandar PDF pesado e responder preço o dia inteiro. Monte sua vitrine com fotos, datas de entrega e sinal no Pix por apenas{' '}
                  <strong className="font-bold text-zinc-900">R$ 24,90</strong>{' '}
                  uma única vez por 90 dias, com{' '}
                  <strong className="font-bold text-zinc-900">0% de comissão</strong>.
                </p>

                <div className="flex flex-col gap-3 pt-1 sm:flex-row">
                  <Link
                    to="/criar"
                    className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-2xl bg-rose-600 px-6 py-4 text-sm font-bold text-white shadow-lg shadow-rose-600/20 transition hover:-translate-y-0.5 hover:bg-rose-700"
                  >
                    Criar vitrine grátis
                    <ArrowRight className="h-4 w-4" />
                  </Link>

                  <button
                    type="button"
                    onClick={() => setDemoOpen(true)}
                    className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-zinc-300 bg-white px-5 py-4 text-sm font-bold text-zinc-800 transition hover:-translate-y-0.5 hover:bg-zinc-50"
                  >
                    <Eye className="h-4 w-4 text-rose-600" />
                    Ver exemplo
                  </button>
                </div>

                <p className="text-xs text-zinc-500">
                  Você monta e testa tudo gratuitamente. Só paga os R$ 24,90 via Pix se gostar e quiser publicar.
                </p>
              </div>

              {/* Composição Visual Animada (100% CSS) */}
              <div className="lg:col-span-6">
                <div className="vm-float relative">
                  {/* Badge flutuante de novo pedido */}
                  <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white px-3.5 py-1.5 text-xs font-bold text-zinc-800 shadow-md sm:absolute sm:-top-4 sm:right-4 sm:z-10 sm:mb-0">
                    <span className="relative flex h-2.5 w-2.5 items-center justify-center">
                      <span className="vm-pulse-dot absolute inline-flex h-full w-full rounded-full bg-emerald-400" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                    </span>
                    <span>Novo pedido recebido</span>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-12 sm:items-center">
                    {/* Mini-card da Vitrine */}
                    <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-lg sm:col-span-6">
                      <div className="bg-gradient-to-br from-rose-600 to-pink-600 px-4 py-4 text-white">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-white/90 bg-rose-100 text-xs font-black text-rose-700">
                            DC
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-extrabold">
                              Doces da Clara
                            </p>
                            <p className="text-[11px] text-white/90">
                              Sinal de 50% via Pix
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2.5 p-3.5">
                        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-2.5">
                          <div className="flex items-center gap-1.5 text-[11px] font-bold text-zinc-600">
                            <Calendar className="h-3.5 w-3.5 text-rose-600" />
                            Datas disponíveis
                          </div>
                          <div className="mt-1.5 flex flex-wrap gap-1">
                            <span className="rounded-md bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-700">
                              23/12 • Tarde
                            </span>
                            <span className="rounded-md bg-rose-600 px-2 py-0.5 text-[10px] font-bold text-white">
                              24/12 • Manhã
                            </span>
                          </div>
                        </div>

                        <div className="rounded-xl border border-zinc-200 bg-white p-2.5">
                          <p className="text-xs font-bold text-zinc-900">
                            Bolo Natalino Frutas
                          </p>
                          <p className="text-[10px] text-zinc-500">
                            Serve 15 fatias
                          </p>
                          <div className="mt-1.5 flex items-center justify-between">
                            <span className="text-xs font-extrabold text-zinc-900">
                              R$ 135,00
                            </span>
                            <span className="inline-flex items-center gap-0.5 rounded-full bg-rose-600 px-2 py-0.5 text-[10px] font-bold text-white">
                              <Check className="h-3 w-3" />
                              1x
                            </span>
                          </div>
                        </div>

                        <div className="rounded-xl border border-zinc-200 bg-white p-2.5">
                          <p className="text-xs font-bold text-zinc-900">
                            Chocotone Trufado
                          </p>
                          <p className="text-[10px] text-zinc-500">
                            Ganache belga 900g
                          </p>
                          <div className="mt-1.5 flex items-center justify-between">
                            <span className="text-xs font-extrabold text-zinc-900">
                              R$ 89,90
                            </span>
                            <span className="inline-flex items-center gap-0.5 rounded-full bg-rose-600 px-2 py-0.5 text-[10px] font-bold text-white">
                              <Plus className="h-3 w-3" />
                              1x
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Card do Pedido Chegando Pronto no WhatsApp */}
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 shadow-lg sm:col-span-6">
                      <div className="mb-2.5 flex items-center gap-2">
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-600 text-white">
                          <MessageCircle className="h-3.5 w-3.5" />
                        </span>
                        <div>
                          <p className="text-xs font-extrabold text-emerald-950">
                            Chega pronto no seu WhatsApp
                          </p>
                          <p className="text-[10px] text-emerald-700">
                            Tudo somado e organizado
                          </p>
                        </div>
                      </div>

                      <div className="space-y-2 rounded-xl border border-emerald-200/80 bg-white p-3.5 text-xs leading-relaxed text-zinc-800 shadow-2xs">
                        <p className="font-semibold text-zinc-900">
                          Olá Doces da Clara! Gostaria de fazer uma encomenda:
                        </p>
                        <div className="text-[11px] text-zinc-600">
                          <p>
                            <strong className="text-zinc-900">Cliente:</strong> Mariana Silva
                          </p>
                          <p>
                            <strong className="text-zinc-900">Data/Turno:</strong> 24/12 (Qui) • Manhã
                          </p>
                          <p>
                            <strong className="text-zinc-900">Recebimento:</strong> Retirada no local
                          </p>
                        </div>
                        <div className="border-t border-zinc-100 pt-1.5 text-[11px]">
                          <p className="font-bold text-zinc-900">Itens do Pedido:</p>
                          <p>• 1x Bolo Natalino (R$ 135,00)</p>
                          <p>• 1x Chocotone Trufado (R$ 89,90)</p>
                        </div>
                        <div className="rounded-lg bg-emerald-50 p-2 text-[11px]">
                          <div className="flex justify-between">
                            <span className="text-zinc-600">Valor Total:</span>
                            <strong className="text-zinc-900">R$ 224,90</strong>
                          </div>
                          <div className="mt-0.5 flex justify-between text-emerald-800">
                            <span className="font-bold">Sinal via Pix (50%):</span>
                            <strong className="font-extrabold">R$ 112,45</strong>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* C. Antes x Depois (Compacta) */}
        <section className="py-14 sm:py-18">
          <div className="mx-auto max-w-6xl px-4">
            <Reveal className="mx-auto max-w-2xl text-center">
              <span className="text-xs font-extrabold uppercase tracking-wider text-rose-600">
                Menos conversa repetida, mais vendas fechadas
              </span>
              <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-zinc-900 sm:text-3xl">
                Transforme seu atendimento no WhatsApp
              </h2>
            </Reveal>

            <div className="mt-9 grid grid-cols-1 gap-6 md:grid-cols-2">
              <Reveal
                delayMs={40}
                className="rounded-2xl border border-red-200/80 bg-red-50/30 p-6 transition-all duration-300 hover:-translate-y-1"
              >
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-600">
                    <XCircle className="h-5 w-5" />
                  </div>
                  <h3 className="text-base font-extrabold text-zinc-900">
                    Como é hoje (PDF e fotos soltas)
                  </h3>
                </div>

                <ul className="mt-4 space-y-2.5 text-sm text-zinc-600">
                  <li className="flex items-start gap-2.5">
                    <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                    <span>
                      Cliente dando zoom em cardápio PDF pesado que demora para abrir.
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                    <span>
                      Mensagens repetidas perguntando preço, disponibilidade e data.
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                    <span>
                      Você somando itens e calculando sinal na mão entre uma produção e outra.
                    </span>
                  </li>
                </ul>
              </Reveal>

              <Reveal
                delayMs={120}
                className="rounded-2xl border border-emerald-200 bg-emerald-50/30 p-6 transition-all duration-300 hover:-translate-y-1"
              >
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <h3 className="text-base font-extrabold text-zinc-900">
                    Com sua vitrine VitriMini
                  </h3>
                </div>

                <ul className="mt-4 space-y-2.5 text-sm text-zinc-700">
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                    <span>
                      Catálogo leve que abre na hora pelo link da bio ou WhatsApp.
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                    <span>
                      Cliente escolhe produtos, data, turno e vê o sinal no Pix já calculado.
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                    <span>
                      Pedido chega pronto no WhatsApp com link de acompanhamento em tempo real.
                    </span>
                  </li>
                </ul>
              </Reveal>
            </div>
          </div>
        </section>

        {/* D. Como Funciona (3 Passos Simples) */}
        <section
          id="como-funciona"
          className="border-y border-zinc-200 bg-zinc-50 py-14 sm:py-18"
        >
          <div className="mx-auto max-w-6xl px-4">
            <Reveal className="mx-auto max-w-2xl text-center">
              <span className="text-xs font-extrabold uppercase tracking-wider text-rose-600">
                Simples do começo ao fim
              </span>
              <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-zinc-900 sm:text-3xl">
                Sua vitrine no ar em 3 passos
              </h2>
            </Reveal>

            <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3">
              {HOW_IT_WORKS_STEPS.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <Reveal
                    key={item.step}
                    delayMs={idx * 90}
                    className="relative rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xs transition-all duration-300 hover:-translate-y-1 hover:shadow-md"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
                        <Icon className="h-5 w-5" />
                      </div>
                      <span className="text-xs font-black uppercase tracking-widest text-zinc-300">
                        Passo {item.step}
                      </span>
                    </div>
                    <h3 className="mt-4 text-base font-extrabold text-zinc-900">
                      {item.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-zinc-600">
                      {item.description}
                    </p>
                  </Reveal>
                );
              })}
            </div>
          </div>
        </section>

        {/* E. Diferenciais Reais da VitriMini */}
        <section id="recursos" className="py-14 sm:py-18">
          <div className="mx-auto max-w-6xl px-4">
            <Reveal className="mx-auto max-w-2xl text-center">
              <span className="text-xs font-extrabold uppercase tracking-wider text-rose-600">
                Feito para quem vende pelo WhatsApp
              </span>
              <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-zinc-900 sm:text-3xl">
                Tudo o que você precisa para vender mais e organizar pedidos
              </h2>
            </Reveal>

            <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((feature, idx) => {
                const Icon = feature.icon;
                return (
                  <Reveal
                    key={feature.title}
                    delayMs={idx * 60}
                    className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xs transition-all duration-300 hover:-translate-y-1 hover:border-rose-200 hover:shadow-md"
                  >
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="mt-4 text-base font-extrabold text-zinc-900">
                      {feature.title}
                    </h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-zinc-600">
                      {feature.description}
                    </p>
                  </Reveal>
                );
              })}
            </div>
          </div>
        </section>

        {/* F. Para quem é (Nichos — SEO de cauda longa) */}
        <section
          id="nichos"
          className="border-t border-zinc-200 bg-zinc-50/60 py-14 sm:py-18"
        >
          <div className="mx-auto max-w-6xl px-4">
            <Reveal className="mx-auto max-w-2xl text-center">
              <span className="text-xs font-extrabold uppercase tracking-wider text-rose-600">
                Para quem é a VitriMini
              </span>
              <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-zinc-900 sm:text-3xl">
                Ideal para pequenos negócios e vendas sob encomenda
              </h2>
            </Reveal>

            <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {NICHES.map((niche, idx) => {
                const Icon = niche.icon;
                return (
                  <Reveal key={niche.title} delayMs={idx * 60}>
                    <article className="h-full rounded-2xl border border-zinc-200 bg-white p-5 shadow-2xs transition-all duration-300 hover:-translate-y-1 hover:border-rose-200">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
                        <Icon className="h-5 w-5" />
                      </div>
                      <h3 className="mt-3.5 text-base font-extrabold text-zinc-900">
                        {niche.title}
                      </h3>
                      <p className="mt-1.5 text-sm leading-relaxed text-zinc-600">
                        {niche.description}
                      </p>
                    </article>
                  </Reveal>
                );
              })}
            </div>
          </div>
        </section>

        {/* G. Seção de Preço Único */}
        <section
          id="valor"
          className="border-t border-zinc-200 bg-white py-14 sm:py-18"
        >
          <div className="mx-auto max-w-6xl px-4">
            <Reveal className="mx-auto max-w-lg rounded-2xl border border-rose-200 bg-rose-50/30 p-7 text-center shadow-sm sm:p-9">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-100 px-3 py-1 text-xs font-bold text-rose-700">
                <Store className="h-3.5 w-3.5" />
                Acesso Completo por 90 Dias
              </span>

              <h2 className="mt-4 text-2xl font-extrabold tracking-tight text-zinc-900">
                Um único pagamento. Sem surpresas.
              </h2>

              <div className="mt-5 flex items-baseline justify-center gap-1">
                <span className="text-sm font-bold text-zinc-500">R$</span>
                <span className="text-5xl font-black tracking-tight text-zinc-900">
                  24,90
                </span>
              </div>
              <p className="mt-1 text-xs font-semibold text-rose-700">
                pagamento único via Pix • válida por 90 dias
              </p>

              <ul className="mt-6 space-y-3 text-left text-sm text-zinc-700">
                {VALUE_BENEFITS.map((benefit) => (
                  <li key={benefit} className="flex items-start gap-2.5">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-rose-600 text-white">
                      <Check className="h-3 w-3 stroke-[3]" />
                    </span>
                    <span>{benefit}</span>
                  </li>
                ))}
              </ul>

              <Link
                to="/criar"
                className="mt-7 flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-rose-600 px-6 py-4 text-sm font-bold text-white shadow-lg shadow-rose-600/20 transition hover:-translate-y-0.5 hover:bg-rose-700"
              >
                Criar vitrine agora
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Reveal>
          </div>
        </section>

        {/* H. Perguntas Frequentes (FAQ Acordeão) */}
        <section
          id="duvidas"
          className="border-t border-zinc-200 bg-zinc-50/70 py-14 sm:py-18"
        >
          <div className="mx-auto max-w-3xl px-4">
            <Reveal className="text-center">
              <span className="text-xs font-extrabold uppercase tracking-wider text-rose-600">
                Tire suas dúvidas
              </span>
              <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-zinc-900 sm:text-3xl">
                Perguntas Frequentes
              </h2>
            </Reveal>

            <div className="mt-8 space-y-3">
              {LANDING_FAQ_ITEMS.map((item, idx) => {
                const isOpen = openFaqIndex === idx;
                const panelId = `faq-panel-${idx}`;
                return (
                  <Reveal
                    key={item.question}
                    delayMs={idx * 45}
                    className="overflow-hidden rounded-2xl border border-zinc-200 bg-white"
                  >
                    <button
                      type="button"
                      aria-expanded={isOpen}
                      aria-controls={panelId}
                      onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                      className="flex w-full cursor-pointer items-center justify-between gap-4 px-5 py-4 text-left text-sm font-bold text-zinc-900 transition hover:bg-zinc-50"
                    >
                      <span>{item.question}</span>
                      <ChevronDown
                        className={`h-4 w-4 shrink-0 text-zinc-500 transition-transform duration-200 ${
                          isOpen ? 'rotate-180 text-rose-600' : ''
                        }`}
                      />
                    </button>

                    <div
                      id={panelId}
                      className={`grid transition-[grid-template-rows] duration-300 ease-out ${
                        isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
                      }`}
                    >
                      <div className="overflow-hidden">
                        <div className="border-t border-zinc-100 px-5 pb-4 pt-3 text-sm leading-relaxed text-zinc-600">
                          {item.answer}
                        </div>
                      </div>
                    </div>
                  </Reveal>
                );
              })}
            </div>
          </div>
        </section>

        {/* I. CTA Final Limpo */}
        <section className="border-t border-zinc-200 bg-zinc-900 py-14 text-white sm:py-16">
          <div className="mx-auto max-w-4xl px-4 text-center">
            <Reveal className="space-y-5">
              <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
                Pronto para receber pedidos organizados no WhatsApp?
              </h2>
              <p className="mx-auto max-w-xl text-sm leading-relaxed text-zinc-300 sm:text-base">
                Monte sua vitrine digital gratuitamente em poucos minutos e pague apenas R$ 24,90 por 90 dias quando decidir publicar.
              </p>
              <div className="flex flex-col justify-center gap-3 pt-2 sm:flex-row">
                <Link
                  to="/criar"
                  className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-2xl bg-rose-600 px-6 py-4 text-sm font-bold text-white shadow-lg shadow-rose-600/25 transition hover:-translate-y-0.5 hover:bg-rose-500"
                >
                  Criar minha vitrine grátis
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <button
                  type="button"
                  onClick={() => setDemoOpen(true)}
                  className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-zinc-700 bg-zinc-800 px-6 py-4 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-zinc-700"
                >
                  <Eye className="h-4 w-4 text-rose-400" />
                  Ver exemplo
                </button>
              </div>
            </Reveal>
          </div>
        </section>
      </main>

      {/* J. Rodapé */}
      <Footer />

      {demoOpen && <DemoStoreModal onClose={() => setDemoOpen(false)} />}
    </div>
  );
}
