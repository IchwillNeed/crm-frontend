import { apiClient } from '../client';
import type { Category, Subcategory, ProductType, Product } from '@/types/catalog';

// Categories
export const getCategories = async (): Promise<Category[]> => {
  const response = await apiClient.get<Category[]>('/categories/');
  return response.data;
};
export const createCategory = async (data: { name: string; description?: string }): Promise<Category> => {
  const response = await apiClient.post<Category>('/categories/', data);
  return response.data;
};

// Subcategories
export const getSubcategories = async (): Promise<Subcategory[]> => {
  const response = await apiClient.get<Subcategory[]>('/subcategories/');
  return response.data;
};
export const createSubcategory = async (data: { category: number; name: string }): Promise<Subcategory> => {
  const response = await apiClient.post<Subcategory>('/subcategories/', data);
  return response.data;
};

// Product Types
export const getProductTypes = async (): Promise<ProductType[]> => {
  const response = await apiClient.get<ProductType[]>('/product-types/');
  return response.data;
};
export const createProductType = async (data: { subcategory: number; name: string }): Promise<ProductType> => {
  const response = await apiClient.post<ProductType>('/product-types/', data);
  return response.data;
};

// Products
export const getProducts = async (): Promise<Product[]> => {
  const response = await apiClient.get<Product[]>('/products/');
  return response.data;
};
export const createProduct = async (data: Partial<Product>): Promise<Product> => {
  const response = await apiClient.post<Product>('/products/', data);
  return response.data;
};
export const updateProduct = async (id: number, data: Partial<Product>): Promise<Product> => {
  const response = await apiClient.patch<Product>(`/products/${id}/`, data);
  return response.data;
};
export const deleteProduct = async (id: number): Promise<void> => {
  await apiClient.delete(`/products/${id}/`);
};
export const restockProduct = async (
  id: number,
  data: { quantity: number; unit_cost?: number }
): Promise<Product> => {
  const response = await apiClient.post<Product>(`/products/${id}/restock/`, data);
  return response.data;
};

// Category - update/delete
export const updateCategory = async (id: number, data: { name: string; description?: string }): Promise<Category> => {
  const response = await apiClient.patch<Category>(`/categories/${id}/`, data);
  return response.data;
};
export const deleteCategory = async (id: number): Promise<void> => {
  await apiClient.delete(`/categories/${id}/`);
};

// Subcategory - update/delete
export const updateSubcategory = async (id: number, data: { category: number; name: string }): Promise<Subcategory> => {
  const response = await apiClient.patch<Subcategory>(`/subcategories/${id}/`, data);
  return response.data;
};
export const deleteSubcategory = async (id: number): Promise<void> => {
  await apiClient.delete(`/subcategories/${id}/`);
};

// ProductType - update/delete
export const updateProductType = async (id: number, data: { subcategory: number; name: string }): Promise<ProductType> => {
  const response = await apiClient.patch<ProductType>(`/product-types/${id}/`, data);
  return response.data;
};
export const deleteProductType = async (id: number): Promise<void> => {
  await apiClient.delete(`/product-types/${id}/`);
};