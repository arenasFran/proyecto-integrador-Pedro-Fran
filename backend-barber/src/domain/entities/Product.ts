import { ProductData, ProductStatus } from '../types/product.types';

export type ProductProps = ProductData;

export class Product {
  private props: ProductProps;

  private constructor(props: ProductProps) {
    this.props = { ...props };
  }

  static create(data: {
    name: string;
    description: string;
    price: number;
    stock: number;
    imageUrl: string;
    gallery?: string[];
    category: string;
  }): Product {
    const now = new Date();
    return new Product({
      id: '',
      name: data.name,
      description: data.description,
      price: data.price,
      stock: data.stock,
      imageUrl: data.imageUrl,
      gallery: data.gallery ?? [],
      category: data.category,
      status: 'active',
      createdAt: now,
      updatedAt: now,
    });
  }

  static restore(props: ProductProps): Product {
    return new Product(props);
  }

  get id(): string { return this.props.id; }
  get name(): string { return this.props.name; }
  get description(): string { return this.props.description; }
  get price(): number { return this.props.price; }
  get stock(): number { return this.props.stock; }
  get imageUrl(): string { return this.props.imageUrl; }
  get gallery(): string[] { return [...this.props.gallery]; }
  get category(): string { return this.props.category; }
  get status(): ProductStatus { return this.props.status; }
  get createdAt(): Date { return new Date(this.props.createdAt.getTime()); }
  get updatedAt(): Date { return new Date(this.props.updatedAt.getTime()); }

  toPrimitives(): ProductProps {
    return { ...this.props };
  }

  update(data: { name?: string; description?: string; price?: number; stock?: number; imageUrl?: string; gallery?: string[]; category?: string; status?: ProductStatus }): void {
    if (data.name !== undefined) this.props.name = data.name;
    if (data.description !== undefined) this.props.description = data.description;
    if (data.price !== undefined) this.props.price = data.price;
    if (data.stock !== undefined) this.props.stock = data.stock;
    if (data.imageUrl !== undefined) this.props.imageUrl = data.imageUrl;
    if (data.gallery !== undefined) this.props.gallery = data.gallery;
    if (data.category !== undefined) this.props.category = data.category;
    if (data.status !== undefined) this.props.status = data.status;
    this.props.updatedAt = new Date();
  }

  activate(): void {
    this.props.status = 'active';
    this.props.updatedAt = new Date();
  }

  deactivate(): void {
    this.props.status = 'inactive';
    this.props.updatedAt = new Date();
  }

  delete(): void {
    this.props.status = 'deleted';
    this.props.updatedAt = new Date();
  }

  decreaseStock(quantity: number): void {
    if (this.props.stock < quantity) {
      throw new Error(`Stock insuficiente. Disponible: ${this.props.stock}, solicitado: ${quantity}`);
    }
    this.props.stock -= quantity;
    this.props.updatedAt = new Date();
  }
}
