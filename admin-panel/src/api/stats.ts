import http from './http';
import type { AdminStatsPayload } from '@/types/stats';
import type { TimeRange } from '@/types/stats';

export function fetchStats(range: TimeRange = '30d') {
  return http.get<AdminStatsPayload>('/api/stats', { params: { range } });
}
