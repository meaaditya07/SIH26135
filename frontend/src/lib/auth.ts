import api from "@/lib/api";

export const TOKEN_KEY = "st_token";
export const ROLE_KEY = "st_role";
export const USER_KEY = "st_user";

export type UserRole = "candidate" | "training_partner" | "employer" | "gov_admin";

export interface SessionUser {
  id: string;
  phone: string;
  full_name: string;
  role: UserRole;
  is_verified: boolean;
}

/** Where each role should land after login. */
export const ROLE_HOME: Record<UserRole, string> = {
  gov_admin: "/gov",
  candidate: "/candidate",
  employer: "/employer",
  training_partner: "/partner",
};

export const ROLE_LABEL: Record<UserRole, string> = {
  gov_admin: "Government Admin",
  candidate: "Candidate",
  employer: "Employer",
  training_partner: "Training Partner",
};

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredRole(): UserRole | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ROLE_KEY) as UserRole | null;
}

export function getStoredUser(): SessionUser | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SessionUser;
  } catch {
    return null;
  }
}

export function isAuthed(): boolean {
  return Boolean(getToken());
}

export async function login(phone: string, password: string): Promise<SessionUser> {
  const res = await api.post<{ access_token: string; user_id: string; role: string }>(
    "/auth/login/password",
    { phone, password }
  );
  const { access_token, user_id, role } = res.data;

  localStorage.setItem(TOKEN_KEY, access_token);

  const userRole = (role as UserRole) || "candidate";

  // Try to enrich the session via /auth/me, but degrade gracefully if the
  // endpoint is unavailable — the login response already carriers role + id.
  let user: SessionUser = {
    id: user_id ?? phone,
    phone,
    full_name: ROLE_LABEL[userRole] ?? "Member",
    role: userRole,
    is_verified: false,
  };
  try {
    const me = await api.get<{ id: string; phone: string; full_name: string; role: string }>(
      "/auth/me"
    );
    user = {
      id: me.data.id ?? user.id,
      phone: me.data.phone ?? phone,
      full_name: me.data.full_name || ROLE_LABEL[userRole],
      role: (me.data.role as UserRole) || userRole,
      is_verified: false,
    };
  } catch {
    // ignore — keep the session built from the login response
  }

  localStorage.setItem(ROLE_KEY, user.role);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  return user;
}

export function logout() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(ROLE_KEY);
  localStorage.removeItem(USER_KEY);
}

export function homeForRole(role: UserRole): string {
  return ROLE_HOME[role] ?? "/";
}

/** Demonstrate each demo account on the login screen. */
export const DEMO_ACCOUNTS: { label: string; phone: string; password: string; role: UserRole }[] = [
  { label: "Government Admin", phone: "9000000000", password: "admin123", role: "gov_admin" },
  { label: "Candidate", phone: "9876543210", password: "password123", role: "candidate" },
  { label: "Training Partner", phone: "9800000001", password: "password123", role: "training_partner" },
  { label: "Employer", phone: "9900000001", password: "password123", role: "employer" },
];