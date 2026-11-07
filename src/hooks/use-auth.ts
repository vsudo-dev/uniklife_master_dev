import { useEffect } from "react";
import { create } from "zustand";
import { supabase } from "@/lib/supabase";
import type {
  PlatformUser,
  TenantMembership,
  TenantRole,
  AuthState,
} from "@/types";

export interface ViewMode {
  tenantId: string;
  slug: string;
  tenantName: string;
  role: TenantRole;
  contactId?: string; // set when viewing as a specific customer
  returnPath?: string; // path to restore on exit
}

interface AuthStore extends AuthState {
  _tenantSlugs: Record<string, string>;
  _savedContext: { activeTenantId: string | null; activeTenantSlug: string | null; activeRole: TenantRole | null } | null;
  viewMode: ViewMode | null;
  setUser: (user: PlatformUser | null) => void;
  setMembershipsWithSlugs: (memberships: TenantMembership[], slugMap: Record<string, string>) => void;
  setActiveTenant: (tenantId: string | null) => void;
  setLoading: (loading: boolean) => void;
  signOut: () => Promise<void>;
  enterViewMode: (params: ViewMode) => void;
  exitViewMode: () => void;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  memberships: [],
  activeTenantId: null,
  activeTenantSlug: null,
  activeRole: null,
  isLoading: true,
  isAuthenticated: false,
  _tenantSlugs: {},
  _savedContext: null,
  viewMode: null,

  setUser: (user) =>
    set({
      user,
      isAuthenticated: user !== null,
    }),

  setMembershipsWithSlugs: (memberships, slugMap) => {
    const { activeTenantId } = get();
    const activeMembership = memberships.find(
      (m) => m.tenant_id === activeTenantId && m.status === "active"
    );
    set({
      memberships,
      _tenantSlugs: slugMap,
      activeRole: (activeMembership?.role as TenantRole) ?? null,
      activeTenantSlug: activeTenantId ? (slugMap[activeTenantId] ?? null) : null,
    });
  },

  setActiveTenant: (tenantId) => {
    const { memberships, _tenantSlugs } = get();
    const membership = memberships.find(
      (m) => m.tenant_id === tenantId && m.status === "active"
    );
    set({
      activeTenantId: tenantId,
      activeTenantSlug: tenantId ? (_tenantSlugs[tenantId] ?? null) : null,
      activeRole: (membership?.role as TenantRole) ?? null,
    });
  },

  setLoading: (isLoading) => set({ isLoading }),

  signOut: async () => {
    await supabase.auth.signOut();
    set({
      user: null,
      memberships: [],
      activeTenantId: null,
      activeTenantSlug: null,
      activeRole: null,
      isAuthenticated: false,
      _tenantSlugs: {},
      viewMode: null,
      _savedContext: null,
    });
  },

  enterViewMode: ({ tenantId, slug, tenantName, role, contactId, returnPath }) => {
    const { activeTenantId, activeTenantSlug, activeRole } = get();
    set({
      _savedContext: { activeTenantId, activeTenantSlug, activeRole },
      viewMode: { tenantId, slug, tenantName, role, contactId, returnPath },
      activeTenantId: tenantId,
      activeTenantSlug: slug,
      activeRole: role,
    });
  },

  exitViewMode: () => {
    const { _savedContext } = get();
    set({
      viewMode: null,
      _savedContext: null,
      activeTenantId: _savedContext?.activeTenantId ?? null,
      activeTenantSlug: _savedContext?.activeTenantSlug ?? null,
      activeRole: _savedContext?.activeRole ?? null,
    });
  },
}));

async function fetchPlatformUser(
  authUserId: string
): Promise<PlatformUser | null> {
  const { data, error } = await supabase
    .from("platform_users")
    .select("*")
    .eq("auth_user_id", authUserId)
    .single();

  if (error || !data) return null;
  return data as PlatformUser;
}

async function fetchMemberships(
  userId: string
): Promise<{ memberships: TenantMembership[]; slugMap: Record<string, string> }> {
  const { data, error } = await supabase
    .from("tenant_memberships")
    .select("id, tenant_id, user_id, role, status, invited_by, joined_at, created_at, updated_at, tenants(slug)")
    .eq("user_id", userId)
    .eq("status", "active");

  if (error || !data) return { memberships: [], slugMap: {} };

  const slugMap: Record<string, string> = {};
  const memberships = data.map((row) => {
    const { tenants, ...m } = row as Record<string, unknown>;
    const t = tenants as { slug?: string } | null;
    if (t?.slug) slugMap[m.tenant_id as string] = t.slug;
    return m as unknown as TenantMembership;
  });

  return { memberships, slugMap };
}

export const useAuth = useAuthStore;

export function useAuthListener() {
  const { setUser, setMembershipsWithSlugs, setActiveTenant, setLoading } =
    useAuthStore();

  useEffect(() => {
    let mounted = true;

    async function loadSession() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.user || !mounted) {
          setUser(null);
          setMembershipsWithSlugs([], {});
          setLoading(false);
          return;
        }

        const platformUser = await fetchPlatformUser(session.user.id);
        if (!mounted) return;

        setUser(platformUser);

        if (platformUser) {
          let { memberships, slugMap } = await fetchMemberships(platformUser.id);
          if (!mounted) return;

          // Auto-link customer accounts: attempt on every tenant_user login (RPC is idempotent)
          if (platformUser.platform_role === "tenant_user") {
            const { data } = await supabase.rpc("link_customer_account");
            if (data?.ok && mounted && memberships.length === 0) {
              const result = await fetchMemberships(platformUser.id);
              memberships = result.memberships;
              slugMap = result.slugMap;
            }
          }

          setMembershipsWithSlugs(memberships, slugMap);

          if (memberships.length === 1) {
            setActiveTenant(memberships[0]!.tenant_id);
          }
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      if (event === "SIGNED_OUT" || !session?.user) {
        setUser(null);
        setMembershipsWithSlugs([], {});
        setActiveTenant(null);
        return;
      }

      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        const platformUser = await fetchPlatformUser(session.user.id);
        if (!mounted) return;
        setUser(platformUser);

        if (platformUser) {
          let { memberships, slugMap } = await fetchMemberships(platformUser.id);
          if (!mounted) return;

          // Auto-link customer accounts: attempt on every tenant_user login (RPC is idempotent)
          if (platformUser.platform_role === "tenant_user") {
            const { data } = await supabase.rpc("link_customer_account");
            if (data?.ok && mounted && memberships.length === 0) {
              const result = await fetchMemberships(platformUser.id);
              memberships = result.memberships;
              slugMap = result.slugMap;
            }
          }

          setMembershipsWithSlugs(memberships, slugMap);

          if (memberships.length === 1) {
            setActiveTenant(memberships[0]!.tenant_id);
          }
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [setUser, setMembershipsWithSlugs, setActiveTenant, setLoading]);
}
