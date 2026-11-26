import { skillsError } from './user-skills.js';

const templates = {
  verify: ['Verify your AI Career Navigator email', '验证 AI Career Navigator 邮箱'],
  email_change: ['Confirm your AI Career Navigator email change', '确认 AI Career Navigator 邮箱变更'],
  password_reset: ['Reset your AI Career Navigator password', '重置 AI Career Navigator 密码'],
};

export function accountMailer() {
  const provider = process.env.ACCOUNT_EMAIL_PROVIDER;
  const from = process.env.ACCOUNT_EMAIL_FROM;
  const key = process.env.RESEND_API_KEY;
  if (provider !== 'resend' || !from || !key) return null;
  return async ({ to, purpose, code, language }) => {
    const chinese = language === 'zh-CN';
    const subject = templates[purpose][Number(chinese)];
    const text = chinese
      ? '验证码：' + code + '。此验证码将在 10 分钟后失效，仅可使用一次。如果你没有发起此请求，请忽略这封邮件。'
      : 'Your code is ' + code + '. It expires in 10 minutes and can be used once. If you did not request it, ignore this email.';
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST', signal: AbortSignal.timeout(8000), redirect: 'error',
      headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to: [to], subject, text }),
    });
    await response.body?.cancel();
    if (!response.ok) throw skillsError(503, 'Account email delivery is unavailable');
  };
}
