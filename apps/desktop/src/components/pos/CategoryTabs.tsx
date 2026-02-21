
import { useCartStore } from '../../store/useCartStore';
import { useCategories } from '../../hooks/useCategories';
import { useBusinessStore } from '@shared/store/useBusinessStore';
import { Grid } from 'lucide-react';

export const CategoryTabs = () => {
    // 1. Obtener datos
    const businessId = useBusinessStore(state => state.id);
    const { categories, loading } = useCategories(businessId);
    const { activeCategoryId, setActiveCategoryId } = useCartStore();

    if (loading) return <div className="h-14 bg-gray-50 animate-pulse w-full mb-2 rounded-lg" />;

    return (
        <div className="w-full bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 px-4 py-3 shadow-sm z-10 transition-colors">
            {/* Contenedor con Scroll Horizontal (hide-scrollbar es opcional si tienes esa clase) */}
            <div className="flex items-center gap-3 overflow-x-auto pb-1 scrollbar-hide">

                {/* Botón: Todo */}
                <button
                    onClick={() => setActiveCategoryId(null)}
                    className={`
            flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all border
            ${activeCategoryId === null
                            ? 'bg-blue-600 text-white border-blue-600 shadow-md transform scale-105'
                            : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-slate-300 border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700 hover:border-gray-300 dark:hover:border-slate-600'
                        }
          `}
                >
                    <Grid size={16} />
                    Todo
                </button>

                {/* Separador vertical visual */}
                <div className="h-6 w-px bg-gray-300 dark:bg-slate-700 mx-1" />

                {/* Lista de Categorías Dinámicas */}
                {categories.map((cat) => (
                    <button
                        key={cat.id}
                        onClick={() => setActiveCategoryId(cat.id)}
                        className={`
              px-5 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all border
              ${activeCategoryId === cat.id
                                ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                                : 'bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-300 border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700 hover:border-blue-300 dark:hover:border-blue-500'
                            }
            `}
                    >
                        {cat.name}
                    </button>
                ))}

                {categories.length === 0 && (
                    <span className="text-xs text-gray-400 italic">Sin categorías</span>
                )}
            </div>
        </div>
    );
};
