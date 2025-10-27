export const USER_ROLE = {
  TECHNICIAN: 'technician',
  ADMIN: 'admin',
  SUPERADMIN: 'superAdmin',
} as const;

export const gender = ['Male', 'Female', 'Others'] as const;
export const Role = Object.values(USER_ROLE);

export type UserRole = (typeof USER_ROLE)[keyof typeof USER_ROLE];