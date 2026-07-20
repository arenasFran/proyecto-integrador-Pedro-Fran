export type ProductStatus = 'active' | 'inactive' | 'deleted';

export type ProductData = {
  id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  minStock: number;
  imageUrl: string;
  gallery: string[];
  category: string;
  status: ProductStatus;
  createdAt: Date;
  updatedAt: Date;
};
