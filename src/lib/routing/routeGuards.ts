export type UserType = 'PASSENGER' | 'DRIVER' | 'ADMIN';

export interface AccessContext {
  userType: UserType;
  isAdminRecord: boolean;
}

export function getRoleHomePath(context: AccessContext): '/passenger' | '/driver' | '/admin' {
  if (context.isAdminRecord || context.userType === 'ADMIN') {
    return '/admin';
  }

  if (context.userType === 'DRIVER') {
    return '/driver';
  }

  return '/passenger';
}

export function canAccessPath(path: string, context: AccessContext): boolean {
  if (path.startsWith('/admin')) {
    return context.isAdminRecord || context.userType === 'ADMIN';
  }

  if (path.startsWith('/driver')) {
    return context.userType === 'DRIVER';
  }

  if (path.startsWith('/passenger')) {
    return context.userType === 'PASSENGER';
  }

  return true;
}
