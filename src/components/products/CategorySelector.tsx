import { useQuery } from '@tanstack/react-query';
import { getCategories, getSubcategories, getProductTypes } from '@/api/endpoints/catalog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface CategorySelectorProps {
  categoryId: number | null;
  subcategoryId: number | null;
  productTypeId: number | null;
  onCategoryChange: (id: number | null) => void;
  onSubcategoryChange: (id: number | null) => void;
  onProductTypeChange: (id: number | null) => void;
}

export function CategorySelector({
  categoryId,
  subcategoryId,
  productTypeId,
  onCategoryChange,
  onSubcategoryChange,
  onProductTypeChange,
}: CategorySelectorProps) {
  const { data: categories } = useQuery({ queryKey: ['categories'], queryFn: getCategories });
  const { data: subcategories } = useQuery({ queryKey: ['subcategories'], queryFn: getSubcategories });
  const { data: productTypes } = useQuery({ queryKey: ['product-types'], queryFn: getProductTypes });

  const selectedType = productTypes?.find(type => type.id === productTypeId);
  const selectedSubcategoryId = subcategoryId ?? selectedType?.subcategory ?? null;
  const selectedCategoryId = categoryId ?? subcategories?.find(sub => sub.id === selectedSubcategoryId)?.category ?? null;
  const filteredSubcategories = subcategories?.filter((s) => s.category === selectedCategoryId) ?? [];
  const filteredProductTypes = productTypes?.filter((pt) => pt.subcategory === selectedSubcategoryId) ?? [];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div className="space-y-2">
        <Label>Categoría</Label>
        <Select
          value={selectedCategoryId?.toString() ?? ''}
          onValueChange={(val) => {
            onCategoryChange(Number(val));
            onSubcategoryChange(null);
            onProductTypeChange(null);
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Seleccionar" />
          </SelectTrigger>
          <SelectContent>
            {categories?.map((cat) => (
              <SelectItem key={cat.id} value={cat.id.toString()}>
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Subcategoría</Label>
        <Select
          value={selectedSubcategoryId?.toString() ?? ''}
          onValueChange={(val) => {
            onSubcategoryChange(Number(val));
            onProductTypeChange(null);
          }}
          disabled={!selectedCategoryId}
        >
          <SelectTrigger>
            <SelectValue placeholder="Seleccionar" />
          </SelectTrigger>
          <SelectContent>
            {filteredSubcategories.map((sub) => (
              <SelectItem key={sub.id} value={sub.id.toString()}>
                {sub.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Tipo de producto</Label>
        <Select
          value={productTypeId?.toString() ?? ''}
          onValueChange={(val) => onProductTypeChange(Number(val))}
          disabled={!selectedSubcategoryId}
        >
          <SelectTrigger>
            <SelectValue placeholder="Seleccionar" />
          </SelectTrigger>
          <SelectContent>
            {filteredProductTypes.map((pt) => (
              <SelectItem key={pt.id} value={pt.id.toString()}>
                {pt.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}