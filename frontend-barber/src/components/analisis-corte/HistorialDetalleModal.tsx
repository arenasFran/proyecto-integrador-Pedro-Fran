import type { FC } from 'react';
import { Modal } from '../common';
import { RecomendacionDetalle } from './RecomendacionDetalle';
import { formatDate } from '../../utils/formatDate';
import type { AnalisisCorteRecord } from '../../types/analisisCorte';

type HistorialDetalleModalProps = {
  record: AnalisisCorteRecord | null;
  onClose: () => void;
};

export const HistorialDetalleModal: FC<HistorialDetalleModalProps> = ({ record, onClose }) => {
  return (
    <Modal
      isOpen={!!record}
      onClose={onClose}
      title={record ? formatDate(record.createdAt) : undefined}
      size="lg"
      centered
    >
      {record && <RecomendacionDetalle resultado={record.resultado} />}
    </Modal>
  );
};
