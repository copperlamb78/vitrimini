import nodemailer from 'nodemailer';
import { prisma } from '../lib/prisma.js';

export interface SendWelcomeEmailInput {
  to: string;
  name: string;
}

export interface SendPasswordResetEmailInput {
  to: string;
  name: string;
  resetUrl: string;
}

export interface SendPasswordChangedEmailInput {
  to: string;
  name: string;
  changedAt?: Date;
}

export interface SendCatalogPublishedEmailInput {
  to: string;
  name: string;
  storeName: string;
  slug: string;
  editToken: string;
  expiresAt: Date;
}

export interface SendCatalogRenewedEmailInput {
  to: string;
  name: string;
  storeName: string;
  slug: string;
  editToken: string;
  expiresAt: Date;
}

export interface SendCatalogExpiringSoonEmailInput {
  to: string;
  name: string;
  storeName: string;
  slug: string;
  expiresAt: Date;
}

export interface SendCatalogExpiredEmailInput {
  to: string;
  name: string;
  storeName: string;
  slug: string;
  expiresAt: Date;
}

interface EmailLayoutOptions {
  title: string;
  bodyHtml: string;
  ctaLabel: string;
  ctaUrl: string;
  showFallbackUrl?: boolean;
  afterCtaHtml?: string;
  securityNoteHtml?: string;
}

const DEFAULT_FROM = 'VitriMini <suporte@vitrimini.com.br>';
const SUPPORT_EMAIL = 'suporte@vitrimini.com.br';
const OFFICIAL_SITE_URL = 'https://vitrimini.com.br';
const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';

function isSmtpConfigured(): boolean {
  return Boolean(
    process.env.SMTP_HOST?.trim() &&
      process.env.SMTP_USER?.trim() &&
      process.env.SMTP_PASS?.trim()
  );
}

function isEmailConfigured(): boolean {
  return Boolean(process.env.BREVO_API_KEY?.trim() || isSmtpConfigured());
}

function getTransporter() {
  const host = process.env.SMTP_HOST!.trim();
  const port = Number(process.env.SMTP_PORT) || 587;
  const secure = port === 465;

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user: process.env.SMTP_USER!.trim(),
      pass: process.env.SMTP_PASS!.trim(),
    },
  });
}

function getFromAddress(): string {
  return process.env.SMTP_FROM?.trim() || DEFAULT_FROM;
}

function parseSender(rawFrom: string): { name: string; email: string } {
  const match = rawFrom.match(/^(?:"?([^"]*)"?\s*)?<([^>]+)>$/);
  if (match) {
    return {
      name: (match[1] || 'VitriMini').trim(),
      email: match[2].trim(),
    };
  }
  return {
    name: 'VitriMini',
    email: rawFrom.trim() || SUPPORT_EMAIL,
  };
}

async function recordEmailLog(params: {
  type: string;
  recipient: string;
  status: 'SENT' | 'FAILED';
  errorMessage?: string;
}): Promise<void> {
  try {
    await prisma.emailLog.create({
      data: {
        type: params.type,
        recipient: params.recipient,
        status: params.status,
        errorMessage: params.errorMessage
          ? params.errorMessage.slice(0, 500)
          : null,
      },
    });
  } catch (logErr) {
    console.error('[EmailLog Error]:', logErr);
  }
}

async function sendEmail(params: {
  type: string;
  to: string;
  toName?: string;
  subject: string;
  text: string;
  html: string;
}): Promise<void> {
  const brevoApiKey = process.env.BREVO_API_KEY?.trim();

  try {
    if (brevoApiKey) {
      const sender = parseSender(getFromAddress());
      const response = await fetch(BREVO_API_URL, {
        method: 'POST',
        headers: {
          'api-key': brevoApiKey,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          sender,
          to: [
            {
              email: params.to,
              ...(params.toName?.trim() ? { name: params.toName.trim() } : {}),
            },
          ],
          subject: params.subject,
          htmlContent: params.html,
          textContent: params.text,
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        console.error(
          `[Brevo API Error]: HTTP ${response.status} - ${errorBody}`
        );
        const errMsg = `HTTP ${response.status}: ${errorBody}`;
        await recordEmailLog({
          type: params.type,
          recipient: params.to,
          status: 'FAILED',
          errorMessage: errMsg,
        });
        throw new Error(
          `Falha ao enviar e-mail via Brevo API (HTTP ${response.status}).`
        );
      }

      await recordEmailLog({
        type: params.type,
        recipient: params.to,
        status: 'SENT',
      });
      return;
    }

    const transporter = getTransporter();
    await transporter.sendMail({
      from: getFromAddress(),
      to: params.to,
      subject: params.subject,
      text: params.text,
      html: params.html,
    });

    await recordEmailLog({
      type: params.type,
      recipient: params.to,
      status: 'SENT',
    });
  } catch (err) {
    if (!brevoApiKey) {
      await recordEmailLog({
        type: params.type,
        recipient: params.to,
        status: 'FAILED',
        errorMessage: err instanceof Error ? err.message : String(err),
      });
    }
    throw err;
  }
}

export function escapeHtml(raw: string): string {
  return raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function getFrontendBaseUrl(): string {
  const configured = process.env.FRONTEND_URL
    ?.split(',')[0]
    ?.trim()
    .replace(/\/+$/, '');
  return configured || OFFICIAL_SITE_URL;
}

function formatDateBR(date: Date): string {
  return date.toLocaleDateString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function formatDateTimeBR(date: Date): string {
  const datePart = formatDateBR(date);
  const timePart = date.toLocaleTimeString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    hour: '2-digit',
    minute: '2-digit',
  });
  return `${datePart} às ${timePart}`;
}

/**
 * Estrutura base compartilhada entre os e-mails transacionais da VitriMini
 * (mesmo layout, tipografia, paleta #e11d48, botão CTA e rodapé com suporte@vitrimini.com.br).
 */
function renderBaseEmailLayout({
  title,
  bodyHtml,
  ctaLabel,
  ctaUrl,
  showFallbackUrl = false,
  afterCtaHtml,
  securityNoteHtml,
}: EmailLayoutOptions): string {
  const safeTitle = escapeHtml(title);
  const safeCtaLabel = escapeHtml(ctaLabel);
  const safeCtaUrl = escapeHtml(ctaUrl);

  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #fafafa; padding: 32px 16px; color: #18181b;">
      <div style="max-width: 480px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e4e4e7; border-radius: 16px; padding: 32px 24px;">
        <p style="margin: 0 0 8px 0; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #e11d48;">
          VitriMini
        </p>
        <h1 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 800; color: #18181b;">
          ${safeTitle}
        </h1>
        ${bodyHtml}
        <div style="text-align: center; margin: 28px 0;">
          <a href="${safeCtaUrl}" style="display: inline-block; background-color: #e11d48; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 700; padding: 14px 28px; border-radius: 12px;">
            ${safeCtaLabel}
          </a>
        </div>
        ${
          showFallbackUrl
            ? `
        <p style="margin: 0 0 20px 0; font-size: 11px; line-height: 1.5; color: #71717a; word-break: break-all;">
          Caso o botão acima não funcione, copie e cole este link no seu navegador:<br />
          <a href="${safeCtaUrl}" style="color: #e11d48;">${safeCtaUrl}</a>
        </p>`
            : ''
        }
        ${afterCtaHtml || ''}
        ${securityNoteHtml || ''}
        <hr style="border: none; border-top: 1px solid #f4f4f5; margin: 24px 0 16px 0;" />
        <p style="margin: 0; font-size: 12px; line-height: 1.5; color: #71717a;">
          Dúvidas ou suporte: <a href="mailto:${SUPPORT_EMAIL}" style="color: #e11d48; font-weight: 600;">${SUPPORT_EMAIL}</a><br />
          Site oficial: <a href="${OFFICIAL_SITE_URL}" style="color: #e11d48;">${OFFICIAL_SITE_URL}</a>
        </p>
      </div>
    </div>
  `;
}

/**
 * 1. E-mail de Cadastro / Boas-vindas
 */
export async function sendWelcomeEmail({
  to,
  name,
}: SendWelcomeEmailInput): Promise<void> {
  const firstName = name.split(' ')[0] || 'Lojista';
  const safeFirstName = escapeHtml(firstName);
  const appUrl = getFrontendBaseUrl();

  if (!isEmailConfigured()) {
    console.log(
      `[Email Dev Fallback] E-mail de boas-vindas para ${to} (${firstName})`
    );
    return;
  }

  const bodyHtml = `
    <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: #52525b;">
      Olá, <strong>${safeFirstName}</strong>! Agradecemos pelo seu cadastro na <strong>VitriMini</strong>. Sua conta já está ativa e pronta para uso.
    </p>
    <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.6; color: #52525b;">
      Você já pode personalizar sua vitrine digital com fotos, datas de entrega, cálculo automático de sinal no Pix e produtos ilimitados.
    </p>
  `;

  const html = renderBaseEmailLayout({
    title: 'Bem-vindo à VitriMini — Sua vitrine digital está pronta',
    bodyHtml,
    ctaLabel: 'Acessar minha vitrine',
    ctaUrl: appUrl,
  });

  const text = [
    `Olá, ${firstName}!`,
    '',
    'Seja muito bem-vindo(a) à VitriMini! Agradecemos pelo seu cadastro.',
    'Sua vitrine digital de encomendas já pode ser personalizada com a sua logo, paleta de cores, datas de retirada e produtos ilimitados.',
    '',
    `Acesse sua conta em: ${appUrl}`,
    '',
    `Precisa de ajuda? Fale com nosso suporte em: ${SUPPORT_EMAIL}`,
    '',
    'Equipe VitriMini',
  ].join('\n');

  await sendEmail({
    type: 'WELCOME',
    to,
    toName: name,
    subject: 'Bem-vindo à VitriMini — Sua vitrine digital está pronta',
    text,
    html,
  });
}

/**
 * 2. E-mail de Recuperação de Senha ("Esqueci minha senha")
 */
export async function sendPasswordResetEmail({
  to,
  name,
  resetUrl,
}: SendPasswordResetEmailInput): Promise<void> {
  const firstName = name.split(' ')[0] || 'Lojista';
  const safeFirstName = escapeHtml(firstName);

  if (!isEmailConfigured()) {
    console.log(
      `[Email Dev Fallback] Link de redefinição de senha para ${to}: ${resetUrl}`
    );
    return;
  }

  const bodyHtml = `
    <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: #52525b;">
      Olá, <strong>${safeFirstName}</strong>. Recebemos uma solicitação para redefinir a senha da sua conta na <strong>VitriMini</strong>.
    </p>
    <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.6; color: #52525b;">
      Clique no botão abaixo para criar sua nova senha. Por segurança, este link expira em <strong>30 minutos</strong>:
    </p>
  `;

  const securityNoteHtml = `
    <p style="margin: 0; font-size: 12px; line-height: 1.5; color: #71717a;">
      Se você não solicitou a redefinição de senha, pode ignorar este e-mail com tranquilidade. Nenhuma alteração será feita e sua senha atual continuará funcionando normalmente.
    </p>
  `;

  const html = renderBaseEmailLayout({
    title: 'Redefinição de senha — VitriMini',
    bodyHtml,
    ctaLabel: 'Redefinir minha senha',
    ctaUrl: resetUrl,
    showFallbackUrl: true,
    securityNoteHtml,
  });

  const text = [
    `Olá, ${firstName}!`,
    '',
    'Recebemos uma solicitação para redefinir a senha da sua conta na VitriMini.',
    'Acesse o link abaixo para criar uma nova senha (válido por 30 minutos):',
    '',
    resetUrl,
    '',
    'Se você não solicitou esta alteração, ignore este e-mail. Sua senha atual continuará funcionando normalmente.',
    '',
    `Dúvidas ou suporte: ${SUPPORT_EMAIL}`,
    `Site oficial: ${OFFICIAL_SITE_URL}`,
  ].join('\n');

  await sendEmail({
    type: 'PASSWORD_RESET',
    to,
    toName: name,
    subject: 'Redefinição de senha — VitriMini',
    text,
    html,
  });
}

/**
 * 3. E-mail de Confirmação de Senha Alterada
 */
export async function sendPasswordChangedEmail({
  to,
  name,
  changedAt = new Date(),
}: SendPasswordChangedEmailInput): Promise<void> {
  const firstName = name.split(' ')[0] || 'Lojista';
  const safeFirstName = escapeHtml(firstName);
  const formattedDateTime = formatDateTimeBR(changedAt);
  const safeFormattedDateTime = escapeHtml(formattedDateTime);
  const loginUrl = `${getFrontendBaseUrl()}/entrar`;

  if (!isEmailConfigured()) {
    console.log(
      `[Email Dev Fallback] Confirmação de senha alterada para ${to} em ${formattedDateTime}`
    );
    return;
  }

  const bodyHtml = `
    <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: #52525b;">
      Olá, <strong>${safeFirstName}</strong>. Confirmamos que a senha da sua conta na <strong>VitriMini</strong> foi alterada com sucesso em <strong>${safeFormattedDateTime}</strong>.
    </p>
    <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.6; color: #52525b;">
      Se foi você quem realizou a alteração, nenhuma outra ação é necessária e você já pode acessar suas vitrines normalmente.
    </p>
  `;

  const securityNoteHtml = `
    <div style="background-color: #fff1f2; border: 1px solid #fecdd3; border-radius: 12px; padding: 14px 16px; margin-top: 8px;">
      <p style="margin: 0; font-size: 12px; line-height: 1.5; color: #9f1239;">
        <strong>Alerta de segurança:</strong> Caso você não reconheça esta alteração de senha, entre em contato imediatamente com nossa equipe pelo e-mail <a href="mailto:${SUPPORT_EMAIL}" style="color: #e11d48; font-weight: 700;">${SUPPORT_EMAIL}</a>.
      </p>
    </div>
  `;

  const html = renderBaseEmailLayout({
    title: 'Sua senha na VitriMini foi alterada',
    bodyHtml,
    ctaLabel: 'Acessar minha conta',
    ctaUrl: loginUrl,
    securityNoteHtml,
  });

  const text = [
    `Olá, ${firstName}!`,
    '',
    `Confirmamos que a senha da sua conta na VitriMini foi alterada com sucesso em ${formattedDateTime}.`,
    '',
    `Acesse sua conta em: ${loginUrl}`,
    '',
    `ALERTA DE SEGURANÇA: Caso você não reconheça esta alteração, entre em contato imediatamente com ${SUPPORT_EMAIL}.`,
  ].join('\n');

  await sendEmail({
    type: 'PASSWORD_CHANGED',
    to,
    toName: name,
    subject: 'Sua senha na VitriMini foi alterada',
    text,
    html,
  });
}

/**
 * 4. E-mail de Vitrine Publicada + Links Salvos
 */
export async function sendCatalogPublishedEmail({
  to,
  name,
  storeName,
  slug,
  editToken,
  expiresAt,
}: SendCatalogPublishedEmailInput): Promise<void> {
  const firstName = name.split(' ')[0] || 'Lojista';
  const baseUrl = getFrontendBaseUrl();
  const publicUrl = `${baseUrl}/c/${slug}`;
  const editUrl = `${baseUrl}/editar/${editToken}`;
  const formattedExpires = formatDateBR(expiresAt);

  const safeFirstName = escapeHtml(firstName);
  const safeStoreName = escapeHtml(storeName);
  const safePublicUrl = escapeHtml(publicUrl);
  const safeEditUrl = escapeHtml(editUrl);
  const safeFormattedExpires = escapeHtml(formattedExpires);

  if (!isEmailConfigured()) {
    console.log(
      `[Email Dev Fallback] Vitrine publicada (${storeName}) para ${to}: Público=${publicUrl} | Edição=${editUrl}`
    );
    return;
  }

  const bodyHtml = `
    <p style="margin: 0 0 14px 0; font-size: 14px; line-height: 1.6; color: #52525b;">
      Olá, <strong>${safeFirstName}</strong>! O pagamento Pix de <strong>R$ 24,90</strong> foi confirmado e a vitrine <strong>${safeStoreName}</strong> já está no ar por 90 dias (válida até <strong>${safeFormattedExpires}</strong>).
    </p>
    <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: #52525b;">
      Guarde este e-mail: abaixo estão os dois links essenciais da sua vitrine:
    </p>
    <div style="background-color: #f4f4f5; border: 1px solid #e4e4e7; border-radius: 12px; padding: 14px 16px; margin-bottom: 12px;">
      <p style="margin: 0 0 4px 0; font-size: 11px; font-weight: 700; text-transform: uppercase; color: #059669;">
        1. Link Público da Vitrine (Divulgue no Instagram e WhatsApp)
      </p>
      <a href="${safePublicUrl}" style="font-size: 13px; font-weight: 700; color: #18181b; word-break: break-all;">
        ${safePublicUrl}
      </a>
    </div>
    <div style="background-color: #fffbeb; border: 1px solid #fde68a; border-radius: 12px; padding: 14px 16px;">
      <p style="margin: 0 0 4px 0; font-size: 11px; font-weight: 700; text-transform: uppercase; color: #b45309;">
        2. Link Exclusivo de Edição (Guarde com segurança!)
      </p>
      <p style="margin: 0 0 6px 0; font-size: 12px; line-height: 1.4; color: #78350f;">
        Use este link para editar produtos, alterar preços, trocar fotos e pausar itens esgotados:
      </p>
      <a href="${safeEditUrl}" style="font-size: 12px; font-family: monospace; font-weight: 700; color: #b45309; word-break: break-all;">
        ${safeEditUrl}
      </a>
    </div>
  `;

  const afterCtaHtml = `
    <div style="text-align: center; margin-bottom: 12px;">
      <a href="${safeEditUrl}" style="display: inline-block; background-color: #f4f4f5; color: #18181b; border: 1px solid #d4d4d8; text-decoration: none; font-size: 13px; font-weight: 700; padding: 10px 22px; border-radius: 10px;">
        Abrir Painel de Edição
      </a>
    </div>
  `;

  const html = renderBaseEmailLayout({
    title: 'Sua vitrine está no ar! Guarde seus links da VitriMini',
    bodyHtml,
    ctaLabel: 'Ver Minha Vitrine Pública',
    ctaUrl: publicUrl,
    afterCtaHtml,
  });

  const text = [
    `Olá, ${firstName}!`,
    '',
    `O pagamento Pix de R$ 24,90 foi confirmado e a vitrine "${storeName}" está ativa por 90 dias (válida até ${formattedExpires}).`,
    '',
    '1. LINK PÚBLICO DA VITRINE (envie aos seus clientes):',
    publicUrl,
    '',
    '2. LINK EXCLUSIVO DE EDIÇÃO (guarde com segurança para gerenciar produtos, preços e fotos):',
    editUrl,
    '',
    `Dúvidas ou suporte: ${SUPPORT_EMAIL}`,
  ].join('\n');

  await sendEmail({
    type: 'CATALOG_PUBLISHED',
    to,
    toName: name,
    subject: 'Sua vitrine está no ar! Guarde seus links da VitriMini',
    text,
    html,
  });
}

/**
 * 5. E-mail de Vitrine Renovada (+90 dias)
 */
export async function sendCatalogRenewedEmail({
  to,
  name,
  storeName,
  slug,
  editToken,
  expiresAt,
}: SendCatalogRenewedEmailInput): Promise<void> {
  const firstName = name.split(' ')[0] || 'Lojista';
  const baseUrl = getFrontendBaseUrl();
  const publicUrl = `${baseUrl}/c/${slug}`;
  const editUrl = `${baseUrl}/editar/${editToken}`;
  const formattedExpires = formatDateBR(expiresAt);

  const safeFirstName = escapeHtml(firstName);
  const safeStoreName = escapeHtml(storeName);
  const safePublicUrl = escapeHtml(publicUrl);
  const safeEditUrl = escapeHtml(editUrl);
  const safeFormattedExpires = escapeHtml(formattedExpires);

  if (!isEmailConfigured()) {
    console.log(
      `[Email Dev Fallback] Vitrine renovada (${storeName}) para ${to} até ${formattedExpires}`
    );
    return;
  }

  const bodyHtml = `
    <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: #52525b;">
      Olá, <strong>${safeFirstName}</strong>! O pagamento Pix de renovação (<strong>R$ 24,90</strong>) foi aprovado e a vitrine <strong>${safeStoreName}</strong> ganhou mais 90 dias no ar.
    </p>
    <div style="background-color: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 12px; padding: 14px 16px; margin-bottom: 16px;">
      <p style="margin: 0; font-size: 13px; color: #065f46;">
        Nova data de validade: <strong>${safeFormattedExpires}</strong>
      </p>
    </div>
    <p style="margin: 0; font-size: 13px; line-height: 1.5; color: #52525b;">
      Link público: <a href="${safePublicUrl}" style="color: #e11d48; font-weight: 600;">${safePublicUrl}</a><br />
      Link de edição: <a href="${safeEditUrl}" style="color: #e11d48; font-weight: 600;">${safeEditUrl}</a>
    </p>
  `;

  const afterCtaHtml = `
    <div style="text-align: center; margin-bottom: 12px;">
      <a href="${safeEditUrl}" style="display: inline-block; background-color: #f4f4f5; color: #18181b; border: 1px solid #d4d4d8; text-decoration: none; font-size: 13px; font-weight: 700; padding: 10px 22px; border-radius: 10px;">
        Editar Produtos da Vitrine
      </a>
    </div>
  `;

  const html = renderBaseEmailLayout({
    title: 'Renovação confirmada! Sua vitrine ganhou +90 dias',
    bodyHtml,
    ctaLabel: 'Acessar Minha Vitrine',
    ctaUrl: publicUrl,
    afterCtaHtml,
  });

  const text = [
    `Olá, ${firstName}!`,
    '',
    `A renovação de R$ 24,90 da vitrine "${storeName}" foi confirmada!`,
    `Nova data de validade: ${formattedExpires}`,
    '',
    `Link público da vitrine: ${publicUrl}`,
    `Link de edição: ${editUrl}`,
    '',
    `Dúvidas ou suporte: ${SUPPORT_EMAIL}`,
  ].join('\n');

  await sendEmail({
    type: 'CATALOG_RENEWED',
    to,
    toName: name,
    subject: 'Renovação confirmada! Sua vitrine ganhou +90 dias',
    text,
    html,
  });
}

/**
 * 6. E-mail de Alerta de Vencimento Próximo (Faltam 7 dias)
 */
export async function sendCatalogExpiringSoonEmail({
  to,
  name,
  storeName,
  slug,
  expiresAt,
}: SendCatalogExpiringSoonEmailInput): Promise<void> {
  const firstName = name.split(' ')[0] || 'Lojista';
  const baseUrl = getFrontendBaseUrl();
  const dashboardUrl = `${baseUrl}/minhas-vitrines`;
  const formattedExpires = formatDateBR(expiresAt);

  const safeFirstName = escapeHtml(firstName);
  const safeStoreName = escapeHtml(storeName);
  const safeSlug = escapeHtml(slug);
  const safeFormattedExpires = escapeHtml(formattedExpires);

  if (!isEmailConfigured()) {
    console.log(
      `[Email Dev Fallback] Alerta de vencimento em 7 dias (${storeName}) para ${to}`
    );
    return;
  }

  const bodyHtml = `
    <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: #52525b;">
      Olá, <strong>${safeFirstName}</strong>. O ciclo de 90 dias da sua vitrine <strong>${safeStoreName}</strong> (<code>/c/${safeSlug}</code>) vence em <strong>${safeFormattedExpires}</strong>.
    </p>
    <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.6; color: #52525b;">
      Após essa data, a vitrine pausa o recebimento de novas encomendas até ser renovada. Para continuar recebendo pedidos sem interrupção, renove por mais 90 dias no seu painel:
    </p>
  `;

  const html = renderBaseEmailLayout({
    title: 'Sua vitrine na VitriMini vence em 7 dias',
    bodyHtml,
    ctaLabel: 'Renovar Minha Vitrine (+90 dias)',
    ctaUrl: dashboardUrl,
  });

  const text = [
    `Olá, ${firstName}!`,
    '',
    `O ciclo de 90 dias da sua vitrine "${storeName}" (/c/${slug}) vence em ${formattedExpires}.`,
    'Após essa data, a vitrine pausa o recebimento de pedidos até ser renovada.',
    '',
    `Para renovar por mais 90 dias sem interromper suas vendas, acesse: ${dashboardUrl}`,
    '',
    `Dúvidas ou suporte: ${SUPPORT_EMAIL}`,
  ].join('\n');

  await sendEmail({
    type: 'CATALOG_EXPIRING_SOON',
    to,
    toName: name,
    subject: 'Sua vitrine na VitriMini vence em 7 dias',
    text,
    html,
  });
}

/**
 * 7. E-mail de Vitrine Expirada — Início da Carência de 30 dias
 */
export async function sendCatalogExpiredEmail({
  to,
  name,
  storeName,
  slug,
  expiresAt,
}: SendCatalogExpiredEmailInput): Promise<void> {
  const firstName = name.split(' ')[0] || 'Lojista';
  const baseUrl = getFrontendBaseUrl();
  const dashboardUrl = `${baseUrl}/minhas-vitrines`;
  const formattedExpires = formatDateBR(expiresAt);

  const safeFirstName = escapeHtml(firstName);
  const safeStoreName = escapeHtml(storeName);
  const safeSlug = escapeHtml(slug);
  const safeFormattedExpires = escapeHtml(formattedExpires);

  if (!isEmailConfigured()) {
    console.log(
      `[Email Dev Fallback] Aviso de vitrine expirada (${storeName}) para ${to}`
    );
    return;
  }

  const bodyHtml = `
    <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: #52525b;">
      Olá, <strong>${safeFirstName}</strong>. O prazo de 90 dias da sua vitrine <strong>${safeStoreName}</strong> (<code>/c/${safeSlug}</code>) encerrou em <strong>${safeFormattedExpires}</strong> e ela foi pausada temporariamente.
    </p>
    <div style="background-color: #fffbeb; border: 1px solid #fde68a; border-radius: 12px; padding: 14px 16px; margin-bottom: 20px;">
      <p style="margin: 0; font-size: 13px; line-height: 1.5; color: #78350f;">
        <strong>Fique tranquilo(a):</strong> Todas as suas fotos, produtos, preços e configurações continuam salvos por <strong>30 dias</strong> e voltam ao ar imediatamente assim que você renovar.
      </p>
    </div>
  `;

  const html = renderBaseEmailLayout({
    title: 'Sua vitrine foi pausada — Seus produtos estão salvos por 30 dias',
    bodyHtml,
    ctaLabel: 'Reativar Minha Vitrine Agora',
    ctaUrl: dashboardUrl,
  });

  const text = [
    `Olá, ${firstName}!`,
    '',
    `O prazo de 90 dias da sua vitrine "${storeName}" (/c/${slug}) encerrou em ${formattedExpires} e ela saiu do ar temporariamente.`,
    'Fique tranquilo(a): todas as suas fotos, produtos e configurações continuam guardados por 30 dias e voltam ao ar imediatamente após a renovação.',
    '',
    `Reative sua vitrine em: ${dashboardUrl}`,
    '',
    `Dúvidas ou suporte: ${SUPPORT_EMAIL}`,
  ].join('\n');

  await sendEmail({
    type: 'CATALOG_EXPIRED',
    to,
    toName: name,
    subject: 'Sua vitrine foi pausada — Seus produtos estão salvos por 30 dias',
    text,
    html,
  });
}

export interface SendNewOrderEmailInput {
  to: string;
  merchantName: string;
  storeName: string;
  catalogId: string;
  orderNumber: number;
  customerName: string;
  totalCents: number;
  deliveryType: 'PICKUP' | 'DELIVERY';
  items: Array<{ productName: string; quantity: number; unitPriceCents: number }>;
}

/**
 * 8. E-mail de Novo Pedido Recebido (para o lojista)
 */
export async function sendNewOrderEmail({
  to,
  merchantName,
  storeName,
  catalogId,
  orderNumber,
  customerName,
  totalCents,
  deliveryType,
  items,
}: SendNewOrderEmailInput): Promise<void> {
  const firstName = merchantName.split(' ')[0] || 'Lojista';
  const baseUrl = getFrontendBaseUrl();
  const panelUrl = `${baseUrl}/painel/${catalogId}`;
  const formattedTotal = (totalCents / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
  const deliveryLabel = deliveryType === 'DELIVERY' ? 'Entrega' : 'Retirada';

  const safeFirstName = escapeHtml(firstName);
  const safeStoreName = escapeHtml(storeName);
  const safeCustomerName = escapeHtml(customerName);
  const safeOrderNumber = escapeHtml(String(orderNumber));
  const safeDeliveryLabel = escapeHtml(deliveryLabel);
  const safeFormattedTotal = escapeHtml(formattedTotal);

  if (!isEmailConfigured()) {
    console.log(
      `[Email Dev Fallback] Novo pedido #${orderNumber} (${storeName}) para ${to}`
    );
    return;
  }

  const itemsHtml = items
    .map((item) => {
      const safeQty = escapeHtml(String(item.quantity));
      const safeProdName = escapeHtml(item.productName);
      const safeItemPrice = escapeHtml(
        ((item.unitPriceCents * item.quantity) / 100).toLocaleString('pt-BR', {
          style: 'currency',
          currency: 'BRL',
        })
      );
      return `<li style="margin-bottom: 6px; font-size: 13px; color: #3f3f46;"><strong>${safeQty}x</strong> ${safeProdName} — ${safeItemPrice}</li>`;
    })
    .join('');

  const bodyHtml = `
    <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: #52525b;">
      Olá, <strong>${safeFirstName}</strong>! Você recebeu um novo pedido na vitrine <strong>${safeStoreName}</strong>.
    </p>
    <div style="background-color: #fafafa; border: 1px solid #e4e4e7; border-radius: 12px; padding: 14px 16px; margin-bottom: 16px;">
      <p style="margin: 0 0 6px 0; font-size: 13px; color: #18181b;">
        <strong>Pedido #${safeOrderNumber}</strong> • ${safeDeliveryLabel}
      </p>
      <p style="margin: 0 0 10px 0; font-size: 13px; color: #52525b;">
        Cliente: <strong>${safeCustomerName}</strong>
      </p>
      <ul style="margin: 0 0 10px 0; padding-left: 18px;">
        ${itemsHtml}
      </ul>
      <p style="margin: 0; font-size: 14px; font-weight: 800; color: #e11d48;">
        Total: ${safeFormattedTotal}
      </p>
    </div>
  `;

  const html = renderBaseEmailLayout({
    title: `Novo pedido #${orderNumber} recebido!`,
    bodyHtml,
    ctaLabel: 'Gerenciar Pedido no Painel',
    ctaUrl: panelUrl,
  });

  const text = [
    `Olá, ${firstName}!`,
    '',
    `Você recebeu o pedido #${orderNumber} na vitrine "${storeName}".`,
    `Cliente: ${customerName} (${deliveryLabel})`,
    ...items.map((item) => `- ${item.quantity}x ${item.productName}`),
    `Total: ${formattedTotal}`,
    '',
    `Acesse seu painel para atualizar o status: ${panelUrl}`,
  ].join('\n');

  await sendEmail({
    type: 'NEW_ORDER',
    to,
    toName: merchantName,
    subject: `Novo pedido #${orderNumber} na vitrine ${storeName}`,
    text,
    html,
  });
}
