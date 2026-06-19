// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { useCentralCash } from '../../hooks/useCentralCash';
import { CashDashboardDetailModal } from '@shared/components/modals/CashDashboardDetailModal';
import { CentralCashMovementModal } from './CentralCashMovementModal';
import { CarteraDetailModal } from '@shared/components/modals/CarteraDetailModal';
import { BonosDetalleModal } from '@shared/components/modals/BonosDetalleModal';
import { VentasServiciosDetalleModal } from '@shared/components/modals/VentasServiciosDetalleModal';
import { useSessionStore } from '@shared/store/useSessionStore';
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
    const user = useSessionStore(state => state.user);

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
    const [editingMov, setEditingMov] = useState<string | null>(null); // movement id being edited
    const [editMovType, setEditMovType] = useState<'income' | 'expense'>('expense');
    const [editMovAmount, setEditMovAmount] = useState('');
    const [editMovDesc, setEditMovDesc] = useState('');

    // Table 3-level state (014-resumen-operativo-mes-completo)
    const [expandedYears, setExpandedYears] = useState<Set<number>>(new Set());
    const [expandedMonth, setExpandedMonth] = useState<string | null>(null);

    const toggleYear = (year: number) => {
        setExpandedYears(prev => {
            const next = new Set(prev);
            if (next.has(year)) {
                next.delete(year);
                // Collapse any expanded month inside this year
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
        // Neto es calculado. Para lograr el nuevo neto, se ajustan los ingresos.
        const tipo = editingCell.field === 'egresos' ? 'expense' : 'income';
        const desc = editingCell.field === 'neto'
            ? `[AJUSTE MANUAL] Neto de ${row.monthLabel} ${row.year} — de $${(row.ingresos - row.egresos).toLocaleString()} a $${newVal.toLocaleString()} (via ingresos)`
            : `[AJUSTE MANUAL] ${fieldNames[editingCell.field]} de ${row.monthLabel} ${row.year} — de $${oldVal.toLocaleString()} a $${newVal.toLocaleString()}`;
        await addMovement(tipo, Math.abs(diff), desc, 'cash');
        setEditingCell(null);
    };

    const formatCurrency = (n: number) =>
        '$' + n.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

    const kpiLoading = loading && movements.length === 0;

    // Movimientos del mes en curso para el modal de Balance Total (lista plana, orden fecha desc)
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

                    {/* COLUMNA DERECHA */}
                    <div className="flex-1 space-y-4">
                        {/* Resumen Operativo — tabla 3 niveles (014-resumen-operativo-mes-completo) */}
                        <div className="bg-white dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5">
                            <h3 className="text-sm font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-4">📊 Resumen Operativo</h3>
                            {yearGroups.length === 0 ? (
                                <div className="text-center py-10">
                                    {tableLoading ? (
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="w-10 h-10 border-3 border-primary/20 border-t-primary rounded-full animate-spin" />
                                            <p className="text-xs text-slate-500 font-medium">Calculando resumen operativo...</p>
                                        </div>
                                    ) : (
                                        <p className="text-xs text-slate-400 italic">Sin movimientos aún</p>
                                    )}
                                </div>
                            ) : (
                                <div className="max-h-[500px] overflow-y-auto custom-scrollbar rounded-lg border border-slate-200 dark:border-slate-700">
                                    <table className="w-full text-xs">
                                        <thead className="sticky top-0 z-10 bg-slate-100 dark:bg-slate-800">
                                            <tr className="text-left">
                                                <th className="px-3 py-2.5 text-[10px] font-black text-slate-500 uppercase tracking-wider">Año / Mes</th>
                                                <th className="px-3 py-2.5 text-[10px] font-black text-slate-500 uppercase tracking-wider text-right">Ingresos</th>
                                                <th className="px-3 py-2.5 text-[10px] font-black text-slate-500 uppercase tracking-wider text-right">Egresos</th>
                                                <th className="px-3 py-2.5 text-[10px] font-black text-slate-500 uppercase tracking-wider text-right">🎁 Bonos</th>
                                                <th className="px-3 py-2.5 text-[10px] font-black text-slate-500 uppercase tracking-wider text-right">📊 Servicios</th>
                                                <th className="px-3 py-2.5 text-[10px] font-black text-slate-500 uppercase tracking-wider text-right">Neto</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {yearGroups.map(yg => {
                                                const isYearExpanded = expandedYears.has(yg.year);
                                                return (
                                                    <React.Fragment key={yg.year}>
                                                        {/* N1 — Fila de Año */}
                                                        <tr>
                                                            <td colSpan={6} className="px-0 py-0">
                                                                <button onClick={() => toggleYear(yg.year)}
                                                                    className="w-full flex items-center px-3 py-2.5 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-700/30 transition-colors text-left font-bold text-sm text-slate-800 dark:text-slate-200">
                                                                    <span className="material-symbols-outlined text-slate-400 !text-[16px] mr-2 transition-transform duration-200"
                                                                        style={{ transform: isYearExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}>chevron_right</span>
                                                                    <span className="flex-1">{yg.year}</span>
                                                                    <span className="text-emerald-600 tabular-nums mr-3">{formatCurrency(yg.totalIngresos)}</span>
                                                                    <span className="text-rose-600 tabular-nums mr-3">{formatCurrency(yg.totalEgresos)}</span>
                                                                    <span className="text-amber-600 tabular-nums mr-3">{formatCurrency(yg.totalBonos)}</span>
                                                                    <span className="text-emerald-600 tabular-nums mr-3">{formatCurrency(yg.totalServicios)}</span>
                                                                    <span className={`tabular-nums mr-3 font-black ${yg.totalNeto >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{yg.totalNeto >= 0 ? '' : '−'}{formatCurrency(Math.abs(yg.totalNeto))}</span>
                                                                </button>
                                                            </td>
                                                        </tr>
                                                        {/* N2 — Filas de Meses (solo si año expandido) */}
                                                        {isYearExpanded && yg.months.map(row => {
                                                            const isMonthExpanded = expandedMonth === row.monthKey;
                                                            const hasDetail = row.cashIngresos.length > 0 || row.transferIngresos.length > 0 || row.egresosDetalle.length > 0 || row.serviciosDetalle.length > 0 || row.bonosDetalle.length > 0;
                                                            return (
                                                                <React.Fragment key={row.monthKey}>
                                                                    <tr className={`border-t border-slate-100 dark:border-slate-800 ${isMonthExpanded ? 'bg-blue-50/50 dark:bg-blue-900/10' : 'hover:bg-slate-50 dark:hover:bg-slate-800/30'} transition-colors`}>
                                                                        <td className="px-3 py-2 pl-10 text-[11px] font-semibold text-slate-600 dark:text-slate-400 cursor-pointer" onClick={() => hasDetail && toggleMonthDetail(row.monthKey)}>
                                                                            <span className="flex items-center gap-2">
                                                                                {hasDetail && <span className="material-symbols-outlined text-slate-300 !text-[12px] transition-transform duration-200"
                                                                                    style={{ transform: isMonthExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}>chevron_right</span>}
                                                                                {row.monthLabel}
                                                                            </span>
                                                                        </td>
                                                                        {/* Ingresos */}
                                                                        <td className="px-3 py-2 text-right tabular-nums"
                                                                            onClick={(e) => { if (e.ctrlKey || e.metaKey) { e.stopPropagation(); startEdit(row.monthKey, 'ingresos', row.ingresos); } }}>
                                                                            {editingCell?.monthKey === row.monthKey && editingCell?.field === 'ingresos' ? (
                                                                                <input type="number" value={editValue} data-edit={`${row.monthKey}-ingresos`}
                                                                                    onChange={e => setEditValue(e.target.value)}
                                                                                    onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditingCell(null); }}
                                                                                    onBlur={saveEdit}
                                                                                    className="w-20 text-right px-1 py-0.5 border border-primary rounded bg-white dark:bg-slate-700 text-emerald-600 font-bold text-[11px] outline-none focus:ring-1 ring-primary"
                                                                                    onClick={e => e.stopPropagation()} />
                                                                            ) : (
                                                                                <span className="text-emerald-600 font-bold cursor-pointer hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded px-1 -mx-1" title="Ctrl+clic para editar">{formatCurrency(row.ingresos)}</span>
                                                                            )}
                                                                        </td>
                                                                        {/* Egresos */}
                                                                        <td className="px-3 py-2 text-right tabular-nums"
                                                                            onClick={(e) => { if (e.ctrlKey || e.metaKey) { e.stopPropagation(); startEdit(row.monthKey, 'egresos', row.egresos); } }}>
                                                                            {editingCell?.monthKey === row.monthKey && editingCell?.field === 'egresos' ? (
                                                                                <input type="number" value={editValue} data-edit={`${row.monthKey}-egresos`}
                                                                                    onChange={e => setEditValue(e.target.value)}
                                                                                    onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditingCell(null); }}
                                                                                    onBlur={saveEdit}
                                                                                    className="w-20 text-right px-1 py-0.5 border border-primary rounded bg-white dark:bg-slate-700 text-rose-600 font-bold text-[11px] outline-none focus:ring-1 ring-primary"
                                                                                    onClick={e => e.stopPropagation()} />
                                                                            ) : (
                                                                                <span className="text-rose-600 font-bold cursor-pointer hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded px-1 -mx-1" title="Ctrl+clic para editar">{formatCurrency(row.egresos)}</span>
                                                                            )}
                                                                        </td>
                                                                        {/* Bonos */}
                                                                        <td className="px-3 py-2 text-right tabular-nums"
                                                                            onClick={(e) => { if (e.ctrlKey || e.metaKey) { e.stopPropagation(); startEdit(row.monthKey, 'bonos', row.bonos); } }}>
                                                                            {editingCell?.monthKey === row.monthKey && editingCell?.field === 'bonos' ? (
                                                                                <input type="number" value={editValue} data-edit={`${row.monthKey}-bonos`}
                                                                                    onChange={e => setEditValue(e.target.value)}
                                                                                    onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditingCell(null); }}
                                                                                    onBlur={saveEdit}
                                                                                    className="w-20 text-right px-1 py-0.5 border border-primary rounded bg-white dark:bg-slate-700 text-amber-600 font-bold text-[11px] outline-none focus:ring-1 ring-primary"
                                                                                    onClick={e => e.stopPropagation()} />
                                                                            ) : (
                                                                                <span className="text-amber-600 font-bold cursor-pointer hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded px-1 -mx-1" title="Ctrl+clic para editar">{formatCurrency(row.bonos)}</span>
                                                                            )}
                                                                        </td>
                                                                        {/* Servicios */}
                                                                        <td className="px-3 py-2 text-right tabular-nums"
                                                                            onClick={(e) => { if (e.ctrlKey || e.metaKey) { e.stopPropagation(); startEdit(row.monthKey, 'servicios', row.servicios); } }}>
                                                                            {editingCell?.monthKey === row.monthKey && editingCell?.field === 'servicios' ? (
                                                                                <input type="number" value={editValue} data-edit={`${row.monthKey}-servicios`}
                                                                                    onChange={e => setEditValue(e.target.value)}
                                                                                    onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditingCell(null); }}
                                                                                    onBlur={saveEdit}
                                                                                    className="w-20 text-right px-1 py-0.5 border border-primary rounded bg-white dark:bg-slate-700 text-purple-600 font-bold text-[11px] outline-none focus:ring-1 ring-primary"
                                                                                    onClick={e => e.stopPropagation()} />
                                                                            ) : (
                                                                                <span className="text-emerald-600 font-bold cursor-pointer hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded px-1 -mx-1" title="Ctrl+clic para editar">{formatCurrency(row.servicios)}</span>
                                                                            )}
                                                                        </td>
                                                                        {/* Neto — Ctrl+clic ajusta ingresos para alcanzar el neto deseado */}
                                                                        <td className={`px-3 py-2 text-right font-black tabular-nums ${row.neto >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}
                                                                            onClick={(e) => { if (e.ctrlKey || e.metaKey) { e.stopPropagation(); startEdit(row.monthKey, 'neto', row.neto); } else if (hasDetail) { toggleMonthDetail(row.monthKey); } }}>
                                                                            {editingCell?.monthKey === row.monthKey && editingCell?.field === 'neto' ? (
                                                                                <input type="number" value={editValue} data-edit={`${row.monthKey}-neto`}
                                                                                    onChange={e => setEditValue(e.target.value)}
                                                                                    onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditingCell(null); }}
                                                                                    onBlur={saveEdit}
                                                                                    className="w-20 text-right px-1 py-0.5 border border-primary rounded bg-white dark:bg-slate-700 text-slate-800 font-black text-[11px] outline-none focus:ring-1 ring-primary"
                                                                                    onClick={e => e.stopPropagation()} />
                                                                            ) : (
                                                                                <span className="cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/30 rounded px-1 -mx-1" title="Ctrl+clic para editar neto">{row.neto >= 0 ? '' : '−'}{formatCurrency(Math.abs(row.neto))}</span>
                                                                            )}
                                                                        </td>
                                                                    </tr>
                                                                    {/* N3 — Detalle del Mes */}
                                                                    {isMonthExpanded && (
                                                                        <tr>
                                                                            <td colSpan={6} className="px-4 py-3 bg-slate-50 dark:bg-slate-800/30 border-b border-slate-200 dark:border-slate-700 animate-in slide-in-from-top-2">
                                                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                                                    {/* 💰 Ingresos Efectivo */}
                                                                                    <div className="bg-emerald-50/50 dark:bg-emerald-900/5 rounded-lg border border-emerald-200 dark:border-emerald-800/30 overflow-hidden">
                                                                                        <div className="px-3 py-1.5 bg-emerald-100 dark:bg-emerald-900/20 text-[9px] font-black text-emerald-700 dark:text-emerald-400 uppercase">💰 Efectivo</div>
                                                                                        <div className="max-h-[120px] overflow-y-auto">
                                                                                            {row.cashIngresos.length === 0 ? <p className="text-[9px] text-slate-400 italic p-2 text-center">—</p> :
                                                                                                row.cashIngresos.slice(0, 8).map((item, i) => (
                                                                                                    <div key={i} className="flex justify-between px-3 py-1 text-[10px] border-b border-emerald-100 dark:border-emerald-800/10">
                                                                                                        <span className="truncate mr-2 text-slate-600 dark:text-slate-400">{item.label}</span>
                                                                                                        <span className="font-bold text-emerald-600 tabular-nums flex-shrink-0">+{formatCurrency(item.amount)}</span>
                                                                                                    </div>
                                                                                                ))}
                                                                                        </div>
                                                                                    </div>
                                                                                    {/* 🏦 Ingresos Transferencia */}
                                                                                    <div className="bg-sky-50/50 dark:bg-sky-900/5 rounded-lg border border-sky-200 dark:border-sky-800/30 overflow-hidden">
                                                                                        <div className="px-3 py-1.5 bg-sky-100 dark:bg-sky-900/20 text-[9px] font-black text-sky-700 dark:text-sky-400 uppercase">🏦 Transferencia</div>
                                                                                        <div className="max-h-[120px] overflow-y-auto">
                                                                                            {row.transferIngresos.length === 0 ? <p className="text-[9px] text-slate-400 italic p-2 text-center">—</p> :
                                                                                                row.transferIngresos.slice(0, 8).map((item, i) => (
                                                                                                    <div key={i} className="flex justify-between px-3 py-1 text-[10px] border-b border-sky-100 dark:border-sky-800/10">
                                                                                                        <span className="truncate mr-2 text-slate-600 dark:text-slate-400">{item.label}</span>
                                                                                                        <span className="font-bold text-sky-600 tabular-nums flex-shrink-0">+{formatCurrency(item.amount)}</span>
                                                                                                    </div>
                                                                                                ))}
                                                                                        </div>
                                                                                    </div>
                                                                                    {/* 📤 Egresos */}
                                                                                    <div className="bg-rose-50/50 dark:bg-rose-900/5 rounded-lg border border-rose-200 dark:border-rose-800/30 overflow-hidden">
                                                                                        <div className="px-3 py-1.5 bg-rose-100 dark:bg-rose-900/20 text-[9px] font-black text-rose-700 dark:text-rose-400 uppercase">📤 Egresos</div>
                                                                                        <div className="max-h-[120px] overflow-y-auto">
                                                                                            {row.egresosDetalle.length === 0 ? <p className="text-[9px] text-slate-400 italic p-2 text-center">—</p> :
                                                                                                row.egresosDetalle.slice(0, 8).map((item, i) => (
                                                                                                    <div key={i} className="flex justify-between px-3 py-1 text-[10px] border-b border-rose-100 dark:border-rose-800/10">
                                                                                                        <span className="truncate mr-2 text-slate-600 dark:text-slate-400">{item.label}</span>
                                                                                                        <span className="font-bold text-rose-600 tabular-nums flex-shrink-0">−{formatCurrency(item.amount)}</span>
                                                                                                    </div>
                                                                                                ))}
                                                                                        </div>
                                                                                    </div>
                                                                                    {/* 📊 Servicios */}
                                                                                    <div className="bg-purple-50/50 dark:bg-purple-900/5 rounded-lg border border-purple-200 dark:border-purple-800/30 overflow-hidden">
                                                                                        <div className="px-3 py-1.5 bg-purple-100 dark:bg-purple-900/20 text-[9px] font-black text-purple-700 dark:text-purple-400 uppercase">📊 Servicios</div>
                                                                                        <div className="max-h-[120px] overflow-y-auto">
                                                                                            {row.serviciosDetalle.length === 0 ? <p className="text-[9px] text-slate-400 italic p-2 text-center">—</p> :
                                                                                                row.serviciosDetalle.slice(0, 8).map((item, i) => (
                                                                                                    <div key={i} className="flex justify-between px-3 py-1 text-[10px] border-b border-purple-100 dark:border-purple-800/10">
                                                                                                        <span className="truncate mr-2 text-slate-600 dark:text-slate-400">{item.label}</span>
                                                                                                        <span className="font-bold text-purple-600 tabular-nums flex-shrink-0">{formatCurrency(item.amount)}</span>
                                                                                                    </div>
                                                                                                ))}
                                                                                        </div>
                                                                                    </div>
                                                                                    {/* 🎁 Bonos */}
                                                                                    <div className="bg-amber-50/50 dark:bg-amber-900/5 rounded-lg border border-amber-200 dark:border-amber-800/30 overflow-hidden md:col-span-2">
                                                                                        <div className="px-3 py-1.5 bg-amber-100 dark:bg-amber-900/20 text-[9px] font-black text-amber-700 dark:text-amber-400 uppercase">🎁 Bonos Canjeados</div>
                                                                                        <div className="max-h-[120px] overflow-y-auto">
                                                                                            {row.bonosDetalle.length === 0 ? <p className="text-[9px] text-slate-400 italic p-2 text-center">—</p> :
                                                                                                row.bonosDetalle.slice(0, 8).map((item, i) => (
                                                                                                    <div key={i} className="flex justify-between px-3 py-1 text-[10px] border-b border-amber-100 dark:border-amber-800/10">
                                                                                                        <span className="truncate mr-2 text-slate-600 dark:text-slate-400">{item.label}</span>
                                                                                                        <span className="font-bold text-amber-600 tabular-nums flex-shrink-0">{formatCurrency(item.amount)}</span>
                                                                                                    </div>
                                                                                                ))}
                                                                                        </div>
                                                                                    </div>
                                                                                </div>
                                                                            </td>
                                                                        </tr>
                                                                    )}
                                                                </React.Fragment>
                                                            );
                                                        })}
                                                        {/* Subtotal del año */}
                                                        {isYearExpanded && (
                                                            <tr className="border-t-2 border-slate-300 dark:border-slate-600 bg-slate-100/50 dark:bg-slate-700/30">
                                                                <td className="px-3 py-2 pl-10 text-[10px] font-black text-slate-500 uppercase">Total {yg.year}</td>
                                                                <td className="px-3 py-2 text-right font-black text-emerald-700 tabular-nums">{formatCurrency(yg.totalIngresos)}</td>
                                                                <td className="px-3 py-2 text-right font-black text-rose-700 tabular-nums">{formatCurrency(yg.totalEgresos)}</td>
                                                                <td className="px-3 py-2 text-right font-black text-amber-700 tabular-nums">{formatCurrency(yg.totalBonos)}</td>
                                                                <td className="px-3 py-2 text-right font-black text-emerald-700 tabular-nums">{formatCurrency(yg.totalServicios)}</td>
                                                                <td className={`px-3 py-2 text-right font-black tabular-nums ${yg.totalNeto >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>{yg.totalNeto >= 0 ? '' : '−'}{formatCurrency(Math.abs(yg.totalNeto))}</td>
                                                            </tr>
                                                        )}
                                                    </React.Fragment>
                                                );
                                            })}
                                        </tbody>
                                        {/* Total General — sticky footer */}
                                        <tfoot className="sticky bottom-0 z-10">
                                            <tr className="bg-gradient-to-r from-slate-800 to-slate-900 dark:from-slate-700 dark:to-slate-800 text-white">
                                                <td className="px-3 py-3 text-xs font-black uppercase tracking-wider">Total General</td>
                                                <td className="px-3 py-3 text-right text-sm font-black tabular-nums">{formatCurrency(generalTotal.ingresos)}</td>
                                                <td className="px-3 py-3 text-right text-sm font-black text-rose-300 tabular-nums">{formatCurrency(generalTotal.egresos)}</td>
                                                <td className="px-3 py-3 text-right text-sm font-black text-amber-300 tabular-nums">{formatCurrency(generalTotal.bonos)}</td>
                                                <td className="px-3 py-3 text-right text-sm font-black text-emerald-300 tabular-nums">{formatCurrency(generalTotal.servicios)}</td>
                                                <td className={`px-3 py-3 text-right text-sm font-black tabular-nums ${generalTotal.neto >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>{generalTotal.neto >= 0 ? '' : '−'}{formatCurrency(Math.abs(generalTotal.neto))}</td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            )}
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

                        {/* Acreedores (015-acreedores-modulo) */}
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
                    </div>
                </div>
            </div>

            {/* ================================================================ */}
            {/* MODALES */}
            {/* ================================================================ */}

            <CentralCashMovementModal isOpen={showMovementModal} onClose={() => setShowMovementModal(false)} addMovement={addMovement} />

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
