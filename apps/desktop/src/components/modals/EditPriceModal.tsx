
import { useState, useEffect } from 'react';

interface EditPriceModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentPrice: number;
    originalPrice: number;
    itemName: string;
    onSave: (newPrice: number) => void;
}

export const EditPriceModal = ({
    isOpen,
    onClose,
    currentPrice,
    originalPrice,
    itemName,
    onSave
}: EditPriceModalProps) => {
    const [price, setPrice] = useState(currentPrice.toString());

    useEffect(() => {
        if (isOpen) {
            setPrice(currentPrice.toString());
        }
    }, [isOpen, currentPrice]);

    if (!isOpen) return null;

    const handleSave = () => {
        const newPrice = parseFloat(price);
        if (!isNaN(newPrice) && newPrice >= 0) {
            onSave(newPrice);
            onClose();
        }
    };

    const parsedPrice = parseFloat(price) || 0;
    // Calculate raw difference: (New - Original) / Original * 100
    // If Original is 100 and New is 80: (80 - 100) / 100 = -0.2 (-20%)
    const discountPercentage = originalPrice > 0
        ? ((parsedPrice - originalPrice) / originalPrice) * 100
        : 0;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-scale-in">
                <div className="p-6">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <h3 className="text-lg font-bold text-slate-800 dark:text-white">Modificar Precio</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400 truncate max-w-[250px]">{itemName}</p>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                        >
                            <span className="material-symbols-outlined">close</span>
                        </button>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Nuevo Precio</label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                                <input
                                    type="number"
                                    value={price}
                                    onChange={(e) => setPrice(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-xl pl-8 pr-4 py-3 font-bold text-lg focus:border-primary focus:ring-0 outline-none text-slate-800 dark:text-white"
                                    placeholder="0"
                                    autoFocus
                                />
                            </div>
                        </div>

                        <div className="flex justify-between text-sm px-1">
                            <span className="text-slate-500">Precio Original:</span>
                            <span className="font-semibold text-slate-700 dark:text-slate-300 strike-through decoration-slate-400">
                                ${originalPrice.toLocaleString()}
                            </span>
                        </div>

                        {parsedPrice !== originalPrice && (
                            <div className={`p-3 rounded-xl flex items-center gap-3 ${discountPercentage < 0
                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400'
                                : 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400'
                                }`}>
                                <span className="material-symbols-outlined">
                                    {discountPercentage < 0 ? 'trending_down' : 'trending_up'}
                                </span>
                                <div className="flex-1">
                                    <p className="text-xs font-bold uppercase opacity-75">
                                        {discountPercentage < 0 ? 'Descuento' : 'Incremento'}
                                    </p>
                                    <p className="font-bold text-lg leading-none">
                                        {Math.abs(discountPercentage).toFixed(1)}%
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-3 mt-6">
                        <button
                            onClick={onClose}
                            className="px-4 py-2.5 rounded-xl font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleSave}
                            className="px-4 py-2.5 rounded-xl font-bold bg-primary hover:bg-primary-hover text-white shadow-lg shadow-primary/30 transition-all active:scale-95"
                        >
                            Guardar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
