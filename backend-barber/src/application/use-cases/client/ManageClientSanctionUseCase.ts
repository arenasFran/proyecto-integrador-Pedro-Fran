import { Client } from '../../../domain/entities/Client';
import { AppError } from '../../../domain/errors/AppError';
import { MongoClientRepository } from '../../../infrastructure/repositories/mongodb/MongoClientRepository';

export const MIN_NOSHOW_PARA_SANCION = 3;

export type SancionarClienteDTO = {
  clientId: string;
  motivo: string;
};

export class ManageClientSanctionUseCase {
  constructor(private readonly clientRepository: MongoClientRepository) {}

  async sancionar(dto: SancionarClienteDTO, actor: string): Promise<Client> {
    const client = await this.clientRepository.findById(dto.clientId);
    if (!client) {
      throw new AppError('Cliente no encontrado.', 404);
    }
    if (client.sancionado) {
      throw new AppError('El cliente ya se encuentra sancionado.', 400);
    }
    if (client.noShowCount < MIN_NOSHOW_PARA_SANCION) {
      throw new AppError(
        `El cliente debe acumular al menos ${MIN_NOSHOW_PARA_SANCION} inasistencias para ser sancionado.`,
        400
      );
    }
    const updated = await this.clientRepository.aplicarSancion(dto.clientId, {
      motivo: dto.motivo,
      sancionadoPor: actor,
    });
    if (!updated) {
      throw new AppError('Cliente no encontrado.', 404);
    }
    return updated;
  }

  async levantar(clientId: string): Promise<Client> {
    const client = await this.clientRepository.findById(clientId);
    if (!client) {
      throw new AppError('Cliente no encontrado.', 404);
    }
    if (!client.sancionado) {
      throw new AppError('El cliente no se encuentra sancionado.', 400);
    }
    const updated = await this.clientRepository.levantarSancion(clientId);
    if (!updated) {
      throw new AppError('Cliente no encontrado.', 404);
    }
    return updated;
  }
}
