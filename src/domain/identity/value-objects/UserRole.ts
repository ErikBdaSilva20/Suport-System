export const USER_ROLE = ['admin', 'agent'] as const;
export type UserRole = typeof USER_ROLE[number];
