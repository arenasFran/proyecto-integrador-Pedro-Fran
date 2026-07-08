export type ProductStatus = 'active' | 'inactive' | 'deleted';

export type Product = {
  id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  imageUrl: string;
  category: string;
  status: ProductStatus;
  createdAt: string;
  updatedAt: string;
};

export type ProductsResponse = {
  products: Product[];
  total: number;
  page: number;
  totalPages: number;
  limit: number;
};

export type CreateProductPayload = {
  name: string;
  description: string;
  price: number;
  stock: number;
  imageUrl?: string;
  category?: string;
};

export type UpdateProductPayload = Partial<CreateProductPayload> & {
  status?: ProductStatus;
};
