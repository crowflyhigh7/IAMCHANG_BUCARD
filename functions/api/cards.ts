// functions/api/cards.ts

interface Env {
  DB: D1Database;
  IMAGES: R2Bucket;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    const { results } = await context.env.DB.prepare(
      `SELECT * FROM cards ORDER BY is_favorite DESC, created_at DESC`
    ).all();

    const formatted = results.map((row: any) => ({
      id: row.id,
      name: row.name,
      position: row.position || '',
      company: row.company || '',
      department: row.department || '',
      email: row.email || '',
      phone: row.phone || '',
      tel: row.tel || '',
      website: row.website || '',
      address: row.address || '',
      memo: row.memo || '',
      tags: row.tags ? JSON.parse(row.tags) : [],
      avatarUrl: row.avatar_url || '',
      theme: row.theme || 'modern-blue',
      isFavorite: Boolean(row.is_favorite),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    return new Response(JSON.stringify(formatted), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const card = await context.request.json() as any;
    const id = card.id || 'card-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7);
    const now = Date.now();

    await context.env.DB.prepare(`
      INSERT INTO cards (
        id, name, position, company, department, email, phone, tel, 
        website, address, memo, tags, avatar_url, theme, is_favorite, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id,
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
      card.createdAt || now,
      now
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
