import React, { useMemo } from 'react';
import { Scissors, Hash } from 'lucide-react';

interface SummaryProps {
    stats: {
        totalSales: number;      // Ignored for clean UI
        totalServices: number;   // Main header count
        totalProducts: number;   // Ignored for clean UI
        serviceBreakdown?: { name: string; count: number }[]; // Source data
    };
    loading?: boolean;
}

export const OperationalSummary: React.FC<SummaryProps> = ({ stats, loading }) => {

    // 1. Process Data for Visualization
    const data = useMemo(() => {
        if (!stats.serviceBreakdown) return [];

        // Sort descending by count
        const sorted = [...stats.serviceBreakdown].sort((a, b) => b.count - a.count);

        // Find max for percentage calculation
        const maxCount = sorted.length > 0 ? sorted[0].count : 0;

        return sorted.map((item, index) => ({
            ...item,
            percentage: maxCount > 0 ? (item.count / maxCount) * 100 : 0,
            rank: index
        }));
    }, [stats.serviceBreakdown]);

    // Calculate total services from breakdown if not provided correctly, or use prop
    const totalServices = stats.serviceBreakdown
        ? stats.serviceBreakdown.reduce((acc, curr) => acc + curr.count, 0)
        : stats.totalServices;

    // Colores para las barras (Top 3 destacados)
    const getBarColor = (index: number) => {
        switch (index) {
            case 0: return 'bg-purple-600'; // Top 1
            case 1: return 'bg-purple-400'; // Top 2
            case 2: return 'bg-purple-300'; // Top 3
            default: return 'bg-gray-200';  // Resto
        }
    };

    if (loading) return <div className="h-full bg-gray-50 rounded-xl animate-pulse min-h-[200px]" />;

    return (
        <div className="h-full flex flex-col">

            {/* Encabezado Limpio: Solo Servicios */}
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
                        <Scissors size={20} />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-sm font-bold text-gray-400 uppercase tracking-wider">Servicios</span>
                        <span className="font-bold text-gray-800 text-base leading-none">Realizados Hoy</span>
                    </div>
                </div>
                <span className="text-2xl font-black text-gray-900 bg-gray-50 px-4 py-2 rounded-xl border border-gray-100">
                    {totalServices}
                </span>
            </div>

            {/* Lista de Barras */}
            <div className="flex-1 overflow-y-auto space-y-5 pr-2 custom-scrollbar max-h-[300px]">
                {data.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-32 text-gray-400">
                        <Hash className="mb-2 opacity-20" size={32} />
                        <p className="text-sm">Sin servicios registrados</p>
                    </div>
                ) : (
                    data.map((item, index) => (
                        <div key={item.name} className="flex flex-col gap-1.5 w-full group">

                            {/* Texto: Nombre ... Cantidad */}
                            <div className="flex justify-between items-end w-full px-1">
                                <span className="font-semibold text-gray-600 text-sm group-hover:text-purple-600 transition-colors">
                                    {index + 1}. {item.name}
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
