import { Camera, Trash2 } from 'lucide-react';
import { getStoreInitials, type ThemePalette } from '../constants/themes';

interface LogoUploaderProps {
  storeName: string;
  imageSrc: string | null;
  theme: ThemePalette;
  onSelectFile: (file: File) => void;
  onRemove: () => void;
}

export function LogoUploader({
  storeName,
  imageSrc,
  theme,
  onSelectFile,
  onRemove,
}: LogoUploaderProps) {
  const initials = getStoreInitials(storeName);

  return (
    <div className="flex items-center gap-4">
      <label className="group relative flex h-20 w-20 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-stone-300 bg-stone-50 shadow-xs transition hover:border-stone-500">
        {imageSrc ? (
          <img
            src={imageSrc}
            alt="Logo do estabelecimento"
            className="h-full w-full object-cover"
          />
        ) : (
          <div
            className={`flex h-full w-full flex-col items-center justify-center ${theme.avatarFallbackBg} ${theme.avatarFallbackText}`}
          >
            <span className="text-base font-extrabold">{initials}</span>
            <Camera className="mt-0.5 h-3.5 w-3.5 opacity-75" />
          </div>
        )}
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition group-hover:opacity-100">
          <Camera className="h-5 w-5 text-white" />
        </div>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onSelectFile(file);
            e.target.value = '';
          }}
          className="hidden"
        />
      </label>

      <div className="space-y-1">
        <p className="text-xs font-bold text-stone-800">
          Logo ou Foto do Estabelecimento{' '}
          <span className="font-normal text-stone-400">(opcional)</span>
        </p>
        <p className="text-[11px] text-stone-500">
          Clique no círculo para enviar. Se preferir sem foto, exibiremos suas iniciais com a cor do tema.
        </p>
        {imageSrc && (
          <button
            type="button"
            onClick={onRemove}
            className="inline-flex items-center gap-1 pt-0.5 text-xs font-semibold text-red-600 hover:text-red-700"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Remover foto
          </button>
        )}
      </div>
    </div>
  );
}
