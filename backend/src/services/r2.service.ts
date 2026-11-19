import crypto from 'node:crypto';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectsCommand,
} from '@aws-sdk/client-s3';
import sharp from 'sharp';

let cachedS3Client: S3Client | null = null;

function getR2Config() {
  const endpoint = process.env.R2_ENDPOINT?.trim().replace(/\/+$/, '');
  const accessKeyId = process.env.R2_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY?.trim();
  const bucketName = process.env.R2_BUCKET_NAME?.trim() || 'vitrimini';
  const publicUrl = process.env.R2_PUBLIC_URL?.trim().replace(/\/+$/, '');

  if (!endpoint || !accessKeyId || !secretAccessKey || !publicUrl) {
    throw new Error(
      'Configuração do Cloudflare R2 incompleta (R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_PUBLIC_URL).'
    );
  }

  return { endpoint, accessKeyId, secretAccessKey, bucketName, publicUrl };
}

function getS3Client(): S3Client {
  if (cachedS3Client) return cachedS3Client;

  const { endpoint, accessKeyId, secretAccessKey } = getR2Config();
  cachedS3Client = new S3Client({
    region: 'auto',
    endpoint,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
  return cachedS3Client;
}

/**
 * Otimiza a imagem em memória via sharp (corrige EXIF, redimensiona até 900x900
 * sem ampliar, converte para WebP qualidade 75 / esforço 6) e sobe ao Cloudflare R2
 * com cache imutável de 1 ano para zerar leituras repetidas (Class B).
 */
export async function uploadImageToR2(buffer: Buffer): Promise<string> {
  const { bucketName, publicUrl } = getR2Config();

  const optimizedBuffer = await sharp(buffer)
    .rotate()
    .resize({
      width: 900,
      height: 900,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .webp({
      quality: 75,
      effort: 6,
    })
    .toBuffer();

  const key = `vitrines/${Date.now()}-${crypto.randomUUID()}.webp`;

  await getS3Client().send(
    new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: optimizedBuffer,
      ContentType: 'image/webp',
      CacheControl: 'public, max-age=31536000, immutable',
    })
  );

  return `${publicUrl}/${key}`;
}

/**
 * Exclui múltiplas imagens do R2 em um único lote (DeleteObjectsCommand = 1 operação Class A),
 * filtrando estritamente URLs pertencentes ao R2_PUBLIC_URL configurado.
 * Nunca utiliza comandos de listagem (ListObjectsV2).
 */
export async function deleteImagesFromR2(
  urls: Array<string | null | undefined>
): Promise<void> {
  const publicUrl = process.env.R2_PUBLIC_URL?.trim().replace(/\/+$/, '');
  if (!publicUrl || urls.length === 0) return;

  const prefix = `${publicUrl}/`;
  const uniqueKeys = Array.from(
    new Set(
      urls
        .filter((u): u is string => typeof u === 'string' && u.startsWith(prefix))
        .map((u) => u.slice(prefix.length).trim())
        .filter(Boolean)
    )
  );

  if (uniqueKeys.length === 0) return;

  try {
    const { bucketName } = getR2Config();
    const client = getS3Client();

    // S3 DeleteObjects aceita até 1000 chaves por requisição em lote
    for (let i = 0; i < uniqueKeys.length; i += 1000) {
      const batch = uniqueKeys.slice(i, i + 1000);
      await client.send(
        new DeleteObjectsCommand({
          Bucket: bucketName,
          Delete: {
            Objects: batch.map((Key) => ({ Key })),
            Quiet: true,
          },
        })
      );
    }
  } catch (err) {
    console.error('[R2 Batch Delete Error]:', err);
  }
}
