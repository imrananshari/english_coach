import { z } from 'zod';

import { uploadProfileImage } from '@/lib/profile-image';

export const runtime = 'nodejs';

const uploadSchema = z.object({
  dataUrl: z
    .string()
    .max(4_000_000, 'Profile image is too large.')
    .regex(
      /^data:image\/(jpeg|jpg|png|webp);base64,/,
      'Unsupported image type.',
    ),
});

export async function POST(request: Request) {
  try {
    const input = uploadSchema.parse(await request.json());
    const imageUrl = await uploadProfileImage(input.dataUrl);
    return Response.json({ imageUrl });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json(
        { message: error.issues[0]?.message ?? 'Invalid image.' },
        { status: 400 },
      );
    }
    return Response.json(
      { message: error instanceof Error ? error.message : 'Upload failed.' },
      { status: 503 },
    );
  }
}
