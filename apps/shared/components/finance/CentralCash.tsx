// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { useCentralCash } from '@shared/hooks/useCentralCash';
import { CashDashboardDetailModal } from '@shared/components/modals/CashDashboardDetailModal';
import { CarteraDetailModal } from '@shared/components/modals/CarteraDetailModal';
import { BonosDetalleModal } from '@shared/components/modals/BonosDetalleModal';
import { VentasServiciosDetalleModal } from '@shared/components/modals/VentasServiciosDetalleModal';
import { useModule } from '@shared/hooks/useModule';

export const CentralCash = () => {
    const {
        movements, loading, addMovement, updateMovement, deleteMovement,
        cashBalance, transferBalance, totalBalance,
        carteraTotal, carteraTotalLoading,
        recuperacionEfectivo, recuperacionTransferencia,
        cashMovementsDelMes, transferMovementsDelMes,
        carteraClientes, carteraClientesLoading,
        recuperacionEfectivoDetalle, recuperacionTransferenciaDetalle, recuperacionDetalleLoading,
        bonosTotal, bonosLoading, bonosDetalle,
        ventasServiciosTotal, ventasServiciosLoading, ventasServiciosDetalle,
        yearGroups, generalTotal, tableLoading,
        acreedoresTotal, acreedoresPagadoMes, acreedoresLoading, acreedoresDetalle, acreedoresPagosDetalle,
    } = useCentralCash();

    const hasCartera = useModule('customers');

    // Modal states
    const [showMovementModal, setShowMovementModal] = useState(false);
    const [showEfectivoModal, setShowEfectivoModal] = useState(false);
    const [showTransferenciaModal, setShowTransferenciaModal] = useState(false);
    const [showBonosModal, setShowBonosModal] = useState(false);
    const [showVentasServiciosModal, setShowVentasServiciosModal] = useState(false);
    const [showCarteraTotalModal, setShowCarteraTotalModal] = useState(false);
    const [showRecupEfectivoModal, setShowRecupEfectivoModal] = useState(false);
    const [showRecupTransferModal, setShowRecupTransferModal] = useState(false);
    const [showAcreedoresTotalModal, setShowAcreedoresTotalModal] = useState(false);
    const [showAcreedoresPagosModal, setShowAcreedoresPagosModal] = useState(false);
    const [showBalanceTotalModal, setShowBalanceTotalModal] = useState(false);
    // Balance Total modal — edit/delete state
    const [editingMov, setEditingMov] = useState<string | null>(null);
    const [editMovType, setEditMovType] = useState<'income' | 'expense'>('expense');
    const [editMovAmount, setEditMovAmount] = useState('');
    const [editMovDesc, setEditMovDesc] = useState('');

    // Table 3-level state (014-resumen-operativo-mes-completo)
    const [expandedYears, setExpandedYears] = useState<Set<number>>(new Set());
    const [expandedMonth, setExpandedMonth] = useState<string | null>(null);
    const [fullscreenTable, setFullscreenTable] = useState(false);
    const [showHistoryModal, setShowHistoryModal] = useState(false);

    // ─── Current month row for simplified Resumen Operativo ───
    const currentMonthKey = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
    const currentMonthRow = yearGroups.flatMap(yg => yg.months).find(r => r.monthKey === currentMonthKey);
    const monthNames = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
    const currentMonthLabel = `${monthNames[new Date().getMonth()]} ${new Date().getFullYear()}`;

    // ─── Todos los días del mes (1..último), rellenando huecos sin actividad ───
    const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
    const allMonthDays = Array.from({ length: daysInMonth }, (_, i) => {
        const day = i + 1;
        const found = currentMonthRow?.dailyBreakdown?.find((d: any) => d.day === day);
        return found || { day, ingresos: 0, egresos: 0, bonos: 0, servicios: 0, neto: 0 };
    });

    const toggleYear = (year: number) => {
        setExpandedYears(prev => {
            const next = new Set(prev);
            if (next.has(year)) {
                next.delete(year);
                if (expandedMonth && expandedMonth.startsWith(`${year}-`)) {
                    setExpandedMonth(null);
                }
            } else {
                next.add(year);
            }
            return next;
        });
    };

    const toggleMonthDetail = (monthKey: string) => {
        setExpandedMonth(prev => prev === monthKey ? null : monthKey);
    };

    // ─── Inline edit state (Ctrl+click on any month cell) ───
    type EditableField = 'ingresos' | 'egresos' | 'neto' | 'bonos' | 'servicios';
    const [editingCell, setEditingCell] = useState<{ monthKey: string; field: EditableField } | null>(null);
    const [editValue, setEditValue] = useState('');

    useEffect(() => {
        if (editingCell) {
            const input = document.querySelector(`[data-edit="${editingCell.monthKey}-${editingCell.field}"]`) as HTMLInputElement | null;
            if (input) { input.focus(); input.select(); }
        }
    }, [editingCell]);

    // Escape key to exit fullscreen table mode
    useEffect(() => {
        if (!fullscreenTable) return;
        const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setFullscreenTable(false); };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [fullscreenTable]);

    const startEdit = (monthKey: string, field: EditableField, currentValue: number) => {
        setEditingCell({ monthKey, field });
        setEditValue(String(currentValue));
    };

    const saveEdit = async () => {
        if (!editingCell) return;
        const newVal = parseInt(editValue) || 0;
        const row = yearGroups.flatMap(yg => yg.months).find(r => r.monthKey === editingCell.monthKey);
        if (!row) { setEditingCell(null); return; }
        const oldVal = (row as any)[editingCell.field];
        const diff = newVal - oldVal;
        if (diff === 0) { setEditingCell(null); return; }
        const fieldNames: Record<EditableField, string> = { ingresos: 'Ingresos', egresos: 'Egresos', neto: 'Neto', bonos: 'Bonos', servicios: 'Servicios' };
        const desc = editingCell.field === 'neto'
            ? `[AJUSTE MANUAL] Neto de ${row.monthLabel} ${row.year} — de $${(row.ingresos - row.egresos).toLocaleString()} a $${newVal.toLocaleString()} (via ingresos)`
            : `[AJUSTE MANUAL] ${fieldNames[editingCell.field]} de ${row.monthLabel} ${row.year} — de $${oldVal.toLocaleString()} a $${newVal.toLocaleString()}`;
        await addMovement('income', Math.abs(diff), desc, 'cash');
        setEditingCell(null);
    };

    const formatCurrency = (n: number) =>
        '$' + n.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

    const kpiLoading = loading && movements.length === 0;

    // Movimientos del mes en curso para el modal de Balance Total
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString();
    const movimientosDelMes = movements
        .filter(m => m.created_at >= monthStart && m.created_at < monthEnd)
        .sort((a, b) => b.created_at.localeCompare(a.created_at));

    const handleDeleteMov = async (id: string) => {
        if (!confirm('¿Eliminar este movimiento?')) return;
        await deleteMovement(id);
    };

    const handleSaveEditMov = async () => {
        if (!editingMov) return;
        const amt = parseFloat(editMovAmount);
        if (!amt || amt <= 0 || !editMovDesc.trim()) return;
        await updateMovement(editingMov, editMovType, amt, editMovDesc);
        setEditingMov(null);
    };

    const startEditMov = (mov: any) => {
        setEditingMov(mov.id);
        setEditMovType(mov.type);
        setEditMovAmount(String(mov.amount));
        setEditMovDesc(mov.description || '');
    };

    const handleMovementSubmit = async (type: 'income' | 'expense', amount: number, description: string, method: 'cash' | 'transfer') => {
        await addMovement(type, amount, description, method);
        setShowMovementModal(false);
    };

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
                    {!fullscreenTable && (
                    <div className="w-full lg:w-[380px] flex-shrink-0 space-y-4">
                        {/* Balance Total */}
                        <div className="bg-gradient-to-br from-slate-800 to-slate-900 dark:from-slate-700 dark:to-slate-800 text-white rounded-2xl p-6 shadow-lg">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Balance Total</p>
                            {kpiLoading ? (
                                <div className="h-10 w-48 bg-white/10 rounded-lg animate-pulse mt-2" />
                            ) : (
                                <button onClick={() => setShowBalanceTotalModal(true)} className="text-left hover:opacity-80 transition-opacity cursor-pointer">
                                    <h2 className={`text-3xl font-black tabular-nums ${totalBalance >= 0 ? 'text-white' : 'text-rose-400'}`}>
                                        {totalBalance >= 0 ? '' : '−'}{formatCurrency(Math.abs(totalBalance))}
                                    </h2>
                                </button>
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
                    )}

                    {/* COLUMNA DERECHA */}
                    <div className={`space-y-4 ${fullscreenTable ? 'w-full' : 'flex-1'}`}>
                        {/* Resumen Operativo — mes en curso con desglose diario */}
                        <div className={`bg-white dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 ${fullscreenTable ? 'fixed inset-0 z-[400] m-0 rounded-none flex flex-col overflow-auto' : ''}`}>
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-sm font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">📊 Resumen Operativo — {currentMonthLabel}</h3>
                                <div className="flex items-center gap-2">
                                    {!fullscreenTable && (
                                        <button onClick={() => setShowHistoryModal(true)}
                                            className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors">
                                            <span className="material-symbols-outlined !text-[16px]">history</span>
                                            Historial
                                        </button>
                                    )}
                                    <button onClick={() => setFullscreenTable(v => !v)}
                                        className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
                                        title={fullscreenTable ? 'Salir de pantalla completa' : 'Modo pantalla completa'}>
                                        <span className="material-symbols-outlined !text-[16px]">{fullscreenTable ? 'fullscreen_exit' : 'fullscreen'}</span>
                                        {fullscreenTable ? 'Salir' : 'Pantalla completa'}
                                    </button>
                                    {fullscreenTable && (
                                        <button onClick={() => setFullscreenTable(false)}
                                            className="flex items-center justify-center w-8 h-8 rounded-full bg-rose-500 hover:bg-rose-600 text-white font-bold text-sm shadow-lg hover:scale-105 active:scale-95 transition-all"
                                            title="Cerrar pantalla completa (Esc)">
                                            ✕
                                        </button>
                                    )}
                                </div>
                            </div>
                            {tableLoading ? (
                                <div className="flex flex-col items-center gap-3 py-10">
                                    <div className="w-10 h-10 border-3 border-primary/20 border-t-primary rounded-full animate-spin" />
                                    <p className="text-xs text-slate-500 font-medium">Calculando...</p>
                                </div>
                            ) : !currentMonthRow || allMonthDays.length === 0 ? (
                                <p className="text-xs text-slate-400 italic text-center py-10">Sin actividad este mes</p>
                            ) : (
                                <div className={`overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm ${fullscreenTable ? 'max-w-4xl mx-auto' : ''}`}>
                                    <table className={`${fullscreenTable ? 'w-auto mx-auto text-[10px]' : 'w-full text-xs'}`}>
                                        <thead>
                                            <tr className="text-left bg-slate-100 dark:bg-slate-800">
                                                <th className={`${fullscreenTable ? 'py-1 px-2' : 'py-2.5 px-4'} text-[10px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-wider rounded-tl-xl`}>Día</th>
                                                <th className={`${fullscreenTable ? 'py-1 px-2' : 'py-2.5 px-4'} text-[10px] font-black text-emerald-600 dark:text-emerald-300 uppercase tracking-wider text-right`}>Ingresos</th>
                                                <th className={`${fullscreenTable ? 'py-1 px-2' : 'py-2.5 px-4'} text-[10px] font-black text-rose-600 dark:text-rose-300 uppercase tracking-wider text-right`}>Egresos</th>
                                                <th className={`${fullscreenTable ? 'py-1 px-2' : 'py-2.5 px-4'} text-[10px] font-black text-amber-600 dark:text-amber-300 uppercase tracking-wider text-right`}>🎁 Bonos</th>
                                                <th className={`${fullscreenTable ? 'py-1 px-2' : 'py-2.5 px-4'} text-[10px] font-black text-purple-600 dark:text-purple-300 uppercase tracking-wider text-right`}>📊 Serv.</th>
                                                <th className={`${fullscreenTable ? 'py-1 px-2' : 'py-2.5 px-4'} text-[10px] font-black text-sky-600 dark:text-sky-300 uppercase tracking-wider text-right rounded-tr-xl`}>Neto</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                            {allMonthDays.map((d, i) => {
                                                const rowBg = d.ingresos > 0 || d.egresos > 0
                                                    ? (i % 2 === 0 ? 'bg-white dark:bg-slate-900/30' : 'bg-slate-50/50 dark:bg-slate-800/20')
                                                    : 'bg-slate-50/30 dark:bg-slate-900/10';
                                                const cellPad = fullscreenTable ? 'py-0.5 px-2' : 'py-2.5 px-4';
                                                const circleSize = fullscreenTable ? 'w-5 h-5 text-[9px]' : 'w-7 h-7 text-[11px]';
                                                return (
                                                <tr key={d.day} className={`${rowBg} hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-colors group`}>
                                                    <td className={`${cellPad}`}>
                                                        <span className={`inline-flex items-center justify-center ${circleSize} rounded-full font-black ${d.ingresos > 0 || d.egresos > 0 ? 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                                                            {d.day}
                                                        </span>
                                                    </td>
                                                    <td className={`${cellPad} text-right font-semibold tabular-nums`}>
                                                        {d.ingresos > 0
                                                            ? <span className="text-emerald-600 dark:text-emerald-400 group-hover:scale-105 inline-block transition-transform">+{formatCurrency(d.ingresos)}</span>
                                                            : <span className="text-slate-300 dark:text-slate-600">—</span>}
                                                    </td>
                                                    <td className={`${cellPad} text-right font-semibold tabular-nums`}>
                                                        {d.egresos > 0
                                                            ? <span className="text-rose-500 dark:text-rose-400 group-hover:scale-105 inline-block transition-transform">−{formatCurrency(d.egresos)}</span>
                                                            : <span className="text-slate-300 dark:text-slate-600">—</span>}
                                                    </td>
                                                    <td className={`${cellPad} text-right font-semibold tabular-nums`}>
                                                        {d.bonos > 0
                                                            ? <span className="text-amber-600 dark:text-amber-400">{formatCurrency(d.bonos)}</span>
                                                            : <span className="text-slate-300 dark:text-slate-600">—</span>}
                                                    </td>
                                                    <td className={`${cellPad} text-right font-semibold tabular-nums`}>
                                                        {d.servicios > 0
                                                            ? <span className="text-purple-600 dark:text-purple-400">{formatCurrency(d.servicios)}</span>
                                                            : <span className="text-slate-300 dark:text-slate-600">—</span>}
                                                    </td>
                                                    <td className={`${cellPad} text-right font-black tabular-nums`}>
                                                        {d.neto !== 0 ? (
                                                            <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] ${d.neto >= 0 ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400' : 'bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400'}`}>
                                                                {d.neto >= 0 ? '+' : '−'}{formatCurrency(Math.abs(d.neto))}
                                                            </span>
                                                        ) : <span className="text-slate-300 dark:text-slate-600">—</span>}
                                                    </td>
                                                </tr>
                                            );})}
                                        </tbody>
                                        <tfoot>
                                            <tr className="border-t-2 border-slate-300 dark:border-slate-600">
                                                <td colSpan={6} className="p-0">
                                                    <div className={`${fullscreenTable ? 'px-3 py-2' : 'px-4 py-3'} bg-slate-100 dark:bg-slate-800 flex items-center justify-between rounded-b-xl`}>
                                                        <span className="text-[10px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-wider">Total {currentMonthLabel}</span>
                                                        <div className={`flex items-center ${fullscreenTable ? 'gap-3' : 'gap-5'}`}>
                                                            <span className={`${fullscreenTable ? 'text-[10px]' : 'text-xs'} font-black text-emerald-600 dark:text-emerald-300 tabular-nums`}>{formatCurrency(allMonthDays.reduce((s: number, d: any) => s + d.ingresos, 0))}</span>
                                                            <span className={`${fullscreenTable ? 'text-[10px]' : 'text-xs'} font-black text-rose-600 dark:text-rose-300 tabular-nums`}>{formatCurrency(allMonthDays.reduce((s: number, d: any) => s + d.egresos, 0))}</span>
                                                            <span className={`${fullscreenTable ? 'text-[10px]' : 'text-xs'} font-black text-amber-600 dark:text-amber-300 tabular-nums`}>{formatCurrency(allMonthDays.reduce((s: number, d: any) => s + d.bonos, 0))}</span>
                                                            <span className={`${fullscreenTable ? 'text-[10px]' : 'text-xs'} font-black text-purple-600 dark:text-purple-300 tabular-nums`}>{formatCurrency(allMonthDays.reduce((s: number, d: any) => s + d.servicios, 0))}</span>
                                                            <span className={`${fullscreenTable ? 'text-xs' : 'text-sm'} font-black tabular-nums ${currentMonthRow.neto >= 0 ? 'text-emerald-600 dark:text-emerald-300' : 'text-rose-600 dark:text-rose-300'}`}>{currentMonthRow.neto >= 0 ? '+' : '−'}{formatCurrency(Math.abs(currentMonthRow.neto))}</span>
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            )}
                        </div>

                        {!fullscreenTable && (<>

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

                        {/* Acreedores */}
                        <div className="bg-white dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5">
                            <h3 className="text-sm font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-4">🏗️ Acreedores</h3>
                            <div className="grid grid-cols-2 gap-3">
                                <button onClick={() => setShowAcreedoresTotalModal(true)} className="bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-800/30 rounded-xl p-3 text-left hover:bg-amber-100 dark:hover:bg-amber-900/20 transition-colors group">
                                    <p className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase mb-1">Deuda Total</p>
                                    {acreedoresLoading ? <div className="h-6 w-20 bg-amber-100 dark:bg-amber-900/20 rounded animate-pulse" /> : <p className="text-lg font-black text-amber-700 dark:text-amber-300 tabular-nums">{formatCurrency(acreedoresTotal)}</p>}
                                    <p className="text-[8px] text-amber-500/60 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity">Ver detalle →</p>
                                </button>
                                <button onClick={() => setShowAcreedoresPagosModal(true)} className="bg-rose-50 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-800/30 rounded-xl p-3 text-left hover:bg-rose-100 dark:hover:bg-rose-900/20 transition-colors group">
                                    <p className="text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase mb-1">Pagado del Mes</p>
                                    {acreedoresLoading ? <div className="h-6 w-20 bg-rose-100 dark:bg-rose-900/20 rounded animate-pulse" /> : <p className="text-lg font-black text-rose-700 dark:text-rose-300 tabular-nums">{formatCurrency(acreedoresPagadoMes)}</p>}
                                    <p className="text-[8px] text-rose-500/60 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity">Ver detalle →</p>
                                </button>
                            </div>
                        </div>

                        {/* Bonos Entregados + Total Ventas Servicios */}
                        <div className="grid grid-cols-2 gap-3">
                            <button onClick={() => setShowBonosModal(true)} className="bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-800/30 rounded-xl p-3 text-left hover:bg-amber-100 dark:hover:bg-amber-900/20 transition-colors group">
                                <p className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase mb-1">🎁 Bonos Entregados</p>
                                {bonosLoading ? <div className="h-6 w-20 bg-amber-100 dark:bg-amber-900/20 rounded animate-pulse" /> : <p className="text-lg font-black text-amber-700 dark:text-amber-300 tabular-nums">{formatCurrency(bonosTotal)}</p>}
                                <p className="text-[8px] text-amber-500/60 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity">Ver detalle →</p>
                            </button>
                            <button onClick={() => setShowVentasServiciosModal(true)} className="bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-800/30 rounded-xl p-3 text-left hover:bg-emerald-100 dark:hover:bg-emerald-900/20 transition-colors group">
                                <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase mb-1">📊 Ventas Servicios</p>
                                {ventasServiciosLoading ? <div className="h-6 w-20 bg-emerald-100 dark:bg-emerald-900/20 rounded animate-pulse" /> : <p className="text-lg font-black text-emerald-700 dark:text-emerald-300 tabular-nums">{formatCurrency(ventasServiciosTotal)}</p>}
                                <p className="text-[8px] text-emerald-500/60 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity">Ver detalle →</p>
                            </button>
                        </div>
                        </>)}
                    </div>
                </div>
            </div>

            {/* ================================================================ */}
            {/* MODALES */}
            {/* ================================================================ */}

            {/* Nuevo Movimiento — inline form modal */}
            {showMovementModal && (
                <NuevoMovimientoModal onClose={() => setShowMovementModal(false)} onSubmit={handleMovementSubmit} />
            )}

            {/* Historial — tabla multi-año completa (modal) */}
            {showHistoryModal && (
                <div className="fixed inset-0 z-[350] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="relative w-full max-w-[95vw] max-h-[90vh] bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xl overflow-hidden flex flex-col">
                        <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
                            <div>
                                <h2 className="text-lg font-bold text-slate-900 dark:text-white">📜 Historial Completo</h2>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{yearGroups.length} años · Total General: <span className={`font-bold ${generalTotal.neto >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{generalTotal.neto >= 0 ? '+' : '−'}{formatCurrency(Math.abs(generalTotal.neto))}</span></p>
                            </div>
                            <button onClick={() => setShowHistoryModal(false)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                                <span className="material-symbols-outlined !text-[20px]">close</span>
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto custom-scrollbar">
                            {tableLoading ? (
                                <div className="flex flex-col items-center gap-3 py-16">
                                    <div className="w-10 h-10 border-3 border-primary/20 border-t-primary rounded-full animate-spin" />
                                    <p className="text-xs text-slate-500 font-medium">Cargando historial...</p>
                                </div>
                            ) : (
                                <table className="w-full text-xs">
                                    <thead className="sticky top-0 z-10 bg-slate-100 dark:bg-slate-800">
                                        <tr className="text-left">
                                            <th className="px-4 py-2.5 text-[10px] font-black text-slate-500 uppercase tracking-wider">Año / Mes</th>
                                            <th className="px-4 py-2.5 text-[10px] font-black text-slate-500 uppercase tracking-wider text-right">Ingresos</th>
                                            <th className="px-4 py-2.5 text-[10px] font-black text-slate-500 uppercase tracking-wider text-right">Egresos</th>
                                            <th className="px-4 py-2.5 text-[10px] font-black text-slate-500 uppercase tracking-wider text-right">🎁 Bonos</th>
                                            <th className="px-4 py-2.5 text-[10px] font-black text-slate-500 uppercase tracking-wider text-right">📊 Servicios</th>
                                            <th className="px-4 py-2.5 text-[10px] font-black text-slate-500 uppercase tracking-wider text-right">Neto</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {yearGroups.map(yg => {
                                            const isYearExpanded = expandedYears.has(yg.year);
                                            return (
                                                <React.Fragment key={yg.year}>
                                                    <tr>
                                                        <td colSpan={6} className="px-0 py-0">
                                                            <button onClick={() => toggleYear(yg.year)}
                                                                className="w-full flex items-center px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-700/30 transition-colors text-left font-bold text-sm text-slate-800 dark:text-slate-200">
                                                                <span className="material-symbols-outlined text-slate-400 !text-[16px] mr-2 transition-transform duration-200"
                                                                    style={{ transform: isYearExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}>chevron_right</span>
                                                                <span className="flex-1">{yg.year}</span>
                                                                <span className="text-emerald-600 tabular-nums mr-4">{formatCurrency(yg.totalIngresos)}</span>
                                                                <span className="text-rose-600 tabular-nums mr-4">{formatCurrency(yg.totalEgresos)}</span>
                                                                <span className="text-amber-600 tabular-nums mr-4">{formatCurrency(yg.totalBonos)}</span>
                                                                <span className="text-emerald-600 tabular-nums mr-4">{formatCurrency(yg.totalServicios)}</span>
                                                                <span className={`tabular-nums mr-4 font-black ${yg.totalNeto >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{yg.totalNeto >= 0 ? '' : '−'}{formatCurrency(Math.abs(yg.totalNeto))}</span>
                                                            </button>
                                                        </td>
                                                    </tr>
                                                    {isYearExpanded && yg.months.map(row => {
                                                        const isMonthExpanded = expandedMonth === row.monthKey;
                                                        const hasDetail = row.dailyBreakdown && row.dailyBreakdown.length > 0;
                                                        return (
                                                            <React.Fragment key={row.monthKey}>
                                                                <tr className={`border-t border-slate-100 dark:border-slate-800 ${isMonthExpanded ? 'bg-blue-50/50 dark:bg-blue-900/10' : 'hover:bg-slate-50 dark:hover:bg-slate-800/30'} transition-colors cursor-pointer`}
                                                                    onClick={() => hasDetail && toggleMonthDetail(row.monthKey)}>
                                                                    <td className="px-4 py-2 pl-12 text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                                                                        <span className="flex items-center gap-2">
                                                                            {hasDetail && <span className="material-symbols-outlined text-slate-300 !text-[12px] transition-transform duration-200"
                                                                                style={{ transform: isMonthExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}>chevron_right</span>}
                                                                            {row.monthLabel}
                                                                        </span>
                                                                    </td>
                                                                    <td className="px-4 py-2 text-right text-emerald-600 font-bold tabular-nums">{formatCurrency(row.ingresos)}</td>
                                                                    <td className="px-4 py-2 text-right text-rose-600 font-bold tabular-nums">{formatCurrency(row.egresos)}</td>
                                                                    <td className="px-4 py-2 text-right text-amber-600 font-bold tabular-nums">{formatCurrency(row.bonos)}</td>
                                                                    <td className="px-4 py-2 text-right text-emerald-600 font-bold tabular-nums">{formatCurrency(row.servicios)}</td>
                                                                    <td className={`px-4 py-2 text-right font-black tabular-nums ${row.neto >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{row.neto >= 0 ? '' : '−'}{formatCurrency(Math.abs(row.neto))}</td>
                                                                </tr>
                                                                {isMonthExpanded && row.dailyBreakdown && (
                                                                    <tr>
                                                                        <td colSpan={6} className="px-6 py-3 bg-slate-50 dark:bg-slate-800/30 border-b border-slate-200 dark:border-slate-700">
                                                                            <table className="w-full text-[11px]">
                                                                                <thead>
                                                                                    <tr className="text-left border-b border-slate-200 dark:border-slate-700">
                                                                                        <th className="py-1 px-2 text-[9px] font-black text-slate-400 uppercase">Día</th>
                                                                                        <th className="py-1 px-2 text-[9px] font-black text-slate-400 uppercase text-right">Ingresos</th>
                                                                                        <th className="py-1 px-2 text-[9px] font-black text-slate-400 uppercase text-right">Egresos</th>
                                                                                        <th className="py-1 px-2 text-[9px] font-black text-slate-400 uppercase text-right">🎁 Bonos</th>
                                                                                        <th className="py-1 px-2 text-[9px] font-black text-slate-400 uppercase text-right">📊 Servicios</th>
                                                                                        <th className="py-1 px-2 text-[9px] font-black text-slate-400 uppercase text-right">Neto</th>
                                                                                    </tr>
                                                                                </thead>
                                                                                <tbody>
                                                                                    {row.dailyBreakdown.map(d => (
                                                                                        <tr key={d.day} className="border-b border-slate-100 dark:border-slate-800">
                                                                                            <td className="py-1 px-2 font-bold text-slate-600">{d.day}</td>
                                                                                            <td className="py-1 px-2 text-right font-semibold text-emerald-600 tabular-nums">{d.ingresos > 0 ? formatCurrency(d.ingresos) : '—'}</td>
                                                                                            <td className="py-1 px-2 text-right font-semibold text-rose-600 tabular-nums">{d.egresos > 0 ? formatCurrency(d.egresos) : '—'}</td>
                                                                                            <td className="py-1 px-2 text-right font-semibold text-amber-600 tabular-nums">{d.bonos > 0 ? formatCurrency(d.bonos) : '—'}</td>
                                                                                            <td className="py-1 px-2 text-right font-semibold text-purple-600 tabular-nums">{d.servicios > 0 ? formatCurrency(d.servicios) : '—'}</td>
                                                                                            <td className={`py-1 px-2 text-right font-black tabular-nums ${d.neto >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{d.neto !== 0 ? (d.neto >= 0 ? '+' : '−') + formatCurrency(Math.abs(d.neto)) : '—'}</td>
                                                                                        </tr>
                                                                                    ))}
                                                                                </tbody>
                                                                            </table>
                                                                        </td>
                                                                    </tr>
                                                                )}
                                                            </React.Fragment>
                                                        );
                                                    })}
                                                    {isYearExpanded && (
                                                        <tr className="border-t-2 border-slate-300 dark:border-slate-600 bg-slate-100/50 dark:bg-slate-700/30">
                                                            <td className="px-4 py-2 pl-12 text-[10px] font-black text-slate-500 uppercase">Total {yg.year}</td>
                                                            <td className="px-4 py-2 text-right font-black text-emerald-700 tabular-nums">{formatCurrency(yg.totalIngresos)}</td>
                                                            <td className="px-4 py-2 text-right font-black text-rose-700 tabular-nums">{formatCurrency(yg.totalEgresos)}</td>
                                                            <td className="px-4 py-2 text-right font-black text-amber-700 tabular-nums">{formatCurrency(yg.totalBonos)}</td>
                                                            <td className="px-4 py-2 text-right font-black text-emerald-700 tabular-nums">{formatCurrency(yg.totalServicios)}</td>
                                                            <td className={`px-4 py-2 text-right font-black tabular-nums ${yg.totalNeto >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>{yg.totalNeto >= 0 ? '' : '−'}{formatCurrency(Math.abs(yg.totalNeto))}</td>
                                                        </tr>
                                                    )}
                                                </React.Fragment>
                                            );
                                        })}
                                    </tbody>
                                    <tfoot className="sticky bottom-0 z-10">
                                        <tr className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-white">
                                            <td className="px-4 py-3 text-xs font-black uppercase tracking-wider">Total General</td>
                                            <td className="px-4 py-3 text-right text-sm font-black tabular-nums">{formatCurrency(generalTotal.ingresos)}</td>
                                            <td className="px-4 py-3 text-right text-sm font-black text-rose-600 dark:text-rose-300 tabular-nums">{formatCurrency(generalTotal.egresos)}</td>
                                            <td className="px-4 py-3 text-right text-sm font-black text-amber-600 dark:text-amber-300 tabular-nums">{formatCurrency(generalTotal.bonos)}</td>
                                            <td className="px-4 py-3 text-right text-sm font-black text-emerald-600 dark:text-emerald-300 tabular-nums">{formatCurrency(generalTotal.servicios)}</td>
                                            <td className={`px-4 py-3 text-right text-sm font-black tabular-nums ${generalTotal.neto >= 0 ? 'text-emerald-600 dark:text-emerald-300' : 'text-rose-600 dark:text-rose-300'}`}>{generalTotal.neto >= 0 ? '' : '−'}{formatCurrency(Math.abs(generalTotal.neto))}</td>
                                        </tr>
                                    </tfoot>
                                </table>
                            )}
                        </div>
                        <div className="flex justify-end px-6 pb-5 pt-2 border-t border-slate-200 dark:border-slate-700 flex-shrink-0">
                            <button onClick={() => setShowHistoryModal(false)} className="px-6 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">Cerrar</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Balance Total — Todos los movimientos del mes (lista plana + editar/eliminar) */}
            {showBalanceTotalModal && (
                <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="relative w-full max-w-2xl max-h-[85vh] bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xl overflow-hidden flex flex-col">
                        <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
                            <div>
                                <h2 className="text-lg font-bold text-slate-900 dark:text-white">💰 Balance Total — Movimientos del Mes</h2>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                    {movimientosDelMes.length} movimientos · Balance: <span className={`font-bold ${totalBalance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{totalBalance >= 0 ? '' : '−'}{formatCurrency(Math.abs(totalBalance))}</span>
                                </p>
                            </div>
                            <button onClick={() => { setShowBalanceTotalModal(false); setEditingMov(null); }} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                                <span className="material-symbols-outlined !text-[20px]">close</span>
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto custom-scrollbar px-6 py-4 space-y-1">
                            {loading ? (
                                <div className="flex items-center justify-center py-12"><div className="w-8 h-8 border-3 border-primary/20 border-t-primary rounded-full animate-spin"></div></div>
                            ) : movimientosDelMes.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                                    <span className="material-symbols-outlined !text-[48px] opacity-30">receipt_long</span>
                                    <p className="text-sm font-semibold mt-2">Sin movimientos este mes</p>
                                </div>
                            ) : (
                                movimientosDelMes.map(m => {
                                    const isIncome = m.type === 'income';
                                    const isEditing = editingMov === m.id;
                                    const methodLabel = m.payment_method === 'transfer' || m.payment_method === 'card' ? '🏦 Transf.' : m.payment_method === 'mixed' ? '🔀 Mixto' : '💵 Efectivo';
                                    const dateStr = new Date(m.created_at).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
                                    return (
                                        <div key={m.id} className={`flex items-center gap-3 py-2.5 px-3 rounded-lg transition-colors ${isEditing ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800' : 'hover:bg-slate-50 dark:hover:bg-slate-700/30'}`}>
                                            {isEditing ? (
                                                <div className="flex-1 flex flex-wrap items-center gap-2">
                                                    <select value={editMovType} onChange={e => setEditMovType(e.target.value as any)}
                                                        className="text-xs font-bold px-2 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-white">
                                                        <option value="income">Ingreso</option>
                                                        <option value="expense">Egreso</option>
                                                    </select>
                                                    <input type="number" value={editMovAmount} onChange={e => setEditMovAmount(e.target.value)}
                                                        className="w-28 text-xs font-bold px-2 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-white"
                                                        onKeyDown={e => { if (e.key === 'Enter') handleSaveEditMov(); if (e.key === 'Escape') setEditingMov(null); }} />
                                                    <input type="text" value={editMovDesc} onChange={e => setEditMovDesc(e.target.value)}
                                                        className="flex-1 min-w-[150px] text-xs font-medium px-2 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-white"
                                                        onKeyDown={e => { if (e.key === 'Enter') handleSaveEditMov(); if (e.key === 'Escape') setEditingMov(null); }} />
                                                    <button onClick={handleSaveEditMov} className="text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 px-2 py-1 rounded">Guardar</button>
                                                    <button onClick={() => setEditingMov(null)} className="text-xs font-bold text-slate-500 hover:text-slate-700 px-2 py-1 rounded">Cancelar</button>
                                                </div>
                                            ) : (
                                                <>
                                                    <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${isIncome ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">{m.description || 'Movimiento'}</p>
                                                        <p className="text-[10px] text-slate-400">{dateStr} · {methodLabel}</p>
                                                    </div>
                                                    <span className={`text-sm font-black tabular-nums flex-shrink-0 ${isIncome ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                        {isIncome ? '+' : '−'}{formatCurrency(m.amount)}
                                                    </span>
                                                    <button onClick={(e) => { e.stopPropagation(); startEditMov(m); }}
                                                        className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                                                        <span className="material-symbols-outlined !text-[16px]">edit</span>
                                                    </button>
                                                    <button onClick={(e) => { e.stopPropagation(); handleDeleteMov(m.id); }}
                                                        className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-600 transition-colors">
                                                        <span className="material-symbols-outlined !text-[16px]">delete</span>
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </div>
                        <div className="flex justify-end px-6 pb-5 pt-2 border-t border-slate-200 dark:border-slate-700 flex-shrink-0">
                            <button onClick={() => { setShowBalanceTotalModal(false); setEditingMov(null); }} className="px-6 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">Cerrar</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Efectivo Drill-Down */}
            <CashDashboardDetailModal isOpen={showEfectivoModal} onClose={() => setShowEfectivoModal(false)} title="💰 Efectivo — Mes en Curso" showIncomes ingresos={cashMovementsDelMes.ingresos} egresos={cashMovementsDelMes.egresos} neto={cashMovementsDelMes.neto} loading={loading} />

            {/* Transferencia Drill-Down */}
            <CashDashboardDetailModal isOpen={showTransferenciaModal} onClose={() => setShowTransferenciaModal(false)} title="🏦 Transferencia — Mes en Curso" showIncomes ingresos={transferMovementsDelMes.ingresos} egresos={transferMovementsDelMes.egresos} neto={transferMovementsDelMes.neto} loading={loading} />

            {/* Bonos Entregados */}
            <BonosDetalleModal isOpen={showBonosModal} onClose={() => setShowBonosModal(false)} items={bonosDetalle} total={bonosTotal} loading={bonosLoading} />

            {/* Ventas Servicios */}
            <VentasServiciosDetalleModal isOpen={showVentasServiciosModal} onClose={() => setShowVentasServiciosModal(false)} items={ventasServiciosDetalle} total={ventasServiciosTotal} loading={ventasServiciosLoading} />

            {/* Cartera Total */}
            <CarteraDetailModal isOpen={showCarteraTotalModal} onClose={() => setShowCarteraTotalModal(false)} mode="total" items={carteraClientes} loading={carteraClientesLoading} />

            {/* Recuperación Efectivo */}
            <CarteraDetailModal isOpen={showRecupEfectivoModal} onClose={() => setShowRecupEfectivoModal(false)} mode="recuperacion-efectivo" items={recuperacionEfectivoDetalle} loading={recuperacionDetalleLoading} />

            {/* Recuperación Transferencia */}
            <CarteraDetailModal isOpen={showRecupTransferModal} onClose={() => setShowRecupTransferModal(false)} mode="recuperacion-transferencia" items={recuperacionTransferenciaDetalle} loading={recuperacionDetalleLoading} />

            {/* Acreedores — Deuda Total */}
            <CarteraDetailModal isOpen={showAcreedoresTotalModal} onClose={() => setShowAcreedoresTotalModal(false)} mode="acreedores" items={acreedoresDetalle} loading={acreedoresLoading} />

            {/* Acreedores — Pagos del Mes */}
            <CarteraDetailModal isOpen={showAcreedoresPagosModal} onClose={() => setShowAcreedoresPagosModal(false)} mode="acreedores-pagos" items={acreedoresPagosDetalle} loading={acreedoresLoading} />
        </div>
    );
};

/** Modal inline para nuevo movimiento (compartido entre desktop y web) */
const NuevoMovimientoModal: React.FC<{ onClose: () => void; onSubmit: (type: 'income' | 'expense', amount: number, desc: string, method: 'cash' | 'transfer') => void }> = ({ onClose, onSubmit }) => {
    const [mvType, setMvType] = useState<'income' | 'expense'>('expense');
    const [mvAmount, setMvAmount] = useState('');
    const [mvDescription, setMvDescription] = useState('');
    const [mvPaymentMethod, setMvPaymentMethod] = useState<'cash' | 'transfer'>('cash');
    const [mvProcessing, setMvProcessing] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const val = parseFloat(mvAmount);
        if (!val || val <= 0 || !mvDescription.trim()) return;
        setMvProcessing(true);
        await onSubmit(mvType, val, mvDescription.trim(), mvPaymentMethod);
        setMvProcessing(false);
        setMvAmount('');
        setMvDescription('');
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[310] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="relative w-full max-w-md bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xl overflow-hidden">
                <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-slate-200 dark:border-slate-700">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary">add_circle</span>Nuevo Movimiento
                    </h2>
                    <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                        <span className="material-symbols-outlined !text-[20px]">close</span>
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="flex bg-slate-100 dark:bg-slate-700 p-1 rounded-xl">
                        <button type="button" onClick={() => setMvType('expense')} className={`flex-1 py-2 text-xs font-black uppercase rounded-lg transition-all ${mvType === 'expense' ? 'bg-white dark:bg-slate-800 text-rose-500 shadow-sm' : 'text-slate-400'}`}>Egreso</button>
                        <button type="button" onClick={() => setMvType('income')} className={`flex-1 py-2 text-xs font-black uppercase rounded-lg transition-all ${mvType === 'income' ? 'bg-white dark:bg-slate-800 text-emerald-500 shadow-sm' : 'text-slate-400'}`}>Ingreso</button>
                    </div>
                    <div className="flex bg-slate-100 dark:bg-slate-700 p-1 rounded-xl">
                        <button type="button" onClick={() => setMvPaymentMethod('cash')} className={`flex-1 py-2 text-xs font-black uppercase rounded-lg transition-all ${mvPaymentMethod === 'cash' ? 'bg-white dark:bg-slate-800 text-emerald-600 shadow-sm' : 'text-slate-400'}`}>💰 Efectivo</button>
                        <button type="button" onClick={() => setMvPaymentMethod('transfer')} className={`flex-1 py-2 text-xs font-black uppercase rounded-lg transition-all ${mvPaymentMethod === 'transfer' ? 'bg-white dark:bg-slate-800 text-sky-600 shadow-sm' : 'text-slate-400'}`}>🏦 Transferencia</button>
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Monto</label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 font-black text-slate-400">$</span>
                            <input type="number" value={mvAmount} onChange={e => setMvAmount(e.target.value)}
                                className="w-full pl-8 pr-4 py-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl outline-none focus:border-primary font-bold text-sm text-slate-900 dark:text-white" placeholder="0" required />
                        </div>
                    </div>
                    <div>
                        <textarea value={mvDescription} onChange={e => setMvDescription(e.target.value)}
                            placeholder="Concepto del movimiento..."
                            className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl outline-none focus:border-primary font-bold text-sm text-slate-900 dark:text-white h-24 resize-none" required />
                    </div>
                    <button type="submit" disabled={mvProcessing || !mvAmount || !mvDescription}
                        className={`w-full py-3 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 ${mvType === 'income' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-rose-600 hover:bg-rose-700 text-white'} disabled:opacity-50`}>
                        {mvProcessing ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : mvType === 'income' ? 'Registrar Ingreso' : 'Registrar Egreso'}
                    </button>
                </form>
            </div>
        </div>
    );
};
