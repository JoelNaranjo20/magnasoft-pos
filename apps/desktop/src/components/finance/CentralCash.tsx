// @ts-nocheck
import React, { useState } from 'react';
import { useCentralCash } from '../../hooks/useCentralCash';
import { CategorySalesModal } from '@shared/components/modals/CategorySalesModal';
import { CashDashboardDetailModal } from '@shared/components/modals/CashDashboardDetailModal';
import { CentralCashHistoryModal } from '@shared/components/modals/CentralCashHistoryModal';
import { CentralCashMovementModal } from './CentralCashMovementModal';
import { NominaDetailModal } from '@shared/components/modals/NominaDetailModal';
import { CarteraDetailModal } from '@shared/components/modals/CarteraDetailModal';
import { useSessionStore } from '@shared/store/useSessionStore';
import { useModule } from '@shared/hooks/useModule';

export const CentralCash = () => {
    const {
        movements, loading, addMovement,
        cashBalance, transferBalance, totalBalance,
        monthlySummary, categorySales, categorySalesLoading, fetchCategorySales,
        carteraTotal, carteraTotalLoading,
        recuperacionEfectivo, recuperacionTransferencia,
        liquidacionesDelMes, liquidacionesLoading, liquidacionesDetail,
        nominaTotal, nominaTotalLoading,
        totalServicios, totalServiciosLoading,
        egresosDelMes, egresosDetail,
        cashMovementsDelMes, transferMovementsDelMes,
        nominaAsalariados, nominaSemanas, liquidacionesComisionistas,
        carteraClientes, carteraClientesLoading,
        recuperacionEfectivoDetalle, recuperacionTransferenciaDetalle, recuperacionDetalleLoading,
    } = useCentralCash();
    const user = useSessionStore(state => state.user);

    const hasCartera = useModule('customers');
    const hasCommissions = useModule('commissions');
    const hasPayroll = useModule('payroll');

    // Modal states
    const [showMovementModal, setShowMovementModal] = useState(false);
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [showEgresosModal, setShowEgresosModal] = useState(false);
    const [showLiquidacionesModal, setShowLiquidacionesModal] = useState(false);
    const [showServiciosModal, setShowServiciosModal] = useState(false);
    const [showEfectivoModal, setShowEfectivoModal] = useState(false);
    const [showTransferenciaModal, setShowTransferenciaModal] = useState(false);
    const [showNominaModal, setShowNominaModal] = useState(false);
    const [showCarteraTotalModal, setShowCarteraTotalModal] = useState(false);
    const [showRecupEfectivoModal, setShowRecupEfectivoModal] = useState(false);
    const [showRecupTransferModal, setShowRecupTransferModal] = useState(false);

    const formatCurrency = (n: number) =>
        '$' + n.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

    const kpiLoading = loading && movements.length === 0;

    return (
        <div className="flex flex-col min-h-[calc(100vh-4rem)] bg-slate-50 dark:bg-[#0a0f14]">
            <div className="p-4 md:p-6 max-w-7xl mx-auto w-full animate-in fade-in duration-500 space-y-6 pb-20">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-black text-slate-900 dark:text-white">💰 Caja Central</h1>
                        <p className="text-xs text-slate-500 mt-1">Dashboard Financiero</p>
                    </div>
                </div>

                <div className="flex flex-col lg:flex-row gap-6">
                    {/* COLUMNA IZQUIERDA */}
                    <div className="w-full lg:w-[380px] flex-shrink-0 space-y-4">
                        {/* Balance Total */}
                        <div className="bg-gradient-to-br from-slate-800 to-slate-900 dark:from-slate-700 dark:to-slate-800 text-white rounded-2xl p-6 shadow-lg">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Balance Total</p>
                            {kpiLoading ? (
                                <div className="h-10 w-48 bg-white/10 rounded-lg animate-pulse mt-2" />
                            ) : (
                                <h2 className={`text-3xl font-black tabular-nums ${totalBalance >= 0 ? 'text-white' : 'text-rose-400'}`}>
                                    {totalBalance >= 0 ? '' : '−'}{formatCurrency(Math.abs(totalBalance))}
                                </h2>
                            )}
                            <div className="flex gap-4 mt-3">
                                <button onClick={() => setShowEfectivoModal(true)} className="flex-1 bg-white/10 rounded-lg p-2.5 hover:bg-white/20 transition-colors text-left cursor-pointer">
                                    <p className="text-[9px] font-bold text-emerald-300 uppercase">Efectivo</p>
                                    {kpiLoading ? <div className="h-5 w-16 bg-white/10 rounded mt-1 animate-pulse" /> : <p className="text-sm font-black text-emerald-400 tabular-nums">{formatCurrency(cashBalance)}</p>}
                                </button>
                                <button onClick={() => setShowTransferenciaModal(true)} className="flex-1 bg-white/10 rounded-lg p-2.5 hover:bg-white/20 transition-colors text-left cursor-pointer">
                                    <p className="text-[9px] font-bold text-sky-300 uppercase">Transferencia</p>
                                    {kpiLoading ? <div className="h-5 w-16 bg-white/10 rounded mt-1 animate-pulse" /> : <p className="text-sm font-black text-sky-400 tabular-nums">{formatCurrency(transferBalance)}</p>}
                                </button>
                            </div>
                        </div>

                        {/* Efectivo (cliqueable) */}
                        <button onClick={() => setShowEfectivoModal(true)} className="w-full text-left bg-white dark:bg-slate-900/50 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-emerald-300 dark:hover:border-emerald-700 transition-all group">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                                        <span className="material-symbols-outlined text-emerald-600 dark:text-emerald-400 !text-[20px]">payments</span>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase">Efectivo Disponible</p>
                                        {kpiLoading ? <div className="h-6 w-20 bg-slate-100 dark:bg-slate-800 rounded mt-1 animate-pulse" /> : <p className="text-lg font-black text-emerald-600 dark:text-emerald-400 tabular-nums">{formatCurrency(cashBalance)}</p>}
                                    </div>
                                </div>
                                <span className="material-symbols-outlined text-slate-300 group-hover:text-slate-500 transition-colors">chevron_right</span>
                            </div>
                        </button>

                        {/* Transferencia (cliqueable) */}
                        <button onClick={() => setShowTransferenciaModal(true)} className="w-full text-left bg-white dark:bg-slate-900/50 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-sky-300 dark:hover:border-sky-700 transition-all group">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-sky-100 dark:bg-sky-900/30 flex items-center justify-center">
                                        <span className="material-symbols-outlined text-sky-600 dark:text-sky-400 !text-[20px]">account_balance</span>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase">Transferencia Disponible</p>
                                        {kpiLoading ? <div className="h-6 w-20 bg-slate-100 dark:bg-slate-800 rounded mt-1 animate-pulse" /> : <p className="text-lg font-black text-sky-600 dark:text-sky-400 tabular-nums">{formatCurrency(transferBalance)}</p>}
                                    </div>
                                </div>
                                <span className="material-symbols-outlined text-slate-300 group-hover:text-slate-500 transition-colors">chevron_right</span>
                            </div>
                        </button>

                        <button onClick={() => setShowMovementModal(true)} className="w-full py-3.5 bg-primary hover:bg-[#0b6ddb] text-white rounded-xl font-bold text-sm shadow-md shadow-primary/20 hover:scale-[1.01] active:scale-[0.99] transition-all duration-200 flex items-center justify-center gap-2">
                            <span className="material-symbols-outlined !text-[18px]">add_circle</span>
                            Nuevo Movimiento
                        </button>
                    </div>

                    {/* COLUMNA DERECHA */}
                    <div className="flex-1 space-y-4">
                        {/* Resumen Operativo */}
                        <div className="bg-white dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5">
                            <h3 className="text-sm font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-4">📊 Resumen Operativo</h3>
                            <div className="grid grid-cols-3 gap-3">
                                <button onClick={() => setShowServiciosModal(true)} className="bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-800/30 rounded-xl p-3 text-left hover:bg-emerald-100 dark:hover:bg-emerald-900/20 transition-colors group">
                                    <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase mb-1">Total Servicios</p>
                                    {totalServiciosLoading && !totalServicios ? <div className="h-6 w-20 bg-emerald-100 dark:bg-emerald-900/20 rounded animate-pulse" /> : <p className="text-lg font-black text-emerald-700 dark:text-emerald-300 tabular-nums">{formatCurrency(totalServicios)}</p>}
                                    <p className="text-[8px] text-emerald-500/60 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity">Ver detalle →</p>
                                </button>
                                <button onClick={() => setShowEgresosModal(true)} className="bg-rose-50 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-800/30 rounded-xl p-3 text-left hover:bg-rose-100 dark:hover:bg-rose-900/20 transition-colors group">
                                    <p className="text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase mb-1">Egresos</p>
                                    <p className="text-lg font-black text-rose-700 dark:text-rose-300 tabular-nums">{formatCurrency(egresosDelMes)}</p>
                                    <p className="text-[8px] text-rose-500/60 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity">Ver detalle →</p>
                                </button>
                                {hasCommissions && (
                                    <button onClick={() => setShowLiquidacionesModal(true)} className="bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-800/30 rounded-xl p-3 text-left hover:bg-amber-100 dark:hover:bg-amber-900/20 transition-colors group">
                                        <p className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase mb-1">Liquidaciones</p>
                                        {liquidacionesLoading ? <div className="h-6 w-20 bg-amber-100 dark:bg-amber-900/20 rounded animate-pulse" /> : <p className="text-lg font-black text-amber-700 dark:text-amber-300 tabular-nums">{formatCurrency(liquidacionesDelMes)}</p>}
                                        <p className="text-[8px] text-amber-500/60 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity">Ver detalle →</p>
                                    </button>
                                )}
                            </div>
                            <button onClick={() => setShowHistoryModal(true)} className="mt-4 w-full py-2.5 text-sm font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 transition-colors flex items-center justify-center gap-2">
                                <span className="material-symbols-outlined !text-[18px]">history</span>
                                Ver Historial Completo
                            </button>
                        </div>

                        {/* Cartera */}
                        {hasCartera && (
                            <div className="bg-white dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5">
                                <h3 className="text-sm font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-4">💳 Cartera</h3>
                                <div className="grid grid-cols-3 gap-3">
                                    <button onClick={() => setShowCarteraTotalModal(true)} className="bg-purple-50 dark:bg-purple-900/10 border border-purple-100 dark:border-purple-800/30 rounded-xl p-3 text-left hover:bg-purple-100 dark:hover:bg-purple-900/20 transition-colors group">
                                        <p className="text-[10px] font-bold text-purple-600 dark:text-purple-400 uppercase mb-1">Cartera Total</p>
                                        {carteraTotalLoading ? <div className="h-6 w-20 bg-purple-100 dark:bg-purple-900/20 rounded animate-pulse" /> : <p className="text-lg font-black text-purple-700 dark:text-purple-300 tabular-nums">{formatCurrency(carteraTotal)}</p>}
                                        <p className="text-[8px] text-purple-500/60 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity">Ver detalle →</p>
                                    </button>
                                    <button onClick={() => setShowRecupEfectivoModal(true)} className="bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-800/30 rounded-xl p-3 text-left hover:bg-emerald-100 dark:hover:bg-emerald-900/20 transition-colors group">
                                        <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase mb-1">Recup. Efectivo</p>
                                        {carteraTotalLoading ? <div className="h-6 w-20 bg-emerald-100 dark:bg-emerald-900/20 rounded animate-pulse" /> : <p className="text-lg font-black text-emerald-700 dark:text-emerald-300 tabular-nums">{formatCurrency(recuperacionEfectivo)}</p>}
                                        <p className="text-[8px] text-emerald-500/60 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity">Ver detalle →</p>
                                    </button>
                                    <button onClick={() => setShowRecupTransferModal(true)} className="bg-sky-50 dark:bg-sky-900/10 border border-sky-100 dark:border-sky-800/30 rounded-xl p-3 text-left hover:bg-sky-100 dark:hover:bg-sky-900/20 transition-colors group">
                                        <p className="text-[10px] font-bold text-sky-600 dark:text-sky-400 uppercase mb-1">Recup. Transfer</p>
                                        {carteraTotalLoading ? <div className="h-6 w-20 bg-sky-100 dark:bg-sky-900/20 rounded animate-pulse" /> : <p className="text-lg font-black text-sky-700 dark:text-sky-300 tabular-nums">{formatCurrency(recuperacionTransferencia)}</p>}
                                        <p className="text-[8px] text-sky-500/60 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity">Ver detalle →</p>
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Nómina (cliqueable) */}
                        {hasPayroll && (
                            <button onClick={() => setShowNominaModal(true)} className="w-full text-left bg-white dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-700 transition-all group">
                                <h3 className="text-sm font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-4">👥 Total Nómina</h3>
                                <div className="bg-indigo-50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-800/30 rounded-xl p-4 flex items-center justify-between">
                                    <div>
                                        <p className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase">Salarios Mensuales</p>
                                        {nominaTotalLoading ? <div className="h-7 w-24 bg-indigo-100 dark:bg-indigo-900/20 rounded mt-1 animate-pulse" /> : <p className="text-xl font-black text-indigo-700 dark:text-indigo-300 tabular-nums">{formatCurrency(nominaTotal)}</p>}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="material-symbols-outlined text-indigo-300 dark:text-indigo-600 !text-[32px]">group</span>
                                        <span className="material-symbols-outlined text-slate-300 group-hover:text-slate-500 transition-colors">chevron_right</span>
                                    </div>
                                </div>
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* ================================================================ */}
            {/* MODALES */}
            {/* ================================================================ */}

            <CentralCashMovementModal isOpen={showMovementModal} onClose={() => setShowMovementModal(false)} addMovement={addMovement} />

            <CentralCashHistoryModal isOpen={showHistoryModal} onClose={() => setShowHistoryModal(false)} movements={movements} monthlySummary={monthlySummary} loading={loading} categorySales={categorySales || []} categorySalesLoading={categorySalesLoading} fetchCategorySales={fetchCategorySales} />

            {/* Efectivo Drill-Down */}
            <CashDashboardDetailModal isOpen={showEfectivoModal} onClose={() => setShowEfectivoModal(false)} title="💰 Efectivo — Mes en Curso" showIncomes ingresos={cashMovementsDelMes.ingresos} egresos={cashMovementsDelMes.egresos} neto={cashMovementsDelMes.neto} loading={loading} />

            {/* Transferencia Drill-Down */}
            <CashDashboardDetailModal isOpen={showTransferenciaModal} onClose={() => setShowTransferenciaModal(false)} title="🏦 Transferencia — Mes en Curso" showIncomes ingresos={transferMovementsDelMes.ingresos} egresos={transferMovementsDelMes.egresos} neto={transferMovementsDelMes.neto} loading={loading} />

            {/* Egresos */}
            <CashDashboardDetailModal isOpen={showEgresosModal} onClose={() => setShowEgresosModal(false)} title="📤 Egresos del Mes" items={egresosDetail} loading={loading} />

            {/* Liquidaciones */}
            <CashDashboardDetailModal isOpen={showLiquidacionesModal} onClose={() => setShowLiquidacionesModal(false)} title="💰 Liquidaciones del Mes" items={liquidacionesDetail} loading={liquidacionesLoading} />

            {/* Nómina */}
            <NominaDetailModal isOpen={showNominaModal} onClose={() => setShowNominaModal(false)} nominaTotal={nominaTotal} asalariados={nominaAsalariados} semanas={nominaSemanas} comisionistas={liquidacionesComisionistas} loading={nominaTotalLoading} />

            {/* Cartera Total */}
            <CarteraDetailModal isOpen={showCarteraTotalModal} onClose={() => setShowCarteraTotalModal(false)} mode="total" items={carteraClientes} loading={carteraClientesLoading} />

            {/* Recuperación Efectivo */}
            <CarteraDetailModal isOpen={showRecupEfectivoModal} onClose={() => setShowRecupEfectivoModal(false)} mode="recuperacion-efectivo" items={recuperacionEfectivoDetalle} loading={recuperacionDetalleLoading} />

            {/* Recuperación Transferencia */}
            <CarteraDetailModal isOpen={showRecupTransferModal} onClose={() => setShowRecupTransferModal(false)} mode="recuperacion-transferencia" items={recuperacionTransferenciaDetalle} loading={recuperacionDetalleLoading} />

            {/* Total Servicios */}
            <CategorySalesModal isOpen={showServiciosModal} onClose={() => setShowServiciosModal(false)} monthLabel={new Date().toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })} categoryData={categorySales || []} loading={categorySalesLoading || totalServiciosLoading} />
        </div>
    );
};
