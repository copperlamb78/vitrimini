import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Store,
  Sparkles,
  Eye,
  XCircle,
  CheckCircle2,
  Palette,
  QrCode,
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
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { DemoStoreModal } from '../components/DemoStoreModal';
import { Footer } from '../components/Footer';
import { applyPageSeo } from '../utils/seo';
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
      { threshold: 0.12 }
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

const FAQ_ITEMS = [
  {
    question:
      'Tem mensalidade ou cobrança automática depois dos 90 dias?',
    answer:
      'Não. O pagamento de R$ 24,90 é feito uma única vez via Pix e libera sua vitrine por 90 dias corridos. Não pedimos cartão de crédito e nunca fazemos cobranças automáticas.',
  },
  {
    question:
      'Vocês cobram alguma taxa sobre as encomendas que eu vender?',
    answer:
      'Zero comissão. Todo o valor das suas vendas e o sinal pago pelos seus clientes caem diretamente na sua conta usando a sua própria chave Pix.',
  },
  {
    question:
      'Consigo alterar preços ou marcar um produto como esgotado depois de publicar?',
    answer:
      'Sim. Assim que publicar sua vitrine, você recebe um link exclusivo de edição rápida para pausar itens esgotados em 1 toque, mudar preços, atualizar datas de entrega ou adicionar novos produtos quando quiser.',
  },
  {
    question: 'Existe limite de quantos produtos posso cadastrar?',
    answer:
      'Não há limite. Você pode cadastrar quantos doces, bolos, salgados, kits ou produtos personalizados desejar, todos com foto, descrição e preço.',
  },
];

export function LandingPage() {
  const { user, logout } = useAuth();
  const [demoOpen, setDemoOpen] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  useEffect(() => {
    applyPageSeo({
      title: 'VitriMini — Crie sua vitrine digital online e venda pelo WhatsApp',
      description:
        'Crie sua vitrine digital de encomendas em 2 minutos com fotos, datas de entrega e sinal no Pix. Sem mensalidade: pague R$ 24,90 uma vez e use por 90 dias.',
      canonicalPath: '/',
      jsonLd: [
        {
          '@context': 'https://schema.org',
          '@type': 'WebSite',
          name: 'VitriMini',
          url: 'https://vitrimini.com.br/',
          inLanguage: 'pt-BR',
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
            'Criador de vitrines digitais de encomendas com cálculo automático de sinal e pedidos organizados no WhatsApp.',
          offers: {
            '@type': 'Offer',
            price: '24.90',
            priceCurrency: 'BRL',
            availability: 'https://schema.org/InStock',
          },
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
          {/* Esquerda: Marca */}
          <Link to="/" className="flex items-center gap-2.5">
            <img
              src={logoVitriMini}
              alt="VitriMini"
              decoding="async"
              fetchPriority="high"
              className="h-8 w-auto object-contain sm:h-9"
            />
          </Link>

          {/* Centro: Links de navegação (Desktop) */}
          <nav
            aria-label="Navegação principal"
            className="hidden items-center gap-7 text-xs font-semibold text-zinc-600 md:flex"
          >
            <a
              href="#como-funciona"
              className="transition hover:text-rose-600"
            >
              Como funciona
            </a>
            <a
              href="#recursos"
              className="transition hover:text-rose-600"
            >
              Recursos
            </a>
            <a
              href="#valor"
              className="transition hover:text-rose-600"
            >
              Valor
            </a>
            <a
              href="#duvidas"
              className="transition hover:text-rose-600"
            >
              Dúvidas
            </a>
          </nav>

          {/* Direita: Autenticação / Minhas Vitrines / CTA */}
          <div className="flex items-center gap-2">
            {user ? (
              <>
                <span className="hidden text-xs font-semibold text-zinc-600 lg:inline">
                  Olá, <strong className="text-zinc-900">{firstName}</strong>
                </span>
                <Link
                  to="/minhas-vitrines"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-bold text-zinc-800 transition hover:bg-zinc-100"
                >
                  <Store className="h-3.5 w-3.5 text-rose-600" />
                  Minhas Vitrines
                </Link>
                <button
                  type="button"
                  onClick={logout}
                  title="Sair da conta"
                  className="inline-flex items-center gap-1 rounded-xl border border-zinc-200 bg-white px-2.5 py-2 text-xs font-semibold text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-900"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Sair</span>
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/entrar"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-100"
                >
                  <LogIn className="h-3.5 w-3.5 text-zinc-500" />
                  Entrar
                </Link>
                <Link
                  to="/criar"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-3.5 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-rose-700"
                >
                  Criar vitrine
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* B. Hero Section */}
      <section className="border-b border-zinc-200 bg-gradient-to-b from-zinc-50/70 to-white py-14 sm:py-20">
        <div className="mx-auto max-w-6xl px-4">
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12">
            {/* Texto e CTAs */}
            <Reveal className="space-y-6 lg:col-span-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-3.5 py-1.5 text-xs font-bold text-rose-700">
                <Sparkles className="h-3.5 w-3.5 text-rose-600" />
                <span>Sem mensalidade • Pronta em 2 minutos</span>
              </div>

              <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 sm:text-4xl lg:text-[2.65rem] lg:leading-[1.15]">
                Pare de mandar PDF no WhatsApp. Receba encomendas prontas em 1 clique.
              </h1>

              <p className="text-base leading-relaxed text-zinc-600">
                Monte sua vitrine personalizada com fotos, datas de retirada e cálculo automático de sinal no Pix. Pague apenas{' '}
                <strong className="font-bold text-zinc-900">R$ 24,90</strong>{' '}
                uma única vez e use por 90 dias.
              </p>

              <div className="flex flex-col gap-3 pt-1 sm:flex-row">
                <Link
                  to="/criar"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-rose-600 px-6 py-4 text-sm font-bold text-white shadow-lg shadow-rose-600/20 transition hover:-translate-y-0.5 hover:bg-rose-700"
                >
                  Criar vitrine grátis
                  <ArrowRight className="h-4 w-4" />
                </Link>

                <button
                  type="button"
                  onClick={() => setDemoOpen(true)}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-zinc-300 bg-white px-5 py-4 text-sm font-bold text-zinc-800 transition hover:-translate-y-0.5 hover:bg-zinc-50"
                >
                  <Eye className="h-4 w-4 text-rose-600" />
                  Ver exemplo
                </button>
              </div>

              <p className="text-xs text-zinc-500">
                Você monta e testa tudo gratuitamente. Só paga os R$ 24,90 se gostar e quiser publicar.
              </p>
            </Reveal>

            {/* Composição Visual: Mini Vitrine + Mensagem Organizada no WhatsApp */}
            <Reveal delayMs={120} className="lg:col-span-6">
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
            </Reveal>
          </div>
        </div>
      </section>

      {/* C. Seção "Antes x Depois" */}
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4">
          <Reveal className="mx-auto max-w-2xl text-center">
            <span className="text-xs font-extrabold uppercase tracking-wider text-rose-600">
              Menos conversa repetida, mais encomendas fechadas
            </span>
            <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-zinc-900 sm:text-3xl">
              Transforme seu atendimento de encomendas
            </h2>
          </Reveal>

          <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* Como é hoje */}
            <Reveal
              delayMs={50}
              className="rounded-2xl border border-red-200/80 bg-red-50/30 p-6 transition-all duration-300 hover:-translate-y-1"
            >
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-600">
                  <XCircle className="h-5 w-5" />
                </div>
                <h3 className="text-base font-extrabold text-zinc-900">
                  Como é hoje (PDF e fotos soltas)
                </h3>
              </div>

              <ul className="mt-5 space-y-3 text-sm text-zinc-600">
                <li className="flex items-start gap-2.5">
                  <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                  <span>
                    Cliente dando zoom em cardápio PDF pesado que demora para abrir no celular.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                  <span>
                    Dezenas de mensagens perguntando preço, sabores e se ainda tem vaga na agenda.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                  <span>
                    Cliente esquecendo de avisar o dia ou o turno da retirada da encomenda.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                  <span>
                    Você somando pedido e calculando 50% de sinal na calculadora entre uma fornada e outra.
                  </span>
                </li>
              </ul>
            </Reveal>

            {/* Com VitriMini */}
            <Reveal
              delayMs={140}
              className="rounded-2xl border border-emerald-200 bg-emerald-50/30 p-6 transition-all duration-300 hover:-translate-y-1"
            >
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <h3 className="text-base font-extrabold text-zinc-900">
                  Com a sua vitrine VitriMini
                </h3>
              </div>

              <ul className="mt-5 space-y-3 text-sm text-zinc-700">
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  <span>
                    Vitrine leve que abre na hora pelo link da sua bio do Instagram ou WhatsApp.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  <span>
                    O cliente toca nos produtos, escolhe as quantidades e vê o total atualizado sozinho.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  <span>
                    Ele seleciona apenas entre as datas e turnos que você deixou liberados na agenda.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  <span>
                    O valor do sinal via Pix já aparece calculado com a sua chave pronta para copiar.
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
        className="border-y border-zinc-200 bg-zinc-50 py-16 sm:py-20"
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
            {[
              {
                step: '01',
                icon: Palette,
                title: 'Monte do seu jeito',
                description:
                  'Adicione sua foto, escolha a cor da marca, defina as datas de entrega e cadastre produtos ilimitados sem precisar criar conta.',
              },
              {
                step: '02',
                icon: QrCode,
                title: 'Ative com Pix único',
                description:
                  'Pague R$ 24,90 uma única vez. Sua vitrine é liberada na hora e fica no ar por 90 dias.',
              },
              {
                step: '03',
                icon: MessageCircle,
                title: 'Compartilhe e venda',
                description:
                  'Coloque o link na bio do Instagram ou envie no WhatsApp e receba os pedidos prontos.',
              },
            ].map((item, idx) => {
              const Icon = item.icon;
              return (
                <Reveal
                  key={item.step}
                  delayMs={idx * 100}
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

      {/* E. Grid de Recursos (Estilo Bento Grid Clean) */}
      <section id="recursos" className="py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4">
          <Reveal className="mx-auto max-w-2xl text-center">
            <span className="text-xs font-extrabold uppercase tracking-wider text-rose-600">
              Feito para quem vive de encomendas
            </span>
            <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-zinc-900 sm:text-3xl">
              Tudo o que você precisa para organizar sua produção
            </h2>
          </Reveal>

          <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2">
            {[
              {
                icon: Wallet,
                title: 'Sinal automático via Pix',
                description:
                  'Calcula 50% (ou a porcentagem que você escolher) e mostra sua chave Pix para o cliente pagar na hora.',
              },
              {
                icon: CalendarClock,
                title: 'Agenda de datas e turnos',
                description:
                  'Evita encomendas para dias em que sua produção já está lotada. Quando um dia fechar, remova-o em segundos.',
              },
              {
                icon: PackageCheck,
                title: 'Botão "Esgotado" em 1 clique',
                description:
                  'Acabou o estoque de um item? Pause com um toque sem precisar apagar a foto nem perder o cadastro do produto.',
              },
              {
                icon: Sparkles,
                title: 'Sua marca em destaque',
                description:
                  'Coloque sua logo e escolha entre paletas de cores prontas para combinar perfeitamente com o seu negócio.',
              },
            ].map((feature, idx) => {
              const Icon = feature.icon;
              return (
                <Reveal
                  key={feature.title}
                  delayMs={idx * 80}
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

      {/* F. Seção de Preço Único */}
      <section
        id="valor"
        className="border-t border-zinc-200 bg-zinc-50/70 py-16 sm:py-20"
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
              pagamento único • válida por 90 dias
            </p>

            <ul className="mt-6 space-y-3 text-left text-sm text-zinc-700">
              {[
                'Produtos ilimitados com foto, descrição e preço',
                '0% de comissão sobre suas vendas (o Pix do cliente cai direto na sua conta)',
                'Link secreto de edição rápida incluso para atualizar preços e estoque',
                'Sem mensalidade e sem renovação automática',
              ].map((benefit) => (
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
              className="mt-7 flex w-full items-center justify-center gap-2 rounded-2xl bg-rose-600 px-6 py-4 text-sm font-bold text-white shadow-lg shadow-rose-600/20 transition hover:-translate-y-0.5 hover:bg-rose-700"
            >
              Criar vitrine
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Reveal>
        </div>
      </section>

      {/* G. Perguntas Frequentes (FAQ Acordeão) */}
      <section id="duvidas" className="border-t border-zinc-200 py-16 sm:py-20">
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
            {FAQ_ITEMS.map((item, idx) => {
              const isOpen = openFaqIndex === idx;
              return (
                <Reveal
                  key={item.question}
                  delayMs={idx * 60}
                  className="overflow-hidden rounded-2xl border border-zinc-200 bg-white"
                >
                  <button
                    type="button"
                    onClick={() =>
                      setOpenFaqIndex(isOpen ? null : idx)
                    }
                    className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left text-sm font-bold text-zinc-900 transition hover:bg-zinc-50"
                  >
                    <span>{item.question}</span>
                    <ChevronDown
                      className={`h-4 w-4 shrink-0 text-zinc-500 transition-transform duration-200 ${
                        isOpen ? 'rotate-180 text-rose-600' : ''
                      }`}
                    />
                  </button>

                  {isOpen && (
                    <div className="border-t border-zinc-100 px-5 pb-4 pt-3 text-sm leading-relaxed text-zinc-600">
                      {item.answer}
                    </div>
                  )}
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* H. Rodapé */}
      <Footer />

      {demoOpen && <DemoStoreModal onClose={() => setDemoOpen(false)} />}
    </div>
  );
}
