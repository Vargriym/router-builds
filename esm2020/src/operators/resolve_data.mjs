/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { EMPTY, EmptyError, from, of, throwError } from 'rxjs';
import { catchError, concatMap, first, map, mapTo, mergeMap, takeLast, tap } from 'rxjs/operators';
import { inheritedParamsDataResolve } from '../router_state';
import { RouteTitleKey } from '../shared';
import { wrapIntoObservable } from '../utils/collection';
import { getClosestRouteInjector } from '../utils/config';
import { getTokenOrFunctionIdentity } from '../utils/preactivation';
export function resolveData(paramsInheritanceStrategy, injector) {
    return mergeMap(t => {
        const { targetSnapshot, guards: { canActivateChecks } } = t;
        if (!canActivateChecks.length) {
            return of(t);
        }
        let canActivateChecksResolved = 0;
        return from(canActivateChecks)
            .pipe(concatMap(check => runResolve(check.route, targetSnapshot, paramsInheritanceStrategy, injector)), tap(() => canActivateChecksResolved++), takeLast(1), mergeMap(_ => canActivateChecksResolved === canActivateChecks.length ? of(t) : EMPTY));
    });
}
function runResolve(futureARS, futureRSS, paramsInheritanceStrategy, injector) {
    const config = futureARS.routeConfig;
    const resolve = futureARS._resolve;
    if (config?.title !== undefined && !hasStaticTitle(config)) {
        resolve[RouteTitleKey] = config.title;
    }
    return resolveNode(resolve, futureARS, futureRSS, injector).pipe(map((resolvedData) => {
        futureARS._resolvedData = resolvedData;
        futureARS.data = inheritedParamsDataResolve(futureARS, paramsInheritanceStrategy).resolve;
        if (config && hasStaticTitle(config)) {
            futureARS.data[RouteTitleKey] = config.title;
        }
        return null;
    }));
}
function resolveNode(resolve, futureARS, futureRSS, injector) {
    const keys = getDataKeys(resolve);
    if (keys.length === 0) {
        return of({});
    }
    const data = {};
    return from(keys).pipe(mergeMap(key => getResolver(resolve[key], futureARS, futureRSS, injector)
        .pipe(first(), tap((value) => {
        data[key] = value;
    }))), takeLast(1), mapTo(data), catchError((e) => e instanceof EmptyError ? EMPTY : throwError(e)));
}
function getDataKeys(obj) {
    return [...Object.keys(obj), ...Object.getOwnPropertySymbols(obj)];
}
function getResolver(injectionToken, futureARS, futureRSS, injector) {
    const closestInjector = getClosestRouteInjector(futureARS) ?? injector;
    const resolver = getTokenOrFunctionIdentity(injectionToken, closestInjector);
    const resolverValue = resolver.resolve ?
        resolver.resolve(futureARS, futureRSS) :
        closestInjector.runInContext(() => resolver(futureARS, futureRSS));
    return wrapIntoObservable(resolverValue);
}
function hasStaticTitle(config) {
    return typeof config.title === 'string' || config.title === null;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVzb2x2ZV9kYXRhLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvcm91dGVyL3NyYy9vcGVyYXRvcnMvcmVzb2x2ZV9kYXRhLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRztBQUdILE9BQU8sRUFBQyxLQUFLLEVBQUUsVUFBVSxFQUFFLElBQUksRUFBd0MsRUFBRSxFQUFFLFVBQVUsRUFBQyxNQUFNLE1BQU0sQ0FBQztBQUNuRyxPQUFPLEVBQUMsVUFBVSxFQUFFLFNBQVMsRUFBRSxLQUFLLEVBQUUsR0FBRyxFQUFFLEtBQUssRUFBRSxRQUFRLEVBQUUsUUFBUSxFQUFFLEdBQUcsRUFBQyxNQUFNLGdCQUFnQixDQUFDO0FBSWpHLE9BQU8sRUFBeUIsMEJBQTBCLEVBQXNCLE1BQU0saUJBQWlCLENBQUM7QUFDeEcsT0FBTyxFQUFDLGFBQWEsRUFBQyxNQUFNLFdBQVcsQ0FBQztBQUN4QyxPQUFPLEVBQUMsa0JBQWtCLEVBQUMsTUFBTSxxQkFBcUIsQ0FBQztBQUN2RCxPQUFPLEVBQUMsdUJBQXVCLEVBQUMsTUFBTSxpQkFBaUIsQ0FBQztBQUN4RCxPQUFPLEVBQUMsMEJBQTBCLEVBQUMsTUFBTSx3QkFBd0IsQ0FBQztBQUVsRSxNQUFNLFVBQVUsV0FBVyxDQUN2Qix5QkFBK0MsRUFDL0MsUUFBNkI7SUFDL0IsT0FBTyxRQUFRLENBQUMsQ0FBQyxDQUFDLEVBQUU7UUFDbEIsTUFBTSxFQUFDLGNBQWMsRUFBRSxNQUFNLEVBQUUsRUFBQyxpQkFBaUIsRUFBQyxFQUFDLEdBQUcsQ0FBQyxDQUFDO1FBRXhELElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxNQUFNLEVBQUU7WUFDN0IsT0FBTyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7U0FDZDtRQUNELElBQUkseUJBQXlCLEdBQUcsQ0FBQyxDQUFDO1FBQ2xDLE9BQU8sSUFBSSxDQUFDLGlCQUFpQixDQUFDO2FBQ3pCLElBQUks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QztBQUNyRSxDQUFDO0FBRUQsU0FBUyxXQUFXLENBQ2hCLGNBQTJDLEVBQUUsU0FBaUMsRUFDOUUsU0FBOEIsRUFBRSxRQUE2QjtJQUMvRCxNQUFNLGVBQWUsR0FBRyx1QkFBdUIsQ0FBQyxTQUFTLENBQUMsSUFBSSxRQUFRLENBQUM7SUFDdkUsTUFBTSxRQUFRLEdBQUcsMEJBQTBCLENBQUMsY0FBYyxFQUFFLGVBQWUsQ0FBQyxDQUFDO0lBQzdFLE1BQU0sYUFBYSxHQUFHLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUNwQyxRQUFRLENBQUMsT0FBTyxDQUFDLFNBQVMsRUFBRSxTQUFTLENBQUMsQ0FBQyxDQUFDO1FBQ3hDLGVBQWUsQ0FBQyxZQUFZLENBQUMsR0FBRyxFQUFFLENBQUMsUUFBUSxDQUFDLFNBQVMsRUFBRSxTQUFTLENBQUMsQ0FBQyxDQUFDO0lBQ3ZFLE9BQU8sa0JBQWtCLENBQUMsYUFBYSxDQUFDLENBQUM7QUFDM0MsQ0FBQztBQUVELFNBQVMsY0FBYyxDQUFDLE1BQWE7SUFDbkMsT0FBTyxPQUFPLE1BQU0sQ0FBQyxLQUFLLEtBQUssUUFBUSxJQUFJLE1BQU0sQ0FBQyxLQUFLLEtBQUssSUFBSSxDQUFDO0FBQ25FLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtFbnZpcm9ubWVudEluamVjdG9yLCBQcm92aWRlclRva2VufSBmcm9tICdAYW5ndWxhci9jb3JlJztcbmltcG9ydCB7RU1QVFksIEVtcHR5RXJyb3IsIGZyb20sIE1vbm9UeXBlT3BlcmF0b3JGdW5jdGlvbiwgT2JzZXJ2YWJsZSwgb2YsIHRocm93RXJyb3J9IGZyb20gJ3J4anMnO1xuaW1wb3J0IHtjYXRjaEVycm9yLCBjb25jYXRNYXAsIGZpcnN0LCBtYXAsIG1hcFRvLCBtZXJnZU1hcCwgdGFrZUxhc3QsIHRhcH0gZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuXG5pbXBvcnQge1Jlc29sdmVEYXRhLCBSb3V0ZX0gZnJvbSAnLi4vbW9kZWxzJztcbmltcG9ydCB7TmF2aWdhdGlvblRyYW5zaXRpb259IGZyb20gJy4uL3JvdXRlcic7XG5pbXBvcnQge0FjdGl2YXRlZFJvdXRlU25hcHNob3QsIGluaGVyaXRlZFBhcmFtc0RhdGFSZXNvbHZlLCBSb3V0ZXJTdGF0ZVNuYXBzaG90fSBmcm9tICcuLi9yb3V0ZXJfc3RhdGUnO1xuaW1wb3J0IHtSb3V0ZVRpdGxlS2V5fSBmcm9tICcuLi9zaGFyZWQnO1xuaW1wb3J0IHt3cmFwSW50b09ic2VydmFibGV9IGZyb20gJy4uL3V0aWxzL2NvbGxlY3Rpb24nO1xuaW1wb3J0IHtnZXRDbG9zZXN0Um91dGVJbmplY3Rvcn0gZnJvbSAnLi4vdXRpbHMvY29uZmlnJztcbmltcG9ydCB7Z2V0VG9rZW5PckZ1bmN0aW9uSWRlbnRpdHl9IGZyb20gJy4uL3V0aWxzL3ByZWFjdGl2YXRpb24nO1xuXG5leHBvcnQgZnVuY3Rpb24gcmVzb2x2ZURhdGEoXG4gICAgcGFyYW1zSW5oZXJpdGFuY2VTdHJhdGVneTogJ2VtcHR5T25seSd8J2Fsd2F5cycsXG4gICAgaW5qZWN0b3I6IEVudmlyb25tZW50SW5qZWN0b3IpOiBNb25vVHlwZU9wZXJhdG9yRnVuY3Rpb248TmF2aWdhdGlvblRyYW5zaXRpb24+IHtcbiAgcmV0dXJuIG1lcmdlTWFwKHQgPT4ge1xuICAgIGNvbnN0IHt0YXJnZXRTbmFwc2hvdCwgZ3VhcmRzOiB7Y2FuQWN0aXZhdGVDaGVja3N9fSA9IHQ7XG5cbiAgICBpZiAoIWNhbkFjdGl2YXRlQ2hlY2tzLmxlbmd0aCkge1xuICAgICAgcmV0dXJuIG9mKHQpO1xuICAgIH1cbiAgICBsZXQgY2FuQWN0aXZhdGVDaGVja3NSZXNvbHZlZCA9IDA7XG4gICAgcmV0dXJuIGZyb20oY2FuQWN0aXZhdGVDaGVja3MpXG4gICAgICAgIC5waXBlKFxuICAgICAgICAgICAgY29uY2F0TWFwKFxuICAgICAgICAgICAgICAgIGNoZWNrID0+XG4gICAgICAgICAgICAgICAgICAgIHJ1blJlc29sdmUoY2hlY2sucm91dGUsIHRhcmdldFNuYXBzaG90ISwgcGFyYW1zSW5oZXJpdGFuY2VTdHJhdGVneSwgaW5qZWN0b3IpKSxcbiAgICAgICAgICAgIHRhcCgoKSA9PiBjYW5BY3RpdmF0ZUNoZWNrc1Jlc29sdmVkKyspLFxuICAgICAgICAgICAgdGFrZUxhc3QoMSksXG4gICAgICAgICAgICBtZXJnZU1hcChfID0+IGNhbkFjdGl2YXRlQ2hlY2tzUmVzb2x2ZWQgPT09IGNhbkFjdGl2YXRlQ2hlY2tzLmxlbmd0aCA/IG9mKHQpIDogRU1QVFkpLFxuICAgICAgICApO1xuICB9KTtcbn1cblxuZnVuY3Rpb24gcnVuUmVzb2x2ZShcbiAgICBmdXR1cmVBUlM6IEFjdGl2YXRlZFJvdXRlU25hcHNob3QsIGZ1dHVyZVJTUzogUm91dGVyU3RhdGVTbmFwc2hvdCxcbiAgICBwYXJhbXNJbmhlcml0YW5jZVN0cmF0ZWd5OiAnZW1wdHlPbmx5J3wnYWx3YXlzJywgaW5qZWN0b3I6IEVudmlyb25tZW50SW5qZWN0b3IpIHtcbiAgY29uc3QgY29uZmlnID0gZnV0dXJlQVJTLnJvdXRlQ29uZmlnO1xuICBjb25zdCByZXNvbHZlID0gZnV0dXJlQVJTLl9yZXNvbHZlO1xuICBpZiAoY29uZmlnPy50aXRsZSAhPT0gdW5kZWZpbmVkICYmICFoYXNTdGF0aWNUaXRsZShjb25maWcpKSB7XG4gICAgcmVzb2x2ZVtSb3V0ZVRpdGxlS2V5XSA9IGNvbmZpZy50aXRsZTtcbiAgfVxuICByZXR1cm4gcmVzb2x2ZU5vZGUocmVzb2x2ZSwgZnV0dXJlQVJTLCBmdXR1cmVSU1MsIGluamVjdG9yKS5waXBlKG1hcCgocmVzb2x2ZWREYXRhOiBhbnkpID0+IHtcbiAgICBmdXR1cmVBUlMuX3Jlc29sdmVkRGF0YSA9IHJlc29sdmVkRGF0YTtcbiAgICBmdXR1cmVBUlMuZGF0YSA9IGluaGVyaXRlZFBhcmFtc0RhdGFSZXNvbHZlKGZ1dHVyZUFSUywgcGFyYW1zSW5oZXJpdGFuY2VTdHJhdGVneSkucmVzb2x2ZTtcbiAgICBpZiAoY29uZmlnICYmIGhhc1N0YXRpY1RpdGxlKGNvbmZpZykpIHtcbiAgICAgIGZ1dHVyZUFSUy5kYXRhW1JvdXRlVGl0bGVLZXldID0gY29uZmlnLnRpdGxlO1xuICAgIH1cbiAgICByZXR1cm4gbnVsbDtcbiAgfSkpO1xufVxuXG5mdW5jdGlvbiByZXNvbHZlTm9kZShcbiAgICByZXNvbHZlOiBSZXNvbHZlRGF0YSwgZnV0dXJlQVJTOiBBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90LCBmdXR1cmVSU1M6IFJvdXRlclN0YXRlU25hcHNob3QsXG4gICAgaW5qZWN0b3I6IEVudmlyb25tZW50SW5qZWN0b3IpOiBPYnNlcnZhYmxlPGFueT4ge1xuICBjb25zdCBrZXlzID0gZ2V0RGF0YUtleXMocmVzb2x2ZSk7XG4gIGlmIChrZXlzLmxlbmd0aCA9PT0gMCkge1xuICAgIHJldHVybiBvZih7fSk7XG4gIH1cbiAgY29uc3QgZGF0YToge1trOiBzdHJpbmd8c3ltYm9sXTogYW55fSA9IHt9O1xuICByZXR1cm4gZnJvbShrZXlzKS5waXBlKFxuICAgICAgbWVyZ2VNYXAoXG4gICAgICAgICAga2V5ID0+IGdldFJlc29sdmVyKHJlc29sdmVba2V5XSwgZnV0dXJlQVJTLCBmdXR1cmVSU1MsIGluamVjdG9yKVxuICAgICAgICAgICAgICAgICAgICAgLnBpcGUoZmlyc3QoKSwgdGFwKCh2YWx1ZTogYW55KSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRhdGFba2V5XSA9IHZhbHVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgfSkpKSxcbiAgICAgIHRha2VMYXN0KDEpLFxuICAgICAgbWFwVG8oZGF0YSksXG4gICAgICBjYXRjaEVycm9yKChlOiB1bmtub3duKSA9PiBlIGluc3RhbmNlb2YgRW1wdHlFcnJvciA/IEVNUFRZIDogdGhyb3dFcnJvcihlKSksXG4gICk7XG59XG5cbmZ1bmN0aW9uIGdldERhdGFLZXlzKG9iajogT2JqZWN0KTogQXJyYXk8c3RyaW5nfHN5bWJvbD4ge1xuICByZXR1cm4gWy4uLk9iamVjdC5rZXlzKG9iaiksIC4uLk9iamVjdC5nZXRPd25Qcm9wZXJ0eVN5bWJvbHMob2JqKV07XG59XG5cbmZ1bmN0aW9uIGdldFJlc29sdmVyKFxuICAgIGluamVjdGlvblRva2VuOiBQcm92aWRlclRva2VuPGFueT58RnVuY3Rpb24sIGZ1dHVyZUFSUzogQWN0aXZhdGVkUm91dGVTbmFwc2hvdCxcbiAgICBmdXR1cmVSU1M6IFJvdXRlclN0YXRlU25hcHNob3QsIGluamVjdG9yOiBFbnZpcm9ubWVudEluamVjdG9yKTogT2JzZXJ2YWJsZTxhbnk+IHtcbiAgY29uc3QgY2xvc2VzdEluamVjdG9yID0gZ2V0Q2xvc2VzdFJvdXRlSW5qZWN0b3IoZnV0dXJlQVJTKSA/PyBpbmplY3RvcjtcbiAgY29uc3QgcmVzb2x2ZXIgPSBnZXRUb2tlbk9yRnVuY3Rpb25JZGVudGl0eShpbmplY3Rpb25Ub2tlbiwgY2xvc2VzdEluamVjdG9yKTtcbiAgY29uc3QgcmVzb2x2ZXJWYWx1ZSA9IHJlc29sdmVyLnJlc29sdmUgP1xuICAgICAgcmVzb2x2ZXIucmVzb2x2ZShmdXR1cmVBUlMsIGZ1dHVyZVJTUykgOlxuICAgICAgY2xvc2VzdEluamVjdG9yLnJ1bkluQ29udGV4dCgoKSA9PiByZXNvbHZlcihmdXR1cmVBUlMsIGZ1dHVyZVJTUykpO1xuICByZXR1cm4gd3JhcEludG9PYnNlcnZhYmxlKHJlc29sdmVyVmFsdWUpO1xufVxuXG5mdW5jdGlvbiBoYXNTdGF0aWNUaXRsZShjb25maWc6IFJvdXRlKSB7XG4gIHJldHVybiB0eXBlb2YgY29uZmlnLnRpdGxlID09PSAnc3RyaW5nJyB8fCBjb25maWcudGl0bGUgPT09IG51bGw7XG59XG4iXX0=