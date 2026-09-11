/**
 * Shape aligned with GET /api/stats (mongodb-api).
 * Mock-first UI; wire this type to the real response later.
 */
export type TimeRange = '7d' | '30d';

export interface StatsTotals {
  totalMessages: number;
  totalUsers: number;
  totalConversations: number;
  totalAgents: number;
  totalFiles: number;
  totalMCPServers: number;
  totalRoles: number;
}

export interface DayCount {
  _id: string;
  count: number;
}

export interface DayActiveUsers {
  _id: string;
  activeUsers: number;
}

export interface LabeledCount {
  _id: string | null;
  count: number;
}

export interface TokenTypeTotal {
  _id: string | null;
  total: number;
}

export interface TopUserTokens {
  _id: string;
  totalTokens: number;
  name?: string;
  email?: string;
}

export interface AdminStatsPayload {
  totals: StatsTotals;
  messagesLast7Days: number;
  newUsersLast30Days: number;
  messagesByDay: DayCount[];
  activeUsersByDay: DayActiveUsers[];
  messagesByModel: LabeledCount[];
  messagesByEndpoint: LabeledCount[];
  tokensByType: TokenTypeTotal[];
  topUsersByTokens: TopUserTokens[];
}

export function createMockStats(): AdminStatsPayload {
  const days = 30;
  const messagesByDay: DayCount[] = [];
  const activeUsersByDay: DayActiveUsers[] = [];

  for (let i = days - 1; i >= 0; i -= 1) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const id = date.toISOString().slice(0, 10);
    messagesByDay.push({
      _id: id,
      count: Math.floor(40 + Math.sin(i / 3) * 25 + (i % 5) * 8),
    });
    activeUsersByDay.push({
      _id: id,
      activeUsers: Math.floor(2 + Math.cos(i / 4) * 2 + (i % 3)),
    });
  }

  return {
    totals: {
      totalMessages: 1842,
      totalUsers: 5,
      totalConversations: 126,
      totalAgents: 15,
      totalFiles: 0,
      totalMCPServers: 8,
      totalRoles: 3,
    },
    messagesLast7Days: 312,
    newUsersLast30Days: 5,
    messagesByDay,
    activeUsersByDay,
    messagesByModel: [
      { _id: 'gemini-3-flash-preview', count: 620 },
      { _id: 'gpt-4o', count: 410 },
      { _id: 'claude-3.5-sonnet', count: 280 },
      { _id: 'gemini-2.5-flash', count: 190 },
      { _id: 'agent_custom', count: 120 },
    ],
    messagesByEndpoint: [
      { _id: 'agents', count: 980 },
      { _id: 'openAI', count: 410 },
      { _id: 'google', count: 320 },
      { _id: 'anthropic', count: 132 },
    ],
    tokensByType: [
      { _id: 'prompt', total: 1_250_000 },
      { _id: 'completion', total: 840_000 },
    ],
    topUsersByTokens: [
      {
        _id: '1',
        totalTokens: 420000,
        name: 'ANDRES EDUARDO GONZALEZ',
        email: 'agonzalez@mobo.com.mx',
      },
      {
        _id: '2',
        totalTokens: 310000,
        name: 'JESUS MANUEL MARQUEZ',
        email: 'manumarquez@mobo.com.mx',
      },
      {
        _id: '3',
        totalTokens: 185000,
        name: 'Carlos Ortiz',
        email: 'cortiz@mobo.com.mx',
      },
      {
        _id: '4',
        totalTokens: 92000,
        name: 'ENRIQUE RIOS',
        email: 'erios@mobo.com.mx',
      },
      {
        _id: '5',
        totalTokens: 41000,
        name: 'Josue',
        email: 'jhgutierrez@mobo.mx',
      },
    ],
  };
}
