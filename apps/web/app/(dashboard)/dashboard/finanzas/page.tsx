'use client';

import React, { useState } from 'react';
import { useCentralCash } from '@/app/hooks/useCentralCash';
import { CashDashboardDetailModal } from '@shared/components/modals/CashDashboardDetailModal';
import { CarteraDetailModal } from '@shared/components/modals/CarteraDetailModal';
import { BonosDetalleModal } from '@shared/components/modals/BonosDetalleModal';
import { VentasServiciosDetalleModal } from '@shared/components/modals/VentasServiciosDetalleModal';
import DashboardHeader from '@/app/components/DashboardHeader';
import { useAuth } from '@/app/context/AuthContext';
import { useModule } from '@shared/hooks/useModule';

export default function CentralCashPage() {
    const {
        movements, loading, addMovement,
        cashBalance, transferBalance, totalBalance,
        carteraTotal, carteraTotalLoading,
        recuperacionEfectivo, recuperacionTransferencia,
        cashMovementsDelMes, transferMovementsDelMes,
        carteraClientes, carteraClientesLoading,
        recuperacionEfectivoDetalle, recuperacionTransferenciaDetalle, recuperacionDetalleLoading,
        monthlyBreakdown, fetchCategorySales,
        bonosTotal, bonosLoading, bonosDetalle,
        ventasServiciosTotal, ventasServiciosLoading, ventasServiciosDetalle,
    } = useCentralCash();
    const { profile } = useAuth();

    const hasCartera = useModule('customers');

    const [showMovementModal, setShowMovementModal] = useState(false);
    const [showEfectivoModal, setShowEfectivoModal] = useState(false);
    const [showTransferenciaModal, setShowTransferenciaModal] = useState(false);
    const [showBonosModal, setShowBonosModal] = useState(false);
    const [showVentasServiciosModal, setShowVentasServiciosModal] = useState(false);
    const [showCarteraTotalModal, setShowCarteraTotalModal] = useState(false);
    const [showRecupEfectivoModal, setShowRecupEfectivoModal] = useState(false);
    const [showRecupTransferModal, setShowRecupTransferModal] = useState(false);
    const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set());

    const toggleMonth = (month: string) => {
        setExpandedMonths(prev => {
            const next = new Set(prev);
            if (next.has(month)) { next.delete(month); }
            else { next.add(month); fetchCategorySales(month); }
            return next;
        });
    };

    const [mvAmount, setMvAmount] = useState('');
    const [mvDescription, setMvDescription] = useState('');
    const [mvType, setMvType] = useState<'income' | 'expense'>('expense');
    const [mvPaymentMethod, setMvPaymentMethod] = useState<'cash' | 'transfer'>('cash');
    const [mvProcessing, setMvProcessing] = useState(false);

    const formatCurrency = (n: number) =>
        '$' + n.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

    const handleSubmitMovement = async (e: React.FormEvent) => {
        e.preventDefault();
        const val = parseFloat(mvAmount);
        if (!val || val <= 0 || !mvDescription) return;
        setMvProcessing(true);
        await addMovement(mvType, val, mvDescription, mvPaymentMethod);
        setMvProcessing(false); setMvAmount(''); setMvDescription(''); setShowMovementModal(false);
    };

    const kpiLoading = loading && movements.length === 0;

    return (
        <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-[#0a0f14]">
            <DashboardHeader />
            <div className="p-4 md:p-6 max-w-7xl mx-auto w-full animate-in fade-in duration-500 space-y-6 pb-20">
                <div className="flex items-center justify-between">
                    <div><h1 className="text-2xl font-black text-slate-900 dark:text-white">💰 Caja Central</h1><p className="text-xs text-slate-500 mt-1">Dashboard Financiero</p></div>
                </div>

                <div className="flex flex-col lg:flex-row gap-6">
                    {/* COLUMNA IZQUIERDA */}
                    <div className="w-full lg:w-[380px] flex-shrink-0 space-y-4">
                        <div className="bg-gradient-to-br from-slate-800 to-slate-900 dark:from-slate-700 dark:to-slate-800 text-white rounded-2xl p-6 shadow-lg">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Balance Total</p>
                            {kpiLoading ? <div className="h-10 w-48 bg-white/10 rounded-lg animate-pulse mt-2" /> : <h2 className={`text-3xl font-black tabular-nums ${totalBalance >= 0 ? 'text-white' : 'text-rose-400'}`}>{totalBalance >= 0 ? '' : '−'}{formatCurrency(Math.abs(totalBalance))}</h2>}
                            <div className="flex gap-4 mt-3">
                                <button onClick={() => setShowEfectivoModal(true)} className="flex-1 bg-white/10 rounded-lg p-2.5 hover:bg-white/20 transition-colors text-left cursor-pointer"><p className="text-[9px] font-bold text-emerald-300 uppercase">Efectivo</p>{kpiLoading ? <div className="h-5 w-16 bg-white/10 rounded mt-1 animate-pulse" /> : <p className="text-sm font-black text-emerald-400 tabular-nums">{formatCurrency(cashBalance)}</p>}</button>
                                <button onClick={() => setShowTransferenciaModal(true)} className="flex-1 bg-white/10 rounded-lg p-2.5 hover:bg-white/20 transition-colors text-left cursor-pointer"><p className="text-[9px] font-bold text-sky-300 uppercase">Transferencia</p>{kpiLoading ? <div className="h-5 w-16 bg-white/10 rounded mt-1 animate-pulse" /> : <p className="text-sm font-black text-sky-400 tabular-nums">{formatCurrency(transferBalance)}</p>}</button>
                            </div>
                        </div>

                        <button onClick={() => setShowEfectivoModal(true)} className="w-full text-left bg-white dark:bg-slate-900/50 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-emerald-300 dark:hover:border-emerald-700 transition-all group">
                            <div className="flex items-center justify-between"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center"><span className="material-symbols-outlined text-emerald-600 dark:text-emerald-400 !text-[20px]">payments</span></div><div><p className="text-[10px] font-black text-slate-400 uppercase">Efectivo Disponible</p>{kpiLoading ? <div className="h-6 w-20 bg-slate-100 dark:bg-slate-800 rounded mt-1 animate-pulse" /> : <p className="text-lg font-black text-emerald-600 dark:text-emerald-400 tabular-nums">{formatCurrency(cashBalance)}</p>}</div></div><span className="material-symbols-outlined text-slate-300 group-hover:text-slate-500 transition-colors">chevron_right</span></div>
                        </button>

                        <button onClick={() => setShowTransferenciaModal(true)} className="w-full text-left bg-white dark:bg-slate-900/50 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-sky-300 dark:hover:border-sky-700 transition-all group">
                            <div className="flex items-center justify-between"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-sky-100 dark:bg-sky-900/30 flex items-center justify-center"><span className="material-symbols-outlined text-sky-600 dark:text-sky-400 !text-[20px]">account_balance</span></div><div><p className="text-[10px] font-black text-slate-400 uppercase">Transferencia Disponible</p>{kpiLoading ? <div className="h-6 w-20 bg-slate-100 dark:bg-slate-800 rounded mt-1 animate-pulse" /> : <p className="text-lg font-black text-sky-600 dark:text-sky-400 tabular-nums">{formatCurrency(transferBalance)}</p>}</div></div><span className="material-symbols-outlined text-slate-300 group-hover:text-slate-500 transition-colors">chevron_right</span></div>
                        </button>

                        <button onClick={() => setShowMovementModal(true)} className="w-full py-3.5 bg-primary hover:bg-[#0b6ddb] text-white rounded-xl font-bold text-sm shadow-md shadow-primary/20 hover:scale-[1.01] active:scale-[0.99] transition-all duration-200 flex items-center justify-center gap-2"><span className="material-symbols-outlined !text-[18px]">add_circle</span>Nuevo Movimiento</button>
                    </div>

                    {/* COLUMNA DERECHA */}
                    <div className="flex-1 space-y-4">
                        {/* Resumen Operativo — acordeones mensuales */}
                        <div className="bg-white dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5">
                            <h3 className="text-sm font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-4">📊 Resumen Operativo</h3>
                            {monthlyBreakdown.length === 0 ? (
                                <p className="text-xs text-slate-400 italic text-center py-8">Sin movimientos aún</p>
                            ) : (
                                <div className="space-y-3">
                                    {monthlyBreakdown.map(mb => {
                                        const isExpanded = expandedMonths.has(mb.month);
                                        const totalIngresos = mb.totalCash + mb.totalTransfer;
                                        return (
                                            <div key={mb.month} className="bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                                                <button onClick={() => toggleMonth(mb.month)}
                                                    className="w-full flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-0 justify-between p-3 hover:bg-slate-100 dark:hover:bg-slate-700/30 transition-colors text-left">
                                                    <div className="flex items-center gap-2">
                                                        <span className="material-symbols-outlined text-slate-400 !text-[18px] transition-transform duration-200"
                                                            style={{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}>chevron_right</span>
                                                        <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{mb.label}</span>
                                                    </div>
                                                    <div className="flex items-center gap-3 ml-7 sm:ml-0 text-xs">
                                                        <span className="text-emerald-600 font-bold">+{formatCurrency(totalIngresos)}</span>
                                                        <span className="text-rose-600 font-bold">−{formatCurrency(mb.totalEgresos)}</span>
                                                        <span className={`font-black ${mb.neto >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                            {mb.neto >= 0 ? '+' : '−'}{formatCurrency(Math.abs(mb.neto))}
                                                        </span>
                                                    </div>
                                                </button>
                                                {isExpanded && (
                                                    <div className="px-4 pb-4 space-y-4 border-t border-slate-200 dark:border-slate-700 pt-4 animate-in slide-in-from-top-2">
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                            <div className="bg-emerald-50/50 dark:bg-emerald-900/5 rounded-xl border border-emerald-200 dark:border-emerald-800/30 overflow-hidden">
                                                                <div className="px-3 py-2 bg-emerald-100 dark:bg-emerald-900/20 border-b border-emerald-200 dark:border-emerald-800/30 flex justify-between items-center">
                                                                    <h4 className="text-[10px] font-black text-emerald-700 dark:text-emerald-400 uppercase">💰 Ingresos Efectivo</h4>
                                                                    <span className="text-xs font-black text-emerald-700 dark:text-emerald-400 tabular-nums">{formatCurrency(mb.totalCash)}</span>
                                                                </div>
                                                                <div className="max-h-[250px] overflow-y-auto custom-scrollbar">
                                                                    {mb.cashIngresos.length === 0 ? <p className="text-[10px] text-slate-400 italic p-3 text-center">Sin ingresos en efectivo</p> :
                                                                        mb.cashIngresos.map((item, i) => (
                                                                            <div key={i} className="flex items-center justify-between px-3 py-1.5 border-b border-emerald-100 dark:border-emerald-800/10 hover:bg-emerald-50 dark:hover:bg-emerald-900/10 transition-colors">
                                                                                <div className="min-w-0 flex-1 mr-2">
                                                                                    <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 truncate">{item.label}</p>
                                                                                    {item.date && <p className="text-[9px] text-slate-400">{new Date(item.date).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })}</p>}
                                                                                </div>
                                                                                <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 tabular-nums flex-shrink-0">+{formatCurrency(item.amount)}</span>
                                                                            </div>
                                                                        ))}
                                                                </div>
                                                            </div>
                                                            <div className="bg-sky-50/50 dark:bg-sky-900/5 rounded-xl border border-sky-200 dark:border-sky-800/30 overflow-hidden">
                                                                <div className="px-3 py-2 bg-sky-100 dark:bg-sky-900/20 border-b border-sky-200 dark:border-sky-800/30 flex justify-between items-center">
                                                                    <h4 className="text-[10px] font-black text-sky-700 dark:text-sky-400 uppercase">🏦 Ingresos Transferencia</h4>
                                                                    <span className="text-xs font-black text-sky-700 dark:text-sky-400 tabular-nums">{formatCurrency(mb.totalTransfer)}</span>
                                                                </div>
                                                                <div className="max-h-[250px] overflow-y-auto custom-scrollbar">
                                                                    {mb.transferIngresos.length === 0 ? <p className="text-[10px] text-slate-400 italic p-3 text-center">Sin ingresos por transferencia</p> :
                                                                        mb.transferIngresos.map((item, i) => (
                                                                            <div key={i} className="flex items-center justify-between px-3 py-1.5 border-b border-sky-100 dark:border-sky-800/10 hover:bg-sky-50 dark:hover:bg-sky-900/10 transition-colors">
                                                                                <div className="min-w-0 flex-1 mr-2">
                                                                                    <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 truncate">{item.label}</p>
                                                                                    {item.date && <p className="text-[9px] text-slate-400">{new Date(item.date).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })}</p>}
                                                                                </div>
                                                                                <span className="text-[11px] font-bold text-sky-600 dark:text-sky-400 tabular-nums flex-shrink-0">+{formatCurrency(item.amount)}</span>
                                                                            </div>
                                                                        ))}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="bg-rose-50/50 dark:bg-rose-900/5 rounded-xl border border-rose-200 dark:border-rose-800/30 overflow-hidden">
                                                            <div className="px-3 py-2 bg-rose-100 dark:bg-rose-900/20 border-b border-rose-200 dark:border-rose-800/30 flex justify-between items-center">
                                                                <h4 className="text-[10px] font-black text-rose-700 dark:text-rose-400 uppercase">📤 Egresos</h4>
                                                                <span className="text-xs font-black text-rose-700 dark:text-rose-400 tabular-nums">−{formatCurrency(mb.totalEgresos)}</span>
                                                            </div>
                                                            <div className="max-h-[200px] overflow-y-auto custom-scrollbar">
                                                                {mb.egresos.length === 0 ? <p className="text-[10px] text-slate-400 italic p-3 text-center">Sin egresos</p> :
                                                                    mb.egresos.map((item, i) => (
                                                                        <div key={i} className="flex items-center justify-between px-3 py-1.5 border-b border-rose-100 dark:border-rose-800/10 hover:bg-rose-50 dark:hover:bg-rose-900/10 transition-colors">
                                                                            <div className="min-w-0 flex-1 mr-2">
                                                                                <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 truncate">{item.label}</p>
                                                                                {item.date && <p className="text-[9px] text-slate-400">{new Date(item.date).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })}</p>}
                                                                            </div>
                                                                            <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400 tabular-nums flex-shrink-0">−{formatCurrency(item.amount)}</span>
                                                                        </div>
                                                                    ))}
                                                            </div>
                                                        </div>
                                                        <div className={`p-3 rounded-lg flex justify-between items-center text-sm font-bold ${mb.neto >= 0 ? 'bg-emerald-50 dark:bg-emerald-900/10 text-emerald-700 dark:text-emerald-400' : 'bg-rose-50 dark:bg-rose-900/10 text-rose-700 dark:text-rose-400'}`}>
                                                            <span>Neto de {mb.label}</span>
                                                            <span className="text-lg tabular-nums">{mb.neto >= 0 ? '' : '−'}{formatCurrency(Math.abs(mb.neto))}</span>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {hasCartera && (
                            <div className="bg-white dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5">
                                <h3 className="text-sm font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-4">💳 Cartera</h3>
                                <div className="grid grid-cols-3 gap-3">
                                    <button onClick={() => setShowCarteraTotalModal(true)} className="bg-purple-50 dark:bg-purple-900/10 border border-purple-100 dark:border-purple-800/30 rounded-xl p-3 text-left hover:bg-purple-100 dark:hover:bg-purple-900/20 transition-colors group"><p className="text-[10px] font-bold text-purple-600 dark:text-purple-400 uppercase mb-1">Cartera Total</p>{carteraTotalLoading ? <div className="h-6 w-20 bg-purple-100 dark:bg-purple-900/20 rounded animate-pulse" /> : <p className="text-lg font-black text-purple-700 dark:text-purple-300 tabular-nums">{formatCurrency(carteraTotal)}</p>}<p className="text-[8px] text-purple-500/60 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity">Ver detalle →</p></button>
                                    <button onClick={() => setShowRecupEfectivoModal(true)} className="bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-800/30 rounded-xl p-3 text-left hover:bg-emerald-100 dark:hover:bg-emerald-900/20 transition-colors group"><p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase mb-1">Recup. Efectivo</p>{carteraTotalLoading ? <div className="h-6 w-20 bg-emerald-100 dark:bg-emerald-900/20 rounded animate-pulse" /> : <p className="text-lg font-black text-emerald-700 dark:text-emerald-300 tabular-nums">{formatCurrency(recuperacionEfectivo)}</p>}<p className="text-[8px] text-emerald-500/60 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity">Ver detalle →</p></button>
                                    <button onClick={() => setShowRecupTransferModal(true)} className="bg-sky-50 dark:bg-sky-900/10 border border-sky-100 dark:border-sky-800/30 rounded-xl p-3 text-left hover:bg-sky-100 dark:hover:bg-sky-900/20 transition-colors group"><p className="text-[10px] font-bold text-sky-600 dark:text-sky-400 uppercase mb-1">Recup. Transfer</p>{carteraTotalLoading ? <div className="h-6 w-20 bg-sky-100 dark:bg-sky-900/20 rounded animate-pulse" /> : <p className="text-lg font-black text-sky-700 dark:text-sky-300 tabular-nums">{formatCurrency(recuperacionTransferencia)}</p>}<p className="text-[8px] text-sky-500/60 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity">Ver detalle →</p></button>
                                </div>
                            </div>
                        )}

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

            {/* Movimiento */}{showMovementModal && (<div className="fixed inset-0 z-[310] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"><div className="relative w-full max-w-md bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xl overflow-hidden"><div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-slate-200 dark:border-slate-700"><h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2"><span className="material-symbols-outlined text-primary">add_circle</span>Nuevo Movimiento</h2><button onClick={() => setShowMovementModal(false)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"><span className="material-symbols-outlined !text-[20px]">close</span></button></div><form onSubmit={handleSubmitMovement} className="p-6 space-y-4"><div className="flex bg-slate-100 dark:bg-slate-700 p-1 rounded-xl"><button type="button" onClick={() => setMvType('expense')} className={`flex-1 py-2 text-xs font-black uppercase rounded-lg transition-all ${mvType === 'expense' ? 'bg-white dark:bg-slate-800 text-rose-500 shadow-sm' : 'text-slate-400'}`}>Egreso</button><button type="button" onClick={() => setMvType('income')} className={`flex-1 py-2 text-xs font-black uppercase rounded-lg transition-all ${mvType === 'income' ? 'bg-white dark:bg-slate-800 text-emerald-500 shadow-sm' : 'text-slate-400'}`}>Ingreso</button></div><div className="flex bg-slate-100 dark:bg-slate-700 p-1 rounded-xl"><button type="button" onClick={() => setMvPaymentMethod('cash')} className={`flex-1 py-2 text-xs font-black uppercase rounded-lg transition-all ${mvPaymentMethod === 'cash' ? 'bg-white dark:bg-slate-800 text-emerald-600 shadow-sm' : 'text-slate-400'}`}>💰 Efectivo</button><button type="button" onClick={() => setMvPaymentMethod('transfer')} className={`flex-1 py-2 text-xs font-black uppercase rounded-lg transition-all ${mvPaymentMethod === 'transfer' ? 'bg-white dark:bg-slate-800 text-sky-600 shadow-sm' : 'text-slate-400'}`}>🏦 Transferencia</button></div><div><label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Monto</label><div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 font-black text-slate-400">$</span><input type="number" value={mvAmount} onChange={e => setMvAmount(e.target.value)} className="w-full pl-8 pr-4 py-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl outline-none focus:border-primary font-bold text-sm text-slate-900 dark:text-white" placeholder="0" required /></div></div><div><textarea value={mvDescription} onChange={e => setMvDescription(e.target.value)} placeholder="Concepto del movimiento..." className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl outline-none focus:border-primary font-bold text-sm text-slate-900 dark:text-white h-24 resize-none" required /></div><button type="submit" disabled={mvProcessing || !mvAmount || !mvDescription} className={`w-full py-3 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 ${mvType === 'income' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-rose-600 hover:bg-rose-700 text-white'} disabled:opacity-50`}>{mvProcessing ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : mvType === 'income' ? 'Registrar Ingreso' : 'Registrar Egreso'}</button></form></div></div>)}

            <CashDashboardDetailModal isOpen={showEfectivoModal} onClose={() => setShowEfectivoModal(false)} title="💰 Efectivo — Mes en Curso" showIncomes ingresos={cashMovementsDelMes.ingresos} egresos={cashMovementsDelMes.egresos} neto={cashMovementsDelMes.neto} loading={loading} />

            <CashDashboardDetailModal isOpen={showTransferenciaModal} onClose={() => setShowTransferenciaModal(false)} title="🏦 Transferencia — Mes en Curso" showIncomes ingresos={transferMovementsDelMes.ingresos} egresos={transferMovementsDelMes.egresos} neto={transferMovementsDelMes.neto} loading={loading} />

            <BonosDetalleModal isOpen={showBonosModal} onClose={() => setShowBonosModal(false)} items={bonosDetalle} total={bonosTotal} loading={bonosLoading} />

            <VentasServiciosDetalleModal isOpen={showVentasServiciosModal} onClose={() => setShowVentasServiciosModal(false)} items={ventasServiciosDetalle} total={ventasServiciosTotal} loading={ventasServiciosLoading} />

            <CarteraDetailModal isOpen={showCarteraTotalModal} onClose={() => setShowCarteraTotalModal(false)} mode="total" items={carteraClientes} loading={carteraClientesLoading} />

            <CarteraDetailModal isOpen={showRecupEfectivoModal} onClose={() => setShowRecupEfectivoModal(false)} mode="recuperacion-efectivo" items={recuperacionEfectivoDetalle} loading={recuperacionDetalleLoading} />

            <CarteraDetailModal isOpen={showRecupTransferModal} onClose={() => setShowRecupTransferModal(false)} mode="recuperacion-transferencia" items={recuperacionTransferenciaDetalle} loading={recuperacionDetalleLoading} />
        </div>
    );
}
