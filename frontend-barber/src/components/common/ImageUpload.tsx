import React, { useEffect, useRef, useState } from 'react';
import { FiCamera, FiUpload, FiX } from 'react-icons/fi';

type ImageUploadProps = {
  currentUrl?: string | null;
  onFileSelect: (file: File | null) => void;
  error?: string;
  helperText?: string;
  variant?: 'box' | 'avatar';
  name?: string;
  lastname?: string;
};

export const ImageUpload: React.FC<ImageUploadProps> = ({
  currentUrl,
  onFileSelect,
  error,
  helperText,
  variant = 'box',
  name,
  lastname,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [localPreview, setLocalPreview] = useState<string | null>(null);

  const previewUrl = localPreview ?? currentUrl ?? null;

  useEffect(() => {
    if (currentUrl) {
      if (localPreview) URL.revokeObjectURL(localPreview);
      setLocalPreview(null);
    }
  }, [currentUrl]);

  useEffect(() => {
    return () => {
      if (localPreview) URL.revokeObjectURL(localPreview);
    };
  }, [localPreview]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && ['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      onFileSelect(file);
      if (localPreview) URL.revokeObjectURL(localPreview);
      setLocalPreview(URL.createObjectURL(file));
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && ['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      onFileSelect(file);
      if (localPreview) URL.revokeObjectURL(localPreview);
      setLocalPreview(URL.createObjectURL(file));
    }
  };

  const handleRemove = () => {
    if (localPreview) URL.revokeObjectURL(localPreview);
    onFileSelect(null);
    setLocalPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const initials = name && lastname
    ? `${name.charAt(0).toUpperCase()}${lastname.charAt(0).toUpperCase()}`
    : name
      ? name.charAt(0).toUpperCase()
      : '?';

  if (variant === 'avatar') {
    return (
      <div className="relative">
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className="group relative w-24 h-24 cursor-pointer"
        >
          <div className="w-full h-full rounded-full overflow-hidden border-2 border-[#282828]">
            {previewUrl ? (
              <img
                src={previewUrl}
                alt="Foto de perfil"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-[#242424] flex items-center justify-center">
                <span className="text-[28px] font-bold text-[#8A8A8A]">{initials}</span>
              </div>
            )}
          </div>
          <div className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <FiCamera className="w-6 h-6 text-white" />
          </div>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleFileSelect}
        />
        {error && <p className="text-[11px] text-red-500 mt-1 text-center">{error}</p>}
        {helperText && <p className="text-[11px] text-[#8A8A8A] mt-1 text-center">{helperText}</p>}
      </div>
    );
  }

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
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFileSelect}
      />
      {error && <p className="text-[11px] text-red-500 mt-1">{error}</p>}
    </div>
  );
};
