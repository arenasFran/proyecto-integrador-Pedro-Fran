import React, { useRef, useState } from 'react';
import { FiUpload, FiX } from 'react-icons/fi';

type ImageUploadProps = {
  currentUrl?: string | null;
  onFileSelect: (file: File | null) => void;
  error?: string;
  helperText?: string;
};

export const ImageUpload: React.FC<ImageUploadProps> = ({
  currentUrl,
  onFileSelect,
  error,
  helperText,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [localPreview, setLocalPreview] = useState<string | null>(null);

  const previewUrl = localPreview ?? currentUrl ?? null;

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file?.type.startsWith('image/')) {
      onFileSelect(file);
      setLocalPreview(URL.createObjectURL(file));
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file?.type.startsWith('image/')) {
      onFileSelect(file);
      setLocalPreview(URL.createObjectURL(file));
    }
  };

  const handleRemove = () => {
    onFileSelect(null);
    setLocalPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div>
      {helperText && <p className="text-[11px] text-[#8A8A8A] mb-2">{helperText}</p>}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className="relative flex flex-col items-center justify-center rounded-[16px] border-2 border-dashed border-[#282828] bg-[#1A1A1A] p-6 cursor-pointer hover:border-[#FF5C00]/50 transition-colors"
      >
        {previewUrl ? (
          <div className="relative">
            <img
              src={previewUrl}
              alt="Preview"
              className="w-24 h-24 rounded-full object-cover border border-[#282828]"
            />
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); handleRemove(); }}
              className="absolute -top-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white hover:bg-red-600 transition-colors"
            >
              <FiX className="w-3 h-3" />
            </button>
          </div>
        ) : (
          <>
            <FiUpload className="w-8 h-8 text-[#8A8A8A] mb-2" />
            <p className="text-[13px] text-[#8A8A8A]">Arrastrá una imagen o hacé clic para subir</p>
            <p className="text-[11px] text-[#555] mt-1">JPG, PNG o WebP</p>
          </>
        )}
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileSelect}
      />
      {error && <p className="text-[11px] text-red-500 mt-1">{error}</p>}
    </div>
  );
};
