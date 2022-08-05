/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { concat, defer, from, of, pipe } from 'rxjs';
import { concatMap, first, map, mergeMap, tap } from 'rxjs/operators';
import { ActivationStart, ChildActivationStart } from '../events';
import { redirectingNavigationError } from '../navigation_canceling_error';
import { isUrlTree } from '../url_tree';
import { wrapIntoObservable } from '../utils/collection';
import { getClosestRouteInjector } from '../utils/config';
import { getCanActivateChild, getTokenOrFunctionIdentity } from '../utils/preactivation';
import { isBoolean, isCanActivate, isCanActivateChild, isCanDeactivate, isCanLoad, isCanMatch } from '../utils/type_guards';
import { prioritizedGuardValue } from './prioritized_guard_value';
export function checkGuards(injector, forwardEvent) {
    return mergeMap(t => {
        const { targetSnapshot, currentSnapshot, guards: { canActivateChecks, canDeactivateChecks } } = t;
        if (canDeactivateChecks.length === 0 && canActivateChecks.length === 0) {
            return of({ ...t, guardsResult: true });
        }
        return runCanDeactivateChecks(canDeactivateChecks, targetSnapshot, currentSnapshot, injector)
            .pipe(mergeMap(canDeactivate => {
            return canDeactivate && isBoolean(canDeactivate) ?
                runCanActivateChecks(targetSnapshot, canActivateChecks, injector, forwardEvent) :
                of(canDeactivate);
        }), map(guardsResult => ({ ...t, guardsResult })));
    });
}
function runCanDeactivateChecks(checks, futureRSS, currRSS, injector) {
    return from(checks).pipe(mergeMap(check => runCanDeactivate(check.component, check.route, currRSS, futureRSS, injector)), first(result => {
        return result !== true;
    }, true));
}
function runCanActivateChecks(futureSnapshot, checks, injector, forwardEvent) {
    return from(checks).pipe(concatMap((check) => {
        return concat(fireChildActivationStart(check.route.parent, forwardEvent), fireActivationStart(check.route, forwardEvent), runCanActivateChild(futureSnapshot, check.path, injector), runCanActivate(futureSnapshot, check.route, injector));
    }), first(result => {
        return result !== true;
    }, true));
}
/**
 * This should fire off `ActivationStart` events for each route being activated at this
 * level.
 * In other words, if you're activating `a` and `b` below, `path` will contain the
 * `ActivatedRouteSnapshot`s for both and we will fire `ActivationStart` for both. Always
 * return
 * `true` so checks continue to run.
 */
function fireActivationStart(snapshot, forwardEvent) {
    if (snapshot !== null && forwardEvent) {
        forwardEvent(new ActivationStart(snapshot));
    }
    return of(true);
}
/**
 * This should fire off `ChildActivationStart` events for each route being activated at this
 * level.
 * In other words, if you're activating `a` and `b` below, `path` will contain the
 * `ActivatedRouteSnapshot`s for both and we will fire `ChildActivationStart` for both. Always
 * return
 * `true` so checks continue to run.
 */
function fireChildActivationStart(snapshot, forwardEvent) {
    if (snapshot !== null && forwardEvent) {
        forwardEvent(new ChildActivationStart(snapshot));
    }
    return of(true);
}
function runCanActivate(futureRSS, futureARS, injector) {
    const canActivate = futureARS.routeConfig ? futureARS.routeConfig.canActivate : null;
    if (!canActivate || canActivate.length === 0)
        return of(true);
    const canActivateObservables = canActivate.map((canActivate) => {
        return defer(() => {
            const closestInjector = getClosestRouteInjector(futureARS) ?? injector;
            const guard = getTokenOrFunctionIdentity(canActivate, closestInjector);
            const guardVal = isCanActivate(guard) ?
                guard.canActivate(futureARS, futureRSS) :
                closestInjector.runInContext(() => guard(futureARS, futureRSS));
            return wrapIntoObservable(guardVal).pipe(first());
        });
    });
    return of(canActivateObservables).pipe(prioritizedGuardValue());
}
function runCanActivateChild(futureRSS, path, injector) {
    const futureARS = path[path.length - 1];
    const canActivateChildGuards = path.slice(0, path.length - 1)
        .reverse()
        .map(p => getCanActivateChild(p))
        .filter(_ => _ !== null);
    const canActivateChildGuardsMapped = canActivateChildGuards.map((d) => {
        return defer(() => {
            const guardsMapped = d.guards.map((canActivateChild) => {
                const closestInjector = getClosestRouteInjector(d.node) ?? injector;
                const guard = getTokenOrFunctionIdentity(canActivateChild, closestInjector);
                const guardVal = isCanActivateChild(guard) ?
                    guard.canActivateChild(futureARS, futureRSS) :
                    closestInjector.runInContext(() => guard(futureARS, futureRSS));
                return wrapIntoObservable(guardVal).pipe(first());
            });
            return of(guardsMapped).pipe(prioritizedGuardValue());
        });
    });
    return of(canActivateChildGuardsMapped).pipe(prioritizedGuardValue());
}
function runCanDeactivate(component, currARS, currRSS, futureRSS, injector) {
    const canDeactivate = currARS && currARS.routeConfig ? currARS.routeConfig.canDeactivate : null;
    if (!canDeactivate || canDeactivate.length === 0)
        return of(true);
    const canDeactivateObservables = canDeactivate.map((c) => {
        const closestInjector = getClosestRouteInjector(currARS) ?? injector;
        const guard = getTokenOrFunctionIdentity(c, closestInjector);
        const guardVal = isCanDeactivate(guard) ?
            guard.canDeactivate(component, currARS, currRSS, futureRSS) :
            closestInjector.runInContext(() => guard(component, currARS, currRSS, futureRSS));
        return wrapIntoObservable(guardVal).pipe(first());
    });
    return of(canDeactivateObservables).pipe(prioritizedGuardValue());
}
export function runCanLoadGuards(injector, route, segments, urlSerializer) {
    const canLoad = route.canLoad;
    if (canLoad === undefined || canLoad.length === 0) {
        return of(true);
    }
    const canLoadObservables = canLoad.map((injectionToken) => {
        const guard = getTokenOrFunctionIdentity(injectionToken, injector);
        const guardVal = isCanLoad(guard) ?
            guard.canLoad(route, segments) :
            injector.runInContext(() => guard(route, segments));
        return wrapIntoObservable(guardVal);
    });
    return of(canLoadObservables)
        .pipe(prioritizedGuardValue(), redirectIfUrlTree(urlSerializer));
}
function redirectIfUrlTree(urlSerializer) {
    return pipe(tap((result) => {
        if (!isUrlTree(result))
            return;
        throw redirectingNavigationError(urlSerializer, result);
    }), map(result => result === true));
}
export function runCanMatchGuards(injector, route, segments, urlSerializer) {
    const canMatch = route.canMatch;
    if (!canMatch || canMatch.length === 0)
        return of(true);
    const canMatchObservables = canMatch.map(injectionToken => {
        const guard = getTokenOrFunctionIdentity(injectionToken, injector);
        const guardVal = isCanMatch(guard) ?
            guard.canMatch(route, segments) :
            injector.runInContext(() => guard(route, segments));
        return wrapIntoObservable(guardVal);
    });
    return of(canMatchObservables)
        .pipe(prioritizedGuardValue(), redirectIfUrlTree(urlSerializer));
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hlY2tfZ3VhcmRzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvcm91dGVyL3NyYy9vcGVyYXRvcnMvY2hlY2tfZ3VhcmRzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRztBQUdILE9BQU8sRUFBQyxNQUFNLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBd0MsRUFBRSxFQUFvQixJQUFJLEVBQUMsTUFBTSxNQUFNLENBQUM7QUFDM0csT0FBTyxFQUFDLFNBQVMsRUFBRSxLQUFLLEVBQUUsR0FBRyxFQUFFLFFBQVEsRUFBRSxHQUFHLEVBQUMsTUFBTSxnQkFBZ0IsQ0FBQztBQUVwRSxPQUFPLEVBQUMsZUFBZSxFQUFFLG9CQUFvQixFQUFRLE1BQU0sV0FBVyxDQUFDO0FBRXZFLE9BQU8sRUFBQywwQkFBMEIsRUFBQyxNQUFNLCtCQUErQixDQUFDO0FBR3pFLE9BQU8sRUFBQyxTQUFTLEVBQXFDLE1BQU0sYUFBYSxDQUFDO0FBQzFFLE9BQU8sRUFBQyxrQkFBa0IsRUFBQyxNQUFNLHFCQUFxQixDQUFDO0FBQ3ZELE9BQU8sRUFBQyx1QkFBdUIsRUFBQyxNQUFNLGlCQUFpQixDQUFDO0FBQ3hELE9BQU8sRUFBNkIsbUJBQW1CLEVBQUUsMEJBQTBCLEVBQUMsTUFBTSx3QkFBd0IsQ0FBQztBQUNuSCxPQUFPLEVBQUMsU0FBUyxFQUFFLGFBQWEsRUFBRSxrQkFBa0IsRUFBRSxlQUFlLEVBQUUsU0FBUyxFQUFFLFVBQVUsRUFBQyxNQUFNLHNCQUFzQixDQUFDO0FBRTFILE9BQU8sRUFBQyxxQkFBcUIsRUFBQyxNQUFNLDJCQUEyQixDQUFDO0FBRWhFLE1BQU0sVUFBVSxXQUFXLENBQUMsUUFBNkIsRUFBRSxZQUFtQztJQUU1RixPQUFPLFFBQVEsQ0FBQyxDQUFDLENBQUMsRUFBRTtRQUNsQixNQUFNLEVBQUMsY0FBYyxFQUFFLGVBQWUsRUFBRSxNQUFNLEVBQUUsRUFBQyxpQkFB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IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7RW52aXJvbm1lbnRJbmplY3RvciwgUHJvdmlkZXJUb2tlbn0gZnJvbSAnQGFuZ3VsYXIvY29yZSc7XG5pbXBvcnQge2NvbmNhdCwgZGVmZXIsIGZyb20sIE1vbm9UeXBlT3BlcmF0b3JGdW5jdGlvbiwgT2JzZXJ2YWJsZSwgb2YsIE9wZXJhdG9yRnVuY3Rpb24sIHBpcGV9IGZyb20gJ3J4anMnO1xuaW1wb3J0IHtjb25jYXRNYXAsIGZpcnN0LCBtYXAsIG1lcmdlTWFwLCB0YXB9IGZyb20gJ3J4anMvb3BlcmF0b3JzJztcblxuaW1wb3J0IHtBY3RpdmF0aW9uU3RhcnQsIENoaWxkQWN0aXZhdGlvblN0YXJ0LCBFdmVudH0gZnJvbSAnLi4vZXZlbnRzJztcbmltcG9ydCB7Q2FuQWN0aXZhdGVDaGlsZCwgQ2FuQWN0aXZhdGVDaGlsZEZuLCBDYW5BY3RpdmF0ZUZuLCBSb3V0ZX0gZnJvbSAnLi4vbW9kZWxzJztcbmltcG9ydCB7cmVkaXJlY3RpbmdOYXZpZ2F0aW9uRXJyb3J9IGZyb20gJy4uL25hdmlnYXRpb25fY2FuY2VsaW5nX2Vycm9yJztcbmltcG9ydCB7TmF2aWdhdGlvblRyYW5zaXRpb259IGZyb20gJy4uL3JvdXRlcic7XG5pbXBvcnQge0FjdGl2YXRlZFJvdXRlU25hcHNob3QsIFJvdXRlclN0YXRlU25hcHNob3R9IGZyb20gJy4uL3JvdXRlcl9zdGF0ZSc7XG5pbXBvcnQge2lzVXJsVHJlZSwgVXJsU2VnbWVudCwgVXJsU2VyaWFsaXplciwgVXJsVHJlZX0gZnJvbSAnLi4vdXJsX3RyZWUnO1xuaW1wb3J0IHt3cmFwSW50b09ic2VydmFibGV9IGZyb20gJy4uL3V0aWxzL2NvbGxlY3Rpb24nO1xuaW1wb3J0IHtnZXRDbG9zZXN0Um91dGVJbmplY3Rvcn0gZnJvbSAnLi4vdXRpbHMvY29uZmlnJztcbmltcG9ydCB7Q2FuQWN0aXZhdGUsIENhbkRlYWN0aXZhdGUsIGdldENhbkFjdGl2YXRlQ2hpbGQsIGdldFRva2VuT3JGdW5jdGlvbklkZW50aXR5fSBmcm9tICcuLi91dGlscy9wcmVhY3RpdmF0aW9uJztcbmltcG9ydCB7aXNCb29sZWFuLCBpc0NhbkFjdGl2YXRlLCBpc0NhbkFjdGl2YXRlQ2hpbGQsIGlzQ2FuRGVhY3RpdmF0ZSwgaXNDYW5Mb2FkLCBpc0Nhbk1hdGNofSBmcm9tICcuLi91dGlscy90eXBlX2d1YXJkcyc7XG5cbmltcG9ydCB7cHJpb3JpdGl6ZWRHdWFyZFZhbHVlfSBmcm9tICcuL3ByaW9yaXRpemVkX2d1YXJkX3ZhbHVlJztcblxuZXhwb3J0IGZ1bmN0aW9uIGNoZWNrR3VhcmRzKGluamVjdG9yOiBFbnZpcm9ubWVudEluamVjdG9yLCBmb3J3YXJkRXZlbnQ/OiAoZXZ0OiBFdmVudCkgPT4gdm9pZCk6XG4gICAgTW9ub1R5cGVPcGVyYXRvckZ1bmN0aW9uPE5hdmlnYXRpb25UcmFuc2l0aW9uPiB7XG4gIHJldHVybiBtZXJnZU1hcCh0ID0+IHtcbiAgICBjb25zdCB7dGFyZ2V0U25hcHNob3QsIGN1cnJlbnRTbmFwc2hvdCwgZ3VhcmRzOiB7Y2FuQWN0aXZhdGVDaGVja3MsIGNhbkRlYWN0aXZhdGVDaGVja3N9fSA9IHQ7XG4gICAgaWYgKGNhbkRlYWN0aXZhdGVDaGVja3MubGVuZ3RoID09PSAwICYmIGNhbkFjdGl2YXRlQ2hlY2tzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgcmV0dXJuIG9mKHsuLi50LCBndWFyZHNSZXN1bHQ6IHRydWV9KTtcbiAgICB9XG5cbiAgICByZXR1cm4gcnVuQ2FuRGVhY3RpdmF0ZUNoZWNrcyhjYW5EZWFjdGl2YXRlQ2hlY2tzLCB0YXJnZXRTbmFwc2hvdCEsIGN1cnJlbnRTbmFwc2hvdCwgaW5qZWN0b3IpXG4gICAgICAgIC5waXBlKFxuICAgICAgICAgICAgbWVyZ2VNYXAoY2FuRGVhY3RpdmF0ZSA9PiB7XG4gICAgICAgICAgICAgIHJldHVybiBjYW5EZWFjdGl2YXRlICYmIGlzQm9vbGVhbihjYW5EZWFjdGl2YXRlKSA/XG4gICAgICAgICAgICAgICAgICBydW5DYW5BY3RpdmF0ZUNoZWNrcyh0YXJnZXRTbmFwc2hvdCEsIGNhbkFjdGl2YXRlQ2hlY2tzLCBpbmplY3RvciwgZm9yd2FyZEV2ZW50KSA6XG4gICAgICAgICAgICAgICAgICBvZihjYW5EZWFjdGl2YXRlKTtcbiAgICAgICAgICAgIH0pLFxuICAgICAgICAgICAgbWFwKGd1YXJkc1Jlc3VsdCA9PiAoey4uLnQsIGd1YXJkc1Jlc3VsdH0pKSk7XG4gIH0pO1xufVxuXG5mdW5jdGlvbiBydW5DYW5EZWFjdGl2YXRlQ2hlY2tzKFxuICAgIGNoZWNrczogQ2FuRGVhY3RpdmF0ZVtdLCBmdXR1cmVSU1M6IFJvdXRlclN0YXRlU25hcHNob3QsIGN1cnJSU1M6IFJvdXRlclN0YXRlU25hcHNob3QsXG4gICAgaW5qZWN0b3I6IEVudmlyb25tZW50SW5qZWN0b3IpIHtcbiAgcmV0dXJuIGZyb20oY2hlY2tzKS5waXBlKFxuICAgICAgbWVyZ2VNYXAoXG4gICAgICAgICAgY2hlY2sgPT4gcnVuQ2FuRGVhY3RpdmF0ZShjaGVjay5jb21wb25lbnQsIGNoZWNrLnJvdXRlLCBjdXJyUlNTLCBmdXR1cmVSU1MsIGluamVjdG9yKSksXG4gICAgICBmaXJzdChyZXN1bHQgPT4ge1xuICAgICAgICByZXR1cm4gcmVzdWx0ICE9PSB0cnVlO1xuICAgICAgfSwgdHJ1ZSBhcyBib29sZWFuIHwgVXJsVHJlZSkpO1xufVxuXG5mdW5jdGlvbiBydW5DYW5BY3RpdmF0ZUNoZWNrcyhcbiAgICBmdXR1cmVTbmFwc2hvdDogUm91dGVyU3RhdGVTbmFwc2hvdCwgY2hlY2tzOiBDYW5BY3RpdmF0ZVtdLCBpbmplY3RvcjogRW52aXJvbm1lbnRJbmplY3RvcixcbiAgICBmb3J3YXJkRXZlbnQ/OiAoZXZ0OiBFdmVudCkgPT4gdm9pZCkge1xuICByZXR1cm4gZnJvbShjaGVja3MpLnBpcGUoXG4gICAgICBjb25jYXRNYXAoKGNoZWNrOiBDYW5BY3RpdmF0ZSkgPT4ge1xuICAgICAgICByZXR1cm4gY29uY2F0KFxuICAgICAgICAgICAgZmlyZUNoaWxkQWN0aXZhdGlvblN0YXJ0KGNoZWNrLnJvdXRlLnBhcmVudCwgZm9yd2FyZEV2ZW50KSxcbiAgICAgICAgICAgIGZpcmVBY3RpdmF0aW9uU3RhcnQoY2hlY2sucm91dGUsIGZvcndhcmRFdmVudCksXG4gICAgICAgICAgICBydW5DYW5BY3RpdmF0ZUNoaWxkKGZ1dHVyZVNuYXBzaG90LCBjaGVjay5wYXRoLCBpbmplY3RvciksXG4gICAgICAgICAgICBydW5DYW5BY3RpdmF0ZShmdXR1cmVTbmFwc2hvdCwgY2hlY2sucm91dGUsIGluamVjdG9yKSk7XG4gICAgICB9KSxcbiAgICAgIGZpcnN0KHJlc3VsdCA9PiB7XG4gICAgICAgIHJldHVybiByZXN1bHQgIT09IHRydWU7XG4gICAgICB9LCB0cnVlIGFzIGJvb2xlYW4gfCBVcmxUcmVlKSk7XG59XG5cbi8qKlxuICogVGhpcyBzaG91bGQgZmlyZSBvZmYgYEFjdGl2YXRpb25TdGFydGAgZXZlbnRzIGZvciBlYWNoIHJvdXRlIGJlaW5nIGFjdGl2YXRlZCBhdCB0aGlzXG4gKiBsZXZlbC5cbiAqIEluIG90aGVyIHdvcmRzLCBpZiB5b3UncmUgYWN0aXZhdGluZyBgYWAgYW5kIGBiYCBiZWxvdywgYHBhdGhgIHdpbGwgY29udGFpbiB0aGVcbiAqIGBBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90YHMgZm9yIGJvdGggYW5kIHdlIHdpbGwgZmlyZSBgQWN0aXZhdGlvblN0YXJ0YCBmb3IgYm90aC4gQWx3YXlzXG4gKiByZXR1cm5cbiAqIGB0cnVlYCBzbyBjaGVja3MgY29udGludWUgdG8gcnVuLlxuICovXG5mdW5jdGlvbiBmaXJlQWN0aXZhdGlvblN0YXJ0KFxuICAgIHNuYXBzaG90OiBBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90fG51bGwsXG4gICAgZm9yd2FyZEV2ZW50PzogKGV2dDogRXZlbnQpID0+IHZvaWQpOiBPYnNlcnZhYmxlPGJvb2xlYW4+IHtcbiAgaWYgKHNuYXBzaG90ICE9PSBudWxsICYmIGZvcndhcmRFdmVudCkge1xuICAgIGZvcndhcmRFdmVudChuZXcgQWN0aXZhdGlvblN0YXJ0KHNuYXBzaG90KSk7XG4gIH1cbiAgcmV0dXJuIG9mKHRydWUpO1xufVxuXG4vKipcbiAqIFRoaXMgc2hvdWxkIGZpcmUgb2ZmIGBDaGlsZEFjdGl2YXRpb25TdGFydGAgZXZlbnRzIGZvciBlYWNoIHJvdXRlIGJlaW5nIGFjdGl2YXRlZCBhdCB0aGlzXG4gKiBsZXZlbC5cbiAqIEluIG90aGVyIHdvcmRzLCBpZiB5b3UncmUgYWN0aXZhdGluZyBgYWAgYW5kIGBiYCBiZWxvdywgYHBhdGhgIHdpbGwgY29udGFpbiB0aGVcbiAqIGBBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90YHMgZm9yIGJvdGggYW5kIHdlIHdpbGwgZmlyZSBgQ2hpbGRBY3RpdmF0aW9uU3RhcnRgIGZvciBib3RoLiBBbHdheXNcbiAqIHJldHVyblxuICogYHRydWVgIHNvIGNoZWNrcyBjb250aW51ZSB0byBydW4uXG4gKi9cbmZ1bmN0aW9uIGZpcmVDaGlsZEFjdGl2YXRpb25TdGFydChcbiAgICBzbmFwc2hvdDogQWN0aXZhdGVkUm91dGVTbmFwc2hvdHxudWxsLFxuICAgIGZvcndhcmRFdmVudD86IChldnQ6IEV2ZW50KSA9PiB2b2lkKTogT2JzZXJ2YWJsZTxib29sZWFuPiB7XG4gIGlmIChzbmFwc2hvdCAhPT0gbnVsbCAmJiBmb3J3YXJkRXZlbnQpIHtcbiAgICBmb3J3YXJkRXZlbnQobmV3IENoaWxkQWN0aXZhdGlvblN0YXJ0KHNuYXBzaG90KSk7XG4gIH1cbiAgcmV0dXJuIG9mKHRydWUpO1xufVxuXG5mdW5jdGlvbiBydW5DYW5BY3RpdmF0ZShcbiAgICBmdXR1cmVSU1M6IFJvdXRlclN0YXRlU25hcHNob3QsIGZ1dHVyZUFSUzogQWN0aXZhdGVkUm91dGVTbmFwc2hvdCxcbiAgICBpbmplY3RvcjogRW52aXJvbm1lbnRJbmplY3Rvcik6IE9ic2VydmFibGU8Ym9vbGVhbnxVcmxUcmVlPiB7XG4gIGNvbnN0IGNhbkFjdGl2YXRlID0gZnV0dXJlQVJTLnJvdXRlQ29uZmlnID8gZnV0dXJlQVJTLnJvdXRlQ29uZmlnLmNhbkFjdGl2YXRlIDogbnVsbDtcbiAgaWYgKCFjYW5BY3RpdmF0ZSB8fCBjYW5BY3RpdmF0ZS5sZW5ndGggPT09IDApIHJldHVybiBvZih0cnVlKTtcblxuICBjb25zdCBjYW5BY3RpdmF0ZU9ic2VydmFibGVzID1cbiAgICAgIGNhbkFjdGl2YXRlLm1hcCgoY2FuQWN0aXZhdGU6IENhbkFjdGl2YXRlRm58UHJvdmlkZXJUb2tlbjx1bmtub3duPikgPT4ge1xuICAgICAgICByZXR1cm4gZGVmZXIoKCkgPT4ge1xuICAgICAgICAgIGNvbnN0IGNsb3Nlc3RJbmplY3RvciA9IGdldENsb3Nlc3RSb3V0ZUluamVjdG9yKGZ1dHVyZUFSUykgPz8gaW5qZWN0b3I7XG4gICAgICAgICAgY29uc3QgZ3VhcmQgPSBnZXRUb2tlbk9yRnVuY3Rpb25JZGVudGl0eTxDYW5BY3RpdmF0ZT4oY2FuQWN0aXZhdGUsIGNsb3Nlc3RJbmplY3Rvcik7XG4gICAgICAgICAgY29uc3QgZ3VhcmRWYWwgPSBpc0NhbkFjdGl2YXRlKGd1YXJkKSA/XG4gICAgICAgICAgICAgIGd1YXJkLmNhbkFjdGl2YXRlKGZ1dHVyZUFSUywgZnV0dXJlUlNTKSA6XG4gICAgICAgICAgICAgIGNsb3Nlc3RJbmplY3Rvci5ydW5JbkNvbnRleHQoKCkgPT4gKGd1YXJkIGFzIENhbkFjdGl2YXRlRm4pKGZ1dHVyZUFSUywgZnV0dXJlUlNTKSk7XG4gICAgICAgICAgcmV0dXJuIHdyYXBJbnRvT2JzZXJ2YWJsZShndWFyZFZhbCkucGlwZShmaXJzdCgpKTtcbiAgICAgICAgfSk7XG4gICAgICB9KTtcbiAgcmV0dXJuIG9mKGNhbkFjdGl2YXRlT2JzZXJ2YWJsZXMpLnBpcGUocHJpb3JpdGl6ZWRHdWFyZFZhbHVlKCkpO1xufVxuXG5mdW5jdGlvbiBydW5DYW5BY3RpdmF0ZUNoaWxkKFxuICAgIGZ1dHVyZVJTUzogUm91dGVyU3RhdGVTbmFwc2hvdCwgcGF0aDogQWN0aXZhdGVkUm91dGVTbmFwc2hvdFtdLFxuICAgIGluamVjdG9yOiBFbnZpcm9ubWVudEluamVjdG9yKTogT2JzZXJ2YWJsZTxib29sZWFufFVybFRyZWU+IHtcbiAgY29uc3QgZnV0dXJlQVJTID0gcGF0aFtwYXRoLmxlbmd0aCAtIDFdO1xuXG4gIGNvbnN0IGNhbkFjdGl2YXRlQ2hpbGRHdWFyZHMgPSBwYXRoLnNsaWNlKDAsIHBhdGgubGVuZ3RoIC0gMSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAucmV2ZXJzZSgpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLm1hcChwID0+IGdldENhbkFjdGl2YXRlQ2hpbGQocCkpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLmZpbHRlcihfID0+IF8gIT09IG51bGwpO1xuXG4gIGNvbnN0IGNhbkFjdGl2YXRlQ2hpbGRHdWFyZHNNYXBwZWQgPSBjYW5BY3RpdmF0ZUNoaWxkR3VhcmRzLm1hcCgoZDogYW55KSA9PiB7XG4gICAgcmV0dXJuIGRlZmVyKCgpID0+IHtcbiAgICAgIGNvbnN0IGd1YXJkc01hcHBlZCA9XG4gICAgICAgICAgZC5ndWFyZHMubWFwKChjYW5BY3RpdmF0ZUNoaWxkOiBDYW5BY3RpdmF0ZUNoaWxkRm58UHJvdmlkZXJUb2tlbjx1bmtub3duPikgPT4ge1xuICAgICAgICAgICAgY29uc3QgY2xvc2VzdEluamVjdG9yID0gZ2V0Q2xvc2VzdFJvdXRlSW5qZWN0b3IoZC5ub2RlKSA/PyBpbmplY3RvcjtcbiAgICAgICAgICAgIGNvbnN0IGd1YXJkID1cbiAgICAgICAgICAgICAgICBnZXRUb2tlbk9yRnVuY3Rpb25JZGVudGl0eTxDYW5BY3RpdmF0ZUNoaWxkPihjYW5BY3RpdmF0ZUNoaWxkLCBjbG9zZXN0SW5qZWN0b3IpO1xuICAgICAgICAgICAgY29uc3QgZ3VhcmRWYWwgPSBpc0NhbkFjdGl2YXRlQ2hpbGQoZ3VhcmQpID9cbiAgICAgICAgICAgICAgICBndWFyZC5jYW5BY3RpdmF0ZUNoaWxkKGZ1dHVyZUFSUywgZnV0dXJlUlNTKSA6XG4gICAgICAgICAgICAgICAgY2xvc2VzdEluamVjdG9yLnJ1bkluQ29udGV4dCgoKSA9PiBndWFyZChmdXR1cmVBUlMsIGZ1dHVyZVJTUykpO1xuICAgICAgICAgICAgcmV0dXJuIHdyYXBJbnRvT2JzZXJ2YWJsZShndWFyZFZhbCkucGlwZShmaXJzdCgpKTtcbiAgICAgICAgICB9KTtcbiAgICAgIHJldHVybiBvZihndWFyZHNNYXBwZWQpLnBpcGUocHJpb3JpdGl6ZWRHdWFyZFZhbHVlKCkpO1xuICAgIH0pO1xuICB9KTtcbiAgcmV0dXJuIG9mKGNhbkFjdGl2YXRlQ2hpbGRHdWFyZHNNYXBwZWQpLnBpcGUocHJpb3JpdGl6ZWRHdWFyZFZhbHVlKCkpO1xufVxuXG5mdW5jdGlvbiBydW5DYW5EZWFjdGl2YXRlKFxuICAgIGNvbXBvbmVudDogT2JqZWN0fG51bGwsIGN1cnJBUlM6IEFjdGl2YXRlZFJvdXRlU25hcHNob3QsIGN1cnJSU1M6IFJvdXRlclN0YXRlU25hcHNob3QsXG4gICAgZnV0dXJlUlNTOiBSb3V0ZXJTdGF0ZVNuYXBzaG90LCBpbmplY3RvcjogRW52aXJvbm1lbnRJbmplY3Rvcik6IE9ic2VydmFibGU8Ym9vbGVhbnxVcmxUcmVlPiB7XG4gIGNvbnN0IGNhbkRlYWN0aXZhdGUgPSBjdXJyQVJTICYmIGN1cnJBUlMucm91dGVDb25maWcgPyBjdXJyQVJTLnJvdXRlQ29uZmlnLmNhbkRlYWN0aXZhdGUgOiBudWxsO1xuICBpZiAoIWNhbkRlYWN0aXZhdGUgfHwgY2FuRGVhY3RpdmF0ZS5sZW5ndGggPT09IDApIHJldHVybiBvZih0cnVlKTtcbiAgY29uc3QgY2FuRGVhY3RpdmF0ZU9ic2VydmFibGVzID0gY2FuRGVhY3RpdmF0ZS5tYXAoKGM6IGFueSkgPT4ge1xuICAgIGNvbnN0IGNsb3Nlc3RJbmplY3RvciA9IGdldENsb3Nlc3RSb3V0ZUluamVjdG9yKGN1cnJBUlMpID8/IGluamVjdG9yO1xuICAgIGNvbnN0IGd1YXJkID0gZ2V0VG9rZW5PckZ1bmN0aW9uSWRlbnRpdHk8YW55PihjLCBjbG9zZXN0SW5qZWN0b3IpO1xuICAgIGNvbnN0IGd1YXJkVmFsID0gaXNDYW5EZWFjdGl2YXRlKGd1YXJkKSA/XG4gICAgICAgIGd1YXJkLmNhbkRlYWN0aXZhdGUoY29tcG9uZW50LCBjdXJyQVJTLCBjdXJyUlNTLCBmdXR1cmVSU1MpIDpcbiAgICAgICAgY2xvc2VzdEluamVjdG9yLnJ1bkluQ29udGV4dDxib29sZWFufFVybFRyZWU+KFxuICAgICAgICAgICAgKCkgPT4gZ3VhcmQoY29tcG9uZW50LCBjdXJyQVJTLCBjdXJyUlNTLCBmdXR1cmVSU1MpKTtcbiAgICByZXR1cm4gd3JhcEludG9PYnNlcnZhYmxlKGd1YXJkVmFsKS5waXBlKGZpcnN0KCkpO1xuICB9KTtcbiAgcmV0dXJuIG9mKGNhbkRlYWN0aXZhdGVPYnNlcnZhYmxlcykucGlwZShwcmlvcml0aXplZEd1YXJkVmFsdWUoKSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBydW5DYW5Mb2FkR3VhcmRzKFxuICAgIGluamVjdG9yOiBFbnZpcm9ubWVudEluamVjdG9yLCByb3V0ZTogUm91dGUsIHNlZ21lbnRzOiBVcmxTZWdtZW50W10sXG4gICAgdXJsU2VyaWFsaXplcjogVXJsU2VyaWFsaXplcik6IE9ic2VydmFibGU8Ym9vbGVhbj4ge1xuICBjb25zdCBjYW5Mb2FkID0gcm91dGUuY2FuTG9hZDtcbiAgaWYgKGNhbkxvYWQgPT09IHVuZGVmaW5lZCB8fCBjYW5Mb2FkLmxlbmd0aCA9PT0gMCkge1xuICAgIHJldHVybiBvZih0cnVlKTtcbiAgfVxuXG4gIGNvbnN0IGNhbkxvYWRPYnNlcnZhYmxlcyA9IGNhbkxvYWQubWFwKChpbmplY3Rpb25Ub2tlbjogYW55KSA9PiB7XG4gICAgY29uc3QgZ3VhcmQgPSBnZXRUb2tlbk9yRnVuY3Rpb25JZGVudGl0eTxhbnk+KGluamVjdGlvblRva2VuLCBpbmplY3Rvcik7XG4gICAgY29uc3QgZ3VhcmRWYWwgPSBpc0NhbkxvYWQoZ3VhcmQpID9cbiAgICAgICAgZ3VhcmQuY2FuTG9hZChyb3V0ZSwgc2VnbWVudHMpIDpcbiAgICAgICAgaW5qZWN0b3IucnVuSW5Db250ZXh0PGJvb2xlYW58VXJsVHJlZT4oKCkgPT4gZ3VhcmQocm91dGUsIHNlZ21lbnRzKSk7XG4gICAgcmV0dXJuIHdyYXBJbnRvT2JzZXJ2YWJsZShndWFyZFZhbCk7XG4gIH0pO1xuXG4gIHJldHVybiBvZihjYW5Mb2FkT2JzZXJ2YWJsZXMpXG4gICAgICAucGlwZShcbiAgICAgICAgICBwcmlvcml0aXplZEd1YXJkVmFsdWUoKSxcbiAgICAgICAgICByZWRpcmVjdElmVXJsVHJlZSh1cmxTZXJpYWxpemVyKSxcbiAgICAgICk7XG59XG5cbmZ1bmN0aW9uIHJlZGlyZWN0SWZVcmxUcmVlKHVybFNlcmlhbGl6ZXI6IFVybFNlcmlhbGl6ZXIpOlxuICAgIE9wZXJhdG9yRnVuY3Rpb248VXJsVHJlZXxib29sZWFuLCBib29sZWFuPiB7XG4gIHJldHVybiBwaXBlKFxuICAgICAgdGFwKChyZXN1bHQ6IFVybFRyZWV8Ym9vbGVhbikgPT4ge1xuICAgICAgICBpZiAoIWlzVXJsVHJlZShyZXN1bHQpKSByZXR1cm47XG5cbiAgICAgICAgdGhyb3cgcmVkaXJlY3RpbmdOYXZpZ2F0aW9uRXJyb3IodXJsU2VyaWFsaXplciwgcmVzdWx0KTtcbiAgICAgIH0pLFxuICAgICAgbWFwKHJlc3VsdCA9PiByZXN1bHQgPT09IHRydWUpLFxuICApO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gcnVuQ2FuTWF0Y2hHdWFyZHMoXG4gICAgaW5qZWN0b3I6IEVudmlyb25tZW50SW5qZWN0b3IsIHJvdXRlOiBSb3V0ZSwgc2VnbWVudHM6IFVybFNlZ21lbnRbXSxcbiAgICB1cmxTZXJpYWxpemVyOiBVcmxTZXJpYWxpemVyKTogT2JzZXJ2YWJsZTxib29sZWFuPiB7XG4gIGNvbnN0IGNhbk1hdGNoID0gcm91dGUuY2FuTWF0Y2g7XG4gIGlmICghY2FuTWF0Y2ggfHwgY2FuTWF0Y2gubGVuZ3RoID09PSAwKSByZXR1cm4gb2YodHJ1ZSk7XG5cbiAgY29uc3QgY2FuTWF0Y2hPYnNlcnZhYmxlcyA9IGNhbk1hdGNoLm1hcChpbmplY3Rpb25Ub2tlbiA9PiB7XG4gICAgY29uc3QgZ3VhcmQgPSBnZXRUb2tlbk9yRnVuY3Rpb25JZGVudGl0eShpbmplY3Rpb25Ub2tlbiwgaW5qZWN0b3IpO1xuICAgIGNvbnN0IGd1YXJkVmFsID0gaXNDYW5NYXRjaChndWFyZCkgP1xuICAgICAgICBndWFyZC5jYW5NYXRjaChyb3V0ZSwgc2VnbWVudHMpIDpcbiAgICAgICAgaW5qZWN0b3IucnVuSW5Db250ZXh0PGJvb2xlYW58VXJsVHJlZT4oKCkgPT4gZ3VhcmQocm91dGUsIHNlZ21lbnRzKSk7XG4gICAgcmV0dXJuIHdyYXBJbnRvT2JzZXJ2YWJsZShndWFyZFZhbCk7XG4gIH0pO1xuXG4gIHJldHVybiBvZihjYW5NYXRjaE9ic2VydmFibGVzKVxuICAgICAgLnBpcGUoXG4gICAgICAgICAgcHJpb3JpdGl6ZWRHdWFyZFZhbHVlKCksXG4gICAgICAgICAgcmVkaXJlY3RJZlVybFRyZWUodXJsU2VyaWFsaXplciksXG4gICAgICApO1xufVxuIl19