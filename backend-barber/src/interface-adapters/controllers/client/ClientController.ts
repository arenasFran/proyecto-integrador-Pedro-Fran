import { Request, Response } from 'express';
import { ManageClientSanctionUseCase } from '../../../application/use-cases/client/ManageClientSanctionUseCase';
import { sendSuccess, sendError } from '../../../common/response';

export class ClientController {
  constructor(private readonly manageSanction: ManageClientSanctionUseCase) {}

  sancionar = async (req: Request, res: Response) => {
    try {
      const rawMotivo = req.body.motivo;
      const motivo = typeof rawMotivo === 'string' && rawMotivo.trim()
        ? rawMotivo.trim()
        : 'Inasistencias reiteradas';
      const actor = req.user?.email || req.user!._id;
      const client = await this.manageSanction.sancionar(
        { clientId: String(req.params.id), motivo },
        actor
      );
      return sendSuccess(res, {
        message: 'Cliente sancionado por inasistencias. Ya no puede reservar turnos.',
        client: client.toPrimitives(),
      }, 200);
    } catch (error) {
      return sendError(res, error, 'Error al sancionar al cliente');
    }
  };

  levantar = async (req: Request, res: Response) => {
    try {
      const client = await this.manageSanction.levantar(String(req.params.id));
      return sendSuccess(res, {
        message: 'Sanción levantada. El cliente ya puede reservar turnos.',
        client: client.toPrimitives(),
      }, 200);
    } catch (error) {
      return sendError(res, error, 'Error al levantar la sanción');
    }
  };
}
