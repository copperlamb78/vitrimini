import nodemailer from 'nodemailer';

export interface SendPasswordResetEmailInput {
  to: string;
  name: string;
  resetUrl: string;
}

function isSmtpConfigured(): boolean {
  return Boolean(
    process.env.SMTP_HOST?.trim() &&
      process.env.SMTP_USER?.trim() &&
      process.env.SMTP_PASS?.trim()
  );
}

export async function sendPasswordResetEmail({
  to,
  name,
  resetUrl,
}: SendPasswordResetEmailInput): Promise<void> {
  const firstName = name.split(' ')[0] || 'Lojista';

  if (!isSmtpConfigured()) {
    console.log(
      `[Email Dev Fallback] Link de redefinição de senha para ${to}: ${resetUrl}`
    );
    return;
  }

  const host = process.env.SMTP_HOST!.trim();
  const port = Number(process.env.SMTP_PORT) || 587;
  const secure = port === 465;

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user: process.env.SMTP_USER!.trim(),
      pass: process.env.SMTP_PASS!.trim(),
    },
  });

  const from =
    process.env.SMTP_FROM?.trim() ||
    `"VitriMini" <${process.env.SMTP_USER!.trim()}>`;

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #fafafa; padding: 32px 16px; color: #18181b;">
      <div style="max-width: 480px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e4e4e7; border-radius: 16px; padding: 32px 24px;">
        <p style="margin: 0 0 8px 0; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #e11d48;">
          VitriMini
        </p>
        <h1 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 800; color: #18181b;">
          Redefinição de senha
        </h1>
        <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: #52525b;">
          Olá, <strong>${firstName}</strong>. Recebemos uma solicitação para criar uma nova senha para a sua conta no VitriMini.
        </p>
        <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.6; color: #52525b;">
          Clique no botão abaixo para escolher sua nova senha (este link é válido por <strong>30 minutos</strong>):
        </p>
        <div style="text-align: center; margin: 28px 0;">
          <a href="${resetUrl}" style="display: inline-block; background-color: #e11d48; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 700; padding: 14px 28px; border-radius: 12px;">
            Criar nova senha
          </a>
        </div>
        <p style="margin: 24px 0 0 0; font-size: 12px; line-height: 1.5; color: #71717a;">
          Se você não solicitou a alteração de senha, pode ignorar este e-mail com segurança. Sua senha atual continuará funcionando normalmente.
        </p>
        <hr style="border: none; border-top: 1px solid #f4f4f5; margin: 24px 0 16px 0;" />
        <p style="margin: 0; font-size: 11px; color: #a1a1aa; word-break: break-all;">
          Caso o botão não funcione, copie e cole este endereço no navegador:<br />
          <a href="${resetUrl}" style="color: #e11d48;">${resetUrl}</a>
        </p>
      </div>
    </div>
  `;

  await transporter.sendMail({
    from,
    to,
    subject: 'Redefinição de senha — VitriMini',
    text: `Olá ${firstName}, acesse o link a seguir para redefinir sua senha no VitriMini (válido por 30 minutos): ${resetUrl}`,
    html,
  });
}
