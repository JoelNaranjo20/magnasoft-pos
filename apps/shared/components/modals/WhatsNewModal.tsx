import { useState, useEffect } from 'react';
import { Sparkles, X, Tag, Calculator, BookOpen, TrendingUp } from 'lucide-react';
import { useBusinessStore } from '@shared/store/useBusinessStore';

// ==========================================
// CONFIGURACIÓN DEL MODAL DE NOVEDADES
// ==========================================
// 1. Cambia esto a la versión actual para mostrar el modal de nuevo a todos.
const CURRENT_VERSION = '1.0.27';

// 2. Apaga (false) o enciende (true) el modal por completo.
const IS_MODAL_ACTIVE = false;

// 3. Define a qué tipo de negocios quieres que les salga este modal.
// Si quieres que le salga a TODOS sin importar el tipo, déjalo como un array con un asterisco: ['*']
const TARGET_BUSINESS_TYPES = ['*'];

const STORAGE_KEY = 'magnasoft_last_seen_version';

export const WhatsNewModal = () => {
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        const lastSeen = localStorage.getItem(STORAGE_KEY);
        if (lastSeen !== CURRENT_VERSION && IS_MODAL_ACTIVE) {
            // Unseen version, show modal
            setIsOpen(true);
        }
    }, []);

    const handleClose = () => {
        setIsOpen(false);
        localStorage.setItem(STORAGE_KEY, CURRENT_VERSION);
    };

    const features = [
        {
            icon: BookOpen,
            color: 'text-emerald-500',
            bg: 'bg-emerald-100 dark:bg-emerald-900/30',
            title: 'Fiados y Deudas Manuales',
            desc: 'Ahora puedes registrar fiados a clientes de forma manual y rápida directamente desde el panel de Cartera.'
        },
        {
            icon: Calculator,
            color: 'text-indigo-500',
            bg: 'bg-indigo-100 dark:bg-indigo-900/30',
            title: 'Comisiones Fijas por Cantidad',
            desc: 'Al vender varias unidades de un producto, la comisión fija para tu trabajador se multiplica automáticamente por la cantidad vendida.'
        },
        {
            icon: Tag,
            color: 'text-purple-500',
            bg: 'bg-purple-100 dark:bg-purple-900/30',
            title: 'Descuento Global en el Carrito',
            desc: 'Aplica un descuento sobre el total de la venta o modifica el precio final usando un PIN de seguridad. ¡Se acabaron los cálculos por ítem!'
        },
        {
            icon: TrendingUp,
            color: 'text-blue-500',
            bg: 'bg-blue-100 dark:bg-blue-900/30',
            title: 'Reportes Financieros Reales',
            desc: 'Optimizamos el Dashboard y Estado de Caja. Los canjes (cambio Efectivo a Digital) ya no sumarán como "Gastos", evitando cruces confusos.'
        }
    ];

    const businessType = useBusinessStore((state: any) => state.businessType);

    // Si el modal está apagado, o el usuario no cumple el filtro de tipo de negocio
    const isTargetAudience = TARGET_BUSINESS_TYPES.includes('*') || TARGET_BUSINESS_TYPES.includes(businessType);

    if (!isOpen || !IS_MODAL_ACTIVE || !isTargetAudience) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                onClick={handleClose}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
            />

            {/* Modal Content */}
            <div className="relative w-full max-w-3xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden z-10 animate-scale-up">
                {/* Header Gradient */}
                <div className="relative h-36 bg-gradient-to-br from-blue-600 to-indigo-700 p-6 flex items-center justify-center overflow-hidden">
                    {/* Decorative circles */}
                    <div className="absolute top-0 right-0 -mr-8 -mt-8 w-40 h-40 rounded-full bg-white opacity-10 blur-2xl"></div>
                    <div className="absolute bottom-0 left-0 -ml-8 -mb-8 w-40 h-40 rounded-full bg-white opacity-10 blur-2xl"></div>

                    <button
                        onClick={handleClose}
                        className="absolute top-4 right-4 text-white/70 hover:text-white bg-black/10 hover:bg-black/20 rounded-full p-1.5 transition-colors z-20"
                    >
                        <X size={18} />
                    </button>

                    <div className="text-center relative z-10 animate-fade-in-up">
                        <div className="inline-flex items-center justify-center p-2.5 bg-white/20 backdrop-blur-md rounded-2xl mb-3 shadow-[0_0_15px_rgba(255,255,255,0.2)]">
                            <Sparkles className="text-white fill-white/20" size={24} />
                        </div>
                        <h2 className="text-3xl font-black text-white tracking-tight">¡Nuevas Funciones!</h2>
                        <p className="text-white/70 text-sm font-medium mt-1">Magnasoft v{CURRENT_VERSION} — Para ti con ❤️</p>
                    </div>
                </div>

                <div className="p-6 md:p-8">
                    <p className="text-center text-sm text-slate-500 dark:text-slate-400 font-medium mb-6">
                        Hemos actualizado Magnasoft para darte más control y precisión.
                    </p>

                    {/* 2-column grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
                        {features.map((feat, idx) => (
                            <div
                                key={idx}
                                className="flex gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50 hover:border-slate-200 dark:hover:border-slate-600 transition-all"
                            >
                                <div className={`shrink-0 w-11 h-11 flex items-center justify-center rounded-xl ${feat.bg} ${feat.color}`}>
                                    <feat.icon size={20} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-0.5 leading-tight">{feat.title}</h4>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{feat.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    <button
                        onClick={handleClose}
                        className="w-full bg-slate-900 hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-700 text-white font-bold rounded-xl py-3.5 px-4 transition-all active:scale-[0.98] shadow-lg shadow-blue-500/20"
                    >
                        Continuar a la aplicación
                    </button>

                    <p className="text-center mt-4 text-[10px] text-slate-400 dark:text-slate-600 font-bold tracking-widest uppercase">
                        Versión {CURRENT_VERSION}
                    </p>
                </div>
            </div>
        </div>
    );
};


