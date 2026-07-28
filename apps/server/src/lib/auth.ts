import { expo } from '@better-auth/expo';
import { drizzleAdapter } from '@better-auth/drizzle-adapter';
import { db, schema } from '@english-coach/database';
import { betterAuth } from 'better-auth';
import { emailOTP } from 'better-auth/plugins';

import { sendOtpEmail } from './email';
import { getTrustedOrigins, serverEnv } from './env';

export const auth = betterAuth({
  appName: 'English Coach',
  baseURL: serverEnv.BETTER_AUTH_URL,
  secret: serverEnv.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, { provider: 'pg', schema }),
  user: {
    additionalFields: {
      age: { type: 'number', required: true, input: true, returned: true },
    },
  },
  emailAndPassword: {
    enabled: true,
    autoSignIn: false,
    requireEmailVerification: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    revokeSessionsOnPasswordReset: true,
  },
  trustedOrigins: (request) => getTrustedOrigins(request),
  plugins: [
    emailOTP({
      overrideDefaultEmailVerification: true,
      sendVerificationOnSignUp: true,
      otpLength: 6,
      expiresIn: 600,
      allowedAttempts: 5,
      storeOTP: 'hashed',
      sendVerificationOTP: sendOtpEmail,
    }),
    expo(),
  ],
});
