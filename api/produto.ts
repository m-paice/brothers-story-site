export const config = { runtime: 'edge' };

interface ProductRow {
  name: string;
  description: string | null;
  image: string | null;
  price: number;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function truncate(value: string, max: number): string {
  return value.length > max ? value.slice(0, max - 1) + '…' : value;
}

export default async function handler(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const id = url.searchParams.get('id') ?? '';

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

  const restUrl = `${supabaseUrl}/rest/v1/products?id=eq.${encodeURIComponent(id)}&select=name,description,image,price&limit=1`;
  const indexUrl = `${url.origin}/index.html`;

  const [productRes, indexRes] = await Promise.all([
    fetch(restUrl, {
      headers: {
        apikey: supabaseAnonKey ?? '',
        Authorization: `Bearer ${supabaseAnonKey ?? ''}`,
        Accept: 'application/json',
      },
    }),
    fetch(indexUrl),
  ]);

  const indexHtml = await indexRes.text();

  if (!productRes.ok) {
    return new Response(indexHtml, { headers: { 'content-type': 'text/html; charset=utf-8' } });
  }

  const rows = (await productRes.json()) as ProductRow[];
  const product = rows[0];

  if (!product) {
    return new Response(indexHtml, { headers: { 'content-type': 'text/html; charset=utf-8' } });
  }

  const productUrl = `${url.origin}/produto/${id}`;
  const title = escapeHtml(`${product.name} — Brothers Story`);
  const rawDesc = product.description ?? product.name;
  const desc = escapeHtml(truncate(rawDesc, 160));
  const image = product.image ? escapeHtml(product.image) : '';

  // Replace values in-place — sem duplicatas, sem dependência de ordem de parsers
  const html = indexHtml
    .replace(/<title>[^<]*<\/title>/, `<title>${title}</title>`)
    .replace(/(<meta\s+property="og:title"\s+content=")[^"]*(")/i, `$1${title}$2`)
    .replace(/(<meta\s+property="og:description"\s+content=")[^"]*(")/i, `$1${desc}$2`)
    .replace(/(<meta\s+property="og:image"\s+content=")[^"]*(")/i, `$1${image}$2`)
    .replace(/(<meta\s+property="og:url"\s+content=")[^"]*(")/i, `$1${escapeHtml(productUrl)}$2`)
    .replace(/(<meta\s+property="og:type"\s+content=")[^"]*(")/i, `$1product$2`)
    .replace(/(<meta\s+name="twitter:card"\s+content=")[^"]*(")/i, `$1summary_large_image$2`)
    .replace(/(<meta\s+name="twitter:title"\s+content=")[^"]*(")/i, `$1${title}$2`)
    .replace(/(<meta\s+name="twitter:description"\s+content=")[^"]*(")/i, `$1${desc}$2`)
    .replace(/(<meta\s+name="twitter:image"\s+content=")[^"]*(")/i, `$1${image}$2`);

  return new Response(html, { headers: { 'content-type': 'text/html; charset=utf-8' } });
}
