import { z } from 'zod';

const optionalNonEmpty = z
  .string()
  .trim()
  .min(1)
  .optional()
  .or(z.literal('').transform(() => undefined));
const booleanFromString = z
  .enum(['true', 'false'])
  .default('true')
  .transform((value) => value === 'true');

const serverEnvSchema = z.object({
  DATABASE_URL: optionalNonEmpty,
  BETTER_AUTH_SECRET: optionalNonEmpty,
  BETTER_AUTH_URL: z.string().url().default('http://localhost:3000'),
  BETTER_AUTH_TRUSTED_ORIGINS: z.string().optional().default(''),
  SMTP_HOST: z.string().default('smtp.gmail.com'),
  SMTP_PORT: z.coerce.number().int().positive().default(465),
  SMTP_SECURE: booleanFromString,
  SMTP_USER: optionalNonEmpty,
  SMTP_APP_PASSWORD: optionalNonEmpty,
  SMTP_FROM_EMAIL: optionalNonEmpty,
  SMTP_FROM_NAME: z.string().default('English Coach'),
  IMAGEKIT_PUBLIC_KEY: optionalNonEmpty,
  IMAGEKIT_PRIVATE_KEY: optionalNonEmpty,
  IMAGEKIT_URL_ENDPOINT: optionalNonEmpty,
  GROQ_API_KEY: optionalNonEmpty,
  GROQ_TEXT_MODEL: z.string().default('openai/gpt-oss-20b'),
  ABLY_API_KEY: optionalNonEmpty,
});

export const serverEnv = serverEnvSchema.parse({
  DATABASE_URL: process.env.DATABASE_URL,
  BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
  BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
  BETTER_AUTH_TRUSTED_ORIGINS: process.env.BETTER_AUTH_TRUSTED_ORIGINS,
  SMTP_HOST: process.env.SMTP_HOST,
  SMTP_PORT: process.env.SMTP_PORT,
  SMTP_SECURE: process.env.SMTP_SECURE,
  SMTP_USER: process.env.SMTP_USER,
  SMTP_APP_PASSWORD: process.env.SMTP_APP_PASSWORD,
  SMTP_FROM_EMAIL: process.env.SMTP_FROM_EMAIL,
  SMTP_FROM_NAME: process.env.SMTP_FROM_NAME,
  IMAGEKIT_PUBLIC_KEY: process.env.IMAGEKIT_PUBLIC_KEY,
  IMAGEKIT_PRIVATE_KEY: process.env.IMAGEKIT_PRIVATE_KEY,
  IMAGEKIT_URL_ENDPOINT: process.env.IMAGEKIT_URL_ENDPOINT,
  GROQ_API_KEY: process.env.GROQ_API_KEY,
  GROQ_TEXT_MODEL: process.env.GROQ_TEXT_MODEL,
  ABLY_API_KEY: process.env.ABLY_API_KEY,
});

function configuredOrigins(): string[] {
  return serverEnv.BETTER_AUTH_TRUSTED_ORIGINS.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function isPrivateDevelopmentHost(hostname: string): boolean {
  if (hostname === 'localhost' || hostname === '127.0.0.1') return true;
  const parts = hostname.split('.').map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part)))
    return false;
  const first = parts[0] ?? -1;
  const second = parts[1] ?? -1;
  if (first === 10) return true;
  if (first === 192 && second === 168) return true;
  return first === 172 && second >= 16 && second <= 31;
}

export function isAllowedCorsOrigin(origin: string): boolean {
  if (configuredOrigins().includes(origin)) return true;
  try {
    const url = new URL(origin);
    return (
      process.env.NODE_ENV !== 'production' &&
      url.protocol === 'http:' &&
      (url.port === '8080' || url.port === '8081') &&
      isPrivateDevelopmentHost(url.hostname)
    );
  } catch {
    return false;
  }
}

export function getTrustedOrigins(request?: Request): string[] {
  const requestOrigin = request?.headers.get('origin');
  return [
    ...new Set([
      'englishcoach://',
      'http://localhost:8080',
      'http://localhost:8081',
      'http://localhost:3000',
      ...(process.env.NODE_ENV === 'production' ? [] : ['exp://*']),
      ...configuredOrigins(),
      ...(requestOrigin && isAllowedCorsOrigin(requestOrigin)
        ? [requestOrigin]
        : []),
    ]),
  ];
}
