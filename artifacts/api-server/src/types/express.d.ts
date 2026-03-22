declare global {
  namespace Express {
    interface User {
      id: number;
      email: string;
      name: string;
      role: string;
      avatarUrl?: string | null;
    }
  }
}

export {};
