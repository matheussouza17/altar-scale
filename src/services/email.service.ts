import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_CODE,
  },
});

const FROM = `"EscalaAltar" <${process.env.GMAIL_USER}>`;
const BASE_URL = process.env.FRONTEND_URL ?? "http://localhost:3000";

function layoutEmail(conteudo: string): string {
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:system-ui,-apple-system,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
        <!-- Header -->
        <tr>
          <td style="background:#1d4ed8;padding:28px 32px;">
            <p style="margin:0;font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.3px;">✝ EscalaAltar</p>
            <p style="margin:4px 0 0;font-size:13px;color:#bfdbfe;">Gestão de escalas litúrgicas</p>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:32px;">
            ${conteudo}
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="padding:16px 32px 28px;border-top:1px solid #f1f5f9;">
            <p style="margin:0;font-size:12px;color:#94a3b8;text-align:center;">
              Este email foi enviado automaticamente. Não responda a esta mensagem.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`.trim();
}

export async function enviarEmailBoasVindas(
  email: string,
  nome: string,
  token: string,
): Promise<void> {
  const url = `${BASE_URL}/definir-senha?token=${token}`;

  const conteudo = `
    <p style="margin:0 0 8px;font-size:20px;font-weight:600;color:#111827;">Olá, ${nome}! 👋</p>
    <p style="margin:0 0 24px;font-size:15px;color:#4b5563;line-height:1.6;">
      Você foi cadastrado(a) no <strong>EscalaAltar</strong>. Clique no botão abaixo para definir a sua senha e começar a usar o sistema.
    </p>
    <table cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
      <tr>
        <td style="background:#1d4ed8;border-radius:10px;">
          <a href="${url}" target="_blank"
             style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;">
            Definir minha senha →
          </a>
        </td>
      </tr>
    </table>
    <p style="margin:0 0 4px;font-size:13px;color:#6b7280;">
      O link expira em <strong>48 horas</strong>. Se não solicitou este cadastro, ignore este email.
    </p>
    <p style="margin:12px 0 0;font-size:12px;color:#9ca3af;word-break:break-all;">
      Ou copie: ${url}
    </p>
  `;

  await transporter.sendMail({
    from: FROM,
    to: email,
    subject: "EscalaAltar — Defina sua senha",
    html: layoutEmail(conteudo),
  });
}

export async function enviarEmailResetSenha(
  email: string,
  nome: string,
  token: string,
): Promise<void> {
  const url = `${BASE_URL}/definir-senha?token=${token}`;

  const conteudo = `
    <p style="margin:0 0 8px;font-size:20px;font-weight:600;color:#111827;">Redefinição de senha</p>
    <p style="margin:0 0 24px;font-size:15px;color:#4b5563;line-height:1.6;">
      Olá, <strong>${nome}</strong>. Foi solicitada a redefinição da sua senha no <strong>EscalaAltar</strong>.
      Clique no botão abaixo para criar uma nova senha.
    </p>
    <table cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
      <tr>
        <td style="background:#1d4ed8;border-radius:10px;">
          <a href="${url}" target="_blank"
             style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;">
            Redefinir minha senha →
          </a>
        </td>
      </tr>
    </table>
    <p style="margin:0 0 4px;font-size:13px;color:#6b7280;">
      O link expira em <strong>48 horas</strong>. Se não solicitou esta redefinição, ignore este email.
    </p>
    <p style="margin:12px 0 0;font-size:12px;color:#9ca3af;word-break:break-all;">
      Ou copie: ${url}
    </p>
  `;

  await transporter.sendMail({
    from: FROM,
    to: email,
    subject: "EscalaAltar — Redefinição de senha",
    html: layoutEmail(conteudo),
  });
}
