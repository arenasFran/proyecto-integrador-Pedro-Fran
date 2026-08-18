import { createApi } from '@reduxjs/toolkit/query/react';
import { axiosBaseQuery } from './baseQuery';
import type { Product, ProductsResponse, CreateProductPayload, UpdateProductPayload } from '../types/product';
import { invalidateAnalyticsAfterSuccess } from './analyticsCache';

export const productApi = createApi({
  reducerPath: 'productApi',
  baseQuery: axiosBaseQuery,
  tagTypes: ['Products', 'Product'],
  endpoints: (builder) => ({
    getProducts: builder.query<ProductsResponse, { status?: string; category?: string; search?: string; page?: number; limit?: number } | void>({
      query: (params) => ({
        url: '/api/products',
        params: params ?? undefined,
      }),
      providesTags: ['Products'],
    }),

    getPublicCatalog: builder.query<ProductsResponse, { category?: string; search?: string; page?: number; limit?: number } | void>({
      query: (params) => ({
        url: '/api/products/catalog',
        params: params ?? undefined,
      }),
      providesTags: ['Products'],
    }),

    getProductById: builder.query<{ product: Product }, string>({
      query: (id) => ({ url: `/api/products/${id}` }),
      providesTags: (_result, _error, id) => [{ type: 'Product', id }],
    }),

    getCategories: builder.query<{ categories: string[] }, void>({
      query: () => ({ url: '/api/products/categories' }),
      providesTags: ['Products'],
    }),

    createProduct: builder.mutation<{ product: Product }, CreateProductPayload>({
      query: (data) => ({
        url: '/api/products',
        method: 'POST',
        data,
      }),
      invalidatesTags: ['Products', 'Product'],
      onQueryStarted: (_arg, { dispatch, queryFulfilled }) => invalidateAnalyticsAfterSuccess(queryFulfilled, dispatch),
    }),

    updateProduct: builder.mutation<{ product: Product }, { id: string; data: UpdateProductPayload }>({
      query: ({ id, data }) => ({
        url: `/api/products/${id}`,
        method: 'PUT',
        data,
      }),
      invalidatesTags: ['Products', 'Product'],
      onQueryStarted: (_arg, { dispatch, queryFulfilled }) => invalidateAnalyticsAfterSuccess(queryFulfilled, dispatch),
    }),

    deleteProduct: builder.mutation<{ message: string }, string>({
      query: (id) => ({
        url: `/api/products/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Products', 'Product'],
      onQueryStarted: (_arg, { dispatch, queryFulfilled }) => invalidateAnalyticsAfterSuccess(queryFulfilled, dispatch),
    }),
  }),
});

export const {
  useGetProductsQuery,
  useGetPublicCatalogQuery,
  useGetProductByIdQuery,
  useGetCategoriesQuery,
  useCreateProductMutation,
  useUpdateProductMutation,
  useDeleteProductMutation,
} = productApi;
