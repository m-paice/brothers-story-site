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

  // Extract product id from path: /api/produto/:id
  const segments = url.pathname.split('/');
  const id = segments[segments.length - 1];

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

  // Fetch product and index.html in parallel
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

  const indexHtml: string = await indexRes.text();

  // If Supabase request failed or product not found, return index.html as-is
  if (!productRes.ok) {
    return new Response(indexHtml, {
      headers: { 'content-type': 'text/html; charset=utf-8' },
    });
  }

  const rows = (await productRes.json()) as ProductRow[];
  const product = rows[0];

  if (!product) {
    return new Response(indexHtml, {
      headers: { 'content-type': 'text/html; charset=utf-8' },
    });
  }

  const productUrl = `${url.origin}/produto/${encodeURIComponent(id)}`;
  const title = escapeHtml(`${product.name} — Brothers Story`);
  const rawDesc = product.description ?? product.name;
  const desc = escapeHtml(truncate(rawDesc, 160));
  const image = product.image ? escapeHtml(product.image) : '';
  const canonicalUrl = escapeHtml(productUrl);

  const ogBlock = `<title>${title}</title>
    <meta property="og:type" content="product" />
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${desc}" />
    <meta property="og:image" content="${image}" />
    <meta property="og:url" content="${canonicalUrl}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${title}" />
    <meta name="twitter:description" content="${desc}" />
    <meta name="twitter:image" content="${image}" />`;

  // Replace the marker with the product-specific OG block
  let html = indexHtml.replace('<!-- %OG_OVERRIDE% -->', ogBlock);

  // Remove the generic <title> that already existed in index.html to avoid duplication.
  // The injected block above already contains the correct <title>.
  html = html.replace(/<title>[^<]*<\/title>\s*\n/, '');

  return new Response(html, {
    headers: { 'content-type': 'text/html; charset=utf-8' },
  });
}
