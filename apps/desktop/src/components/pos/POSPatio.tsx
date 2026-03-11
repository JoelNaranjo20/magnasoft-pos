import { useEffect, useState } from 'react';
import { useTableStore } from '../../store/useTableStore';
import { useCartStore } from '../../store/useCartStore';
import { useBusinessStore } from '@shared/store/useBusinessStore';
import { useSessionStore } from '@shared/store/useSessionStore';

export const POSPatio = () => {
    const { id: businessId } = useBusinessStore();
    const { isWorkerAdmin: isAdmin, cashSession, refreshAdminStatus, hasHydrated } = useSessionStore();
    const { tables, fetchTables, subscribeToTables, addTable, updateTableStatus, updateTable, removeTable, setSelectedTable, selectedTableId, error: tableError } = useTableStore();

    useEffect(() => {
        // Self-healing: Refresh admin status if session exists
        if (hasHydrated && cashSession) {
            refreshAdminStatus();
        }
    }, [hasHydrated, cashSession]);


    useEffect(() => {
        console.log("🔍 POSPatio mounted - Admin Status:", isAdmin);
    }, [isAdmin]);

    const [isEditing, setIsEditing] = useState(false);
    const [isLayoutMode, setIsLayoutMode] = useState(false);
    const [draggingTableId, setDraggingTableId] = useState<string | null>(null);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

    const [newTableName, setNewTableName] = useState('');
    const [newTableCapacity, setNewTableCapacity] = useState(4);

    useEffect(() => {
        if (businessId) {
            fetchTables(businessId);
            const unsubscribe = subscribeToTables(businessId);
            return () => unsubscribe();
        }
    }, [businessId]);

    const handleAddTable = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTableName.trim() || !businessId) return;

        try {
            await addTable(businessId, newTableName.trim(), newTableCapacity);
            setNewTableName('');
            setNewTableCapacity(4);
        } catch (error) {
            console.error(error);
            alert('Error al agregar mesa. Verifica que el nombre no exista ya.');
        }
    };

    const handleTableClick = async (table: any) => {
        if (isEditing || isLayoutMode) return; // Don't select if managing tables or layout

        setSelectedTable(table.id);

        // Switch the cart store to this table's cart (creates it if it doesn't exist)
        useCartStore.getState().setActiveCart(table.id);

        // If the table is available, mark it as occupied immediately
        if (table.status === 'available') {
            await updateTableStatus(table.id, 'occupied');
        }

        window.dispatchEvent(new CustomEvent('pos-select-table', {
            detail: { table }
        }));
    };

    // Drag & Drop Handlers (Mouse & Touch)
    const handleDragStart = (e: React.MouseEvent | React.TouchEvent, table: any) => {
        if (!isLayoutMode) return;
        e.stopPropagation();

        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        setDraggingTableId(table.id);
        setDragOffset({
            x: clientX - rect.left,
            y: clientY - rect.top
        });
    };

    const handleDragMove = (e: React.MouseEvent | React.TouchEvent) => {
        if (!draggingTableId || !isLayoutMode) return;

        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

        const patioContainer = document.getElementById('patio-container');
        if (!patioContainer) return;

        const containerRect = patioContainer.getBoundingClientRect();
        const x = clientX - containerRect.left - dragOffset.x;
        const y = clientY - containerRect.top - dragOffset.y;

        // Visual update only
        const draggingElement = document.getElementById(`table-${draggingTableId}`);
        if (draggingElement) {
            draggingElement.style.left = `${x}px`;
            draggingElement.style.top = `${y}px`;
        }
    };

    const handleDragEnd = async (_e: React.MouseEvent | React.TouchEvent, table: any) => {
        if (!draggingTableId || !isLayoutMode) return;

        const draggingElement = document.getElementById(`table-${draggingTableId}`);
        if (draggingElement) {
            const x = parseInt(draggingElement.style.left);
            const y = parseInt(draggingElement.style.top);

            // Save to DB via metadata
            await updateTable(table.id, {
                metadata: {
                    ...(table.metadata || {}),
                    x,
                    y
                }
            });
        }

        setDraggingTableId(null);
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'available': return 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-700/50 hover:bg-emerald-200 dark:hover:bg-emerald-800/40';
            case 'occupied': return 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 border-rose-300 dark:border-rose-700/50 hover:bg-rose-200 dark:hover:bg-rose-800/40';
            case 'reserved': return 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-700/50 hover:bg-amber-200 dark:hover:bg-amber-800/40';
            default: return 'bg-slate-100 text-slate-700 border-slate-300';
        }
    };

    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-[#0f172a] p-6 overflow-hidden">
            {/* Header */}
            <div className="flex justify-between items-center mb-6 flex-none">
                <div>
                    <h2 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tight flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary !text-[28px]">table_restaurant</span>
                        Patio / Mesas
                    </h2>

                    <p className="text-sm font-bold text-slate-500">
                        {tables.length} mesas configuradas • {tables.filter(t => t.status === 'available').length} disponibles
                    </p>
                </div>

                {tableError && (
                    <div className="flex-1 mx-4 p-2 bg-rose-50 text-rose-600 text-xs font-bold rounded-lg border border-rose-100 flex items-center gap-2">
                        <span className="material-symbols-outlined !text-[14px]">error</span>
                        Error DB: {tableError}
                    </div>
                )}

                <div className="flex gap-2">
                    {isAdmin && (
                        <>
                            <button
                                onClick={() => {
                                    setIsLayoutMode(!isLayoutMode);
                                    if (isEditing) setIsEditing(false);
                                }}
                                className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all ${isLayoutMode
                                    ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20 ring-2 ring-amber-500/20'
                                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                                    }`}
                            >
                                <span className="material-symbols-outlined !text-[18px]">
                                    {isLayoutMode ? 'check_circle' : 'dashboard_customize'}
                                </span>
                                {isLayoutMode ? 'Guardar Diseño' : 'Personalizar Plano'}
                            </button>

                            <button
                                onClick={() => {
                                    setIsEditing(!isEditing);
                                    if (isLayoutMode) setIsLayoutMode(false);
                                }}
                                className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all ${isEditing
                                    ? 'bg-primary text-white shadow-lg shadow-blue-500/20 ring-2 ring-primary/20'
                                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                                    }`}
                            >
                                <span className="material-symbols-outlined !text-[18px]">
                                    {isEditing ? 'done' : 'settings'}
                                </span>
                                {isEditing ? 'Finalizar Gestión' : 'Gestionar Mesas'}
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Editing View */}
            {isEditing ? (
                <div className="flex-1 flex flex-col gap-6 overflow-hidden animate-in slide-in-from-bottom-4">
                    {/* Add Table Form */}
                    <form onSubmit={handleAddTable} className="flex gap-4 p-5 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex-none">
                        <div className="flex-1">
                            <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Nueva Mesa (Nombre)</label>
                            <input
                                type="text"
                                value={newTableName}
                                onChange={(e) => setNewTableName(e.target.value)}
                                placeholder="Mesa 1, VIP, Terraza..."
                                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-sm font-bold focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                                required
                            />
                        </div>
                        <div className="w-28">
                            <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Capacidad</label>
                            <input
                                type="number"
                                min="1"
                                value={newTableCapacity}
                                onChange={(e) => setNewTableCapacity(parseInt(e.target.value))}
                                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-sm font-bold focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                                required
                            />
                        </div>
                        <div className="flex items-end">
                            <button type="submit" className="h-[38px] px-6 bg-primary hover:bg-blue-600 text-white rounded-xl font-bold text-sm shadow-md transition-all flex items-center gap-2">
                                <span className="material-symbols-outlined !text-[18px]">add</span>
                                Crear Mesa
                            </button>
                        </div>
                    </form>

                    {/* Table List for Management */}
                    <div className="flex-1 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden flex flex-col">
                        <div className="overflow-y-auto">
                            <table className="w-full text-left border-collapse">
                                <thead className="sticky top-0 bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 z-10">
                                    <tr>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400">Nombre</th>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400">Capacidad</th>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400">Estado</th>
                                        <th className="px-6 py-4 text-right text-[10px] font-black uppercase text-slate-400">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                                    {tables.map(table => (
                                        <tr key={table.id} className="group hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition-colors">
                                            <td className="px-6 py-4">
                                                <input
                                                    type="text"
                                                    defaultValue={table.name}
                                                    onBlur={(e) => {
                                                        if (e.target.value !== table.name) updateTable(table.id, { name: e.target.value });
                                                    }}
                                                    className="bg-transparent border-none font-bold text-slate-800 dark:text-white focus:ring-1 focus:ring-primary/30 rounded px-2 -ml-2 w-full outline-none"
                                                />
                                            </td>
                                            <td className="px-6 py-4">
                                                <input
                                                    type="number"
                                                    min="1"
                                                    defaultValue={table.capacity ?? 0}
                                                    onBlur={(e) => {
                                                        const val = parseInt(e.target.value);
                                                        if (val !== table.capacity) updateTable(table.id, { capacity: val });
                                                    }}
                                                    className="bg-transparent border-none font-bold text-slate-600 dark:text-slate-400 focus:ring-1 focus:ring-primary/30 rounded px-2 -ml-2 w-20 outline-none"
                                                />
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex px-2 py-0.5 rounded-lg text-[10px] font-black uppercase ${getStatusColor(table.status || 'available').split(' ')[0]} ${getStatusColor(table.status || 'available').split(' ')[2]}`}>
                                                    {table.status === 'available' ? 'Disponible' : table.status === 'occupied' ? 'Ocupada' : 'Reservada'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button
                                                    onClick={() => {
                                                        if (confirm(`¿Eliminar ${table.name} permanentemente?`)) removeTable(table.id);
                                                    }}
                                                    className="size-9 rounded-xl bg-rose-50 dark:bg-rose-900/20 text-rose-500 flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all ml-auto"
                                                >
                                                    <span className="material-symbols-outlined !text-[18px]">delete</span>
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            ) : (
                /* Grid View (Standard POS use) */
                <div
                    id="patio-container"
                    className={`flex-1 overflow-auto relative min-h-[500px] ${isLayoutMode ? 'bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] dark:bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:20px_20px]' : ''}`}
                    onMouseMove={handleDragMove}
                    onTouchMove={handleDragMove}
                    onMouseUp={() => draggingTableId && setDraggingTableId(null)}
                    onTouchEnd={() => draggingTableId && setDraggingTableId(null)}
                >
                    {tables.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400 animate-in fade-in">
                            <span className="material-symbols-outlined !text-6xl mb-4 opacity-30">table_bar</span>
                            <p className="font-bold">No hay mesas configuradas aún.</p>
                            {isAdmin && (
                                <button onClick={() => setIsEditing(true)} className="mt-4 px-6 py-2 bg-primary/10 text-primary rounded-xl font-bold hover:bg-primary/20 transition-all">
                                    Configurar Patio
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className={isLayoutMode ? '' : 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 pb-20 scrollbar-hide'}>
                            {tables.map((table, index) => {
                                const metadata = table.metadata as any || {};
                                const hasCoords = metadata.x !== undefined && metadata.y !== undefined;

                                const style: React.CSSProperties = isLayoutMode || hasCoords ? {
                                    position: 'absolute',
                                    left: metadata.x || (index % 6) * 180 + 20,
                                    top: metadata.y || Math.floor(index / 6) * 180 + 20,
                                    width: '160px',
                                    height: '160px',
                                    zIndex: draggingTableId === table.id ? 50 : 10
                                } : {};

                                return (
                                    <div
                                        key={table.id}
                                        id={`table-${table.id}`}
                                        onClick={() => handleTableClick(table)}
                                        onMouseDown={(e) => handleDragStart(e, table)}
                                        onTouchStart={(e) => handleDragStart(e, table)}
                                        onMouseUp={(e) => handleDragEnd(e, table)}
                                        onTouchEnd={(e) => handleDragEnd(e, table)}
                                        style={style}
                                        className={`
                                            relative p-5 rounded-2xl border-2 flex flex-col justify-between aspect-square transition-all duration-300
                                            ${getStatusColor(table.status || 'available')}
                                            cursor-pointer active:scale-95 group
                                            ${selectedTableId === table.id ? 'ring-4 ring-primary/30 border-primary scale-105 shadow-xl z-20' : 'shadow-sm border-slate-200 dark:border-slate-700/50'}
                                            ${isLayoutMode ? 'cursor-move ring-2 ring-amber-500/20' : ''}
                                            ${draggingTableId === table.id ? 'opacity-80 scale-105 shadow-2xl z-50 cursor-grabbing' : ''}
                                        `}
                                    >
                                        <div className="flex justify-between items-start">
                                            <div className="bg-white/60 dark:bg-black/20 backdrop-blur-md px-2 py-1 rounded-lg flex items-center gap-1.5">
                                                <span className="material-symbols-outlined !text-[14px]">groups</span>
                                                <span className="text-[10px] font-black uppercase tracking-wider">
                                                    {table.capacity}
                                                </span>
                                            </div>

                                            {!isLayoutMode && (
                                                <button
                                                    className="size-8 rounded-full bg-white/40 dark:bg-black/20 flex items-center justify-center hover:bg-white dark:hover:bg-black/40 transition-colors opacity-0 group-hover:opacity-100"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        const currentStatus = table.status || 'available';
                                                        const newStatus = currentStatus === 'available' ? 'reserved' : currentStatus === 'reserved' ? 'available' : currentStatus;
                                                        if (newStatus !== currentStatus) updateTableStatus(table.id, newStatus as 'available' | 'occupied' | 'reserved');
                                                    }}
                                                >
                                                    <span className="material-symbols-outlined !text-[18px]">
                                                        {table.status === 'reserved' ? 'check_circle' : 'event_seat'}
                                                    </span>
                                                </button>
                                            )}

                                            {isLayoutMode && (
                                                <div className="size-8 rounded-full bg-amber-500 text-white flex items-center justify-center shadow-lg">
                                                    <span className="material-symbols-outlined !text-[18px]">drag_pan</span>
                                                </div>
                                            )}
                                        </div>

                                        <div className="mt-auto text-center py-2">
                                            <h3 className="text-xl font-black leading-none break-words mb-1 text-slate-900 dark:text-white transition-colors">
                                                {table.name}
                                            </h3>
                                            <p className="text-[10px] uppercase font-black opacity-60 tracking-[0.15em]">
                                                {table.status === 'available' ? 'Disponible' : table.status === 'occupied' ? 'En Uso' : 'Reservada'}
                                            </p>
                                        </div>

                                        {/* Selection Glow */}
                                        {selectedTableId === table.id && !isLayoutMode && (
                                            <div className="absolute inset-0 rounded-2xl ring-2 ring-primary ring-offset-2 dark:ring-offset-[#0f172a] animate-pulse pointer-events-none" />
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

