// functions/api/images/[key].ts

interface Env {
  IMAGES: R2Bucket;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    const key = context.params.key as string;
    const object = await context.env.IMAGES.get(key);

    if (!object) {
      return new Response('Image not found', { status: 404 });
    }

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set('etag', object.httpEtag);
    headers.set('Cache-Control', 'public, max-age=31536000, immutable');

    return new Response(object.body, { headers });
  } catch (err: any) {
    return new Response(err.message, { status: 500 });
  }
};
