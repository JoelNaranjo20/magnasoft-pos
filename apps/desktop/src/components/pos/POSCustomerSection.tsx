// @ts-nocheck
import { useState, useEffect } from 'react';
import { useAuthStore } from '@shared/store/useAuthStore';
import { useCartStore } from '../../store/useCartStore';
import { supabase } from '../../lib/supabase';
import { useBusinessStore } from '@shared/store/useBusinessStore';
import { useModule } from '../../hooks/useModule';

interface Worker {
    id: string;
    name: string;
}

interface POSCustomerSectionProps {
    selectedCustomer: any;
    selectedVehicle: any;
    searchQuery: string;
    searchResults: any[];
    showResults: boolean;
    isSearching: boolean;
    last30DaysVisits: number;
    loyaltySettings: any;
    onSearchChange: (value: string) => void;
    onSearchKeyDown: (e: React.KeyboardEvent) => void;
    onSearchFocus: () => void;
    onResultClick: (result: any) => void;
    onCloseResults: () => void;
    onCustomerSelect: (customer: any, vehicle: any) => void;
    onClearCustomer: () => void;
    onOpenCustomerModal: () => void;
    onQuickClient: () => void;
    onOpenHistory: (tab: 'ventas' | 'clinico') => void;
}

export const POSCustomerSection = ({
    selectedCustomer,
    selectedVehicle,
    searchQuery,
    searchResults,
    showResults,
    isSearching,
    last30DaysVisits,
    loyaltySettings,
    onSearchChange,
    onSearchKeyDown,
    onSearchFocus,
    onResultClick,
    onCloseResults,
    onCustomerSelect,
    onClearCustomer,
    onOpenCustomerModal,
    onQuickClient,
    onOpenHistory
}: POSCustomerSectionProps) => {
    const { business } = useAuthStore();
    const businessType = business?.business_type || 'retail'; // Kept for fallback labels

    // Module-based feature flags — replaces hardcoded business_type checks
    const hasVehicles = useModule('vehicles');
    const hasTables = useModule('tables');

    // UI feature flags
    const showVehicle = hasVehicles;
    const isFrequentCustomer = last30DaysVisits >= 3;

    // Determine placeholder text based on active modules
    const getPlaceholder = () => {
        if (hasVehicles) return "Nombre, celular o placa...";
        if (hasTables) return "Nombre o celular...";
        return "Nombre o celular...";
    };

    // Quick client button label
    const getQuickButtonLabel = () => {
        if (!hasVehicles && !hasTables) return 'Público';
        return 'Rápido';
    };

    return (
        <div className="flex-none p-6 border-b border-slate-100 dark:border-slate-800 bg-white/50 dark:bg-slate-900/20 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <span className="material-symbols-outlined !text-[16px]">person</span>
                    Cliente
                </h2>
                <div className="flex items-center gap-3">
                    {!selectedCustomer && (
                        <button
                            onClick={onQuickClient}
                            className="flex items-center gap-1 px-3 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg hover:bg-emerald-500/20 transition-all font-black text-[10px] uppercase tracking-wider border border-emerald-500/20"
                        >
                            <span className="material-symbols-outlined !text-[16px]">bolt</span>
                            {getQuickButtonLabel()}
                        </button>
                    )}
                    {selectedCustomer && selectedCustomer.id !== 'anonymous' && (
                        <div className="flex items-center gap-1.5">
                            <button
                                onClick={() => onOpenHistory('clinico')}
                                className="flex items-center justify-center p-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 rounded-lg transition-all border border-blue-100 dark:border-blue-800"
                                title="Récord Clínico"
                            >
                                <span className="material-symbols-outlined !text-[18px]">medical_services</span>
                            </button>
                            <button
                                onClick={() => onOpenHistory('ventas')}
                                className="flex items-center justify-center p-1.5 bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-primary rounded-lg transition-all"
                                title="Historial de Ventas"
                            >
                                <span className="material-symbols-outlined !text-[18px]">history</span>
                            </button>
                        </div>
                    )}
                    <button
                        onClick={onOpenCustomerModal}
                        className="text-[10px] font-bold text-primary hover:text-primary-hover hover:underline transition-colors uppercase tracking-wide"
                    >
                        {showVehicle ? 'Nuevo +' : 'Nuevo Cliente +'}
                    </button>
                </div>
            </div>

            {/* Customer Search */}
            <div className="relative group">
                <span className="absolute left-3 top-2.5 text-slate-400 group-focus-within:text-primary transition-colors material-symbols-outlined">person_search</span>
                <input
                    className="w-full bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl pl-10 pr-12 py-3 text-sm font-bold focus:ring-0 focus:border-primary transition-all placeholder:text-slate-400 outline-none shadow-sm group-hover:border-slate-300 dark:group-hover:border-slate-600"
                    placeholder={getPlaceholder()}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => onSearchChange(e.target.value)}
                    onKeyDown={onSearchKeyDown}
                    onFocus={onSearchFocus}
                />

                {/* Search Results Dropdown */}
                {showResults && (
                    <>
                        <div
                            className="fixed inset-0 z-40"
                            onClick={onCloseResults}
                        />
                        <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200 max-h-[300px] overflow-y-auto custom-scrollbar">
                            {searchResults.map((result, idx) => (
                                <button
                                    key={`${result.type}-${result.data.id}-${idx}`}
                                    onClick={() => onResultClick(result)}
                                    className="w-full flex items-center gap-3 p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 border-b border-slate-100 dark:border-slate-700/50 last:border-0 transition-colors text-left group/item"
                                >
                                    <div className="shrink-0">
                                        {result.type === 'vehicle' ? (
                                            <div className="w-16 h-10 bg-slate-900 border-2 border-slate-700 rounded-lg flex flex-col items-center justify-center shadow-lg relative overflow-hidden group-hover/item:border-primary transition-colors">
                                                <div className="absolute top-0 left-0 right-0 h-1 bg-yellow-400"></div>
                                                <span className="text-sm font-black leading-none text-white">{result.data.license_plate}</span>
                                                <div className="text-[7px] font-black text-slate-400 uppercase leading-none mt-0.5">COLOMBIA</div>
                                            </div>
                                        ) : (
                                            <div className="h-10 w-10 rounded-xl flex items-center justify-center bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                                                <span className="material-symbols-outlined !text-[20px]">person</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-bold text-slate-900 dark:text-white truncate">
                                            {result.type === 'customer' ? result.data.name : result.data.license_plate}
                                        </h4>
                                        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 truncate">
                                            {result.type === 'customer'
                                                ? (result.data.phone || 'Sin teléfono')
                                                : `${result.data.brand || ''} ${result.data.model || ''} • ${result.data.customer?.name || 'S.N'}`}
                                        </p>
                                    </div>
                                    <span className="material-symbols-outlined !text-[18px] text-slate-300 group-hover/item:text-primary transition-colors">chevron_right</span>
                                </button>
                            ))}
                        </div>
                    </>
                )}

                {searchQuery && (
                    <button
                        onClick={onClearCustomer}
                        className="absolute right-2 top-2 p-1.5 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                    >
                        <span className="material-symbols-outlined !text-[20px]">close</span>
                    </button>
                )}
                {!selectedCustomer && searchQuery && (
                    <button
                        onClick={onOpenCustomerModal}
                        className="absolute right-2 top-2 p-1.5 text-slate-400 hover:text-primary rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                    >
                        <span className="material-symbols-outlined !text-[20px]">edit</span>
                    </button>
                )}
            </div>





            {/* Customer Tags */}
            {selectedCustomer && (
                <div className="mt-3 flex items-center gap-2 flex-wrap">
                    {selectedCustomer.id === 'anonymous' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500 text-white text-[11px] font-black border border-emerald-600 shadow-sm animate-in fade-in zoom-in duration-300">
                            <span className="material-symbols-outlined !text-[14px]">bolt</span>
                            {isRetail ? 'PÚBLICO GENERAL' : 'VENTA RÁPIDA'}
                            <button
                                onClick={onClearCustomer}
                                className="ml-1 hover:text-white/70 transition-colors"
                                title={isRetail ? 'Salir de Público General' : 'Salir de Venta Rápida'}
                            >
                                <span className="material-symbols-outlined !text-[12px]">close</span>
                            </button>
                        </span>
                    ) : (
                        <>
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white dark:bg-slate-800 text-slate-800 dark:text-white text-[11px] font-bold border border-slate-200 dark:border-slate-700 shadow-sm">
                                <span className="material-symbols-outlined !text-[14px]">person</span>
                                {selectedCustomer.name}
                                <button
                                    onClick={onClearCustomer}
                                    className="ml-1 hover:text-rose-500 transition-colors flex items-center justify-center p-0.5 rounded-full hover:bg-rose-50 dark:hover:bg-rose-900/20"
                                    title="Quitar cliente"
                                >
                                    <span className="material-symbols-outlined !text-[14px]">close</span>
                                </button>
                            </span>
                            {isFrequentCustomer && (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 text-[11px] font-bold border border-emerald-100 dark:border-emerald-900/30">
                                    <span className="material-symbols-outlined !text-[14px]">star</span>
                                    Cliente Frecuente
                                </span>
                            )}
                            {selectedVehicle && (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[11px] font-bold border border-slate-200 dark:border-slate-700">
                                    <span className="material-symbols-outlined !text-[14px]">
                                        {selectedVehicle.type === 'motorcycle' ? 'two_wheeler' : 'directions_car'}
                                    </span>
                                    {selectedVehicle.brand} {selectedVehicle.model || selectedVehicle.license_plate}
                                </span>
                            )}
                            {(selectedCustomer.loyalty_points || 0) >= (loyaltySettings.points_threshold || 50) && (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 text-[11px] font-black border border-purple-200 dark:border-purple-800 animate-pulse transition-all">
                                    <span className="material-symbols-outlined !text-[14px]">redeem</span>
                                    RECOMPENSA ({selectedCustomer.loyalty_points || 0})
                                </span>
                            )}
                        </>
                    )}




                </div>
            )}
        </div>
    );
};
