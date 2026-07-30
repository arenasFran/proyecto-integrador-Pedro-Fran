import { Request, Response } from 'express';
import { sendError } from '../../../common/response';
import { ExportOrdersCsvUseCase } from '../../../application/use-cases/reports/ExportOrdersCsvUseCase';
import { ExportSalesCsvUseCase } from '../../../application/use-cases/reports/ExportSalesCsvUseCase';
import { ExportProductsCsvUseCase } from '../../../application/use-cases/reports/ExportProductsCsvUseCase';
import { ExportMembershipsCsvUseCase } from '../../../application/use-cases/reports/ExportMembershipsCsvUseCase';

export class ReportsController {
  constructor(
    private readonly exportOrdersCsvUseCase: ExportOrdersCsvUseCase,
    private readonly exportSalesCsvUseCase: ExportSalesCsvUseCase,
    private readonly exportProductsCsvUseCase: ExportProductsCsvUseCase,
    private readonly exportMembershipsCsvUseCase: ExportMembershipsCsvUseCase,
  ) {}

  exportOrdersCsv = async (req: Request, res: Response) => {
    try {
      const { desde, hasta, status } = req.query as Record<string, string | undefined>;
      const csv = await this.exportOrdersCsvUseCase.execute({ desde, hasta, status });
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="ordenes.csv"');
      return res.status(200).send(csv);
    } catch (error) {
      return sendError(res, error, 'Error al exportar órdenes');
    }
  };

  exportSalesCsv = async (req: Request, res: Response) => {
    try {
      const { desde, hasta } = req.query as Record<string, string | undefined>;
      const csv = await this.exportSalesCsvUseCase.execute({ desde, hasta });
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="ventas.csv"');
      return res.status(200).send(csv);
    } catch (error) {
      return sendError(res, error, 'Error al exportar ventas');
    }
  };

  exportProductsCsv = async (_req: Request, res: Response) => {
    try {
      const csv = await this.exportProductsCsvUseCase.execute();
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="productos.csv"');
      return res.status(200).send(csv);
    } catch (error) {
      return sendError(res, error, 'Error al exportar productos');
    }
  };

  exportMembershipsCsv = async (req: Request, res: Response) => {
    try {
      const { desde, hasta, status } = req.query as Record<string, string | undefined>;
      const csv = await this.exportMembershipsCsvUseCase.execute({ desde, hasta, status });
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="membresias.csv"');
      return res.status(200).send(csv);
    } catch (error) {
      return sendError(res, error, 'Error al exportar membresías');
    }
  };
}
