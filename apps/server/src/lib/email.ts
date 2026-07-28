import nodemailer from 'nodemailer';

import { serverEnv } from './env';

type OtpType =
  | 'sign-in'
  | 'email-verification'
  | 'forget-password'
  | 'change-email';

const otpCopy: Record<OtpType, { subject: string; heading: string }> = {
  'email-verification': {
    subject: 'Verify your English Coach account',
    heading: 'Confirm your email address',
  },
  'forget-password': {
    subject: 'Reset your English Coach password',
    heading: 'Reset your password',
  },
  'sign-in': {
    subject: 'Your English Coach sign-in code',
    heading: 'Sign in to English Coach',
  },
  'change-email': {
    subject: 'Confirm your new email address',
    heading: 'Confirm your email change',
  },
};

export async function sendOtpEmail(input: {
  email: string;
  otp: string;
  type: OtpType;
}): Promise<void> {
  if (!serverEnv.SMTP_USER || !serverEnv.SMTP_APP_PASSWORD) {
    throw new Error(
      'Email delivery is not configured. Add SMTP_USER and SMTP_APP_PASSWORD.',
    );
  }

  const copy = otpCopy[input.type];
  const transporter = nodemailer.createTransport({
    host: serverEnv.SMTP_HOST,
    port: serverEnv.SMTP_PORT,
    secure: serverEnv.SMTP_SECURE,
    auth: {
      user: serverEnv.SMTP_USER,
      pass: serverEnv.SMTP_APP_PASSWORD.replace(/\s/g, ''),
    },
  });

  await transporter.sendMail({
    from: {
      name: serverEnv.SMTP_FROM_NAME,
      address: serverEnv.SMTP_FROM_EMAIL ?? serverEnv.SMTP_USER,
    },
    to: input.email,
    subject: copy.subject,
    html: `<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;padding:32px;color:#10233f"><h1 style="font-size:24px">${copy.heading}</h1><p>Use this one-time code in the English Coach app:</p><div style="font-size:36px;font-weight:700;letter-spacing:10px;color:#146ef5;margin:28px 0">${input.otp}</div><p style="color:#60708a">This code expires in 10 minutes. If you did not request it, you can ignore this email.</p></div>`,
    text: `${copy.heading}\n\nYour English Coach code is ${input.otp}. It expires in 10 minutes.`,
  });
}