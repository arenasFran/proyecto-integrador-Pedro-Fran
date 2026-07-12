import { useMemo, useState } from 'react';
import { FiUser, FiX } from 'react-icons/fi';
import { Modal, Button, Input, useToast } from '../../../../components/common';
import { useCreateMembershipMutation } from '../../../../services/membershipApi';
import { useGetClientesListQuery } from '../../../../services/analyticsApi';
import type { ClienteData } from '../../../../types/analytics';

type CreateMembershipModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

export const CreateMembershipModal: React.FC<CreateMembershipModalProps> = ({ isOpen, onClose }) => {
  const { showToast } = useToast();
  const [search, setSearch] = useState('');
  const [selectedClient, setSelectedClient] = useState<ClienteData | null>(null);
  const [createMembership, { isLoading }] = useCreateMembershipMutation();

  const desde = useMemo(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 1);
    return d.toISOString().split('T')[0];
  }, []);
  const hasta = useMemo(() => {
    const d = new Date();
    return d.toISOString().split('T')[0];
  }, []);

  const { data: clients = [] } = useGetClientesListQuery({ desde, hasta }, { skip: !isOpen });

  const filtered = (search
    ? clients.filter(
        (c: ClienteData) =>
          c.kind === 'Registrado' && (
            c.clientName.toLowerCase().includes(search.toLowerCase()) ||
            c.clientLastname.toLowerCase().includes(search.toLowerCase()) ||
            (c.clientEmail ?? '').toLowerCase().includes(search.toLowerCase())
          )
      )
    : clients.filter((c: ClienteData) => c.kind === 'Registrado')
  );

  const handleCreate = async () => {
    if (!selectedClient?.clientId) return;
    try {
      await createMembership({ userId: selectedClient.clientId }).unwrap();
      showToast('Membresía creada correctamente', 'success');
      setSelectedClient(null);
      setSearch('');
      onClose();
    } catch {
      showToast('Error al crear la membresía', 'error');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Nueva membresía" size="md">
      <div className="flex flex-col gap-4">
        <Input
          label="Buscar cliente"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setSelectedClient(null); }}
          placeholder="Nombre, apellido o email..."
        />

        {!selectedClient && (
          <div className="max-h-48 overflow-y-auto rounded-[12px] border border-[#282828] bg-[#1A1A1A]">
            {filtered.length === 0 ? (
              <p className="text-[13px] text-[#8A8A8A] p-4 text-center">No se encontraron clientes</p>
            ) : (
              filtered.map((c: ClienteData) => (
                <button
                  key={c.key}
                  onClick={() => setSelectedClient(c)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left text-[13px] text-white hover:bg-[#242424] transition-colors border-b border-[#282828] last:border-b-0"
                >
                  <FiUser className="text-[#FF5C00] shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">
                      {c.clientName} {c.clientLastname}
                    </p>
                    {c.clientEmail && (
                      <p className="text-[11px] text-[#8A8A8A] truncate">{c.clientEmail}</p>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        )}

        {selectedClient && (
          <div className="flex items-center justify-between rounded-[12px] bg-[#1A1A1A] border border-[#282828] px-4 py-3">
            <div className="flex items-center gap-2">
              <FiUser className="text-[#FF5C00] text-sm" />
              <span className="text-[13px] text-white">
                {selectedClient.clientName} {selectedClient.clientLastname}
              </span>
            </div>
            <button onClick={() => setSelectedClient(null)} className="text-[#8A8A8A] hover:text-white transition-colors">
              <FiX size={16} />
            </button>
          </div>
        )}

        <div className="rounded-[12px] bg-[#FF5C00]/5 border border-[#FF5C00]/20 p-4">
          <p className="text-[12px] text-[#8A8A8A]">
            La membresía se creará con <strong className="text-white">4 cupones</strong> y una validez de <strong className="text-white">30 días</strong>.
            El cliente recibirá los beneficios de forma inmediata.
          </p>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button loading={isLoading} disabled={!selectedClient} onClick={handleCreate}>
            Crear membresía
          </Button>
        </div>
      </div>
    </Modal>
  );
};
