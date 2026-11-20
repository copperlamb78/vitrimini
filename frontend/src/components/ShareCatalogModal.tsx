import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import {
  Check,
  Copy,
  Download,
  Loader2,
  MessageCircle,
  QrCode,
  X,
} from 'lucide-react';
import { getTheme } from '../constants/themes';

interface ShareCatalogModalProps {
  storeName: string;
  slug: string;
  themeColor?: string;
  onClose: () => void;
}

function fitCanvasText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  startSize: number,
  minSize: number
): { fontSize: number; fittedText: string } {
  const clean = text.trim() || 'Minha Vitrine';
  for (let size = startSize; size >= minSize; size -= 2) {
    ctx.font = `800 ${size}px Inter, system-ui, -apple-system, sans-serif`;
    if (ctx.measureText(clean).width <= maxWidth) {
      return { fontSize: size, fittedText: clean };
    }
  }

  ctx.font = `800 ${minSize}px Inter, system-ui, -apple-system, sans-serif`;
  let truncated = clean;
  while (truncated.length > 1 && ctx.measureText(`${truncated}…`).width > maxWidth) {
    truncated = truncated.slice(0, -1).trimEnd();
  }
  return { fontSize: minSize, fittedText: `${truncated}…` };
}

export function ShareCatalogModal({
  storeName,
  slug,
  themeColor,
  onClose,
}: ShareCatalogModalProps) {
  const theme = getTheme(themeColor);
  const storeLink = `https://vitrimini.com.br/c/${slug}`;
  const whatsappShareUrl = `https://wa.me/?text=${encodeURIComponent(
    `Olá! Confira nossa vitrine *${storeName}* e faça sua encomenda online: ${storeLink}`
  )}`;

  const [previewDataUrl, setPreviewDataUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    let active = true;
    QRCode.toDataURL(storeLink, {
      width: 440,
      margin: 2,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#18181B',
        light: '#FFFFFF',
      },
    })
      .then((url) => {
        if (active) setPreviewDataUrl(url);
      })
      .catch(() => {
        if (active) setPreviewDataUrl(null);
      });

    return () => {
      active = false;
    };
  }, [storeLink]);

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(storeLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Ignora erro caso área de transferência esteja bloqueada
    }
  }

  async function handleDownloadPng() {
    setDownloading(true);
    try {
      const size = 1024;
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Fundo branco limpo com margem de segurança (quiet zone)
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, size, size);

      // QR Code em alta resolução centralizado
      const qrSize = 740;
      const qrCanvas = document.createElement('canvas');
      await QRCode.toCanvas(qrCanvas, storeLink, {
        width: qrSize,
        margin: 2,
        errorCorrectionLevel: 'M',
        color: {
          dark: '#18181B',
          light: '#FFFFFF',
        },
      });
      ctx.drawImage(qrCanvas, (size - qrSize) / 2, 72, qrSize, qrSize);

      // Nome da vitrine ajustado para nunca cortar nas bordas
      const { fontSize, fittedText } = fitCanvasText(
        ctx,
        storeName,
        880,
        42,
        24
      );
      ctx.fillStyle = '#18181B';
      ctx.font = `800 ${fontSize}px Inter, system-ui, -apple-system, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(fittedText, size / 2, 876);

      // Chamada amigável abaixo do nome
      ctx.fillStyle = '#52525B';
      ctx.font = '600 26px Inter, system-ui, -apple-system, sans-serif';
      ctx.fillText('Aponte a câmera para fazer seu pedido', size / 2, 938);

      const pngUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = pngUrl;
      link.download = `qrcode-${slug}.png`;
      document.body.appendChild(link);
      link.click();
      link.remove();
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-catalog-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <span
              className={`inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider ${theme.primaryText}`}
            >
              <QrCode className="h-3.5 w-3.5" />
              Kit de Divulgação
            </span>
            <h2
              id="share-catalog-title"
              className="mt-0.5 text-lg font-extrabold text-zinc-900"
            >
              Divulgar minha vitrine
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar janela"
            className="cursor-pointer rounded-lg p-1.5 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Cartão prévia do QR Code */}
        <div className="mt-4 flex flex-col items-center rounded-2xl border border-zinc-200 bg-zinc-50/70 p-5 text-center">
          <div className="flex h-48 w-48 items-center justify-center rounded-xl border border-zinc-200 bg-white p-2 shadow-2xs">
            {previewDataUrl ? (
              <img
                src={previewDataUrl}
                alt={`QR Code da vitrine ${storeName}`}
                className="h-full w-full object-contain"
              />
            ) : (
              <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
            )}
          </div>
          <p className="mt-3 max-w-full truncate text-sm font-extrabold text-zinc-900">
            {storeName}
          </p>
          <p className="mt-0.5 text-[11px] text-zinc-500">
            Aponte a câmera para fazer seu pedido
          </p>
        </div>

        {/* Link da vitrine + ações */}
        <div className="mt-4 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-center text-xs font-medium text-zinc-600 select-all">
          {storeLink}
        </div>

        <div className="mt-4 space-y-2.5">
          <button
            type="button"
            onClick={() => void handleDownloadPng()}
            disabled={downloading}
            className={`flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl px-4 py-3 text-xs font-bold shadow-xs transition disabled:cursor-not-allowed disabled:opacity-60 ${theme.primaryBg} ${theme.primaryHover} ${theme.buttonText}`}
          >
            {downloading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            Baixar QR Code (PNG)
          </button>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => void handleCopyLink()}
              className="flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-xs font-bold text-zinc-700 transition hover:bg-zinc-50"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                  Link copiado!
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5 text-zinc-500" />
                  Copiar link da vitrine
                </>
              )}
            </button>

            <a
              href={whatsappShareUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2.5 text-xs font-bold text-white transition hover:bg-emerald-700"
            >
              <MessageCircle className="h-3.5 w-3.5" />
              Compartilhar no WhatsApp
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
