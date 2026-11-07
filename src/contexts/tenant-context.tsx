import { createContext, useContext } from "react";

export interface TenantContextValue {
  tenantId: string;
  slug: string;
}

const TenantCtx = createContext<TenantContextValue | null>(null);

export const TenantContextProvider = TenantCtx.Provider;

export function useTenantContext(): TenantContextValue {
  const ctx = useContext(TenantCtx);
  if (!ctx) throw new Error("useTenantContext must be used inside TenantShell");
  return ctx;
}
