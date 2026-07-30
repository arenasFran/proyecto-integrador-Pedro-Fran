import { ProductModel } from '../../../infrastructure/repositories/mongodb/models/product.model';

export class ExportProductsCsvUseCase {
  async execute(): Promise<string> {
    const products = await ProductModel.find({ status: { $ne: 'deleted' } }).sort({ name: 1 }).lean();

    const header = 'ID,Nombre,Categoría,Precio,Stock,Estado';
    const rows = products.map((p) =>
      [p._id.toString(), p.name, p.category, p.price, p.stock, p.status].join(',')
    );

    return [header, ...rows].join('\n');
  }
}
