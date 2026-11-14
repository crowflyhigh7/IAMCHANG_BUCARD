// functions/api/cards/[id].ts

interface Env {
  DB: D1Database;
  IMAGES: R2Bucket;
}

export const onRequestPut: PagesFunction<Env> = async (context) => {
  try {
    const id = context.params.id as string;
    const card = await context.request.json() as any;
    const now = Date.now();

    await context.env.DB.prepare(`
      UPDATE cards SET 
        name = ?, position = ?, company = ?, department = ?, 
        email = ?, phone = ?, tel = ?, website = ?, address = ?, 
        memo = ?, tags = ?, avatar_url = ?, theme = ?, is_favorite = ?, updated_at = ?
      WHERE id = ?
    `).bind(
      card.name || '',
      card.position || '',
      card.company || '',
      card.department || '',
      card.email || '',
      card.phone || '',
      card.tel || '',
      card.website || '',
      card.address || '',
      card.memo || '',
      JSON.stringify(card.tags || []),
      card.avatarUrl || '',
      card.theme || 'modern-blue',
      card.isFavorite ? 1 : 0,
      now,
      id
    ).run();

    return new Response(JSON.stringify({ success: true, id }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

export const onRequestDelete: PagesFunction<Env> = async (context) => {
  try {
    const id = context.params.id as string;

    // Optional: Fetch card to delete its R2 image if exists
    try {
      const card = await context.env.DB.prepare(`SELECT avatar_url FROM cards WHERE id = ?`).bind(id).first() as any;
      if (card && card.avatar_url && card.avatar_url.includes('/api/images/')) {
        const imageKey = card.avatar_url.split('/api/images/')[1];
        if (imageKey) {
          await context.env.IMAGES.delete(imageKey);
        }
      }
    } catch (e) {
      console.warn('Failed to delete image from R2:', e);
    }

    await context.env.DB.prepare(`DELETE FROM cards WHERE id = ?`).bind(id).run();

    return new Response(JSON.stringify({ success: true, id }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
