import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ReviewInput {
  request_id: string;
  decision: "approved" | "rejected";
  reason: string;
}

interface ExecuteResult {
  success: boolean;
  message: string;
  data?: unknown;
  record_type?: string;
  record_id?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return err(401, "Missing authorization header");

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const {
      data: { user },
      error: authError,
    } = await userClient.auth.getUser();
    if (authError || !user) return err(401, "Unauthorized");

    const { data: platformUser, error: puError } = await serviceClient
      .from("platform_users")
      .select("id, platform_role, status")
      .eq("auth_user_id", user.id)
      .single();

    if (puError || !platformUser) return err(401, "Platform user not found");
    if (platformUser.platform_role !== "super_admin")
      return err(403, "Only super_admin can review action requests");
    if (platformUser.status !== "active") return err(403, "Account is not active");

    const body: ReviewInput = await req.json();
    const { request_id, decision, reason } = body;

    if (!request_id || !decision || !reason)
      return err(400, "Required: request_id, decision, reason");
    if (decision !== "approved" && decision !== "rejected")
      return err(400, "decision must be 'approved' or 'rejected'");

    // Fetch the request + its grant
    const { data: actionReq, error: reqError } = await serviceClient
      .from("support_action_requests")
      .select(
        "*, grant:support_permission_grants!grant_id(permission_key, grantee_user_id, allowed_actions)"
      )
      .eq("id", request_id)
      .single();

    if (reqError || !actionReq) return err(404, "Action request not found");
    if (actionReq.status !== "pending")
      return err(400, `Request is already ${actionReq.status}`);
    if (actionReq.requester_id === platformUser.id)
      return err(400, "Cannot review your own request");

    // Update status
    const { error: updateError } = await serviceClient
      .from("support_action_requests")
      .update({
        status: decision,
        reviewer_id: platformUser.id,
        review_reason: reason,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", request_id);

    if (updateError) return err(500, "Failed to update request status");

    // If rejected, we're done
    if (decision === "rejected") {
      return ok({ status: "rejected", message: "Request rejected" });
    }

    // If approved, execute the action
    const grant = actionReq.grant as {
      permission_key: string;
      grantee_user_id: string;
      allowed_actions: string[];
    };

    const result = await executeAction(serviceClient, {
      permission_key: grant.permission_key,
      tenant_id: actionReq.tenant_id,
      action: actionReq.requested_action,
      payload: actionReq.payload ?? {},
      actor_id: grant.grantee_user_id,
    });

    // Mark executed
    await serviceClient
      .from("support_action_requests")
      .update({ executed_at: new Date().toISOString() })
      .eq("id", request_id);

    // Audit log
    await serviceClient.from("privileged_operation_log").insert({
      actor_id: grant.grantee_user_id,
      actor_role: "support_ops",
      operation: `${grant.permission_key}:${actionReq.requested_action}`,
      tenant_id: actionReq.tenant_id,
      record_type: result.record_type ?? null,
      record_id: result.record_id ?? null,
      reason: `Approved by super_admin: ${reason}`,
      details: {
        request_id,
        approved_by: platformUser.id,
        payload: actionReq.payload,
        result: result.data,
        execution_success: result.success,
      },
    });

    if (!result.success) {
      return ok({
        status: "approved",
        execution: "failed",
        message: result.message,
      });
    }

    return ok({
      status: "approved",
      execution: "success",
      message: result.message,
      data: result.data,
    });
  } catch (e) {
    console.error(e);
    return err(500, "Internal server error");
  }
});

// ---------------------------------------------------------------------------
// Action router — mirrors support-action/index.ts executeAction
// ---------------------------------------------------------------------------

async function executeAction(
  client: ReturnType<typeof createClient>,
  ctx: {
    permission_key: string;
    tenant_id: string;
    action: string;
    payload?: Record<string, unknown>;
    actor_id: string;
  }
): Promise<ExecuteResult> {
  const { permission_key, tenant_id, action, payload, actor_id } = ctx;

  switch (permission_key) {
    case "module.entitlement.change": {
      const module_id = payload?.module_id as string | undefined;
      if (!module_id) return fail("payload.module_id required");

      const statusMap: Record<string, string> = {
        enable: "active",
        disable: "disabled",
        suspend: "suspended",
      };
      const newStatus = statusMap[action];
      if (!newStatus) return fail(`Unknown action '${action}'`);

      const { data, error } = await client
        .from("tenant_entitlements")
        .update({
          status: newStatus,
          change_reason: `support_ops: ${action}`,
          approved_by: actor_id,
        })
        .eq("tenant_id", tenant_id)
        .eq("module_id", module_id)
        .select("id, status")
        .single();

      if (error) return fail(error.message);
      return pass("Entitlement updated", data, "tenant_entitlements", data.id);
    }

    case "tenant.config.read": {
      const { data, error } = await client
        .from("tenants")
        .select("id, name, slug, status, subscription_tier, primary_industry_id")
        .eq("id", tenant_id)
        .single();

      if (error) return fail(error.message);
      return pass("Tenant config read", data, "tenants", tenant_id);
    }

    case "tenant.config.update": {
      const allowed = ["name", "status", "subscription_tier"];
      const update: Record<string, unknown> = {};
      for (const key of allowed) {
        if (payload?.[key] !== undefined) update[key] = payload[key];
      }
      if (Object.keys(update).length === 0)
        return fail("No updatable fields in payload");

      const { data, error } = await client
        .from("tenants")
        .update(update)
        .eq("id", tenant_id)
        .select("id, name, status")
        .single();

      if (error) return fail(error.message);
      return pass("Tenant config updated", data, "tenants", tenant_id);
    }

    case "platform.user.manage": {
      const user_id = payload?.user_id as string | undefined;
      if (!user_id) return fail("payload.user_id required");

      const statusMap: Record<string, string> = {
        suspend: "suspended",
        activate: "active",
        deactivate: "deactivated",
      };
      const newStatus = statusMap[action];
      if (!newStatus) return fail(`Unknown action '${action}'`);

      const { data, error } = await client
        .from("platform_users")
        .update({ status: newStatus })
        .eq("id", user_id)
        .select("id, status")
        .single();

      if (error) return fail(error.message);
      return pass("User status updated", data, "platform_users", user_id);
    }

    case "tenant.branding.update": {
      const allowed = [
        "business_name",
        "logo_url",
        "primary_color",
        "secondary_color",
        "accent_color",
        "support_email",
      ];
      const update: Record<string, unknown> = { updated_by: actor_id };
      for (const key of allowed) {
        if (payload?.[key] !== undefined) update[key] = payload[key];
      }
      if (Object.keys(update).length === 1)
        return fail("No updatable fields in payload");

      const { data, error } = await client
        .from("tenant_branding")
        .update(update)
        .eq("tenant_id", tenant_id)
        .select("id")
        .single();

      if (error) return fail(error.message);
      return pass("Branding updated", data, "tenant_branding", tenant_id);
    }

    case "tenant.membership.manage": {
      const membership_id = payload?.membership_id as string | undefined;
      if (!membership_id) return fail("payload.membership_id required");

      const statusMap: Record<string, string> = {
        suspend: "suspended",
        activate: "active",
        remove: "removed",
      };
      const newStatus = statusMap[action];
      if (!newStatus) return fail(`Unknown action '${action}'`);

      const { data, error } = await client
        .from("tenant_memberships")
        .update({ status: newStatus })
        .eq("id", membership_id)
        .eq("tenant_id", tenant_id)
        .select("id, status")
        .single();

      if (error) return fail(error.message);
      return pass("Membership updated", data, "tenant_memberships", membership_id);
    }

    default:
      return fail(`Unsupported permission_key: ${permission_key}`);
  }
}

function pass(
  message: string,
  data: unknown,
  record_type: string,
  record_id: string
): ExecuteResult {
  return { success: true, message, data, record_type, record_id };
}

function fail(message: string): ExecuteResult {
  return { success: false, message };
}

function ok(data: unknown) {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function err(status: number, message: string) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
