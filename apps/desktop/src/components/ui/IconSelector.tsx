
import {
    Package, Scissors, Coffee, Shirt,
    Zap, Star, Gift, Tag, ShoppingBag, Briefcase,
    Wrench, Car, PenTool, Smile, Check
} from 'lucide-react';

// Debe coincidir con el mapa de POSProductGrid
const ICONS = [
    { id: 'package', icon: Package, label: 'Paquete' },
    { id: 'scissors', icon: Scissors, label: 'Tijeras' },
    { id: 'coffee', icon: Coffee, label: 'Café' },
    { id: 'shirt', icon: Shirt, label: 'Ropa' },
    { id: 'zap', icon: Zap, label: 'Rápido' },
    { id: 'star', icon: Star, label: 'Destacado' },
    { id: 'gift', icon: Gift, label: 'Regalo' },
    { id: 'tag', icon: Tag, label: 'Oferta' },
    { id: 'bag', icon: ShoppingBag, label: 'Bolsa' },
    { id: 'briefcase', icon: Briefcase, label: 'Maletín' },
    { id: 'wrench', icon: Wrench, label: 'Llave' },
    { id: 'car', icon: Car, label: 'Auto' },
    { id: 'tool', icon: PenTool, label: 'Herramienta' },
    { id: 'smile', icon: Smile, label: 'Carita' },
];

interface IconSelectorProps {
    selectedIcon: string | undefined;
    onSelect: (icon: string) => void;
    label?: string;
}

export const IconSelector = ({ selectedIcon, onSelect, label = "Seleccionar Icono" }: IconSelectorProps) => {
    return (
        <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-500 uppercase">{label}</label>
            <div className="grid grid-cols-5 gap-2 p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg max-h-40 overflow-y-auto">
                {ICONS.map(({ id, icon: Icon, label }) => {
                    const isSelected = selectedIcon === id || (!selectedIcon && id === 'package'); // Default fallback visual

                    return (
                        <button
                            key={id}
                            type="button"
                            onClick={() => onSelect(id)}
                            title={label}
                            className={`
                relative flex items-center justify-center p-2 rounded-lg transition-all
                ${isSelected
                                    ? 'bg-blue-100 text-blue-600 border border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800'
                                    : 'bg-white text-slate-500 border border-gray-100 hover:bg-gray-100 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700 dark:hover:bg-slate-700'}
              `}
                        >
                            <Icon size={20} />
                            {isSelected && (
                                <div className="absolute -top-1.5 -right-1.5 bg-blue-500 text-white rounded-full p-0.5 border-2 border-white dark:border-slate-900">
                                    <Check size={10} strokeWidth={4} />
                                </div>
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
};
