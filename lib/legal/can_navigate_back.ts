import { APP_VISITED_STORAGE_KEY } from '../../components/shared/AppVisitedMarker';

/** Whether legal close should router.back() vs push('/'). */
export function canNavigateBack(): boolean {
  if (typeof window === 'undefined') return false;
  if (window.history.length <= 1) return false;
  return sessionStorage.getItem(APP_VISITED_STORAGE_KEY) === '1';
}
