import { useBusinessStore } from '@shared/store/useBusinessStore';
import { MODULE_REGISTRY, type ModuleKey } from '../shared/modules';

/**
 * useModule
 *
 * Hook to check whether a given module is enabled for the current business.
 * Uses semantic module keys (e.g. 'vehicles', 'commissions') which are
 * mapped to the actual DB config keys via MODULE_REGISTRY.
 *
 * @example
 * const hasVehicles = useModule('vehicles');
 * const hasCommissions = useModule('commissions');
 *
 * @param moduleKey - Semantic module key from MODULE_REGISTRY
 * @returns boolean — true if the module is enabled, false otherwise
 */
export function useModule(moduleKey: ModuleKey): boolean {
    const configKey = MODULE_REGISTRY[moduleKey].id;
    // Subscribe directly to the config object so Zustand knows to re-render
    const config = useBusinessStore(state => state.config);
    return config?.[configKey] ?? false;
}

/**
 * useModules
 *
 * Hook to check multiple modules at once.
 * Returns a record of { moduleKey: boolean } for each requested key.
 *
 * @example
 * const { vehicles, commissions } = useModules(['vehicles', 'commissions']);
 */
export function useModules<T extends ModuleKey>(moduleKeys: T[]): Record<T, boolean> {
    const config = useBusinessStore(state => state.config);
    return moduleKeys.reduce((acc, key) => {
        acc[key] = config?.[MODULE_REGISTRY[key].id] ?? false;
        return acc;
    }, {} as Record<T, boolean>);
}
