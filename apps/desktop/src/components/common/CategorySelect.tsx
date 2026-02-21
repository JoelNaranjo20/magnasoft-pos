// @ts-nocheck
import React from 'react';
import { useCategories } from '../../hooks/useCategories';
import { useBusinessStore } from '@shared/store/useBusinessStore';

interface CategorySelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
    label?: string;
    error?: string;
}

export const CategorySelect: React.FC<CategorySelectProps> = ({
    label = "Categoría",
    error,
    className = '',
    ...props
}) => {
    // Get business ID automatically from store
    const businessId = useBusinessStore(state => state.id);
    const { categories, loading } = useCategories(businessId);

    return (
        <div className="flex flex-col gap-1 w-full">
            {label && (
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    {label}
                </label>
            )}

            <select
                className={`
          w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-800 
          text-slate-900 dark:text-white
          focus:ring-2 focus:ring-primary focus:border-primary
          transition-colors
          ${error ? 'border-red-500' : 'border-slate-300 dark:border-slate-600'}
          ${loading ? 'opacity-50 cursor-wait' : ''}
          ${className}
        `}
                disabled={loading || props.disabled}
                {...props}
            >
                <option value="">Seleccionar categoría...</option>

                {loading ? (
                    <option disabled>Cargando...</option>
                ) : categories.length > 0 ? (
                    categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                            {cat.name}
                        </option>
                    ))
                ) : (
                    <option disabled>No hay categorías creadas</option>
                )}
            </select>

            {error && (
                <span className="text-xs text-red-500">{error}</span>
            )}
        </div>
    );
};
