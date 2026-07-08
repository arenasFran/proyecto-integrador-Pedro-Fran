import { useRef, useState } from 'react';
import { FiUpload, FiX, FiCheck } from 'react-icons/fi';
import { Spinner } from '../common';

interface ProductImageUploadProps {
  mainImageUrl: string;
  galleryUrls: string[];
  onMainImageChange: (url: string) => void;
  onGalleryChange: (urls: string[]) => void;
}

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export default function ProductImageUpload({ mainImageUrl, galleryUrls, onMainImageChange, onGalleryChange }: ProductImageUploadProps) {
  const mainInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const uploadFiles = async (files: File[]): Promise<string[]> => {
    setUploading(true);
    try {
      const formData = new FormData();
      files.forEach((f) => formData.append('images', f));
      const res = await fetch('/api/upload/product-images', {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
        body: formData,
      });
      const data = await res.json();
      return data.data?.urls ?? [];
    } finally {
      setUploading(false);
    }
  };

  const handleMainSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !ACCEPTED_TYPES.includes(file.type)) return;
    const urls = await uploadFiles([file]);
    if (urls[0]) onMainImageChange(urls[0]);
    if (mainInputRef.current) mainInputRef.current.value = '';
  };

  const handleGallerySelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    const valid = files.filter((f) => ACCEPTED_TYPES.includes(f.type));
    const remaining = 4 - galleryUrls.length;
    if (valid.length === 0 || remaining <= 0) return;
    const urls = await uploadFiles(valid.slice(0, remaining));
    onGalleryChange([...galleryUrls, ...urls]);
    if (galleryInputRef.current) galleryInputRef.current.value = '';
  };

  const removeMain = async () => {
    onMainImageChange('');
  };

  const removeGallery = (index: number) => {
    const next = galleryUrls.filter((_, i) => i !== index);
    onGalleryChange(next);
  };

  return (
    <div className="space-y-4">
      {uploading && (
        <div className="flex items-center gap-2 text-[13px] text-[#FF5C00]">
          <Spinner size="sm" />
          Subiendo imágenes...
        </div>
      )}

      <div>
        <p className="mb-1.5 text-[12px] font-medium text-[#8A8A8A]">Imagen principal</p>
        <div
          onClick={() => mainInputRef.current?.click()}
          className="relative flex flex-col items-center justify-center rounded-[16px] border-2 border-dashed border-[#282828] bg-[#1A1A1A] p-6 cursor-pointer hover:border-[#FF5C00]/50 transition-colors"
        >
          {mainImageUrl ? (
            <div className="relative">
              <img src={mainImageUrl} alt="Principal" className="w-32 h-32 rounded-[12px] object-cover border border-[#282828]" />
              <button type="button" onClick={(e) => { e.stopPropagation(); removeMain(); }} className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white hover:bg-red-600"><FiX className="w-3 h-3" /></button>
            </div>
          ) : (
            <>
              <FiUpload className="w-8 h-8 text-[#8A8A8A] mb-2" />
              <p className="text-[13px] text-[#8A8A8A]">Imagen principal del producto</p>
              <p className="text-[11px] text-[#555] mt-1">JPG, PNG o WebP — se recorta a cuadrado</p>
            </>
          )}
        </div>
        <input ref={mainInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleMainSelect} />
      </div>

      <div>
        <p className="mb-1.5 text-[12px] font-medium text-[#8A8A8A]">Galería ({galleryUrls.length}/4)</p>
        <div className="grid grid-cols-4 gap-2">
          {galleryUrls.map((url, i) => (
            <div key={i} className="relative aspect-square rounded-[12px] bg-[#1A1A1A] border border-[#282828] overflow-hidden group">
              <img src={url} alt={`Galería ${i + 1}`} className="w-full h-full object-cover" />
              <button type="button" onClick={() => removeGallery(i)} className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity"><FiX className="w-2.5 h-2.5" /></button>
              <FiCheck className="absolute bottom-1 right-1 text-[#22C55E] w-3 h-3" />
            </div>
          ))}
          {galleryUrls.length < 4 && (
            <div onClick={() => galleryInputRef.current?.click()} className="aspect-square rounded-[12px] border-2 border-dashed border-[#282828] bg-[#1A1A1A] flex flex-col items-center justify-center cursor-pointer hover:border-[#FF5C00]/50 transition-colors">
              <FiUpload className="w-5 h-5 text-[#8A8A8A] mb-1" />
              <p className="text-[10px] text-[#555]">Agregar</p>
            </div>
          )}
        </div>
        <input ref={galleryInputRef} type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" onChange={handleGallerySelect} />
      </div>
    </div>
  );
}
