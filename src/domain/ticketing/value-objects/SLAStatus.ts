export const SLA_STATUS = ['ok', 'warning', 'breached'] as const;
export type SLAStatus = typeof SLA_STATUS[number];
