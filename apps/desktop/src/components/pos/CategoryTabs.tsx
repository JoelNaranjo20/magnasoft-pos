
import { useCartStore } from '../../store/useCartStore';
import { useCategories } from '../../hooks/useCategories';
import { useBusinessStore } from '@shared/store/useBusinessStore';
import { Grid } from 'lucide-react';

export const CategoryTabs = () => {
    // 1. Obtener datos
    const businessId = useBusinessStore(state => state.id);
    const { categories, loading } = useCategories(businessId || undefined);
    const { activeCategoryId, setActiveCategoryId } = useCartStore();

    if (loading) return <div className="h-12 bg-slate-100 dark:bg-slate-800 animate-pulse w-full" />;

    return (
        <div className="w-full bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 px-4 py-2.5 z-10 transition-colors">
            {/* Contenedor con Flex Wrap para permitir múltiples filas de categorías compactas */}
            <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto w-full pb-1 pr-1 custom-scrollbar">

                {/* Botón: Todo */}
                <button
                    onClick={() => setActiveCategoryId(null)}
                    className={`
            flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-200 border
            focus:outline-none focus:ring-2 focus:ring-primary/30
            ${activeCategoryId === null
                            ? 'bg-gradient-to-r from-primary to-blue-600 text-white border-transparent shadow-md shadow-primary/20'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                        }
          `}
                >
                    <Grid size={14} />
                    Todo
                </button>

                {/* Separador vertical visual minificado */}
                <div className="h-5 w-px bg-slate-200/60 dark:bg-white/10 mx-0.5 self-center" />

                {/* Lista de Categorías Dinámicas */}
                {categories.map((cat) => (
                    <button
                        key={cat.id}
                        onClick={() => setActiveCategoryId(cat.id)}
                        className={`
              focus:outline-none focus:ring-2 focus:ring-primary/30
              px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all duration-200 border
              ${activeCategoryId === cat.id
                                ? 'bg-gradient-to-r from-primary to-blue-600 text-white border-transparent shadow-md shadow-primary/20'
                                : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-350 border-slate-200/60 dark:border-white/5 hover:bg-slate-100 dark:hover:bg-slate-700 hover:border-primary/30 dark:hover:border-primary/20'
                            }
            `}
                    >
                        {cat.name}
                    </button>
                ))}

                {categories.length === 0 && (
                    <span className="text-xs text-slate-400 italic">Sin categorías</span>
                )}
            </div>
        </div>
    );
};
