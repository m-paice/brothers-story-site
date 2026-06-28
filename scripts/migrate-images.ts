/**
 * Migra imagens de produto do Google Drive para o Supabase Storage.
 *
 * Uso:
 *   SUPABASE_SERVICE_ROLE_KEY=sua_chave npx tsx scripts/migrate-images.ts
 *
 * A chave está em: Supabase Dashboard → Project Settings → API → service_role
 */
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://bqotguvfiquscfgohgfo.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SERVICE_KEY) {
  console.error('Erro: defina a variável SUPABASE_SERVICE_ROLE_KEY antes de rodar.');
  console.error('  SUPABASE_SERVICE_ROLE_KEY=... npx tsx scripts/migrate-images.ts');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

function isDriveUrl(url: string): boolean {
  return typeof url === 'string' && url.includes('drive.google.com');
}

function driveToDownloadUrl(url: string): string {
  const match = url.match(/\/file\/d\/([^/]+)/) ?? url.match(/[?&]id=([^&]+)/);
  if (!match) return url;
  return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w1200`;
}

async function downloadImage(url: string): Promise<{ buffer: Buffer; contentType: string }> {
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) throw new Error(`HTTP ${res.status} ao baixar ${url}`);
  const contentType = res.headers.get('content-type') ?? 'image/jpeg';
  const buffer = Buffer.from(await res.arrayBuffer());
  return { buffer, contentType };
}

async function uploadToStorage(buffer: Buffer, contentType: string): Promise<string> {
  const ext = contentType.split('/')[1]?.replace('jpeg', 'jpg').split(';')[0] ?? 'jpg';
  const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const { error } = await supabase.storage
    .from('produtos')
    .upload(path, buffer, { contentType, upsert: false });

  if (error) throw error;

  const { data } = supabase.storage.from('produtos').getPublicUrl(path);
  return data.publicUrl;
}

async function migrateUrl(url: string): Promise<string> {
  if (!isDriveUrl(url)) return url;
  const downloadUrl = driveToDownloadUrl(url);
  console.log(`    Baixando ${downloadUrl.slice(0, 80)}…`);
  const { buffer, contentType } = await downloadImage(downloadUrl);
  const publicUrl = await uploadToStorage(buffer, contentType);
  console.log(`    → ${publicUrl}`);
  return publicUrl;
}

async function main() {
  console.log('Buscando produtos…\n');

  const { data: products, error } = await supabase
    .from('products')
    .select('id, name, image, images')
    .order('id');

  if (error) throw error;
  console.log(`${products.length} produto(s) encontrado(s).\n`);

  let migrated = 0;
  let skipped = 0;

  for (const product of products) {
    const imageList: string[] =
      Array.isArray(product.images) && product.images.length > 0
        ? product.images
        : product.image
        ? [product.image]
        : [];

    const hasDrive = imageList.some(isDriveUrl);

    if (!hasDrive) {
      console.log(`[${product.id}] ${product.name} — sem Drive, pulando.`);
      skipped++;
      continue;
    }

    console.log(`[${product.id}] ${product.name} (${imageList.length} imagem(ns))`);

    const newImages: string[] = [];
    for (const url of imageList) {
      try {
        newImages.push(await migrateUrl(url));
      } catch (err) {
        console.error(`    ERRO ao migrar ${url}:`, (err as Error).message);
        newImages.push(url); // mantém a URL original em caso de falha
      }
    }

    const { error: updateError } = await supabase
      .from('products')
      .update({ image: newImages[0] ?? '', images: newImages })
      .eq('id', product.id);

    if (updateError) {
      console.error(`  ERRO ao atualizar produto ${product.id}:`, updateError.message);
    } else {
      console.log(`  ✓ Produto atualizado.\n`);
      migrated++;
    }
  }

  console.log('─'.repeat(50));
  console.log(`Migração concluída: ${migrated} migrado(s), ${skipped} pulado(s).`);
}

main().catch((err) => {
  console.error('Erro fatal:', err);
  process.exit(1);
});
