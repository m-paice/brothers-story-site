// Converte links do Google Drive em URL direta de imagem (na renderização).
// Aceita os formatos comuns:
//   https://drive.google.com/file/d/FILE_ID/view?...
//   https://drive.google.com/open?id=FILE_ID
//   https://drive.google.com/uc?...id=FILE_ID
//   https://drive.google.com/thumbnail?id=FILE_ID (idempotente)
// URLs que não são do Drive são retornadas sem alteração.
export function resolveImageUrl(url: string, width = 800): string {
  if (!url || !url.includes('drive.google.com')) return url;

  const match = url.match(/\/file\/d\/([^/]+)/) ?? url.match(/[?&]id=([^&]+)/);
  if (!match) return url;

  return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w${width}`;
}
