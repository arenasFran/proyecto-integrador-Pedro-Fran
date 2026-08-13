import React, { useState } from 'react';
import { FiGlobe, FiShield, FiTrash2 } from 'react-icons/fi';
import { Modal, Button } from '../common';

type ConsentModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onAccept: () => void;
  loading?: boolean;
};

export const ConsentModal: React.FC<ConsentModalProps> = ({ isOpen, onClose, onAccept, loading = false }) => {
  const [accepted, setAccepted] = useState(false);

  const handleClose = () => {
    setAccepted(false);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Antes de analizar tu foto" size="md">
      <p className="text-[13px] text-[#8A8A8A] mb-4">
        Usamos inteligencia artificial para analizar la forma de tu rostro y recomendarte cortes de pelo.
        Antes de continuar, necesitamos tu consentimiento:
      </p>

      <div className="space-y-3 mb-5">
        <div className="flex items-start gap-3 rounded-[12px] bg-[#1A1A1A] border border-[#282828] p-3">
          <FiTrash2 className="mt-0.5 shrink-0 text-[#FF5C00]" />
          <p className="text-[12px] text-[#8A8A8A]">
            Tu foto <span className="text-white font-medium">no se guarda</span>. Se procesa al momento y se
            descarta apenas termina el análisis — solo guardamos el resultado (forma de cara y cortes sugeridos).
          </p>
        </div>
        <div className="flex items-start gap-3 rounded-[12px] bg-[#1A1A1A] border border-[#282828] p-3">
          <FiGlobe className="mt-0.5 shrink-0 text-[#FF5C00]" />
          <p className="text-[12px] text-[#8A8A8A]">
            El procesamiento ocurre <span className="text-white font-medium">fuera de Uruguay</span>, a través de
            proveedores externos (AWS y Google), que reciben la foto únicamente para este análisis.
          </p>
        </div>
        <div className="flex items-start gap-3 rounded-[12px] bg-[#1A1A1A] border border-[#282828] p-3">
          <FiShield className="mt-0.5 shrink-0 text-[#FF5C00]" />
          <p className="text-[12px] text-[#8A8A8A]">
            Esto se pide una sola vez. Una vez que aceptes, no te lo volvemos a preguntar.
          </p>
        </div>
      </div>

      <label className="flex items-start gap-2.5 mb-5 cursor-pointer">
        <input
          type="checkbox"
          checked={accepted}
          onChange={(e) => setAccepted(e.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 accent-[#FF5C00]"
        />
        <span className="text-[13px] text-white">
          Entiendo y acepto que mi foto sea procesada por AWS y Google para este análisis, y que no se conserva.
        </span>
      </label>

      <div className="flex gap-3">
        <Button variant="secondary" onClick={handleClose} disabled={loading}>
          Cancelar
        </Button>
        <Button onClick={onAccept} disabled={!accepted} loading={loading}>
          Acepto y continúo
        </Button>
      </div>
    </Modal>
  );
};
