declare global {
  namespace Express {
    interface User {
      id: number;
      email: string;
      name: string;
      role: string;
      avatarUrl?: string | null;
      username?: string;
      orgId?: number;
    }
    interface Request {
      /** Current user's org id, resolved once per request by the orgContext
       *  middleware in app.ts. Undefined for unauthenticated/public requests —
       *  those routes must resolve their own org (e.g. getDefaultOrgId()). */
      orgId?: number;
    }
  }
}

export {};
