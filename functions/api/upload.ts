// functions/api/upload.ts

interface Env {
  IMAGES: R2Bucket;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const contentType = context.request.headers.get('content-type') || '';
    let imageBuffer: ArrayBuffer;
    let mimeType = 'image/jpeg';

    if (contentType.includes('application/json')) {
      const { base64Data, mime } = await context.request.json() as any;
      if (!base64Data) {
        return new Response(JSON.stringify({ error: 'No image data provided' }), { status: 400 });
      }
      mimeType = mime || 'image/jpeg';
      const binaryStr = atob(base64Data);
      const len = binaryStr.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
      }
      imageBuffer = bytes.buffer;
    } else {
      // Direct binary or form-data
      imageBuffer = await context.request.arrayBuffer();
      mimeType = contentType || 'image/jpeg';
    }

    const key = `card-${Date.now()}-${Math.random().toString(36).substring(2, 8)}.jpg`;

    await context.env.IMAGES.put(key, imageBuffer, {
      httpMetadata: {
        contentType: mimeType,
      },
    });

    const imageUrl = `/api/images/${key}`;

    return new Response(JSON.stringify({ success: true, key, url: imageUrl }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
