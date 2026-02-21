import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { useBusinessStore } from '@shared/store/useBusinessStore';
import { useCartStore } from '../../store/useCartStore';
import {
    Search, Package, Scissors, Coffee, Shirt,
    Zap, Star, Gift, Tag, ShoppingBag, Briefcase,
    Wrench, Car, PenTool, Smile
} from 'lucide-react';

// --- 1. DICCIONARIO DE ICONOS ---
// Aquí definimos qué iconos están disponibles para el sistema
const ICON_MAP: Record<string, React.ElementType> = {
    package: Package,
    scissors: Scissors,
    coffee: Coffee,
    shirt: Shirt,
    zap: Zap,
    star: Star,
    gift: Gift,
    tag: Tag,
    bag: ShoppingBag,
    briefcase: Briefcase,
    wrench: Wrench,
    car: Car,
    tool: PenTool,
    smile: Smile
};

// --- 2. COLOR PALETTE POR CATEGORÍA ---
// Paleta de colores vibrantes y modernos
const COLOR_THEMES = [
    {
        name: 'blue',
        gradient: { light: 'from-blue-50 via-blue-50/80 to-cyan-50', dark: 'dark:from-blue-950/40 dark:via-slate-900 dark:to-cyan-950/30' },
        icon: { light: 'from-blue-400/20 to-cyan-400/20 border-blue-300/30 text-blue-700', dark: 'dark:border-blue-600/30 dark:text-blue-300 group-hover:from-blue-500/30 group-hover:to-cyan-500/30' },
        border: { light: 'border-blue-200/60 hover:border-blue-400', dark: 'dark:border-blue-800/50 dark:hover:border-blue-600' },
        price: { light: 'bg-blue-100/50 text-blue-900', dark: 'dark:bg-blue-900/20 dark:text-blue-200' },
        shine: 'from-transparent via-blue-200/10 to-transparent',
        bottomBar: 'from-blue-500 via-cyan-500 to-blue-500'
    },
    {
        name: 'purple',
        gradient: { light: 'from-purple-50 via-purple-50/80 to-pink-50', dark: 'dark:from-purple-950/40 dark:via-slate-900 dark:to-pink-950/30' },
        icon: { light: 'from-purple-400/20 to-pink-400/20 border-purple-300/30 text-purple-700', dark: 'dark:border-purple-600/30 dark:text-purple-300 group-hover:from-purple-500/30 group-hover:to-pink-500/30' },
        border: { light: 'border-purple-200/60 hover:border-purple-400', dark: 'dark:border-purple-800/50 dark:hover:border-purple-600' },
        price: { light: 'bg-purple-100/50 text-purple-900', dark: 'dark:bg-purple-900/20 dark:text-purple-200' },
        shine: 'from-transparent via-purple-200/10 to-transparent',
        bottomBar: 'from-purple-500 via-pink-500 to-purple-500'
    },
    {
        name: 'emerald',
        gradient: { light: 'from-emerald-50 via-emerald-50/80 to-teal-50', dark: 'dark:from-emerald-950/40 dark:via-slate-900 dark:to-teal-950/30' },
        icon: { light: 'from-emerald-400/20 to-teal-400/20 border-emerald-300/30 text-emerald-700', dark: 'dark:border-emerald-600/30 dark:text-emerald-300 group-hover:from-emerald-500/30 group-hover:to-teal-500/30' },
        border: { light: 'border-emerald-200/60 hover:border-emerald-400', dark: 'dark:border-emerald-800/50 dark:hover:border-emerald-600' },
        price: { light: 'bg-emerald-100/50 text-emerald-900', dark: 'dark:bg-emerald-900/20 dark:text-emerald-200' },
        shine: 'from-transparent via-emerald-200/10 to-transparent',
        bottomBar: 'from-emerald-500 via-teal-500 to-emerald-500'
    },
    {
        name: 'amber',
        gradient: { light: 'from-amber-50 via-amber-50/80 to-orange-50', dark: 'dark:from-amber-950/40 dark:via-slate-900 dark:to-orange-950/30' },
        icon: { light: 'from-amber-400/20 to-orange-400/20 border-amber-300/30 text-amber-700', dark: 'dark:border-amber-600/30 dark:text-amber-300 group-hover:from-amber-500/30 group-hover:to-orange-500/30' },
        border: { light: 'border-amber-200/60 hover:border-amber-400', dark: 'dark:border-amber-800/50 dark:hover:border-amber-600' },
        price: { light: 'bg-amber-100/50 text-amber-900', dark: 'dark:bg-amber-900/20 dark:text-amber-200' },
        shine: 'from-transparent via-amber-200/10 to-transparent',
        bottomBar: 'from-amber-500 via-orange-500 to-amber-500'
    },
    {
        name: 'rose',
        gradient: { light: 'from-rose-50 via-rose-50/80 to-pink-50', dark: 'dark:from-rose-950/40 dark:via-slate-900 dark:to-pink-950/30' },
        icon: { light: 'from-rose-400/20 to-pink-400/20 border-rose-300/30 text-rose-700', dark: 'dark:border-rose-600/30 dark:text-rose-300 group-hover:from-rose-500/30 group-hover:to-pink-500/30' },
        border: { light: 'border-rose-200/60 hover:border-rose-400', dark: 'dark:border-rose-800/50 dark:hover:border-rose-600' },
        price: { light: 'bg-rose-100/50 text-rose-900', dark: 'dark:bg-rose-900/20 dark:text-rose-200' },
        shine: 'from-transparent via-rose-200/10 to-transparent',
        bottomBar: 'from-rose-500 via-pink-500 to-rose-500'
    },
    {
        name: 'indigo',
        gradient: { light: 'from-indigo-50 via-indigo-50/80 to-violet-50', dark: 'dark:from-indigo-950/40 dark:via-slate-900 dark:to-violet-950/30' },
        icon: { light: 'from-indigo-400/20 to-violet-400/20 border-indigo-300/30 text-indigo-700', dark: 'dark:border-indigo-600/30 dark:text-indigo-300 group-hover:from-indigo-500/30 group-hover:to-violet-500/30' },
        border: { light: 'border-indigo-200/60 hover:border-indigo-400', dark: 'dark:border-indigo-800/50 dark:hover:border-indigo-600' },
        price: { light: 'bg-indigo-100/50 text-indigo-900', dark: 'dark:bg-indigo-900/20 dark:text-indigo-200' },
        shine: 'from-transparent via-indigo-200/10 to-transparent',
        bottomBar: 'from-indigo-500 via-violet-500 to-indigo-500'
    }
];

// Mapa de categorías a temas
const categoryColorMap = new Map<string, typeof COLOR_THEMES[0]>();

// Función helper para obtener colores por categoría
const getThemeForCategory = (categoryId: string | undefined, serviceType: 'PRODUCT' | 'SERVICE') => {
    if (!categoryId) {
        return serviceType === 'PRODUCT' ? COLOR_THEMES[0] : COLOR_THEMES[1];
    }

    if (categoryColorMap.has(categoryId)) {
        return categoryColorMap.get(categoryId)!;
    }

    // Asignar tema basado en hash del ID
    const hash = categoryId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const themeIndex = hash % COLOR_THEMES.length;
    const theme = COLOR_THEMES[themeIndex];

    categoryColorMap.set(categoryId, theme);
    return theme;
};

// --- Tipos ---
interface ProductItem {
    id: string;
    name: string;
    price: number;
    stock?: number;
    category_id?: string;
    icon?: string; // Nuevo campo
    service_type: 'PRODUCT' | 'SERVICE';
}

export const POSProductGrid = () => {
    const [items, setItems] = useState<ProductItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    const businessId = useBusinessStore(state => state.id);
    const { addItem, activeCategoryId } = useCartStore();

    // --- Fetch Data ---
    useEffect(() => {
        const fetchData = async () => {
            if (!businessId) return;

            try {
                setLoading(true);

                // A. Productos (Pedimos el icono)
                const { data: productsData, error: productsError } = await supabase
                    .from('products')
                    .select('id, name, price, stock, category_id, icon')
                    .eq('business_id', businessId)
                    .eq('active', true);

                if (productsError) throw productsError;

                // B. Servicios (Pedimos el icono)
                const { data: servicesData, error: servicesError } = await supabase
                    .from('services')
                    .select('id, name, price, category_id, icon')
                    .eq('business_id', businessId)
                    .eq('active', true);

                if (servicesError) throw servicesError;

                const formattedProducts: ProductItem[] = (productsData || []).map(p => ({
                    ...p, service_type: 'PRODUCT'
                }));

                const formattedServices: ProductItem[] = (servicesData || []).map(s => ({
                    ...s, service_type: 'SERVICE'
                }));

                setItems([...formattedProducts, ...formattedServices]);

            } catch (error) {
                console.error('Error loading data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [businessId, refreshTrigger]);

    // Listen for sale completion events to refresh products
    useEffect(() => {
        const handleSaleComplete = () => {
            console.log('🔄 Sale completed, refreshing product grid...');
            setRefreshTrigger(prev => prev + 1);
        };

        window.addEventListener('saleCompleted', handleSaleComplete);
        return () => window.removeEventListener('saleCompleted', handleSaleComplete);
    }, []);

    // --- Filtros ---
    const filteredItems = useMemo(() => {
        return items.filter(item => {
            const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesCategory = activeCategoryId
                ? item.category_id === activeCategoryId
                : true;
            return matchesSearch && matchesCategory;
        });
    }, [items, searchTerm, activeCategoryId]);

    // --- Helper para renderizar icono ---
    const renderIcon = (iconName: string | undefined, type: string) => {
        // Buscamos en el mapa, si no existe usamos el default según tipo
        const IconComponent = ICON_MAP[iconName || ''] || (type === 'PRODUCT' ? Package : Scissors);
        return <IconComponent size={28} strokeWidth={1.5} />;
    };

    if (loading) {
        return (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className="h-40 bg-gray-100 dark:bg-slate-700 rounded-2xl animate-pulse" />
                ))}
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-gray-50 dark:bg-slate-900">
            {/* Buscador Estilizado */}
            <div className="p-4 sticky top-0 z-10 bg-gray-50/95 dark:bg-slate-900/95 backdrop-blur-sm">
                <div className="relative max-w-2xl mx-auto">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input
                        type="text"
                        placeholder="Buscar productos..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-white dark:bg-slate-800 border-0 shadow-sm ring-1 ring-gray-200 dark:ring-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-gray-700 dark:text-gray-200 placeholder:text-gray-400"
                    />
                </div>
            </div>

            {/* Grid de Tarjetas Premium */}
            <div className="flex-1 overflow-y-auto p-4 scrollbar-hide">
                {filteredItems.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                        <Package size={48} className="mb-2 opacity-20" />
                        <p>No se encontraron resultados</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 pb-24">
                        {filteredItems.map((item) => {
                            const isProduct = item.service_type === 'PRODUCT';
                            const hasStock = !isProduct || (item.stock && item.stock > 0);
                            const theme = getThemeForCategory(item.category_id, item.service_type);

                            return (
                                <div
                                    key={item.id}
                                    onClick={() => {
                                        if (hasStock) {
                                            const type = item.service_type === 'PRODUCT' ? 'product' : 'service';
                                            addItem(item as any, type);
                                        }
                                    }}
                                    className={`
                    relative group flex flex-col justify-between p-5 h-full min-h-[180px]
                    rounded-2xl overflow-hidden
                    transition-all duration-300 ease-out
                    select-none cursor-pointer
                    bg-gradient-to-br ${theme.gradient.light} ${theme.gradient.dark}
                    ${hasStock
                                            ? `shadow-md hover:shadow-2xl hover:-translate-y-2 active:scale-[0.98] border-2 ${theme.border.light} ${theme.border.dark}`
                                            : 'opacity-50 cursor-not-allowed grayscale border-2 border-gray-200 dark:border-gray-700'}
                  `}
                                >
                                    {/* Gradient Overlay Effect */}
                                    <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none ${isProduct
                                        ? 'bg-gradient-to-t from-blue-500/5 to-transparent'
                                        : 'bg-gradient-to-t from-purple-500/5 to-transparent'
                                        }`} />

                                    {/* Badge de Stock (Flotante) */}
                                    {isProduct && (
                                        <div className={`
                      absolute top-3 right-3 text-[11px] font-black px-2.5 py-1.5 rounded-xl z-10 shadow-lg
                      ${hasStock
                                                ? 'bg-gradient-to-r from-emerald-500 to-green-500 text-white'
                                                : 'bg-gradient-to-r from-red-500 to-rose-500 text-white'}
                    `}>
                                            {hasStock ? `${item.stock}` : 'AGOTADO'}
                                        </div>
                                    )}

                                    {/* Icono Central con Efecto Glassmorphism */}
                                    <div className="flex justify-center mb-4 mt-1">
                                        <div className={`
                      p-6 rounded-3xl transition-all duration-300 backdrop-blur-sm
                      shadow-lg group-hover:shadow-xl group-hover:scale-110
                      bg-gradient-to-br ${theme.icon.light} ${theme.icon.dark}
                    `}>
                                            {renderIcon(item.icon, item.service_type)}
                                        </div>
                                    </div>

                                    {/* Información */}
                                    <div className="text-center space-y-2 relative z-10">
                                        <h3 className="font-bold text-gray-900 dark:text-white text-[15px] leading-snug line-clamp-2 h-10 flex items-center justify-center px-1 drop-shadow-sm">
                                            {item.name}
                                        </h3>

                                        <div className={`pt-3 mt-2 rounded-xl ${theme.price.light} ${theme.price.dark} backdrop-blur-sm`}>
                                            <p className={`text-xl font-black tracking-tight py-2 drop-shadow-sm`}>
                                                ${item.price.toLocaleString()}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Efecto de brillo al hacer hover */}
                                    <div className={`
                    absolute bottom-0 left-0 right-0 h-1 rounded-b-2xl
                    bg-gradient-to-r ${theme.bottomBar}
                    opacity-0 group-hover:opacity-100 transition-opacity shadow-lg
                  `} />

                                    {/* Shine effect on hover */}
                                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
                                        <div className={`absolute inset-0 bg-gradient-to-tr ${theme.shine} translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700`} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};
