import { useBusinessStore } from '../store/useBusinessStore';
import { MODULE_REGISTRY, type ModuleKey } from '../modules';

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
    return useBusinessStore(state => state.isModuleEnabled(configKey));
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
    const isModuleEnabled = useBusinessStore(state => state.isModuleEnabled);
    return moduleKeys.reduce((acc, key) => {
        acc[key] = isModuleEnabled(MODULE_REGISTRY[key].id);
        return acc;
    }, {} as Record<T, boolean>);
}
