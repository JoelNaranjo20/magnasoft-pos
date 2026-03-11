import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useBusinessStore } from '@shared/store/useBusinessStore';
import { Scissors, Hash } from 'lucide-react';

interface ServiceRank {
    name: string;
    count: number;
    percentage: number;
}

export const CategorySalesSummary = () => {
    const [data, setData] = useState<ServiceRank[]>([]);
    const [loading, setLoading] = useState(true);
    const [totalServices, setTotalServices] = useState(0);
    const businessId = useBusinessStore(state => state.id);

    useEffect(() => {
        // DEBUG: Confirm component mount and business ID
        console.log('[CategorySalesSummary] Component mounted. Business ID:', businessId);

        if (!businessId) {
            console.warn('[CategorySalesSummary] No business ID found. Waiting...');
            return;
        }

        const fetchServices = async () => {
            try {
                setLoading(true);
                setData([]);

                // 1. Rango: HOY
                const start = new Date(); start.setHours(0, 0, 0, 0);
                const end = new Date(); end.setHours(23, 59, 59, 999);

                console.log('[CategorySalesSummary] Fetching services for range:', { start: start.toISOString(), end: end.toISOString() });

                // 2. CONSULTA ESTRICTA: Solo Servicios (services!inner fuerza que sea servicio)
                // Traemos el nombre del servicio o su categoría, según prefieras agrupar.
                const { data: sales, error } = await supabase
                    .from('sale_items')
                    .select(`
            quantity,
            created_at,
            services!inner ( 
              name, 
              category:categories ( name ) 
            )
          `)
                    .eq('business_id', businessId)
                    .gte('created_at', start.toISOString())
                    .lte('created_at', end.toISOString());

                if (error) {
                    console.error('[CategorySalesSummary] Supabase Error:', error);
                    throw error;
                }

                console.log('[CategorySalesSummary] Sales fetched:', sales?.length, sales);

                // 3. Agrupar por Nombre del Servicio
                const groups: Record<string, number> = {};
                let totalCount = 0;
                let maxCount = 0;

                sales?.forEach((item: any) => {
                    const serviceName = item.services?.name || 'Servicio General';
                    const qty = item.quantity || 1;

                    groups[serviceName] = (groups[serviceName] || 0) + qty;
                    totalCount += qty;

                    if (groups[serviceName] > maxCount) maxCount = groups[serviceName];
                });

                console.log('[CategorySalesSummary] Processed groups:', groups);

                setTotalServices(totalCount);

                // 4. Convertir a Array y Ordenar
                const result = Object.entries(groups)
                    .map(([name, count]) => ({
                        name,
                        count,
                        percentage: maxCount > 0 ? (count / maxCount) * 100 : 0
                    }))
                    .sort((a, b) => b.count - a.count);

                setData(result);
                console.log('[CategorySalesSummary] Final Data:', result);

            } catch (err) {
                console.error('[CategorySalesSummary] Catch Error:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchServices();
    }, [businessId]);

    // Colores para las barras (Top 3 destacados)
    const getBarColor = (index: number) => {
        switch (index) {
            case 0: return 'bg-purple-600'; // Top 1
            case 1: return 'bg-purple-400'; // Top 2
            case 2: return 'bg-purple-300'; // Top 3
            default: return 'bg-gray-200';  // Resto
        }
    };

    if (loading) return (
        <div className="h-full bg-gray-50 rounded-xl animate-pulse min-h-[200px] flex items-center justify-center">
            <p className="text-xs text-gray-400">Cargando servicios...</p>
        </div>
    );

    return (
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 h-full flex flex-col relative">
            {/* DEBUG INDICATOR */}
            {/* <div className="absolute top-0 right-0 p-1 bg-red-500 text-white text-[10px] z-50">V: DEBUG</div> */}

            {/* Encabezado Limpio: Solo Servicios */}
            <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                    <div className="p-1.5 bg-purple-50 text-purple-600 rounded-lg">
                        <Scissors size={18} />
                    </div>
                    Servicios Realizados
                </h3>
                <span className="text-xl font-black text-gray-900 bg-gray-50 px-3 py-1 rounded-lg border border-gray-100">
                    {totalServices}
                </span>
            </div>

            {/* Lista de Barras */}
            <div className="flex-1 overflow-y-auto space-y-5 pr-2 custom-scrollbar">
                {data.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-32 text-gray-400">
                        <Hash className="mb-2 opacity-20" size={32} />
                        <p className="text-sm">Sin servicios hoy</p>
                        <p className="text-[10px] text-gray-300 mt-2">({new Date().toLocaleDateString()})</p>
                    </div>
                ) : (
                    data.map((item, index) => (
                        <div key={item.name} className="flex flex-col gap-1.5 w-full">

                            {/* Texto: Nombre ... Cantidad */}
                            <div className="flex justify-between items-end w-full px-1">
                                <span className="font-semibold text-gray-600 text-sm">
                                    {item.name}
                                </span>
                                <span className="font-bold text-gray-900 text-base">
                                    {item.count}
                                </span>
                            </div>

                            {/* Barra de Progreso */}
                            <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                                <div
                                    className={`h-full rounded-full transition-all duration-700 ease-out ${getBarColor(index)}`}
                                    style={{ width: `${item.percentage}%` }}
                                />
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};
