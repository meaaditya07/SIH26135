"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { getStoredRole, homeForRole, type UserRole } from "@/lib/auth";

/**
 * Guards a page by (optional) role.
 * - If the user is not signed in at all, redirects to /auth.
 * - If a `role` is required and the user's role doesn't match, redirects to their own home.
 */
export function useRequireAuth(requiredRole?: UserRole | UserRole[]) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const role = getStoredRole();
    if (!role) {
      router.replace(`/auth?next=${encodeURIComponent(pathname ?? "/")}`);
      return;
    }
    if (requiredRole) {
      const allowed = Array.isArray(requiredRole)
        ? requiredRole
        : [requiredRole];
      if (!allowed.includes(role)) {
        router.replace(homeForRole(role));
      }
    }
  }, [router, pathname, requiredRole]);
}