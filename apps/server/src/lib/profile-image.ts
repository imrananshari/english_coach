import { serverEnv } from './env';

interface ImageKitUploadResponse {
  fileId?: string;
  url?: string;
  error?: { message?: string };
  message?: string;
}

export async function uploadProfileImage(dataUrl: string): Promise<string> {
  if (!serverEnv.IMAGEKIT_PRIVATE_KEY) {
    throw new Error('Profile image storage is not configured.');
  }
  if (serverEnv.IMAGEKIT_PRIVATE_KEY.startsWith('public_')) {
    throw new Error(
      'IMAGEKIT_PRIVATE_KEY contains a public key. Paste the private_ key from ImageKit Developer options.',
    );
  }

  const formData = new FormData();
  formData.append('file', dataUrl);
  formData.append('fileName', `profile-${crypto.randomUUID()}.jpg`);
  formData.append('folder', '/english-coach/profiles');
  formData.append('useUniqueFileName', 'true');
  formData.append('tags', 'profile-picture');

  const authorization = Buffer.from(
    `${serverEnv.IMAGEKIT_PRIVATE_KEY}:`,
  ).toString('base64');
  const response = await fetch(
    'https://upload.imagekit.io/api/v1/files/upload',
    {
      method: 'POST',
      headers: { Authorization: `Basic ${authorization}` },
      body: formData,
    },
  );
  const result = (await response.json()) as ImageKitUploadResponse;
  if (!response.ok || !result.url) {
    throw new Error(
      result.error?.message ?? result.message ?? 'Profile image upload failed.',
    );
  }
  return result.url;
}
