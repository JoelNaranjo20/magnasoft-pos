'use client';

import * as LucideIcons from 'lucide-react';

// Type definitions
type IconName = keyof typeof LucideIcons;

export interface KPIWidget {
    id?: string;
    type: 'kpi';
    title: string; // User might override this
    label?: string; // Original label from catalog
    icon: string;
    value: number | string;
    query?: string;
    data?: any; // The actual fetched data
}

export interface ChartWidget {
    id?: string;
    type: 'chart';
    title: string;
    label?: string;
    chartType: 'bar' | 'line' | 'pie';
    query?: string;
    data?: any[];
}

export interface TableColumn {
    key: string;
    label: string;
}

export interface TableWidget {
    id?: string;
    type: 'table';
    title: string;
    label?: string;
    columns: TableColumn[];
    query?: string;
    data?: any[];
}

export type DashboardWidget = KPIWidget | ChartWidget | TableWidget;

interface DashboardRendererProps {
    widgets: DashboardWidget[];
    isPreview?: boolean;
}

// Helper to get random mock data for preview
const getMockValue = (type: 'kpi' | 'chart' | 'table', widget: any) => {
    if (type === 'kpi') return Math.floor(Math.random() * 1000);
    if (type === 'chart') return [
        { date: '2023-01-01', count: 12 },
        { date: '2023-01-02', count: 19 },
        { date: '2023-01-03', count: 3 },
        { date: '2023-01-04', count: 5 },
    ];
    if (type === 'table') {
        const columns = widget.columns || [];
        return Array(3).fill(0).map((_, i) => {
            const row: any = {};
            columns.forEach((col: any) => {
                row[col.key] = `Data ${i + 1}`;
            });
            return row;
        });
    }
    return null;
};

// KPI Card Component
function KPICard({ widget, isPreview }: { widget: KPIWidget, isPreview?: boolean }) {
    const IconComponent = LucideIcons[widget.icon as IconName] as React.ComponentType<any> || LucideIcons.HelpCircle;

    let displayValue = widget.data ?? widget.value ?? 0;

    if (isPreview) {
        displayValue = getMockValue('kpi', widget);
    } else {
        // If data is an object with a single value, extract it
        displayValue = typeof displayValue === 'object' && displayValue !== null
            ? Object.values(displayValue)[0]
            : displayValue;
    }

    return (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md transition-all">
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    {widget.title || widget.label}
                </h3>
                <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
                    <IconComponent className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                </div>
            </div>
            <p className="text-3xl font-black text-slate-900 dark:text-white">
                {typeof displayValue === 'number' ? displayValue.toLocaleString() : displayValue}
            </p>
        </div>
    );
}

// Table Component
function DataTable({ widget, isPreview }: { widget: TableWidget, isPreview?: boolean }) {
    let tableData = Array.isArray(widget.data) ? widget.data : [];

    if (isPreview) {
        tableData = getMockValue('table', widget) as any[];
    }

    return (
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-700">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    {widget.title || widget.label}
                </h3>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-slate-50 dark:bg-slate-900/50">
                        <tr>
                            {widget.columns.map((col) => (
                                <th
                                    key={col.key}
                                    className="px-4 py-3 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider"
                                >
                                    {col.label}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                        {tableData.length > 0 ? (
                            tableData.map((row, idx) => (
                                <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                    {widget.columns.map((col) => (
                                        <td
                                            key={col.key}
                                            className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300 whitespace-nowrap"
                                        >
                                            {row[col.key] ?? '-'}
                                        </td>
                                    ))}
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td
                                    colSpan={widget.columns.length}
                                    className="px-4 py-8 text-center text-sm text-slate-500 dark:text-slate-400"
                                >
                                    No hay datos disponibles
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// Chart Component
function ChartRenderer({ widget, isPreview }: { widget: ChartWidget, isPreview?: boolean }) {
    return (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4">
                {widget.title || widget.label}
            </h3>
            <div className="h-64 flex items-center justify-center text-slate-400 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                <div className="text-center">
                    <span className="material-symbols-outlined text-4xl mb-2">bar_chart</span>
                    <p className="text-xs font-medium">Gráfico: {widget.chartType}</p>
                    {isPreview && <p className="text-[10px] mt-1 text-slate-500">(Vista Previa)</p>}
                </div>
            </div>
        </div>
    );
}

export default function DashboardRenderer({ widgets, isPreview = false }: DashboardRendererProps) {
    if (!widgets || widgets.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                <span className="material-symbols-outlined text-4xl mb-2 text-slate-300 dark:text-slate-600">dashboard_customize</span>
                <p>No hay widgets configurados</p>
                {isPreview && <p className="text-sm mt-1">Selecciona widgets del menú para comenzar</p>}
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {widgets
                    .filter((w) => w.type === 'kpi')
                    .map((widget, idx) => (
                        <KPICard
                            key={idx}
                            widget={widget as KPIWidget}
                            isPreview={isPreview}
                        />
                    ))}
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {widgets
                    .filter((w) => w.type === 'chart')
                    .map((widget, idx) => (
                        <ChartRenderer
                            key={idx}
                            widget={widget as ChartWidget}
                            isPreview={isPreview}
                        />
                    ))}
            </div>

            {/* Tables */}
            <div className="grid grid-cols-1 gap-6">
                {widgets
                    .filter((w) => w.type === 'table')
                    .map((widget, idx) => (
                        <DataTable
                            key={idx}
                            widget={widget as TableWidget}
                            isPreview={isPreview}
                        />
                    ))}
            </div>
        </div>
    );
}
