/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { EmptyOutletComponent } from '../components/empty_outlet';
import { PRIMARY_OUTLET } from '../shared';
export function getLoadedRoutes(route) {
    return route._loadedRoutes;
}
export function getLoadedInjector(route) {
    return route._loadedInjector;
}
export function getProvidersInjector(route) {
    return route._injector;
}
export function validateConfig(config, parentPath = '') {
    // forEach doesn't iterate undefined values
    for (let i = 0; i < config.length; i++) {
        const route = config[i];
        const fullPath = getFullPath(parentPath, route);
        validateNode(route, fullPath);
    }
}
function validateNode(route, fullPath) {
    if (typeof ngDevMode === 'undefined' || ngDevMode) {
        if (!route) {
            throw new Error(`
      Invalid configuration of route '${fullPath}': Encountered undefined route.
      The reason might be an extra comma.

      Example:
      const routes: Routes = [
        { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
        { path: 'dashboard',  component: DashboardComponent },, << two commas
        { path: 'detail/:id', component: HeroDetailComponent }
      ];
    `);
        }
        if (Array.isArray(route)) {
            throw new Error(`Invalid configuration of route '${fullPath}': Array cannot be specified`);
        }
        if (!route.component && !route.children && !route.loadChildren &&
            (route.outlet && route.outlet !== PRIMARY_OUTLET)) {
            throw new Error(`Invalid configuration of route '${fullPath}': a componentless route without children or loadChildren cannot have a named outlet set`);
        }
        if (route.redirectTo && route.children) {
            throw new Error(`Invalid configuration of route '${fullPath}': redirectTo and children cannot be used together`);
        }
        if (route.redirectTo && route.loadChildren) {
            throw new Error(`Invalid configuration of route '${fullPath}': redirectTo and loadChildren cannot be used together`);
        }
        if (route.children && route.loadChildren) {
            throw new Error(`Invalid configuration of route '${fullPath}': children and loadChildren cannot be used together`);
        }
        if (route.redirectTo && route.component) {
            throw new Error(`Invalid configuration of route '${fullPath}': redirectTo and component cannot be used together`);
        }
        if (route.redirectTo && route.canActivate) {
            throw new Error(`Invalid configuration of route '${fullPath}': redirectTo and canActivate cannot be used together. Redirects happen before activation ` +
                `so canActivate will never be executed.`);
        }
        if (route.path && route.matcher) {
            throw new Error(`Invalid configuration of route '${fullPath}': path and matcher cannot be used together`);
        }
        if (route.redirectTo === void 0 && !route.component && !route.children && !route.loadChildren) {
            throw new Error(`Invalid configuration of route '${fullPath}'. One of the following must be provided: component, redirectTo, children or loadChildren`);
        }
        if (route.path === void 0 && route.matcher === void 0) {
            throw new Error(`Invalid configuration of route '${fullPath}': routes must have either a path or a matcher specified`);
        }
        if (typeof route.path === 'string' && route.path.charAt(0) === '/') {
            throw new Error(`Invalid configuration of route '${fullPath}': path cannot start with a slash`);
        }
        if (route.path === '' && route.redirectTo !== void 0 && route.pathMatch === void 0) {
            const exp = `The default value of 'pathMatch' is 'prefix', but often the intent is to use 'full'.`;
            throw new Error(`Invalid configuration of route '{path: "${fullPath}", redirectTo: "${route.redirectTo}"}': please provide 'pathMatch'. ${exp}`);
        }
    }
    if (route.children) {
        validateConfig(route.children, fullPath);
    }
}
function getFullPath(parentPath, currentRoute) {
    if (!currentRoute) {
        return parentPath;
    }
    if (!parentPath && !currentRoute.path) {
        return '';
    }
    else if (parentPath && !currentRoute.path) {
        return `${parentPath}/`;
    }
    else if (!parentPath && currentRoute.path) {
        return currentRoute.path;
    }
    else {
        return `${parentPath}/${currentRoute.path}`;
    }
}
/**
 * Makes a copy of the config and adds any default required properties.
 */
export function standardizeConfig(r) {
    const children = r.children && r.children.map(standardizeConfig);
    const c = children ? { ...r, children } : { ...r };
    if (!c.component && (children || c.loadChildren) && (c.outlet && c.outlet !== PRIMARY_OUTLET)) {
        c.component = EmptyOutletComponent;
    }
    return c;
}
/** Returns the `route.outlet` or PRIMARY_OUTLET if none exists. */
export function getOutlet(route) {
    return route.outlet || PRIMARY_OUTLET;
}
/**
 * Sorts the `routes` such that the ones with an outlet matching `outletName` come first.
 * The order of the configs is otherwise preserved.
 */
export function sortByMatchingOutlets(routes, outletName) {
    const sortedConfig = routes.filter(r => getOutlet(r) === outletName);
    sortedConfig.push(...routes.filter(r => getOutlet(r) !== outletName));
    return sortedConfig;
}
/**
 * Gets the first injector in the snapshot's parent tree.
 *
 * If the `Route` has a static list of providers, the returned injector will be the one created from
 * those. If it does not exist, the returned injector may come from the parents, which may be from a
 * loaded config or their static providers.
 *
 * Returns `null` if there is neither this nor any parents have a stored injector.
 *
 * Generally used for retrieving the injector to use for getting tokens for guards/resolvers and
 * also used for getting the correct injector to use for creating components.
 */
export function getClosestRouteInjector(snapshot) {
    if (!snapshot)
        return null;
    // If the current route has its own injector, which is created from the static providers on the
    // route itself, we should use that. Otherwise, we start at the parent since we do not want to
    // include the lazy loaded injector from this route.
    if (snapshot.routeConfig?._injector) {
        return snapshot.routeConfig._injector;
    }
    for (let s = snapshot.parent; s; s = s.parent) {
        const route = s.routeConfig;
        // Note that the order here is important. `_loadedInjector` stored on the route with
        // `loadChildren: () => NgModule` so it applies to child routes with priority. The `_injector`
        // is created from the static providers on that parent route, so it applies to the children as
        // well, but only if there is no lazy loaded NgModuleRef injector.
        if (route?._loadedInjector)
            return route._loadedInjector;
        if (route?._injector)
            return route._injector;
    }
    return null;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlnLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvcm91dGVyL3NyYy91dGlscy9jb25maWcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HO0FBSUgsT0FBTyxFQUFDLG9CQUFvQixFQUFDLE1BQU0sNEJBQTRCLENBQUM7QUFHaEUsT0FBTyxFQUFDLGNBQWMsRUFBQyxNQUFNLFdBQVcsQ0FBQztBQUV6QyxNQUFNLFVBQVUsZUFBZSxDQUFDLEtBQVk7SUFDMUMsT0FBTyxLQUFLLENBQUMsYUFBYSxDQUFDO0FBQzdCLENBQUM7QUFFRCxNQUFNLFVBQVUsaUJBQWlCLENBQUMsS0FBWTtJQUM1QyxPQUFPLEtBQUssQ0FBQyxlQUFlLENBQUM7QUFDL0IsQ0FBQztBQUVELE1BQU0sVUFBVSxvQkFBb0IsQ0FBQyxLQUFZO0lBQy9DLE9BQU8sS0FBSyxDQUFDLFNBQVMsQ0FBQztBQUN6QixDQUFDO0FBRUQsTUFBTSxVQUFVLGNBQWMsQ0FBQyxNQUFjLEVBQUUsYUFBcUIsRUFBRTtJQUNwRSwyQ0FBMkM7SUFDM0MsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLE1BQU0sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUU7UUFDdEMsTUFBTSxLQUFLLEdBQVUsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQy9CLE1BQU0sUUFBUSxHQUFXLFdBQVcsQ0FBQyxVQUFVLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDeEQsWUFBWSxDQUFDLEtBQUssRUFBRSxRQUFRLENBQUMsQ0FBQztLQUMvQjtBQUNILENBQUM7QUFFRCxTQUFTLFlBQVksQ0FBQyxLQUFZLEVBQUUsUUFBZ0I7SUFDbEQsSUFBSSxPQUFPLFNBQVMsS0FBSyxXQUFXLElBQUksU0FBUyxFQUFFO1FBQ2pELElBQUksQ0FBQyxLQUFLLEVBQUU7WUFDVixNQUFNLElBQUksS0FBSyxDQUFDO3dDQUNrQixRQUFROzs7Ozs7Ozs7S0FTM0MsQ0FBQyxDQUFDO1NBQ0Y7UUFDRCxJQUFJLEtBQUssQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLEVBQUU7WUFDeEIsTUFBTSxJQUFJLEtBQUssQ0FBQyxtQ0FBbUMsUUFBUSw4QkFBOEIsQ0FBQyxDQUFDO1NBQzVGO1FBQ0QsSUFBSSxDQUFDLEtBQUssQ0FBQyxTQUFTLElBQUksQ0FBQyxLQUFLLENBQUMsUUFBUSxJQUFJLENBQUMsS0FBSyxDQUFDLFlBQVk7WUFDMUQsQ0FBQyxLQUFLLENBQUMsTUFBTSxJQUFJLEtBQUssQ0FBQyxNQUFNLEtBQUssY0FBYyxDQUFDLEVBQUU7WUFDckQsTUFBTSxJQUFJLEtBQUssQ0FBQyxtQ0FDWixRQUFRLDBGQUEwRixDQUFDLENBQUM7U0FDekc7UUFDRCxJQUFJLEtBQUssQ0FBQyxVQUFVLElBQUksS0FBSyxDQUFDLFFBQVEsRUFBRTtZQUN0QyxNQUFNLElBQUksS0FBSyxDQUFDLG1DQUNaLFFBQVEsb0RBQW9ELENBQUMsQ0FBQztTQUNuRTtRQUNELElBQUksS0FBSyxDQUFDLFVBQVUsSUFBSSxLQUFLLENBQUMsWUFBWSxFQUFFO1lBQzFDLE1BQU0sSUFBSSxLQUFLLENBQUMsbUNBQ1osUUFBUSx3REFBd0QsQ0FBQyxDQUFDO1NBQ3ZFO1FBQ0QsSUFBSSxLQUFLLENBQUMsUUFBUSxJQUFJLEtBQUssQ0FBQyxZQUFZLEVBQUU7WUFDeEMsTUFBTSxJQUFJLEtBQUssQ0FBQyxtQ0FDWixRQUFRLHNEQUFzRCxDQUFDLENBQUM7U0FDckU7UUFDRCxJQUFJLEtBQUssQ0FBQyxVQUFVLElBQUksS0FBSyxDQUFDLFNBQVMsRUFBRTtZQUN2QyxNQUFNLElBQUksS0FBSyxDQUFDLG1DQUNaLFFBQVEscURBQXFELENBQUMsQ0FBQztTQUNwRTtRQUNELElBQUksS0FBSyxDQUFDLFVBQVUsSUFBSSxLQUFLLENBQUMsV0FBVyxFQUFFO1lBQ3pDLE1BQU0sSUFBSSxLQUFLLENBQ1gsbUNBQ0ksUUFBUSw0RkFBNEY7Z0JBQ3hHLHdDQUF3QyxDQUFDLENBQUM7U0FDL0M7UUFDRCxJQUFJLEtBQUssQ0FBQyxJQUFJLElBQUksS0FBSyxDQUFDLE9BQU8sRUFBRTtZQUMvQixNQUFNLElBQUksS0FBSyxDQUNYLG1DQUFtQyxRQUFRLDZDQUE2QyxDQUFDLENBQUM7U0FDL0Y7UUFDRCxJQUFJLEtBQUssQ0FBQyxVQUFVLEtBQUssS0FBSyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsU0FBUyxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsSUFBSSxDQUFDLEtBQUssQ0FBQyxZQUFZLEVBQUU7WUFDN0YsTUFBTSxJQUFJLEtBQUssQ0FBQyxtQ0FDWixRQUFRLDJGQUEyRixDQUFDLENBQUM7U0FDMUc7UUFDRCxJQUFJLEtBQUssQ0FBQyxJQUFJLEtBQUssS0FBSyxDQUFDLElBQUksS0FBSyxDQUFDLE9BQU8sS0FBSyxLQUFLLENBQUMsRUFBRTtZQUNyRCxNQUFNLElBQUksS0FBSyxDQUFDLG1DQUNaLFFBQVEsMERBQTBELENBQUMsQ0FBQztTQUN6RTtRQUNELElBQUksT0FBTyxLQUFLLENBQUMsSUFBSSxLQUFLLFFBQVEsSUFBSSxLQUFLLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsS0FBSyxHQUFHLEVBQUU7WUFDbEUsTUFBTSxJQUFJLEtBQUssQ0FDWCxtQ0FBbUMsUUFBUSxtQ0FBbUMsQ0FBQyxDQUFDO1NBQ3JGO1FBQ0QsSUFBSSxLQUFLLENBQUMsSUFBSSxLQUFLLEVBQUUsSUFBSSxLQUFLLENBQUMsVUFBVSxLQUFLLEtBQUssQ0FBQyxJQUFJLEtBQUssQ0FBQyxTQUFTLEtBQUssS0FBSyxDQUFDLEVBQUU7WUFDbEYsTUFBTSxHQUFHLEdBQ0wsc0ZBQXNGLENBQUM7WUFDM0YsTUFBTSxJQUFJLEtBQUssQ0FBQywyQ0FBMkMsUUFBUSxtQkFDL0QsS0FBSyxDQUFDLFVBQVUsb0NBQW9DLEdBQUcsRUFBRSxDQUFDLENBQUM7U0FDaEU7S0FDRjtJQUNELElBQUksS0FBSyxDQUFDLFFBQVEsRUFBRTtRQUNsQixjQUFjLENBQUMsS0FBSyxDQUFDLFFBQVEsRUFBRSxRQUFRLENBQUMsQ0FBQztLQUMxQztBQUNILENBQUM7QUFFRCxTQUFTLFdBQVcsQ0FBQyxVQUFrQixFQUFFLFlBQW1CO0lBQzFELElBQUksQ0FBQyxZQUFZLEVBQUU7UUFDakIsT0FBTyxVQUFVLENBQUM7S0FDbkI7SUFDRCxJQUFJLENBQUMsVUFBVSxJQUFJLENBQUMsWUFBWSxDQUFDLElBQUksRUFBRTtRQUNyQyxPQUFPLEVBQUUsQ0FBQztLQUNYO1NBQU0sSUFBSSxVQUFVLElBQUksQ0FBQyxZQUFZLENBQUMsSUFBSSxFQUFFO1FBQzNDLE9BQU8sR0FBRyxVQUFVLEdBQUcsQ0FBQztLQUN6QjtTQUFNLElBQUksQ0FBQyxVQUFVLElBQUksWUFBWSxDQUFDLElBQUksRUFBRTtRQUMzQyxPQUFPLFlBQVksQ0FBQyxJQUFJLENBQUM7S0FDMUI7U0FBTTtRQUNMLE9BQU8sR0FBRyxVQUFVLElBQUksWUFBWSxDQUFDLElBQUksRUFBRSxDQUFDO0tBQzdDO0FBQ0gsQ0FBQztBQUVEOztHQUVHO0FBQ0gsTUFBTSxVQUFVLGlCQUFpQixDQUFDLENBQVE7SUFDeEMsTUFBTSxRQUFRLEdBQUcsQ0FBQyxDQUFDLFFBQVEsSUFBSSxDQUFDLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO0lBQ2pFLE1BQU0sQ0FBQyxHQUFHLFFBQVEsQ0FBQyxDQUFDLENBQUMsRUFBQyxHQUFHLENBQUMsRUFBRSxRQUFRLEVBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxHQUFHLENBQUMsRUFBQyxDQUFDO0lBQy9DLElBQUksQ0FBQyxDQUFDLENBQUMsU0FBUyxJQUFJLENBQUMsUUFBUSxJQUFJLENBQUMsQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxNQUFNLElBQUksQ0FBQyxDQUFDLE1BQU0sS0FBSyxjQUFjLENBQUMsRUFBRTtRQUM3RixDQUFDLENBQUMsU0FBUyxHQUFHLG9CQUFvQixDQUFDO0tBQ3BDO0lBQ0QsT0FBTyxDQUFDLENBQUM7QUFDWCxDQUFDO0FBRUQsbUVBQW1FO0FBQ25FLE1BQU0sVUFBVSxTQUFTLENBQUMsS0FBWTtJQUNwQyxPQUFPLEtBQUssQ0FBQyxNQUFNLElBQUksY0FBYyxDQUFDO0FBQ3hDLENBQUM7QUFFRDs7O0dBR0c7QUFDSCxNQUFNLFVBQVUscUJBQXFCLENBQUMsTUFBYyxFQUFFLFVBQWtCO0lBQ3RFLE1BQU0sWUFBWSxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEtBQUssVUFBVSxDQUFDLENBQUM7SUFDckUsWUFBWSxDQUFDLElBQUksQ0FBQyxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEtBQUssVUFBVSxDQUFDLENBQUMsQ0FBQztJQUN0RSxPQUFPLFlBQVksQ0FBQztBQUN0QixDQUFDO0FBRUQ7Ozs7Ozs7Ozs7O0dBV0c7QUFDSCxNQUFNLFVBQVUsdUJBQXVCLENBQUMsUUFBZ0M7SUFFdEUsSUFBSSxDQUFDLFFBQVE7UUFBRSxPQUFPLElBQUksQ0FBQztJQUUzQiwrRkFBK0Y7SUFDL0YsOEZBQThGO0lBQzlGLG9EQUFvRDtJQUNwRCxJQUFJLFFBQVEsQ0FBQyxXQUFXLEVBQUUsU0FBUyxFQUFFO1FBQ25DLE9BQU8sUUFBUSxDQUFDLFdBQVcsQ0FBQyxTQUFTLENBQUM7S0FDdkM7SUFFRCxLQUFLLElBQUksQ0FBQyxHQUFHLFFBQVEsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsTUFBTSxFQUFFO1FBQzdDLE1BQU0sS0FBSyxHQUFHLENBQUMsQ0FBQyxXQUFXLENBQUM7UUFDNUIsb0ZBQW9GO1FBQ3BGLDhGQUE4RjtRQUM5Riw4RkFBOEY7UUFDOUYsa0VBQWtFO1FBQ2xFLElBQUksS0FBSyxFQUFFLGVBQWU7WUFBRSxPQUFPLEtBQUssQ0FBQyxlQUFlLENBQUM7UUFDekQsSUFBSSxLQUFLLEVBQUUsU0FBUztZQUFFLE9BQU8sS0FBSyxDQUFDLFNBQVMsQ0FBQztLQUM5QztJQUVELE9BQU8sSUFBSSxDQUFDO0FBQ2QsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge0Vudmlyb25tZW50SW5qZWN0b3J9IGZyb20gJ0Bhbmd1bGFyL2NvcmUnO1xuXG5pbXBvcnQge0VtcHR5T3V0bGV0Q29tcG9uZW50fSBmcm9tICcuLi9jb21wb25lbnRzL2VtcHR5X291dGxldCc7XG5pbXBvcnQge1JvdXRlLCBSb3V0ZXN9IGZyb20gJy4uL21vZGVscyc7XG5pbXBvcnQge0FjdGl2YXRlZFJvdXRlU25hcHNob3R9IGZyb20gJy4uL3JvdXRlcl9zdGF0ZSc7XG5pbXBvcnQge1BSSU1BUllfT1VUTEVUfSBmcm9tICcuLi9zaGFyZWQnO1xuXG5leHBvcnQgZnVuY3Rpb24gZ2V0TG9hZGVkUm91dGVzKHJvdXRlOiBSb3V0ZSk6IFJvdXRlW118dW5kZWZpbmVkIHtcbiAgcmV0dXJuIHJvdXRlLl9sb2FkZWRSb3V0ZXM7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRMb2FkZWRJbmplY3Rvcihyb3V0ZTogUm91dGUpOiBFbnZpcm9ubWVudEluamVjdG9yfHVuZGVmaW5lZCB7XG4gIHJldHVybiByb3V0ZS5fbG9hZGVkSW5qZWN0b3I7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRQcm92aWRlcnNJbmplY3Rvcihyb3V0ZTogUm91dGUpOiBFbnZpcm9ubWVudEluamVjdG9yfHVuZGVmaW5lZCB7XG4gIHJldHVybiByb3V0ZS5faW5qZWN0b3I7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiB2YWxpZGF0ZUNvbmZpZyhjb25maWc6IFJvdXRlcywgcGFyZW50UGF0aDogc3RyaW5nID0gJycpOiB2b2lkIHtcbiAgLy8gZm9yRWFjaCBkb2Vzbid0IGl0ZXJhdGUgdW5kZWZpbmVkIHZhbHVlc1xuICBmb3IgKGxldCBpID0gMDsgaSA8IGNvbmZpZy5sZW5ndGg7IGkrKykge1xuICAgIGNvbnN0IHJvdXRlOiBSb3V0ZSA9IGNvbmZpZ1tpXTtcbiAgICBjb25zdCBmdWxsUGF0aDogc3RyaW5nID0gZ2V0RnVsbFBhdGgocGFyZW50UGF0aCwgcm91dGUpO1xuICAgIHZhbGlkYXRlTm9kZShyb3V0ZSwgZnVsbFBhdGgpO1xuICB9XG59XG5cbmZ1bmN0aW9uIHZhbGlkYXRlTm9kZShyb3V0ZTogUm91dGUsIGZ1bGxQYXRoOiBzdHJpbmcpOiB2b2lkIHtcbiAgaWYgKHR5cGVvZiBuZ0Rldk1vZGUgPT09ICd1bmRlZmluZWQnIHx8IG5nRGV2TW9kZSkge1xuICAgIGlmICghcm91dGUpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgXG4gICAgICBJbnZhbGlkIGNvbmZpZ3VyYXRpb24gb2Ygcm91dGUgJyR7ZnVsbFBhdGh9JzogRW5jb3VudGVyZWQgdW5kZWZpbmVkIHJvdXRlLlxuICAgICAgVGhlIHJlYXNvbiBtaWdodCBiZSBhbiBleHRyYSBjb21tYS5cblxuICAgICAgRXhhbXBsZTpcbiAgICAgIGNvbnN0IHJvdXRlczogUm91dGVzID0gW1xuICAgICAgICB7IHBhdGg6ICcnLCByZWRpcmVjdFRvOiAnL2Rhc2hib2FyZCcsIHBhdGhNYXRjaDogJ2Z1bGwnIH0sXG4gICAgICAgIHsgcGF0aDogJ2Rhc2hib2FyZCcsICBjb21wb25lbnQ6IERhc2hib2FyZENvbXBvbmVudCB9LCwgPDwgdHdvIGNvbW1hc1xuICAgICAgICB7IHBhdGg6ICdkZXRhaWwvOmlkJywgY29tcG9uZW50OiBIZXJvRGV0YWlsQ29tcG9uZW50IH1cbiAgICAgIF07XG4gICAgYCk7XG4gICAgfVxuICAgIGlmIChBcnJheS5pc0FycmF5KHJvdXRlKSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBJbnZhbGlkIGNvbmZpZ3VyYXRpb24gb2Ygcm91dGUgJyR7ZnVsbFBhdGh9JzogQXJyYXkgY2Fubm90IGJlIHNwZWNpZmllZGApO1xuICAgIH1cbiAgICBpZiAoIXJvdXRlLmNvbXBvbmVudCAmJiAhcm91dGUuY2hpbGRyZW4gJiYgIXJvdXRlLmxvYWRDaGlsZHJlbiAmJlxuICAgICAgICAocm91dGUub3V0bGV0ICYmIHJvdXRlLm91dGxldCAhPT0gUFJJTUFSWV9PVVRMRVQpKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYEludmFsaWQgY29uZmlndXJhdGlvbiBvZiByb3V0ZSAnJHtcbiAgICAgICAgICBmdWxsUGF0aH0nOiBhIGNvbXBvbmVudGxlc3Mgcm91dGUgd2l0aG91dCBjaGlsZHJlbiBvciBsb2FkQ2hpbGRyZW4gY2Fubm90IGhhdmUgYSBuYW1lZCBvdXRsZXQgc2V0YCk7XG4gICAgfVxuICAgIGlmIChyb3V0ZS5yZWRpcmVjdFRvICYmIHJvdXRlLmNoaWxkcmVuKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYEludmFsaWQgY29uZmlndXJhdGlvbiBvZiByb3V0ZSAnJHtcbiAgICAgICAgICBmdWxsUGF0aH0nOiByZWRpcmVjdFRvIGFuZCBjaGlsZHJlbiBjYW5ub3QgYmUgdXNlZCB0b2dldGhlcmApO1xuICAgIH1cbiAgICBpZiAocm91dGUucmVkaXJlY3RUbyAmJiByb3V0ZS5sb2FkQ2hpbGRyZW4pIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgSW52YWxpZCBjb25maWd1cmF0aW9uIG9mIHJvdXRlICcke1xuICAgICAgICAgIGZ1bGxQYXRofSc6IHJlZGlyZWN0VG8gYW5kIGxvYWRDaGlsZHJlbiBjYW5ub3QgYmUgdXNlZCB0b2dldGhlcmApO1xuICAgIH1cbiAgICBpZiAocm91dGUuY2hpbGRyZW4gJiYgcm91dGUubG9hZENoaWxkcmVuKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYEludmFsaWQgY29uZmlndXJhdGlvbiBvZiByb3V0ZSAnJHtcbiAgICAgICAgICBmdWxsUGF0aH0nOiBjaGlsZHJlbiBhbmQgbG9hZENoaWxkcmVuIGNhbm5vdCBiZSB1c2VkIHRvZ2V0aGVyYCk7XG4gICAgfVxuICAgIGlmIChyb3V0ZS5yZWRpcmVjdFRvICYmIHJvdXRlLmNvbXBvbmVudCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBJbnZhbGlkIGNvbmZpZ3VyYXRpb24gb2Ygcm91dGUgJyR7XG4gICAgICAgICAgZnVsbFBhdGh9JzogcmVkaXJlY3RUbyBhbmQgY29tcG9uZW50IGNhbm5vdCBiZSB1c2VkIHRvZ2V0aGVyYCk7XG4gICAgfVxuICAgIGlmIChyb3V0ZS5yZWRpcmVjdFRvICYmIHJvdXRlLmNhbkFjdGl2YXRlKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgYEludmFsaWQgY29uZmlndXJhdGlvbiBvZiByb3V0ZSAnJHtcbiAgICAgICAgICAgICAgZnVsbFBhdGh9JzogcmVkaXJlY3RUbyBhbmQgY2FuQWN0aXZhdGUgY2Fubm90IGJlIHVzZWQgdG9nZXRoZXIuIFJlZGlyZWN0cyBoYXBwZW4gYmVmb3JlIGFjdGl2YXRpb24gYCArXG4gICAgICAgICAgYHNvIGNhbkFjdGl2YXRlIHdpbGwgbmV2ZXIgYmUgZXhlY3V0ZWQuYCk7XG4gICAgfVxuICAgIGlmIChyb3V0ZS5wYXRoICYmIHJvdXRlLm1hdGNoZXIpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgICBgSW52YWxpZCBjb25maWd1cmF0aW9uIG9mIHJvdXRlICcke2Z1bGxQYXRofSc6IHBhdGggYW5kIG1hdGNoZXIgY2Fubm90IGJlIHVzZWQgdG9nZXRoZXJgKTtcbiAgICB9XG4gICAgaWYgKHJvdXRlLnJlZGlyZWN0VG8gPT09IHZvaWQgMCAmJiAhcm91dGUuY29tcG9uZW50ICYmICFyb3V0ZS5jaGlsZHJlbiAmJiAhcm91dGUubG9hZENoaWxkcmVuKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYEludmFsaWQgY29uZmlndXJhdGlvbiBvZiByb3V0ZSAnJHtcbiAgICAgICAgICBmdWxsUGF0aH0nLiBPbmUgb2YgdGhlIGZvbGxvd2luZyBtdXN0IGJlIHByb3ZpZGVkOiBjb21wb25lbnQsIHJlZGlyZWN0VG8sIGNoaWxkcmVuIG9yIGxvYWRDaGlsZHJlbmApO1xuICAgIH1cbiAgICBpZiAocm91dGUucGF0aCA9PT0gdm9pZCAwICYmIHJvdXRlLm1hdGNoZXIgPT09IHZvaWQgMCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBJbnZhbGlkIGNvbmZpZ3VyYXRpb24gb2Ygcm91dGUgJyR7XG4gICAgICAgICAgZnVsbFBhdGh9Jzogcm91dGVzIG11c3QgaGF2ZSBlaXRoZXIgYSBwYXRoIG9yIGEgbWF0Y2hlciBzcGVjaWZpZWRgKTtcbiAgICB9XG4gICAgaWYgKHR5cGVvZiByb3V0ZS5wYXRoID09PSAnc3RyaW5nJyAmJiByb3V0ZS5wYXRoLmNoYXJBdCgwKSA9PT0gJy8nKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgYEludmFsaWQgY29uZmlndXJhdGlvbiBvZiByb3V0ZSAnJHtmdWxsUGF0aH0nOiBwYXRoIGNhbm5vdCBzdGFydCB3aXRoIGEgc2xhc2hgKTtcbiAgICB9XG4gICAgaWYgKHJvdXRlLnBhdGggPT09ICcnICYmIHJvdXRlLnJlZGlyZWN0VG8gIT09IHZvaWQgMCAmJiByb3V0ZS5wYXRoTWF0Y2ggPT09IHZvaWQgMCkge1xuICAgICAgY29uc3QgZXhwID1cbiAgICAgICAgICBgVGhlIGRlZmF1bHQgdmFsdWUgb2YgJ3BhdGhNYXRjaCcgaXMgJ3ByZWZpeCcsIGJ1dCBvZnRlbiB0aGUgaW50ZW50IGlzIHRvIHVzZSAnZnVsbCcuYDtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgSW52YWxpZCBjb25maWd1cmF0aW9uIG9mIHJvdXRlICd7cGF0aDogXCIke2Z1bGxQYXRofVwiLCByZWRpcmVjdFRvOiBcIiR7XG4gICAgICAgICAgcm91dGUucmVkaXJlY3RUb31cIn0nOiBwbGVhc2UgcHJvdmlkZSAncGF0aE1hdGNoJy4gJHtleHB9YCk7XG4gICAgfVxuICB9XG4gIGlmIChyb3V0ZS5jaGlsZHJlbikge1xuICAgIHZhbGlkYXRlQ29uZmlnKHJvdXRlLmNoaWxkcmVuLCBmdWxsUGF0aCk7XG4gIH1cbn1cblxuZnVuY3Rpb24gZ2V0RnVsbFBhdGgocGFyZW50UGF0aDogc3RyaW5nLCBjdXJyZW50Um91dGU6IFJvdXRlKTogc3RyaW5nIHtcbiAgaWYgKCFjdXJyZW50Um91dGUpIHtcbiAgICByZXR1cm4gcGFyZW50UGF0aDtcbiAgfVxuICBpZiAoIXBhcmVudFBhdGggJiYgIWN1cnJlbnRSb3V0ZS5wYXRoKSB7XG4gICAgcmV0dXJuICcnO1xuICB9IGVsc2UgaWYgKHBhcmVudFBhdGggJiYgIWN1cnJlbnRSb3V0ZS5wYXRoKSB7XG4gICAgcmV0dXJuIGAke3BhcmVudFBhdGh9L2A7XG4gIH0gZWxzZSBpZiAoIXBhcmVudFBhdGggJiYgY3VycmVudFJvdXRlLnBhdGgpIHtcbiAgICByZXR1cm4gY3VycmVudFJvdXRlLnBhdGg7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIGAke3BhcmVudFBhdGh9LyR7Y3VycmVudFJvdXRlLnBhdGh9YDtcbiAgfVxufVxuXG4vKipcbiAqIE1ha2VzIGEgY29weSBvZiB0aGUgY29uZmlnIGFuZCBhZGRzIGFueSBkZWZhdWx0IHJlcXVpcmVkIHByb3BlcnRpZXMuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzdGFuZGFyZGl6ZUNvbmZpZyhyOiBSb3V0ZSk6IFJvdXRlIHtcbiAgY29uc3QgY2hpbGRyZW4gPSByLmNoaWxkcmVuICYmIHIuY2hpbGRyZW4ubWFwKHN0YW5kYXJkaXplQ29uZmlnKTtcbiAgY29uc3QgYyA9IGNoaWxkcmVuID8gey4uLnIsIGNoaWxkcmVufSA6IHsuLi5yfTtcbiAgaWYgKCFjLmNvbXBvbmVudCAmJiAoY2hpbGRyZW4gfHwgYy5sb2FkQ2hpbGRyZW4pICYmIChjLm91dGxldCAmJiBjLm91dGxldCAhPT0gUFJJTUFSWV9PVVRMRVQpKSB7XG4gICAgYy5jb21wb25lbnQgPSBFbXB0eU91dGxldENvbXBvbmVudDtcbiAgfVxuICByZXR1cm4gYztcbn1cblxuLyoqIFJldHVybnMgdGhlIGByb3V0ZS5vdXRsZXRgIG9yIFBSSU1BUllfT1VUTEVUIGlmIG5vbmUgZXhpc3RzLiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldE91dGxldChyb3V0ZTogUm91dGUpOiBzdHJpbmcge1xuICByZXR1cm4gcm91dGUub3V0bGV0IHx8IFBSSU1BUllfT1VUTEVUO1xufVxuXG4vKipcbiAqIFNvcnRzIHRoZSBgcm91dGVzYCBzdWNoIHRoYXQgdGhlIG9uZXMgd2l0aCBhbiBvdXRsZXQgbWF0Y2hpbmcgYG91dGxldE5hbWVgIGNvbWUgZmlyc3QuXG4gKiBUaGUgb3JkZXIgb2YgdGhlIGNvbmZpZ3MgaXMgb3RoZXJ3aXNlIHByZXNlcnZlZC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHNvcnRCeU1hdGNoaW5nT3V0bGV0cyhyb3V0ZXM6IFJvdXRlcywgb3V0bGV0TmFtZTogc3RyaW5nKTogUm91dGVzIHtcbiAgY29uc3Qgc29ydGVkQ29uZmlnID0gcm91dGVzLmZpbHRlcihyID0+IGdldE91dGxldChyKSA9PT0gb3V0bGV0TmFtZSk7XG4gIHNvcnRlZENvbmZpZy5wdXNoKC4uLnJvdXRlcy5maWx0ZXIociA9PiBnZXRPdXRsZXQocikgIT09IG91dGxldE5hbWUpKTtcbiAgcmV0dXJuIHNvcnRlZENvbmZpZztcbn1cblxuLyoqXG4gKiBHZXRzIHRoZSBmaXJzdCBpbmplY3RvciBpbiB0aGUgc25hcHNob3QncyBwYXJlbnQgdHJlZS5cbiAqXG4gKiBJZiB0aGUgYFJvdXRlYCBoYXMgYSBzdGF0aWMgbGlzdCBvZiBwcm92aWRlcnMsIHRoZSByZXR1cm5lZCBpbmplY3RvciB3aWxsIGJlIHRoZSBvbmUgY3JlYXRlZCBmcm9tXG4gKiB0aG9zZS4gSWYgaXQgZG9lcyBub3QgZXhpc3QsIHRoZSByZXR1cm5lZCBpbmplY3RvciBtYXkgY29tZSBmcm9tIHRoZSBwYXJlbnRzLCB3aGljaCBtYXkgYmUgZnJvbSBhXG4gKiBsb2FkZWQgY29uZmlnIG9yIHRoZWlyIHN0YXRpYyBwcm92aWRlcnMuXG4gKlxuICogUmV0dXJucyBgbnVsbGAgaWYgdGhlcmUgaXMgbmVpdGhlciB0aGlzIG5vciBhbnkgcGFyZW50cyBoYXZlIGEgc3RvcmVkIGluamVjdG9yLlxuICpcbiAqIEdlbmVyYWxseSB1c2VkIGZvciByZXRyaWV2aW5nIHRoZSBpbmplY3RvciB0byB1c2UgZm9yIGdldHRpbmcgdG9rZW5zIGZvciBndWFyZHMvcmVzb2x2ZXJzIGFuZFxuICogYWxzbyB1c2VkIGZvciBnZXR0aW5nIHRoZSBjb3JyZWN0IGluamVjdG9yIHRvIHVzZSBmb3IgY3JlYXRpbmcgY29tcG9uZW50cy5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldENsb3Nlc3RSb3V0ZUluamVjdG9yKHNuYXBzaG90OiBBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90KTogRW52aXJvbm1lbnRJbmplY3RvcnxcbiAgICBudWxsIHtcbiAgaWYgKCFzbmFwc2hvdCkgcmV0dXJuIG51bGw7XG5cbiAgLy8gSWYgdGhlIGN1cnJlbnQgcm91dGUgaGFzIGl0cyBvd24gaW5qZWN0b3IsIHdoaWNoIGlzIGNyZWF0ZWQgZnJvbSB0aGUgc3RhdGljIHByb3ZpZGVycyBvbiB0aGVcbiAgLy8gcm91dGUgaXRzZWxmLCB3ZSBzaG91bGQgdXNlIHRoYXQuIE90aGVyd2lzZSwgd2Ugc3RhcnQgYXQgdGhlIHBhcmVudCBzaW5jZSB3ZSBkbyBub3Qgd2FudCB0b1xuICAvLyBpbmNsdWRlIHRoZSBsYXp5IGxvYWRlZCBpbmplY3RvciBmcm9tIHRoaXMgcm91dGUuXG4gIGlmIChzbmFwc2hvdC5yb3V0ZUNvbmZpZz8uX2luamVjdG9yKSB7XG4gICAgcmV0dXJuIHNuYXBzaG90LnJvdXRlQ29uZmlnLl9pbmplY3RvcjtcbiAgfVxuXG4gIGZvciAobGV0IHMgPSBzbmFwc2hvdC5wYXJlbnQ7IHM7IHMgPSBzLnBhcmVudCkge1xuICAgIGNvbnN0IHJvdXRlID0gcy5yb3V0ZUNvbmZpZztcbiAgICAvLyBOb3RlIHRoYXQgdGhlIG9yZGVyIGhlcmUgaXMgaW1wb3J0YW50LiBgX2xvYWRlZEluamVjdG9yYCBzdG9yZWQgb24gdGhlIHJvdXRlIHdpdGhcbiAgICAvLyBgbG9hZENoaWxkcmVuOiAoKSA9PiBOZ01vZHVsZWAgc28gaXQgYXBwbGllcyB0byBjaGlsZCByb3V0ZXMgd2l0aCBwcmlvcml0eS4gVGhlIGBfaW5qZWN0b3JgXG4gICAgLy8gaXMgY3JlYXRlZCBmcm9tIHRoZSBzdGF0aWMgcHJvdmlkZXJzIG9uIHRoYXQgcGFyZW50IHJvdXRlLCBzbyBpdCBhcHBsaWVzIHRvIHRoZSBjaGlsZHJlbiBhc1xuICAgIC8vIHdlbGwsIGJ1dCBvbmx5IGlmIHRoZXJlIGlzIG5vIGxhenkgbG9hZGVkIE5nTW9kdWxlUmVmIGluamVjdG9yLlxuICAgIGlmIChyb3V0ZT8uX2xvYWRlZEluamVjdG9yKSByZXR1cm4gcm91dGUuX2xvYWRlZEluamVjdG9yO1xuICAgIGlmIChyb3V0ZT8uX2luamVjdG9yKSByZXR1cm4gcm91dGUuX2luamVjdG9yO1xuICB9XG5cbiAgcmV0dXJuIG51bGw7XG59XG4iXX0=