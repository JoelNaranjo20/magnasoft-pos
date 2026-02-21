'use client';

import { useState, useMemo, useEffect } from 'react';
import * as LucideIcons from 'lucide-react';
import { WIDGET_CATALOG, INDUSTRY_PRESETS } from '@/app/constants/WidgetCatalog';
import { MODULE_REGISTRY, INDUSTRY_PRESETS as MODULE_PRESETS } from '@/app/constants/ModuleRegistry';
import DashboardRenderer from '@/app/components/DashboardRenderer';

interface DashboardBuilderModalProps {
    businessId: string;
    currentType: string;
    // can be null if user has no config yet
    currentConfig: any[];
    operationalConfig?: any; // The POS runtime config
    isOpen: boolean;
    onClose: () => void;
    onSave: (config: any[], newType: string) => Promise<void>;
}

// Map MODULE_REGISTRY to array for UI
const MODULE_DEFINITIONS = Object.values(MODULE_REGISTRY);

const DEFAULT_MODULES: Record<string, boolean> = Object.keys(MODULE_REGISTRY).reduce((acc, key) => {
    acc[MODULE_REGISTRY[key as keyof typeof MODULE_REGISTRY].id] = MODULE_REGISTRY[key as keyof typeof MODULE_REGISTRY].default;
    return acc;
}, {} as Record<string, boolean>);

// Industry Definitions for UI Cards
const INDUSTRIES = [
    {
        id: 'barbershop',
        label: 'Barbería',
        icon: 'scissors',
        description: 'Gestión de turnos, barberos top y venta de productos.',
        color: 'bg-orange-500'
    },
    {
        id: 'automotive',
        label: 'Automotriz',
        icon: 'car',
        description: 'Control de lavado, pista de vehículos y ticket promedio.',
        color: 'bg-blue-600'
    },
    {
        id: 'beauty_salon',
        label: 'Salón de Belleza',
        icon: 'sparkles',
        description: 'Agenda de citas, tratamientos activos y estilistas.',
        color: 'bg-pink-500'
    },
    {
        id: 'restaurant',
        label: 'Restaurante',
        icon: 'utensils',
        description: 'Mesas ocupadas, comandas en cocina y platos top.',
        color: 'bg-red-500'
    },
    {
        id: 'hotel',
        label: 'Hotel',
        icon: 'hotel',
        description: 'Check-ins/out, ocupación y huéspedes en casa.',
        color: 'bg-indigo-500'
    }
];

// Helper to get ALL catalog items in a flat list
const ALL_CATALOG_ITEMS = [
    ...WIDGET_CATALOG.kpis.map(w => ({ ...w, type: 'kpi' })),
    ...WIDGET_CATALOG.charts.map(w => ({ ...w, type: 'chart' })),
    ...WIDGET_CATALOG.tables.map(w => ({ ...w, type: 'table' })),
];

export default function DashboardBuilderModal({
    businessId,
    currentType,
    currentConfig,
    operationalConfig,
    isOpen,
    onClose,
    onSave
}: DashboardBuilderModalProps) {
    const [selectedIndustry, setSelectedIndustry] = useState<string>(currentType);
    const [isSaving, setIsSaving] = useState(false);
    const [activeTab, setActiveTab] = useState<'industry' | 'modules' | 'widgets'>('industry');

    // Default search/filter
    const [searchTerm, setSearchTerm] = useState('');

    // State for selected widgets - Initialize with current config
    const [selectedWidgets, setSelectedWidgets] = useState<any[]>(() => {
        if (!currentConfig || !Array.isArray(currentConfig)) return [];
        return currentConfig
            .filter(configItem => configItem.type !== 'modules') // Exclude module_config from widgets
            .map(configItem => {
                if (configItem.id) {
                    const catalogItem = ALL_CATALOG_ITEMS.find(i => i.id === configItem.id);
                    if (catalogItem) {
                        return { ...catalogItem, ...configItem, type: catalogItem.type };
                    }
                }
                return configItem;
            });
    });

    // State for module toggles - Initialize from currentConfig's module_config entry
    // Fallback to operationalConfig if missing in dashboard_config
    const [moduleConfig, setModuleConfig] = useState<Record<string, boolean>>(() => {
        if (currentConfig && Array.isArray(currentConfig)) {
            const existing = currentConfig.find((c: any) => c.type === 'modules');
            if (existing) {
                const { id, type, ...flags } = existing;
                return { ...DEFAULT_MODULES, ...flags };
            }
        }
        // Fallback: If dashboard_config doesn't have it, use operationalConfig
        if (operationalConfig) {
            return { ...DEFAULT_MODULES, ...operationalConfig };
        }
        return { ...DEFAULT_MODULES };
    });

    const handleToggleModule = (key: string) => {
        setModuleConfig(prev => ({ ...prev, [key]: !prev[key] }));
    };

    // Handle Industry Selection -> Auto-populate Presets
    const handleSelectIndustry = (industryId: string) => {
        // If clicking the same one, maybe deselect? No, just re-apply for now or do nothing.
        // Let's allow re-applying to "reset" to defaults.
        if (selectedIndustry === industryId) {
            // Optional: Allow deselecting? For now, assume user wants to switch or reset.
        }

        setSelectedIndustry(industryId);

        const presetIds = INDUSTRY_PRESETS[industryId] || [];

        // Map IDs to full widget objects
        const newWidgets = presetIds.map(id => {
            const catalogItem = ALL_CATALOG_ITEMS.find(item => item.id === id);
            if (!catalogItem) return null;
            return {
                ...catalogItem,
                title: catalogItem.label,
                icon: (catalogItem as any).defaultIcon || 'box',
                // Default layout could be added here if we had it in catalog, 
                // but simpler to let Renderer handle auto-layout or use defaults.
                // For now we just add the widget data.
                layout: (catalogItem as any).layout || { x: 0, y: 0, w: 4, h: 2 } // Mock layout
            };
        }).filter(Boolean);

        setSelectedWidgets(newWidgets as any[]);

        // Also update module toggles based on template defaults (Step 3 Sync)
        const presetModules = MODULE_PRESETS[industryId as keyof typeof MODULE_PRESETS] || {};
        setModuleConfig(prev => ({
            ...prev,
            ...presetModules
        }));
    };

    const handleToggleWidget = (catalogItem: any) => {
        const isSelected = selectedWidgets.some(w => w.id === catalogItem.id);

        if (isSelected) {
            setSelectedWidgets(prev => prev.filter(w => w.id !== catalogItem.id));
        } else {
            setSelectedWidgets(prev => [...prev, {
                ...catalogItem,
                type: catalogItem.type,
                title: catalogItem.label,
                icon: (catalogItem as any).defaultIcon || 'box',
                id: catalogItem.id,
                layout: { x: 0, y: 0, w: 4, h: 2 } // Default layout
            }]);
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const widgetConfig = selectedWidgets.map(w => ({
                id: w.id,
                type: w.type,
                title: w.title,
                icon: w.icon,
                value: w.value,
                query: w.query,
                chartType: w.chartType,
                columns: w.columns,
                layout: w.layout
            }));

            // Append module_config entry so changeBusinessType can extract it
            const moduleEntry = {
                id: 'module_config',
                type: 'modules',
                ...moduleConfig
            };

            const configToSave = [...widgetConfig, moduleEntry];

            await onSave(configToSave, selectedIndustry);
            onClose();
        } catch (error) {
            console.error("Failed to save", error);
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-[100] p-4 animate-in fade-in duration-300">
            <div className="bg-slate-50 dark:bg-slate-950 w-full max-w-7xl h-[90vh] rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col relative">

                {/* Header */}
                <div className="px-8 py-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-900 z-20">
                    <div>
                        <h2 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-3">
                            <span className="material-symbols-outlined text-indigo-500 scale-125">package_2</span>
                            Constructor de Paquetes
                        </h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                            Elige un <span className="font-bold text-indigo-500">Stack de Industria</span> para comenzar, y luego afina tu selección.
                        </p>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="px-6 py-3 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-bold text-sm transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black uppercase tracking-widest shadow-lg shadow-indigo-500/20 active:scale-95 transition-all flex items-center gap-2"
                        >
                            {isSaving ? 'Guardando...' : (
                                <>
                                    <span className="material-symbols-outlined">save</span>
                                    Aplicar Config
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 px-8">
                    <button
                        onClick={() => setActiveTab('industry')}
                        className={`py-4 px-6 font-bold text-sm border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'industry' ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                    >
                        <span className="material-symbols-outlined text-sm">factory</span>
                        Industria
                    </button>
                    <button
                        onClick={() => setActiveTab('modules')}
                        className={`py-4 px-6 font-bold text-sm border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'modules' ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                    >
                        <span className="material-symbols-outlined text-sm">view_module</span>
                        Módulos
                    </button>
                    <button
                        onClick={() => setActiveTab('widgets')}
                        className={`py-4 px-6 font-bold text-sm border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'widgets' ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                    >
                        <span className="material-symbols-outlined text-sm">dashboard</span>
                        Widgets
                    </button>
                </div>

                <div className="flex-1 overflow-hidden flex flex-col">

                    {/* TAB: INDUSTRY */}
                    {activeTab === 'industry' && (
                        <div className="px-8 py-6 bg-slate-100 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 overflow-x-auto">
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 sticky left-0">
                                1. Selecciona tu Industria
                            </h3>
                            <div className="flex gap-4 pb-2 min-w-max">
                                {INDUSTRIES.map((ind) => {
                                    const isSelected = selectedIndustry === ind.id;
                                    const Icon = LucideIcons[ind.icon as keyof typeof LucideIcons] as any || LucideIcons.Circle;

                                    return (
                                        <button
                                            key={ind.id}
                                            onClick={() => handleSelectIndustry(ind.id)}
                                            className={`group relative text-left w-72 p-5 rounded-2xl border-2 transition-all duration-300 ${isSelected
                                                ? 'bg-white dark:bg-slate-800 border-indigo-500 shadow-xl scale-105 ring-4 ring-indigo-500/10'
                                                : 'bg-white/50 dark:bg-slate-900/50 border-transparent hover:border-slate-300 dark:hover:border-slate-700 hover:bg-white dark:hover:bg-slate-800'
                                                }`}
                                        >
                                            <div className={`size-12 rounded-xl flex items-center justify-center mb-4 transition-colors ${isSelected ? ind.color + ' text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-500 group-hover:bg-slate-300 dark:group-hover:bg-slate-700'}`}>
                                                <Icon className="w-6 h-6" />
                                            </div>
                                            <h4 className={`text-lg font-black mb-1 ${isSelected ? 'text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-400'}`}>
                                                {ind.label}
                                            </h4>
                                            <p className="text-xs text-slate-500 dark:text-slate-500 leading-relaxed">
                                                {ind.description}
                                            </p>

                                            {isSelected && (
                                                <div className="absolute top-4 right-4">
                                                    <div className="size-6 bg-indigo-500 rounded-full flex items-center justify-center text-white">
                                                        <span className="material-symbols-outlined text-sm">check</span>
                                                    </div>
                                                </div>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* TAB: MODULES */}
                    {activeTab === 'modules' && (
                        <div className="flex-1 overflow-y-auto p-8 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">
                                Activa o desactiva los módulos
                            </h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {MODULE_DEFINITIONS.map((mod) => {
                                    const isEnabled = moduleConfig[mod.id] ?? false;
                                    return (
                                        <div
                                            key={mod.id}
                                            onClick={() => handleToggleModule(mod.id)}
                                            className={`cursor-pointer flex items-center gap-3 p-4 rounded-xl border-2 transition-all duration-200 shadow-sm ${isEnabled
                                                ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-500/50'
                                                : 'bg-slate-50 dark:bg-slate-800/50 border-transparent hover:border-slate-200 dark:hover:border-slate-700'
                                                }`}
                                        >
                                            <div className={`p-3 rounded-lg transition-colors ${isEnabled
                                                ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400'
                                                : 'bg-slate-200 dark:bg-slate-700 text-slate-400'
                                                }`}>
                                                <span className="material-symbols-outlined text-xl">{mod.icon}</span>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className={`text-sm font-bold truncate ${isEnabled ? 'text-slate-900 dark:text-white' : 'text-slate-500'}`}>
                                                    {mod.label}
                                                </p>
                                                <p className="text-xs text-slate-400 truncate">{mod.description}</p>
                                            </div>
                                            <div className={`w-10 h-6 rounded-full transition-colors relative flex-none ${isEnabled ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`}>
                                                <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform shadow-sm ${isEnabled ? 'translate-x-4' : 'translate-x-0'}`} />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* TAB: WIDGETS */}
                    {activeTab === 'widgets' && (
                        <div className="flex-1 overflow-y-auto p-8 bg-slate-50 dark:bg-slate-950">
                            <div className="max-w-7xl mx-auto">
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">
                                        Widgets Activos ({selectedWidgets.length})
                                    </h3>
                                    {/* Simple filter if needed */}
                                    <div className="relative">
                                        <span className="material-symbols-outlined absolute left-3 top-2.5 text-slate-400 text-sm">search</span>
                                        <input
                                            type="text"
                                            placeholder="Buscar widget..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="pl-9 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500 w-64"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-20">
                                    {ALL_CATALOG_ITEMS
                                        .filter(item =>
                                            item.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                            (item.tags && item.tags.some(t => t.toLowerCase().includes(searchTerm.toLowerCase())))
                                        )
                                        .map((item) => {
                                            const isSelected = selectedWidgets.some(w => w.id === item.id);
                                            const Icon = LucideIcons[(item as any).defaultIcon as keyof typeof LucideIcons] as any || LucideIcons.Circle;

                                            return (
                                                <div
                                                    key={item.id}
                                                    onClick={() => handleToggleWidget(item)}
                                                    className={`cursor-pointer group flex flex-col p-4 rounded-xl border-2 transition-all duration-200 ${isSelected
                                                        ? 'bg-white dark:bg-slate-900 border-indigo-500 shadow-lg'
                                                        : 'bg-white/50 dark:bg-slate-900/30 border-transparent hover:border-slate-200 dark:hover:border-slate-800'
                                                        }`}
                                                >
                                                    <div className="flex justify-between items-start mb-3">
                                                        <div className={`p-2 rounded-lg transition-colors ${isSelected ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                                                            <Icon className="w-5 h-5" />
                                                        </div>
                                                        <div className={`w-10 h-6 rounded-full transition-colors relative ${isSelected ? 'bg-indigo-500' : 'bg-slate-200 dark:bg-slate-700'}`}>
                                                            <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${isSelected ? 'translate-x-4' : 'translate-x-0'}`} />
                                                        </div>
                                                    </div>

                                                    <h4 className={`font-bold text-sm mb-1 ${isSelected ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-500'}`}>
                                                        {item.label}
                                                    </h4>

                                                    <div className="mt-auto pt-2 flex items-center gap-2">
                                                        <span className={`text-[10px] uppercase font-black tracking-wider px-2 py-0.5 rounded ${item.type === 'kpi' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                                                            item.type === 'chart' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' :
                                                                'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                                                            }`}>
                                                            {item.type}
                                                        </span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                </div>
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
}
