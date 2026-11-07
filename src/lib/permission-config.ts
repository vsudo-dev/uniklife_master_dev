export interface ActionDef {
  value: string;
  label: string;
}

export interface PermissionDef {
  label: string;
  actions: ActionDef[];
}

export const PERMISSIONS: Record<string, PermissionDef> = {
  "module.entitlement.change": {
    label: "Module Entitlements",
    actions: [
      { value: "enable", label: "Enable module" },
      { value: "disable", label: "Disable module" },
      { value: "suspend", label: "Suspend module" },
    ],
  },
  "tenant.config.read": {
    label: "Tenant Config — Read",
    actions: [{ value: "read", label: "Read config" }],
  },
  "tenant.config.update": {
    label: "Tenant Config — Update",
    actions: [{ value: "update", label: "Update config" }],
  },
  "platform.user.manage": {
    label: "Platform User Management",
    actions: [
      { value: "suspend", label: "Suspend user" },
      { value: "activate", label: "Activate user" },
      { value: "deactivate", label: "Deactivate user" },
    ],
  },
  "tenant.branding.update": {
    label: "Tenant Branding",
    actions: [{ value: "update", label: "Update branding" }],
  },
  "tenant.membership.manage": {
    label: "Membership Management",
    actions: [
      { value: "suspend", label: "Suspend member" },
      { value: "activate", label: "Activate member" },
      { value: "remove", label: "Remove member" },
    ],
  },
  "tenant.membership": {
    label: "Membership Management (legacy)",
    actions: [
      { value: "suspend", label: "Suspend member" },
      { value: "activate", label: "Activate member" },
      { value: "remove", label: "Remove member" },
    ],
  },
};

const LEGACY_KEYS = new Set(["tenant.membership"]);

export const PERMISSION_KEYS = Object.keys(PERMISSIONS).filter((k) => !LEGACY_KEYS.has(k));

export function getActionsForPermission(permissionKey: string): ActionDef[] {
  return PERMISSIONS[permissionKey]?.actions ?? [];
}
