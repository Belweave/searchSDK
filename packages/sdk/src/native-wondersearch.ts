/** Official public contracts reviewed 2026-10-22. See docs/provider-surfaces-b.md. */
import { createNativeTransport } from "./native-transport.js";
import type { NativeOperation, NativeRequestInput, NativeTransportConfig, NativeSSEEvent } from "./native-transport.js";
import { adapterOptions } from "./http.js";
import { exactFields } from "./validation.js";
import { SearchError } from "./errors.js";
export type WonderSearchClientOptions = Omit<NativeTransportConfig, "provider" | "baseUrl" | "headers"> & { apiKey: string };
export namespace WonderSearchSchemas {
}

export type WonderSearchSearchDrivePath = { "drive_id": string; };
export type WonderSearchSearchDriveHeaders = { "Idempotency-Key": string; };
export type WonderSearchSearchDriveBody = {
  "query": string;
  "effort"?: "small" | "medium" | "large";
  "folder_id"?: (string | null);
  "allow_degraded"?: boolean;
  "group_by_document"?: boolean;
  "timeout_ms"?: number;
  [key: string]: unknown;
};
export type WonderSearchSearchDriveInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { path: WonderSearchSearchDrivePath; headers: WonderSearchSearchDriveHeaders; body: WonderSearchSearchDriveBody; };
export type WonderSearchSearchDriveResponse = {
  "request_id": string;
  "drive_id": string;
  "model"?: string;
  "effort_requested"?: "small" | "medium" | "large";
  "effort_served"?: "small" | "medium" | "large";
  "results": ReadonlyArray<{
    "document_id": string;
    "external_id": string;
    "document_revision": string;
    "passage_id": string;
    "row_id": string;
    "text": string;
    "start_byte": number;
    "end_byte": number;
    "metadata": Record<string, unknown>;
    "score": number;
    [key: string]: unknown;
  }>;
  "usage": {
    "cost": {
      "amount": string;
      "currency": "USD";
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };
  "warnings": ReadonlyArray<string>;
  [key: string]: unknown;
};
export type WonderSearchGetPassagePath = { "drive_id": string; "passage_id": string; };
export type WonderSearchGetPassageQuery = { "index_snapshot_id": string; };
export type WonderSearchGetPassageInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { path: WonderSearchGetPassagePath; query: WonderSearchGetPassageQuery; };
export type WonderSearchGetPassageResponse = {
  "document_id": string;
  "external_id": string;
  "document_revision": string;
  "passage_id": string;
  "row_id": string;
  "text": string;
  "start_byte": number;
  "end_byte": number;
  "metadata": Record<string, unknown>;
  "score": number;
  "index_snapshot_id": string;
  [key: string]: unknown;
};
export type WonderSearchGetCapabilitiesPath = { "workspace_id": string; };
export type WonderSearchGetCapabilitiesInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { path: WonderSearchGetCapabilitiesPath; };
export type WonderSearchGetCapabilitiesResponse = {
  "search_enabled": boolean;
  "models": ReadonlyArray<string>;
  "default_model": string;
  "enabled_efforts": ReadonlyArray<"small" | "medium" | "large">;
  "effort_config": {
    "small": {
      "timeout_ms": number;
      [key: string]: unknown;
    };
    "medium": {
      "timeout_ms": number;
      [key: string]: unknown;
    };
    "large": {
      "timeout_ms": number;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };
  [key: string]: unknown;
};
export type WonderSearchSearchWorkspacePath = { "workspace_id": string; };
export type WonderSearchSearchWorkspaceHeaders = { "Idempotency-Key": string; };
export type WonderSearchSearchWorkspaceBody = {
  "query": string;
  "effort"?: "small" | "medium" | "large";
  "folder_id"?: (string | null);
  "allow_degraded"?: boolean;
  "group_by_document"?: boolean;
  "timeout_ms"?: number;
  [key: string]: unknown;
};
export type WonderSearchSearchWorkspaceInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { path: WonderSearchSearchWorkspacePath; headers: WonderSearchSearchWorkspaceHeaders; body: WonderSearchSearchWorkspaceBody; };
export type WonderSearchSearchWorkspaceResponse = {
  "request_id": string;
  "drive_id": string;
  "model"?: string;
  "effort_requested"?: "small" | "medium" | "large";
  "effort_served"?: "small" | "medium" | "large";
  "results": ReadonlyArray<{
    "document_id": string;
    "external_id": string;
    "document_revision": string;
    "passage_id": string;
    "row_id": string;
    "text": string;
    "start_byte": number;
    "end_byte": number;
    "metadata": Record<string, unknown>;
    "score": number;
    [key: string]: unknown;
  }>;
  "usage": {
    "cost": {
      "amount": string;
      "currency": "USD";
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };
  "warnings": ReadonlyArray<string>;
  [key: string]: unknown;
};
export type WonderSearchBootstrapAccountHeaders = { "Idempotency-Key": string; };
export type WonderSearchBootstrapAccountInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { headers: WonderSearchBootstrapAccountHeaders; };
export type WonderSearchBootstrapAccountResponse = {
  "provisioned": true;
  "organization_id": (string | null);
  "workspace_id": (string | null);
  [key: string]: unknown;
};
export type WonderSearchGetMeInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & {  };
export type WonderSearchGetMeResponse = {
  "user_id": string;
  "email": string;
  "status": "active" | "disabled" | "unprovisioned";
  "provisioned": boolean;
  "compatibility": {
    "cli": {
      "api_major": number;
      "minimum_cli_version": string;
      "latest_stable_cli_version": (string | null);
      "notices": ReadonlyArray<{
        "id": string;
        "severity": "upgrade" | "deprecation";
        "message": string;
        "effective_date"?: string;
        "documentation_url"?: string;
        [key: string]: unknown;
      }>;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };
  [key: string]: unknown;
};
export type WonderSearchListOrganizationsQuery = { "limit"?: number; "cursor"?: string; };
export type WonderSearchListOrganizationsInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { query?: WonderSearchListOrganizationsQuery; };
export type WonderSearchListOrganizationsResponse = {
  "data": ReadonlyArray<{
    "id"?: string;
    "version"?: string;
    "created_at"?: string;
    "updated_at"?: string;
    "name"?: string;
    "status"?: "active";
    "tier"?: "free" | "paid" | "credit_only";
    "search_limits"?: "free" | "paid" | "unlimited";
    "free_storage_policy_id"?: string;
    "created_by"?: string;
    "bootstrap_user_id"?: (string | null);
    "role"?: "owner" | "admin" | "member";
    "etag"?: string;
    [key: string]: unknown;
  }>;
  "next_cursor": (string | null);
  [key: string]: unknown;
};
export type WonderSearchGetOrganizationPath = { "organization_id": string; };
export type WonderSearchGetOrganizationInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { path: WonderSearchGetOrganizationPath; };
export type WonderSearchGetOrganizationResponse = {
  "id"?: string;
  "version"?: string;
  "created_at"?: string;
  "updated_at"?: string;
  "name"?: string;
  "status"?: "active";
  "tier"?: "free" | "paid" | "credit_only";
  "search_limits"?: "free" | "paid" | "unlimited";
  "free_storage_policy_id"?: string;
  "created_by"?: string;
  "bootstrap_user_id"?: (string | null);
  "role"?: "owner" | "admin" | "member";
  [key: string]: unknown;
};
export type WonderSearchGetOrganizationRawPath = { "organization_id": string; };
export type WonderSearchGetOrganizationRawInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { path: WonderSearchGetOrganizationRawPath; };
export type WonderSearchGetOrganizationRawResponse = Response;
export type WonderSearchUpdateOrganizationPath = { "organization_id": string; };
export type WonderSearchUpdateOrganizationHeaders = { "If-Match": string; };
export type WonderSearchUpdateOrganizationBody = {
  "name": string;
  [key: string]: unknown;
};
export type WonderSearchUpdateOrganizationInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { path: WonderSearchUpdateOrganizationPath; headers: WonderSearchUpdateOrganizationHeaders; body: WonderSearchUpdateOrganizationBody; };
export type WonderSearchUpdateOrganizationResponse = {
  "id"?: string;
  "version"?: string;
  "created_at"?: string;
  "updated_at"?: string;
  "name"?: string;
  "status"?: "active";
  "tier"?: "free" | "paid" | "credit_only";
  "search_limits"?: "free" | "paid" | "unlimited";
  "free_storage_policy_id"?: string;
  "created_by"?: string;
  "bootstrap_user_id"?: (string | null);
  "role"?: "owner" | "admin" | "member";
  [key: string]: unknown;
};
export type WonderSearchListOrganizationMembersPath = { "organization_id": string; };
export type WonderSearchListOrganizationMembersQuery = { "limit"?: number; "cursor"?: string; };
export type WonderSearchListOrganizationMembersInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { path: WonderSearchListOrganizationMembersPath; query?: WonderSearchListOrganizationMembersQuery; };
export type WonderSearchListOrganizationMembersResponse = {
  "data": ReadonlyArray<{
    "user_id"?: string;
    "display_name"?: (string | null);
    "email"?: (string | null);
    "role"?: "owner" | "admin" | "member";
    "version"?: string;
    "created_at"?: string;
    "etag"?: string;
    [key: string]: unknown;
  }>;
  "next_cursor": (string | null);
  [key: string]: unknown;
};
export type WonderSearchUpdateOrganizationMemberPath = { "organization_id": string; "user_id": string; };
export type WonderSearchUpdateOrganizationMemberHeaders = { "If-Match": string; };
export type WonderSearchUpdateOrganizationMemberBody = {
  "role": "owner" | "admin" | "member";
  [key: string]: unknown;
};
export type WonderSearchUpdateOrganizationMemberInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { path: WonderSearchUpdateOrganizationMemberPath; headers: WonderSearchUpdateOrganizationMemberHeaders; body: WonderSearchUpdateOrganizationMemberBody; };
export type WonderSearchUpdateOrganizationMemberResponse = {
  "user_id"?: string;
  "role"?: "owner" | "admin" | "member";
  "version"?: string;
  "created_at"?: string;
  [key: string]: unknown;
};
export type WonderSearchDeleteOrganizationMemberPath = { "organization_id": string; "user_id": string; };
export type WonderSearchDeleteOrganizationMemberHeaders = { "If-Match": string; };
export type WonderSearchDeleteOrganizationMemberInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { path: WonderSearchDeleteOrganizationMemberPath; headers: WonderSearchDeleteOrganizationMemberHeaders; };
export type WonderSearchDeleteOrganizationMemberResponse = Record<string, unknown>;
export type WonderSearchListOrganizationWorkspacesPath = { "organization_id": string; };
export type WonderSearchListOrganizationWorkspacesQuery = { "limit"?: number; "cursor"?: string; };
export type WonderSearchListOrganizationWorkspacesInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { path: WonderSearchListOrganizationWorkspacesPath; query?: WonderSearchListOrganizationWorkspacesQuery; };
export type WonderSearchListOrganizationWorkspacesResponse = {
  "data": ReadonlyArray<{
    "id"?: string;
    "version"?: string;
    "created_at"?: string;
    "updated_at"?: string;
    "organization_id"?: string;
    "name"?: string;
    "role"?: "admin" | "editor" | "viewer";
    "etag"?: string;
    [key: string]: unknown;
  }>;
  "next_cursor": (string | null);
  [key: string]: unknown;
};
export type WonderSearchCreateOrganizationWorkspacePath = { "organization_id": string; };
export type WonderSearchCreateOrganizationWorkspaceHeaders = { "Idempotency-Key": string; };
export type WonderSearchCreateOrganizationWorkspaceBody = {
  "name": string;
  [key: string]: unknown;
};
export type WonderSearchCreateOrganizationWorkspaceInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { path: WonderSearchCreateOrganizationWorkspacePath; headers: WonderSearchCreateOrganizationWorkspaceHeaders; body: WonderSearchCreateOrganizationWorkspaceBody; };
export type WonderSearchCreateOrganizationWorkspaceResponse = {
  "id"?: string;
  "version"?: string;
  "created_at"?: string;
  "updated_at"?: string;
  "organization_id"?: string;
  "name"?: string;
  "role"?: "admin" | "editor" | "viewer";
  [key: string]: unknown;
};
export type WonderSearchGetWorkspacePath = { "workspace_id": string; };
export type WonderSearchGetWorkspaceInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { path: WonderSearchGetWorkspacePath; };
export type WonderSearchGetWorkspaceResponse = {
  "id"?: string;
  "version"?: string;
  "created_at"?: string;
  "updated_at"?: string;
  "organization_id"?: string;
  "name"?: string;
  "role"?: "admin" | "editor" | "viewer";
  [key: string]: unknown;
};
export type WonderSearchGetWorkspaceRawPath = { "workspace_id": string; };
export type WonderSearchGetWorkspaceRawInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { path: WonderSearchGetWorkspaceRawPath; };
export type WonderSearchGetWorkspaceRawResponse = Response;
export type WonderSearchUpdateWorkspacePath = { "workspace_id": string; };
export type WonderSearchUpdateWorkspaceHeaders = { "If-Match": string; };
export type WonderSearchUpdateWorkspaceBody = {
  "name": string;
  [key: string]: unknown;
};
export type WonderSearchUpdateWorkspaceInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { path: WonderSearchUpdateWorkspacePath; headers: WonderSearchUpdateWorkspaceHeaders; body: WonderSearchUpdateWorkspaceBody; };
export type WonderSearchUpdateWorkspaceResponse = {
  "id"?: string;
  "version"?: string;
  "created_at"?: string;
  "updated_at"?: string;
  "organization_id"?: string;
  "name"?: string;
  "role"?: "admin" | "editor" | "viewer";
  [key: string]: unknown;
};
export type WonderSearchListWorkspaceInheritedMembersPath = { "workspace_id": string; };
export type WonderSearchListWorkspaceInheritedMembersQuery = { "limit"?: number; "cursor"?: string; };
export type WonderSearchListWorkspaceInheritedMembersInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { path: WonderSearchListWorkspaceInheritedMembersPath; query?: WonderSearchListWorkspaceInheritedMembersQuery; };
export type WonderSearchListWorkspaceInheritedMembersResponse = {
  "data": ReadonlyArray<{
    "user_id"?: string;
    "display_name"?: (string | null);
    "email"?: (string | null);
    "role"?: "owner" | "admin";
    "version"?: string;
    "created_at"?: string;
    "etag"?: string;
    [key: string]: unknown;
  }>;
  "next_cursor": (string | null);
  [key: string]: unknown;
};
export type WonderSearchListWorkspaceMembersPath = { "workspace_id": string; };
export type WonderSearchListWorkspaceMembersQuery = { "limit"?: number; "cursor"?: string; };
export type WonderSearchListWorkspaceMembersInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { path: WonderSearchListWorkspaceMembersPath; query?: WonderSearchListWorkspaceMembersQuery; };
export type WonderSearchListWorkspaceMembersResponse = {
  "data": ReadonlyArray<{
    "user_id"?: string;
    "display_name"?: (string | null);
    "email"?: (string | null);
    "role"?: "admin" | "editor" | "viewer";
    "version"?: string;
    "created_at"?: string;
    "etag"?: string;
    [key: string]: unknown;
  }>;
  "next_cursor": (string | null);
  "inherited_access": string;
  [key: string]: unknown;
};
export type WonderSearchCreateWorkspaceMemberPath = { "workspace_id": string; };
export type WonderSearchCreateWorkspaceMemberHeaders = { "Idempotency-Key": string; };
export type WonderSearchCreateWorkspaceMemberBody = {
  "user_id": string;
  "role": "admin" | "editor" | "viewer";
  [key: string]: unknown;
};
export type WonderSearchCreateWorkspaceMemberInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { path: WonderSearchCreateWorkspaceMemberPath; headers: WonderSearchCreateWorkspaceMemberHeaders; body: WonderSearchCreateWorkspaceMemberBody; };
export type WonderSearchCreateWorkspaceMemberResponse = {
  "user_id"?: string;
  "role"?: "admin" | "editor" | "viewer";
  "version"?: string;
  "created_at"?: string;
  [key: string]: unknown;
};
export type WonderSearchUpdateWorkspaceMemberPath = { "workspace_id": string; "user_id": string; };
export type WonderSearchUpdateWorkspaceMemberHeaders = { "If-Match": string; };
export type WonderSearchUpdateWorkspaceMemberBody = {
  "role": "admin" | "editor" | "viewer";
  [key: string]: unknown;
};
export type WonderSearchUpdateWorkspaceMemberInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { path: WonderSearchUpdateWorkspaceMemberPath; headers: WonderSearchUpdateWorkspaceMemberHeaders; body: WonderSearchUpdateWorkspaceMemberBody; };
export type WonderSearchUpdateWorkspaceMemberResponse = {
  "user_id"?: string;
  "role"?: "admin" | "editor" | "viewer";
  "version"?: string;
  "created_at"?: string;
  [key: string]: unknown;
};
export type WonderSearchDeleteWorkspaceMemberPath = { "workspace_id": string; "user_id": string; };
export type WonderSearchDeleteWorkspaceMemberHeaders = { "If-Match": string; };
export type WonderSearchDeleteWorkspaceMemberInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { path: WonderSearchDeleteWorkspaceMemberPath; headers: WonderSearchDeleteWorkspaceMemberHeaders; };
export type WonderSearchDeleteWorkspaceMemberResponse = Record<string, unknown>;
export type WonderSearchListOrganizationInvitationsPath = { "organization_id": string; };
export type WonderSearchListOrganizationInvitationsQuery = { "limit"?: number; "cursor"?: string; };
export type WonderSearchListOrganizationInvitationsInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { path: WonderSearchListOrganizationInvitationsPath; query?: WonderSearchListOrganizationInvitationsQuery; };
export type WonderSearchListOrganizationInvitationsResponse = {
  "data": ReadonlyArray<{
    "id"?: string;
    "version"?: string;
    "created_at"?: string;
    "updated_at"?: string;
    "organization_id"?: string;
    "email"?: string;
    "organization_role"?: "admin" | "member";
    "invited_by"?: string;
    "status"?: "pending" | "accepted" | "revoked" | "expired";
    "expires_at"?: string;
    "accepted_by"?: (string | null);
    "accepted_at"?: (string | null);
    "delivery_generation"?: number;
    "etag"?: string;
    [key: string]: unknown;
  }>;
  "next_cursor": (string | null);
  [key: string]: unknown;
};
export type WonderSearchCreateOrganizationInvitationPath = { "organization_id": string; };
export type WonderSearchCreateOrganizationInvitationHeaders = { "Idempotency-Key": string; };
export type WonderSearchCreateOrganizationInvitationBody = {
  "email": string;
  "organization_role"?: "admin" | "member";
  "workspaces"?: ReadonlyArray<{
    "workspace_id": string;
    "role": "admin" | "editor" | "viewer";
    [key: string]: unknown;
  }>;
  [key: string]: unknown;
};
export type WonderSearchCreateOrganizationInvitationInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { path: WonderSearchCreateOrganizationInvitationPath; headers: WonderSearchCreateOrganizationInvitationHeaders; body: WonderSearchCreateOrganizationInvitationBody; };
export type WonderSearchCreateOrganizationInvitationResponse = {
  "id"?: string;
  "version"?: string;
  "created_at"?: string;
  "updated_at"?: string;
  "organization_id"?: string;
  "email"?: string;
  "organization_role"?: "admin" | "member";
  "invited_by"?: string;
  "status"?: "pending" | "accepted" | "revoked" | "expired";
  "expires_at"?: string;
  "accepted_by"?: (string | null);
  "accepted_at"?: (string | null);
  "delivery_generation"?: number;
  "delivery_status"?: "queued";
  [key: string]: unknown;
};
export type WonderSearchGetOrganizationInvitationPath = { "organization_id": string; "invitation_id": string; };
export type WonderSearchGetOrganizationInvitationInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { path: WonderSearchGetOrganizationInvitationPath; };
export type WonderSearchGetOrganizationInvitationResponse = {
  "id"?: string;
  "version"?: string;
  "created_at"?: string;
  "updated_at"?: string;
  "organization_id"?: string;
  "email"?: string;
  "organization_role"?: "admin" | "member";
  "invited_by"?: string;
  "status"?: "pending" | "accepted" | "revoked" | "expired";
  "expires_at"?: string;
  "accepted_by"?: (string | null);
  "accepted_at"?: (string | null);
  "delivery_generation"?: number;
  [key: string]: unknown;
};
export type WonderSearchGetOrganizationInvitationRawPath = { "organization_id": string; "invitation_id": string; };
export type WonderSearchGetOrganizationInvitationRawInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { path: WonderSearchGetOrganizationInvitationRawPath; };
export type WonderSearchGetOrganizationInvitationRawResponse = Response;
export type WonderSearchDeleteOrganizationInvitationPath = { "organization_id": string; "invitation_id": string; };
export type WonderSearchDeleteOrganizationInvitationHeaders = { "If-Match": string; };
export type WonderSearchDeleteOrganizationInvitationInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { path: WonderSearchDeleteOrganizationInvitationPath; headers: WonderSearchDeleteOrganizationInvitationHeaders; };
export type WonderSearchDeleteOrganizationInvitationResponse = Record<string, unknown>;
export type WonderSearchResendOrganizationInvitationPath = { "organization_id": string; "invitation_id": string; };
export type WonderSearchResendOrganizationInvitationHeaders = { "Idempotency-Key": string; };
export type WonderSearchResendOrganizationInvitationInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { path: WonderSearchResendOrganizationInvitationPath; headers: WonderSearchResendOrganizationInvitationHeaders; };
export type WonderSearchResendOrganizationInvitationResponse = {
  "id"?: string;
  "version"?: string;
  "created_at"?: string;
  "updated_at"?: string;
  "organization_id"?: string;
  "email"?: string;
  "organization_role"?: "admin" | "member";
  "invited_by"?: string;
  "status"?: "pending" | "accepted" | "revoked" | "expired";
  "expires_at"?: string;
  "accepted_by"?: (string | null);
  "accepted_at"?: (string | null);
  "delivery_generation"?: number;
  "delivery_status"?: "queued";
  [key: string]: unknown;
};
export type WonderSearchPreviewInvitationBody = {
  "token": string;
  [key: string]: unknown;
};
export type WonderSearchPreviewInvitationInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { body: WonderSearchPreviewInvitationBody; };
export type WonderSearchPreviewInvitationResponse = {
  "organization_id": string;
  "organization_name"?: string;
  "organization_role"?: "admin" | "member";
  "workspaces"?: ReadonlyArray<{
    "workspace_id": string;
    "role": "admin" | "editor" | "viewer";
    [key: string]: unknown;
  }>;
  "accepted"?: true;
  [key: string]: unknown;
};
export type WonderSearchAcceptInvitationHeaders = { "Idempotency-Key": string; };
export type WonderSearchAcceptInvitationBody = {
  "token": string;
  [key: string]: unknown;
};
export type WonderSearchAcceptInvitationInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { headers: WonderSearchAcceptInvitationHeaders; body: WonderSearchAcceptInvitationBody; };
export type WonderSearchAcceptInvitationResponse = {
  "organization_id": string;
  "accepted": true;
  [key: string]: unknown;
};
export type WonderSearchListWorkspaceApiKeysPath = { "workspace_id": string; };
export type WonderSearchListWorkspaceApiKeysQuery = { "limit"?: number; "cursor"?: string; };
export type WonderSearchListWorkspaceApiKeysInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { path: WonderSearchListWorkspaceApiKeysPath; query?: WonderSearchListWorkspaceApiKeysQuery; };
export type WonderSearchListWorkspaceApiKeysResponse = {
  "data": ReadonlyArray<{
    "id"?: string;
    "organization_id"?: string;
    "workspace_id"?: string;
    "name"?: string;
    "display_prefix"?: string;
    "permission"?: "search" | "read_write";
    "created_by"?: string;
    "expires_at"?: (string | null);
    "revoked_at"?: (string | null);
    "created_at"?: string;
    [key: string]: unknown;
  }>;
  "next_cursor": (string | null);
  [key: string]: unknown;
};
export type WonderSearchCreateWorkspaceApiKeyPath = { "workspace_id": string; };
export type WonderSearchCreateWorkspaceApiKeyHeaders = { "Idempotency-Key": string; };
export type WonderSearchCreateWorkspaceApiKeyBody = {
  "name": string;
  "permission": "search" | "read_write";
  "expires_at"?: string;
  [key: string]: unknown;
};
export type WonderSearchCreateWorkspaceApiKeyInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { path: WonderSearchCreateWorkspaceApiKeyPath; headers: WonderSearchCreateWorkspaceApiKeyHeaders; body: WonderSearchCreateWorkspaceApiKeyBody; };
export type WonderSearchCreateWorkspaceApiKeyResponse = {
  "id"?: string;
  "organization_id"?: string;
  "workspace_id"?: string;
  "name"?: string;
  "display_prefix"?: string;
  "permission"?: "search" | "read_write";
  "created_by"?: string;
  "expires_at"?: (string | null);
  "revoked_at"?: (string | null);
  "created_at"?: string;
  "secret"?: string;
  "secret_available"?: boolean;
  [key: string]: unknown;
};
export type WonderSearchDeleteWorkspaceApiKeyPath = { "workspace_id": string; "key_id": string; };
export type WonderSearchDeleteWorkspaceApiKeyInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { path: WonderSearchDeleteWorkspaceApiKeyPath; };
export type WonderSearchDeleteWorkspaceApiKeyResponse = Record<string, unknown>;
export type WonderSearchGetWorkspaceOverviewPath = { "workspace_id": string; };
export type WonderSearchGetWorkspaceOverviewInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { path: WonderSearchGetWorkspaceOverviewPath; };
export type WonderSearchGetWorkspaceOverviewResponse = {
  "workspace_id": string;
  "drives_count": number;
  "documents_count": number;
  "source_bytes": string;
  "indexed_documents_count": number;
  "pending_documents_count": number;
  "failed_documents_count": number;
  "last_searchable_at": (string | null);
  "drives": ReadonlyArray<{
    "id": string;
    "name": string;
    "status": "creating" | "ready" | "failed";
    "indexed_document_count": number;
    "documents_count": number;
    "last_searchable_at": (string | null);
    [key: string]: unknown;
  }>;
  [key: string]: unknown;
};
export type WonderSearchGetOrganizationUsagePath = { "organization_id": string; };
export type WonderSearchGetOrganizationUsageQuery = { "from"?: string; "to"?: string; "workspace_id"?: string; "key_id"?: string; };
export type WonderSearchGetOrganizationUsageInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { path: WonderSearchGetOrganizationUsagePath; query?: WonderSearchGetOrganizationUsageQuery; };
export type WonderSearchGetOrganizationUsageResponse = {
  "period": {
    "from": string;
    "to": string;
    [key: string]: unknown;
  };
  "summary": {
    "searches": number;
    "completed": number;
    "failed": number;
    "pending": number;
    "free_searches": number;
    "cost_usd": string;
    [key: string]: unknown;
  };
  "daily": ReadonlyArray<{
    "date": string;
    "searches": number;
    "cost_usd": string;
    [key: string]: unknown;
  }>;
  "workspaces": ReadonlyArray<{
    "workspace_id": string;
    "name": string;
    "searches": number;
    "cost_usd": string;
    [key: string]: unknown;
  }>;
  "api_keys": ReadonlyArray<{
    "key_id": (string | null);
    "name": (string | null);
    "workspace_id": string;
    "searches": number;
    "cost_usd": string;
    [key: string]: unknown;
  }>;
  "filter_options": {
    "workspaces": ReadonlyArray<{
      "id": string;
      "name": string;
      [key: string]: unknown;
    }>;
    "api_keys": ReadonlyArray<{
      "id": string;
      "name": string;
      "workspace_id": string;
      "revoked_at": (string | null);
      [key: string]: unknown;
    }>;
    [key: string]: unknown;
  };
  [key: string]: unknown;
};
export type WonderSearchListWorkspaceDrivesPath = { "workspace_id": string; };
export type WonderSearchListWorkspaceDrivesQuery = { "limit"?: number; "cursor"?: string; };
export type WonderSearchListWorkspaceDrivesInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { path: WonderSearchListWorkspaceDrivesPath; query?: WonderSearchListWorkspaceDrivesQuery; };
export type WonderSearchListWorkspaceDrivesResponse = {
  "data": ReadonlyArray<{
    "id": string;
    "name": string;
    "version": string;
    "etag": string;
    [key: string]: unknown;
  }>;
  "next_cursor": (string | null);
  [key: string]: unknown;
};
export type WonderSearchCreateWorkspaceDrivePath = { "workspace_id": string; };
export type WonderSearchCreateWorkspaceDriveHeaders = { "Idempotency-Key": string; };
export type WonderSearchCreateWorkspaceDriveBody = {
  "name": string;
  [key: string]: unknown;
};
export type WonderSearchCreateWorkspaceDriveInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { path: WonderSearchCreateWorkspaceDrivePath; headers: WonderSearchCreateWorkspaceDriveHeaders; body: WonderSearchCreateWorkspaceDriveBody; };
export type WonderSearchCreateWorkspaceDriveResponse = {
  "id"?: string;
  "name"?: string;
  "version"?: string;
  "status"?: string;
  "document_count"?: number;
  "indexed_document_count"?: number;
  "index_snapshot_id"?: string | null;
  [key: string]: unknown;
};
export type WonderSearchGetDrivePath = { "drive_id": string; };
export type WonderSearchGetDriveInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { path: WonderSearchGetDrivePath; };
export type WonderSearchGetDriveResponse = {
  "id"?: string;
  "name"?: string;
  "version"?: string;
  "status"?: string;
  "document_count"?: number;
  "indexed_document_count"?: number;
  "index_snapshot_id"?: string | null;
  [key: string]: unknown;
};
export type WonderSearchGetDriveRawPath = { "drive_id": string; };
export type WonderSearchGetDriveRawInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { path: WonderSearchGetDriveRawPath; };
export type WonderSearchGetDriveRawResponse = Response;
export type WonderSearchUpdateDrivePath = { "drive_id": string; };
export type WonderSearchUpdateDriveHeaders = { "If-Match": string; };
export type WonderSearchUpdateDriveBody = {
  "name": string;
  [key: string]: unknown;
};
export type WonderSearchUpdateDriveInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { path: WonderSearchUpdateDrivePath; headers: WonderSearchUpdateDriveHeaders; body: WonderSearchUpdateDriveBody; };
export type WonderSearchUpdateDriveResponse = {
  "id"?: string;
  "name"?: string;
  "version"?: string;
  "status"?: string;
  "document_count"?: number;
  "indexed_document_count"?: number;
  "index_snapshot_id"?: string | null;
  [key: string]: unknown;
};
export type WonderSearchDeleteDrivePath = { "drive_id": string; };
export type WonderSearchDeleteDriveHeaders = { "Idempotency-Key": string; "If-Match": string; };
export type WonderSearchDeleteDriveInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { path: WonderSearchDeleteDrivePath; headers: WonderSearchDeleteDriveHeaders; };
export type WonderSearchDeleteDriveResponse = Record<string, unknown>;
export type WonderSearchListDriveFoldersPath = { "drive_id": string; };
export type WonderSearchListDriveFoldersQuery = { "limit"?: number; "cursor"?: string; "parent_folder_id"?: string; };
export type WonderSearchListDriveFoldersInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { path: WonderSearchListDriveFoldersPath; query?: WonderSearchListDriveFoldersQuery; };
export type WonderSearchListDriveFoldersResponse = {
  "data": ReadonlyArray<Record<string, unknown>>;
  "next_cursor": (string | null);
  [key: string]: unknown;
};
export type WonderSearchCreateDriveFolderPath = { "drive_id": string; };
export type WonderSearchCreateDriveFolderHeaders = { "Idempotency-Key": string; };
export type WonderSearchCreateDriveFolderBody = {
  "name": string;
  "parent_folder_id"?: (string | null);
  [key: string]: unknown;
};
export type WonderSearchCreateDriveFolderInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { path: WonderSearchCreateDriveFolderPath; headers: WonderSearchCreateDriveFolderHeaders; body: WonderSearchCreateDriveFolderBody; };
export type WonderSearchCreateDriveFolderResponse = {
  "id"?: string;
  "name"?: string;
  "parent_folder_id"?: string | null;
  "version"?: string;
  [key: string]: unknown;
};
export type WonderSearchGetDriveFolderPath = { "drive_id": string; "folder_id": string; };
export type WonderSearchGetDriveFolderInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { path: WonderSearchGetDriveFolderPath; };
export type WonderSearchGetDriveFolderResponse = {
  "id"?: string;
  "name"?: string;
  "parent_folder_id"?: string | null;
  "version"?: string;
  [key: string]: unknown;
};
export type WonderSearchGetDriveFolderRawPath = { "drive_id": string; "folder_id": string; };
export type WonderSearchGetDriveFolderRawInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { path: WonderSearchGetDriveFolderRawPath; };
export type WonderSearchGetDriveFolderRawResponse = Response;
export type WonderSearchUpdateDriveFolderPath = { "drive_id": string; "folder_id": string; };
export type WonderSearchUpdateDriveFolderHeaders = { "If-Match": string; };
export type WonderSearchUpdateDriveFolderBody = {
  "name": string;
  [key: string]: unknown;
};
export type WonderSearchUpdateDriveFolderInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { path: WonderSearchUpdateDriveFolderPath; headers: WonderSearchUpdateDriveFolderHeaders; body: WonderSearchUpdateDriveFolderBody; };
export type WonderSearchUpdateDriveFolderResponse = {
  "id"?: string;
  "name"?: string;
  "parent_folder_id"?: string | null;
  "version"?: string;
  [key: string]: unknown;
};
export type WonderSearchDeleteDriveFolderPath = { "drive_id": string; "folder_id": string; };
export type WonderSearchDeleteDriveFolderHeaders = { "Idempotency-Key": string; "If-Match": string; };
export type WonderSearchDeleteDriveFolderInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { path: WonderSearchDeleteDriveFolderPath; headers: WonderSearchDeleteDriveFolderHeaders; };
export type WonderSearchDeleteDriveFolderResponse = Record<string, unknown>;
export type WonderSearchCreateDriveDocumentPath = { "drive_id": string; };
export type WonderSearchCreateDriveDocumentHeaders = { "Idempotency-Key": string; "X-Ingestion-Mode"?: "progressive"; };
export type WonderSearchCreateDriveDocumentBody = {
  "documents": ReadonlyArray<{
    "external_id": string;
    "text": string;
    "metadata"?: Record<string, unknown>;
    "folder_id"?: (string | null);
    [key: string]: unknown;
  }>;
  [key: string]: unknown;
};
export type WonderSearchCreateDriveDocumentInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { path: WonderSearchCreateDriveDocumentPath; headers: WonderSearchCreateDriveDocumentHeaders; body: WonderSearchCreateDriveDocumentBody; };
export type WonderSearchCreateDriveDocumentResponse = {
  "operation_id": string;
  "documents"?: ReadonlyArray<{
    "id": string;
    "revision": string;
    [key: string]: unknown;
  }>;
  "usage": Record<string, unknown>;
  [key: string]: unknown;
};
export type WonderSearchListDriveDocumentsPath = { "drive_id": string; };
export type WonderSearchListDriveDocumentsQuery = { "limit"?: number; "cursor"?: string; "folder_id"?: string; };
export type WonderSearchListDriveDocumentsInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { path: WonderSearchListDriveDocumentsPath; query?: WonderSearchListDriveDocumentsQuery; };
export type WonderSearchListDriveDocumentsResponse = {
  "data": ReadonlyArray<{
    "id": string;
    "external_id": string;
    "filename": (string | null);
    "source_format": (string | null);
    "source_bytes": (number | string | null);
    "latest_revision": string;
    "searchable_revision": (string | null);
    "folder_id": (string | null);
    "metadata": Record<string, unknown>;
    "operation_id": string;
    "operation_state": string;
    [key: string]: unknown;
  }>;
  "next_cursor": (string | null);
  [key: string]: unknown;
};
export type WonderSearchGetDriveDocumentPath = { "drive_id": string; "document_id": string; };
export type WonderSearchGetDriveDocumentInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { path: WonderSearchGetDriveDocumentPath; };
export type WonderSearchGetDriveDocumentResponse = {
  "id": string;
  "external_id": string;
  "filename": (string | null);
  "source_format": (string | null);
  "source_bytes": (number | string | null);
  "latest_revision": string;
  "searchable_revision": (string | null);
  "folder_id": (string | null);
  "metadata": Record<string, unknown>;
  "operation_id": string;
  "operation_state": string;
  [key: string]: unknown;
};
export type WonderSearchReplaceDocumentPath = { "drive_id": string; "document_id": string; };
export type WonderSearchReplaceDocumentHeaders = { "Idempotency-Key": string; };
export type WonderSearchReplaceDocumentBody = {
  "text": string;
  "metadata"?: Record<string, unknown>;
  "folder_id"?: (string | null);
  [key: string]: unknown;
};
export type WonderSearchReplaceDocumentInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { path: WonderSearchReplaceDocumentPath; headers: WonderSearchReplaceDocumentHeaders; body: WonderSearchReplaceDocumentBody; };
export type WonderSearchReplaceDocumentResponse = {
  "operation_id": string;
  "documents"?: ReadonlyArray<{
    "id": string;
    "revision": string;
    [key: string]: unknown;
  }>;
  "usage": Record<string, unknown>;
  [key: string]: unknown;
};
export type WonderSearchDeleteDriveDocumentPath = { "drive_id": string; "document_id": string; };
export type WonderSearchDeleteDriveDocumentHeaders = { "Idempotency-Key": string; };
export type WonderSearchDeleteDriveDocumentInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { path: WonderSearchDeleteDriveDocumentPath; headers: WonderSearchDeleteDriveDocumentHeaders; };
export type WonderSearchDeleteDriveDocumentResponse = {
  "operation_id": string;
  "documents"?: ReadonlyArray<{
    "id": string;
    "revision": string;
    [key: string]: unknown;
  }>;
  "usage": Record<string, unknown>;
  [key: string]: unknown;
};
export type WonderSearchGetDriveDocumentSourcePath = { "drive_id": string; "document_id": string; };
export type WonderSearchGetDriveDocumentSourceInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { path: WonderSearchGetDriveDocumentSourcePath; };
export type WonderSearchGetDriveDocumentSourceResponse = Uint8Array;
export type WonderSearchGetWorkspaceDefaultDrivePath = { "workspace_id": string; };
export type WonderSearchGetWorkspaceDefaultDriveInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { path: WonderSearchGetWorkspaceDefaultDrivePath; };
export type WonderSearchGetWorkspaceDefaultDriveResponse = {
  "default_drive_id": string;
  "version": string;
  [key: string]: unknown;
};
export type WonderSearchGetWorkspaceDefaultDriveRawPath = { "workspace_id": string; };
export type WonderSearchGetWorkspaceDefaultDriveRawInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { path: WonderSearchGetWorkspaceDefaultDriveRawPath; };
export type WonderSearchGetWorkspaceDefaultDriveRawResponse = Response;
export type WonderSearchSetDefaultDrivePath = { "workspace_id": string; };
export type WonderSearchSetDefaultDriveHeaders = { "Idempotency-Key": string; "If-Match": string; };
export type WonderSearchSetDefaultDriveBody = {
  "drive_id": string;
  [key: string]: unknown;
};
export type WonderSearchSetDefaultDriveInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { path: WonderSearchSetDefaultDrivePath; headers: WonderSearchSetDefaultDriveHeaders; body: WonderSearchSetDefaultDriveBody; };
export type WonderSearchSetDefaultDriveResponse = {
  "default_drive_id": string;
  "version": string;
  [key: string]: unknown;
};
export type WonderSearchGetSdkContextInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & {  };
export type WonderSearchGetSdkContextResponse = {
  "workspace_id": string;
  "permission": "search" | "read_write";
  "default_drive_id": string;
  "default_version": string;
  "compatibility": {
    "api_major": number;
    "minimum_sdk_version": string;
    "latest_stable_sdk_version": (string | null);
    "notices": ReadonlyArray<{
      "id": string;
      "severity": "upgrade" | "deprecation";
      "message": string;
      "effective_date": string;
      "documentation_url": string;
      [key: string]: unknown;
    }>;
    "cli": {
      "api_major": number;
      "minimum_cli_version": string;
      "latest_stable_cli_version": (string | null);
      "notices": ReadonlyArray<Record<string, unknown>>;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };
  "upload_batch"?: {
    "version"?: number;
    "max_items"?: number;
    "max_body_bytes"?: number;
    [key: string]: unknown;
  };
  [key: string]: unknown;
};
export type WonderSearchGetDriveUploadCapabilitiesPath = { "drive_id": string; };
export type WonderSearchGetDriveUploadCapabilitiesInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { path: WonderSearchGetDriveUploadCapabilitiesPath; };
export type WonderSearchGetDriveUploadCapabilitiesResponse = {
  "version": number;
  "max_items": number;
  "max_body_bytes": number;
  [key: string]: unknown;
};
export type WonderSearchCreateUploadBatchPath = { "drive_id": string; };
export type WonderSearchCreateUploadBatchBody = {
  "files": ReadonlyArray<({
    "external_id": string;
    "filename": string;
    "format": "pdf" | "docx" | "txt" | "md";
    "size_bytes": number;
    "sha256": string;
    "folder_id"?: (string | null);
    "metadata"?: Record<string, unknown>;
    [key: string]: unknown;
  } & {
    "key": string;
    [key: string]: unknown;
  })>;
  [key: string]: unknown;
};
export type WonderSearchCreateUploadBatchInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { path: WonderSearchCreateUploadBatchPath; body: WonderSearchCreateUploadBatchBody; };
export type WonderSearchCreateUploadBatchResponse = {
  "files": ReadonlyArray<{
    "key"?: string;
    "id"?: string;
    "state"?: string;
    "transfer"?: {
      "transport": "proxy" | "direct";
      "url"?: string;
      "headers"?: Record<string, string>;
      "expires_in"?: number;
      [key: string]: unknown;
    };
    "document_id"?: string | null;
    "operation_id"?: string | null;
    "warnings"?: ReadonlyArray<Record<string, unknown>>;
    "error_code"?: string | null;
    "processing_status"?: string;
    "processing_error_code"?: string | null;
    "index_snapshot_id"?: string | null;
    [key: string]: unknown;
  }>;
  [key: string]: unknown;
};
export type WonderSearchCompleteUploadBatchPath = { "drive_id": string; };
export type WonderSearchCompleteUploadBatchBody = {
  "files": ReadonlyArray<{
    "id": string;
    "transport": "direct" | "proxy";
    [key: string]: unknown;
  }>;
  [key: string]: unknown;
};
export type WonderSearchCompleteUploadBatchInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { path: WonderSearchCompleteUploadBatchPath; body: WonderSearchCompleteUploadBatchBody; };
export type WonderSearchCompleteUploadBatchResponse = {
  "files": ReadonlyArray<{
    "key"?: string;
    "id"?: string;
    "state"?: string;
    "transfer"?: {
      "transport": "proxy" | "direct";
      "url"?: string;
      "headers"?: Record<string, string>;
      "expires_in"?: number;
      [key: string]: unknown;
    };
    "document_id"?: string | null;
    "operation_id"?: string | null;
    "warnings"?: ReadonlyArray<Record<string, unknown>>;
    "error_code"?: string | null;
    "processing_status"?: string;
    "processing_error_code"?: string | null;
    "index_snapshot_id"?: string | null;
    [key: string]: unknown;
  }>;
  [key: string]: unknown;
};
export type WonderSearchGetUploadBatchStatusPath = { "drive_id": string; };
export type WonderSearchGetUploadBatchStatusBody = {
  "ids": ReadonlyArray<string>;
  [key: string]: unknown;
};
export type WonderSearchGetUploadBatchStatusInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { path: WonderSearchGetUploadBatchStatusPath; body: WonderSearchGetUploadBatchStatusBody; };
export type WonderSearchGetUploadBatchStatusResponse = {
  "files": ReadonlyArray<{
    "key"?: string;
    "id"?: string;
    "state"?: string;
    "transfer"?: {
      "transport": "proxy" | "direct";
      "url"?: string;
      "headers"?: Record<string, string>;
      "expires_in"?: number;
      [key: string]: unknown;
    };
    "document_id"?: string | null;
    "operation_id"?: string | null;
    "warnings"?: ReadonlyArray<Record<string, unknown>>;
    "error_code"?: string | null;
    "processing_status"?: string;
    "processing_error_code"?: string | null;
    "index_snapshot_id"?: string | null;
    [key: string]: unknown;
  }>;
  [key: string]: unknown;
};
export type WonderSearchCreateDriveUploadPath = { "drive_id": string; };
export type WonderSearchCreateDriveUploadHeaders = { "Idempotency-Key": string; };
export type WonderSearchCreateDriveUploadBody = {
  "external_id": string;
  "filename": string;
  "format": "pdf" | "docx" | "txt" | "md";
  "size_bytes": number;
  "sha256": string;
  "folder_id"?: (string | null);
  "metadata"?: Record<string, unknown>;
  [key: string]: unknown;
};
export type WonderSearchCreateDriveUploadInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { path: WonderSearchCreateDriveUploadPath; headers: WonderSearchCreateDriveUploadHeaders; body: WonderSearchCreateDriveUploadBody; };
export type WonderSearchCreateDriveUploadResponse = {
  "id": string;
  "state": string;
  "expires_in": number;
  [key: string]: unknown;
};
export type WonderSearchGetDriveUploadPath = { "drive_id": string; "upload_id": string; };
export type WonderSearchGetDriveUploadInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { path: WonderSearchGetDriveUploadPath; };
export type WonderSearchGetDriveUploadResponse = {
  "id": string;
  "state": string;
  "document_id": (string | null);
  "operation_id": (string | null);
  "warnings": ReadonlyArray<Record<string, unknown>>;
  "error_code": (string | null);
  "error_message": (string | null);
  [key: string]: unknown;
};
export type WonderSearchUploadContentPath = { "drive_id": string; "upload_id": string; };
export type WonderSearchUploadContentHeaders = { "Idempotency-Key": string; };
export type WonderSearchUploadContentInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { path: WonderSearchUploadContentPath; headers: WonderSearchUploadContentHeaders; rawBody: BodyInit; };
export type WonderSearchUploadContentResponse = {
  "id": string;
  "state": string;
  "uploaded": true;
  [key: string]: unknown;
};
export type WonderSearchCreateUploadTransferPath = { "drive_id": string; "upload_id": string; };
export type WonderSearchCreateUploadTransferHeaders = { "Idempotency-Key": string; };
export type WonderSearchCreateUploadTransferBody = Record<string, unknown>;
export type WonderSearchCreateUploadTransferInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { path: WonderSearchCreateUploadTransferPath; headers: WonderSearchCreateUploadTransferHeaders; body: WonderSearchCreateUploadTransferBody; };
export type WonderSearchCreateUploadTransferResponse = {
  "transport": "proxy" | "direct";
  "url"?: string;
  "headers"?: Record<string, string>;
  "expires_in"?: number;
  [key: string]: unknown;
};
export type WonderSearchCompleteUploadPath = { "drive_id": string; "upload_id": string; };
export type WonderSearchCompleteUploadHeaders = { "Idempotency-Key": string; };
export type WonderSearchCompleteUploadBody = {
  "transport"?: "direct";
  [key: string]: unknown;
};
export type WonderSearchCompleteUploadInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { path: WonderSearchCompleteUploadPath; headers: WonderSearchCompleteUploadHeaders; body: WonderSearchCompleteUploadBody; };
export type WonderSearchCompleteUploadResponse = {
  "id": string;
  "state": string;
  [key: string]: unknown;
};
export type WonderSearchGetWorkspaceOperationPath = { "workspace_id": string; "operation_id": string; };
export type WonderSearchGetWorkspaceOperationInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { path: WonderSearchGetWorkspaceOperationPath; };
export type WonderSearchGetWorkspaceOperationResponse = {
  "id": string;
  "status": "queued" | "running" | "searchable" | "failed";
  "index_snapshot_id": (string | null);
  "error_code": (string | null);
  "error_message": (string | null);
  "created_at": string;
  "completed_at": (string | null);
  "document_count": number;
  "usage": Record<string, unknown>;
  [key: string]: unknown;
};
export type WonderSearchCreateImportPath = { "drive_id": string; "import_id": string; };
export type WonderSearchCreateImportBody = {
  "source_bytes": number;
  "documents": number;
  [key: string]: unknown;
};
export type WonderSearchCreateImportInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { path: WonderSearchCreateImportPath; body: WonderSearchCreateImportBody; };
export type WonderSearchCreateImportResponse = {
  "state"?: "open" | "sealed" | "closed";
  "complete"?: boolean;
  "chunks"?: ReadonlyArray<{
    "sequence"?: number;
    "state"?: string;
    "attempts"?: number;
    "last_error"?: unknown;
    "failed_operations"?: ReadonlyArray<Record<string, unknown>>;
    [key: string]: unknown;
  }>;
  [key: string]: unknown;
};
export type WonderSearchGetImportPath = { "drive_id": string; "import_id": string; };
export type WonderSearchGetImportQuery = { "after"?: number; "limit"?: number; };
export type WonderSearchGetImportInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { path: WonderSearchGetImportPath; query?: WonderSearchGetImportQuery; };
export type WonderSearchGetImportResponse = {
  "state"?: "open" | "sealed" | "closed";
  "complete"?: boolean;
  "chunks"?: ReadonlyArray<{
    "sequence"?: number;
    "state"?: string;
    "attempts"?: number;
    "last_error"?: unknown;
    "failed_operations"?: ReadonlyArray<Record<string, unknown>>;
    [key: string]: unknown;
  }>;
  [key: string]: unknown;
};
export type WonderSearchDeclareImportChunksPath = { "drive_id": string; "import_id": string; };
export type WonderSearchDeclareImportChunksBody = {
  "chunks": ReadonlyArray<{
    "sequence": number;
    "sha256": string;
    "encoded_bytes": number;
    "source_bytes": number;
    "documents": number;
    [key: string]: unknown;
  }>;
  [key: string]: unknown;
};
export type WonderSearchDeclareImportChunksInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { path: WonderSearchDeclareImportChunksPath; body: WonderSearchDeclareImportChunksBody; };
export type WonderSearchDeclareImportChunksResponse = {
  "chunks"?: ReadonlyArray<{
    "sequence"?: number;
    "transfer"?: {
      "transport": "proxy" | "direct";
      "url"?: string;
      "headers"?: Record<string, string>;
      "expires_in"?: number;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  }>;
  [key: string]: unknown;
};
export type WonderSearchAcknowledgeImportChunkPath = { "drive_id": string; "import_id": string; "sequence": string; };
export type WonderSearchAcknowledgeImportChunkBody = Record<string, unknown>;
export type WonderSearchAcknowledgeImportChunkInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { path: WonderSearchAcknowledgeImportChunkPath; body: WonderSearchAcknowledgeImportChunkBody; };
export type WonderSearchAcknowledgeImportChunkResponse = Record<string, unknown>;
export type WonderSearchSealImportPath = { "drive_id": string; "import_id": string; };
export type WonderSearchSealImportBody = {
  "chunks": number;
  "source_bytes": number;
  "documents": number;
  [key: string]: unknown;
};
export type WonderSearchSealImportInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { path: WonderSearchSealImportPath; body: WonderSearchSealImportBody; };
export type WonderSearchSealImportResponse = {
  "state"?: "open" | "sealed" | "closed";
  "complete"?: boolean;
  "chunks"?: ReadonlyArray<{
    "sequence"?: number;
    "state"?: string;
    "attempts"?: number;
    "last_error"?: unknown;
    "failed_operations"?: ReadonlyArray<Record<string, unknown>>;
    [key: string]: unknown;
  }>;
  [key: string]: unknown;
};
export type WonderSearchGetIngestionMetricsPath = { "drive_id": string; };
export type WonderSearchGetIngestionMetricsInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { path: WonderSearchGetIngestionMetricsPath; };
export type WonderSearchGetIngestionMetricsResponse = Record<string, unknown>;
export type WonderSearchGetOrganizationBillingPath = { "organization_id": string; };
export type WonderSearchGetOrganizationBillingInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { path: WonderSearchGetOrganizationBillingPath; };
export type WonderSearchGetOrganizationBillingResponse = {
  "organization_id": string;
  "status": string;
  "selected_gb": number;
  "pending_gb": (number | null);
  "period_start": string;
  "period_end": string;
  "search_limit_usd": string;
  "allowance_usd": string;
  "storage_allowance": {
    "effective_storage_bytes": string;
    "used_storage_bytes": string;
    "reserved_storage_bytes": string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
};
export type WonderSearchSetBillingLimitsPath = { "organization_id": string; };
export type WonderSearchSetBillingLimitsHeaders = { "Idempotency-Key": string; };
export type WonderSearchSetBillingLimitsBody = {
  "maximum_usd": string;
  "workspace_id"?: string;
  "key_id"?: string;
  [key: string]: unknown;
};
export type WonderSearchSetBillingLimitsInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { path: WonderSearchSetBillingLimitsPath; headers: WonderSearchSetBillingLimitsHeaders; body: WonderSearchSetBillingLimitsBody; };
export type WonderSearchSetBillingLimitsResponse = {
  "maximum_usd": string;
  "workspace_id": (string | null);
  "key_id": (string | null);
  [key: string]: unknown;
};
export type WonderSearchGetOrganizationBillingLimitsPath = { "organization_id": string; };
export type WonderSearchGetOrganizationBillingLimitsInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { path: WonderSearchGetOrganizationBillingLimitsPath; };
export type WonderSearchGetOrganizationBillingLimitsResponse = Record<string, unknown>;
export type WonderSearchGetOrganizationBillingUsagePath = { "organization_id": string; };
export type WonderSearchGetOrganizationBillingUsageInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { path: WonderSearchGetOrganizationBillingUsagePath; };
export type WonderSearchGetOrganizationBillingUsageResponse = {
  "storage": (Record<string, unknown> | null);
  "storage_allowance": {
    "effective_storage_bytes": string;
    "used_storage_bytes": string;
    "reserved_storage_bytes": string;
    [key: string]: unknown;
  };
  "search": {
    "settled_usd": string;
    "reserved_usd": string;
    "period_start": string;
    "period_end": string;
    "period_source": "subscription" | "calendar_month";
    "period_current": boolean;
    [key: string]: unknown;
  };
  [key: string]: unknown;
};
export type WonderSearchCreateBillingPortalPath = { "organization_id": string; };
export type WonderSearchCreateBillingPortalHeaders = { "Idempotency-Key": string; };
export type WonderSearchCreateBillingPortalInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { path: WonderSearchCreateBillingPortalPath; headers: WonderSearchCreateBillingPortalHeaders; };
export type WonderSearchCreateBillingPortalResponse = {
  "portal_url": string;
  [key: string]: unknown;
};
export type WonderSearchGetOrganizationBillingWalletPath = { "organization_id": string; };
export type WonderSearchGetOrganizationBillingWalletInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { path: WonderSearchGetOrganizationBillingWalletPath; };
export type WonderSearchGetOrganizationBillingWalletResponse = {
  "currency": "usd";
  "balance_usd": string;
  "reserved_usd": string;
  "available_usd": string;
  "purchased_credits_usd": string;
  "subscription_credits_usd": string;
  "auto_topup_credits_usd": string;
  "expiring_subscription_credits_usd": string;
  "promotional_credits_usd": string;
  "promotional_grants": ReadonlyArray<Record<string, unknown>>;
  "storage_allowance": {
    "effective_storage_bytes": string;
    "used_storage_bytes": string;
    "reserved_storage_bytes": string;
    [key: string]: unknown;
  };
  "subscription_credits_expire_at": (string | null);
  "status": string;
  [key: string]: unknown;
};
export type WonderSearchGetOrganizationBillingActivityPath = { "organization_id": string; };
export type WonderSearchGetOrganizationBillingActivityInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { path: WonderSearchGetOrganizationBillingActivityPath; };
export type WonderSearchGetOrganizationBillingActivityResponse = Record<string, unknown>;
export type WonderSearchCreateOrganizationBillingPurchasePath = { "organization_id": string; };
export type WonderSearchCreateOrganizationBillingPurchaseHeaders = { "Idempotency-Key": string; };
export type WonderSearchCreateOrganizationBillingPurchaseBody = {
  "amount_usd": number;
  [key: string]: unknown;
};
export type WonderSearchCreateOrganizationBillingPurchaseInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { path: WonderSearchCreateOrganizationBillingPurchasePath; headers: WonderSearchCreateOrganizationBillingPurchaseHeaders; body: WonderSearchCreateOrganizationBillingPurchaseBody; };
export type WonderSearchCreateOrganizationBillingPurchaseResponse = {
  "id": string;
  "state": string;
  "checkout_url": string;
  [key: string]: unknown;
};
export type WonderSearchGetOrganizationBillingPurchasePath = { "organization_id": string; "purchase_id": string; };
export type WonderSearchGetOrganizationBillingPurchaseInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { path: WonderSearchGetOrganizationBillingPurchasePath; };
export type WonderSearchGetOrganizationBillingPurchaseResponse = {
  "id": string;
  "state": "pending" | "paid" | "expired" | "failed";
  "amount_usd": number;
  [key: string]: unknown;
};
export type WonderSearchListOrganizationBillingInvoicesPath = { "organization_id": string; };
export type WonderSearchListOrganizationBillingInvoicesQuery = { "limit"?: number; "cursor"?: string; };
export type WonderSearchListOrganizationBillingInvoicesInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { path: WonderSearchListOrganizationBillingInvoicesPath; query?: WonderSearchListOrganizationBillingInvoicesQuery; };
export type WonderSearchListOrganizationBillingInvoicesResponse = {
  "data": ReadonlyArray<{
    "id": string;
    "number": (string | null);
    "issued_at": (string | null);
    "description": (string | null);
    "currency": string;
    "total_cents": string;
    "status": string;
    "hosted_url": (string | null);
    "pdf_url": (string | null);
    [key: string]: unknown;
  }>;
  "next_cursor": (string | null);
  [key: string]: unknown;
};
export type WonderSearchGetWorkspaceStoragePath = { "workspace_id": string; };
export type WonderSearchGetWorkspaceStorageInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { path: WonderSearchGetWorkspaceStoragePath; };
export type WonderSearchGetWorkspaceStorageResponse = {
  "workspace_id": string;
  "organization_id": string;
  "version": string;
  "state": "free" | "active" | "grace" | "restricted" | "legacy";
  "selected_gb": number;
  "pending_gb": (number | null);
  "downgrade_blocked": boolean;
  "used_bytes": string;
  "reserved_bytes": string;
  "capacity_bytes": string;
  "period_start": (string | null);
  "period_end": (string | null);
  "grace_ends_at": (string | null);
  "policy": {
    "minimum_gb": number;
    "maximum_gb": number;
    "workspace_limit": number;
    "free_storage_bytes": string;
    "price_per_gb_usd": string;
    [key: string]: unknown;
  };
  "can_manage": boolean;
  "billing_model": "credits";
  "subscription_eligible": boolean;
  "credit_only": boolean;
  "subscription_status": string;
  "subscription_cancel_at_period_end": boolean;
  "subscription_period_end": (string | null);
  "payment_pending": boolean;
  "payment_status": (string | null);
  "payment_recovery_status": (string | null);
  "next_payment_attempt": (string | null);
  "payment_id": (string | null);
  "invoice_url": (string | null);
  "carried_usd": string;
  "available_credits_usd": (string | null);
  "legacy_paid_until": (string | null);
  [key: string]: unknown;
};
export type WonderSearchSetWorkspaceStoragePath = { "workspace_id": string; };
export type WonderSearchSetWorkspaceStorageHeaders = { "Idempotency-Key": string; };
export type WonderSearchSetWorkspaceStorageBody = {
  "quote_id": string;
  [key: string]: unknown;
};
export type WonderSearchSetWorkspaceStorageInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { path: WonderSearchSetWorkspaceStoragePath; headers: WonderSearchSetWorkspaceStorageHeaders; body: WonderSearchSetWorkspaceStorageBody; };
export type WonderSearchSetWorkspaceStorageResponse = {
  "workspace_id": string;
  "organization_id": string;
  "version": string;
  "state": "free" | "active" | "grace" | "restricted" | "legacy";
  "selected_gb": number;
  "pending_gb": (number | null);
  "downgrade_blocked": boolean;
  "used_bytes": string;
  "reserved_bytes": string;
  "capacity_bytes": string;
  "period_start": (string | null);
  "period_end": (string | null);
  "grace_ends_at": (string | null);
  "policy": {
    "minimum_gb": number;
    "maximum_gb": number;
    "workspace_limit": number;
    "free_storage_bytes": string;
    "price_per_gb_usd": string;
    [key: string]: unknown;
  };
  "can_manage": boolean;
  "billing_model": "credits";
  "subscription_eligible": boolean;
  "credit_only": boolean;
  "subscription_status": string;
  "subscription_cancel_at_period_end": boolean;
  "subscription_period_end": (string | null);
  "payment_pending": boolean;
  "payment_status": (string | null);
  "payment_recovery_status": (string | null);
  "next_payment_attempt": (string | null);
  "payment_id": (string | null);
  "invoice_url": (string | null);
  "carried_usd": string;
  "available_credits_usd": (string | null);
  "legacy_paid_until": (string | null);
  [key: string]: unknown;
};
export type WonderSearchQuoteWorkspaceStoragePath = { "workspace_id": string; };
export type WonderSearchQuoteWorkspaceStorageBody = {
  "selected_gb": number;
  [key: string]: unknown;
};
export type WonderSearchQuoteWorkspaceStorageInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { path: WonderSearchQuoteWorkspaceStoragePath; body: WonderSearchQuoteWorkspaceStorageBody; };
export type WonderSearchQuoteWorkspaceStorageResponse = {
  "id": string;
  "selected_gb": number;
  "action": "start" | "upgrade" | "schedule" | "keep" | "restore" | "free";
  "charge_usd": string;
  "monthly_usd": string;
  "credits_applied_usd": string;
  "card_charge_usd": string;
  "rounding_adjustment_usd": string;
  "renewal_at": (string | null);
  "effective_at": string;
  "expires_at": string;
  [key: string]: unknown;
};
export type WonderSearchCloseImportPath = { "drive_id": string; "import_id": string; };
export type WonderSearchCloseImportBody = Record<string, unknown>;
export type WonderSearchCloseImportInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { path: WonderSearchCloseImportPath; body: WonderSearchCloseImportBody; };
export type WonderSearchCloseImportResponse = {
  "state"?: "open" | "sealed" | "closed";
  "complete"?: boolean;
  "chunks"?: ReadonlyArray<{
    "sequence"?: number;
    "state"?: string;
    "attempts"?: number;
    "last_error"?: unknown;
    "failed_operations"?: ReadonlyArray<Record<string, unknown>>;
    [key: string]: unknown;
  }>;
  [key: string]: unknown;
};
export type WonderSearchRecoverImportPath = { "drive_id": string; "import_id": string; };
export type WonderSearchRecoverImportBody = Record<string, unknown>;
export type WonderSearchRecoverImportInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { path: WonderSearchRecoverImportPath; body: WonderSearchRecoverImportBody; };
export type WonderSearchRecoverImportResponse = {
  "state"?: "open" | "sealed" | "closed";
  "complete"?: boolean;
  "chunks"?: ReadonlyArray<{
    "sequence"?: number;
    "state"?: string;
    "attempts"?: number;
    "last_error"?: unknown;
    "failed_operations"?: ReadonlyArray<Record<string, unknown>>;
    [key: string]: unknown;
  }>;
  [key: string]: unknown;
};
export type WonderSearchRetryImportOperationPath = { "drive_id": string; "import_id": string; "operation_id": string; };
export type WonderSearchRetryImportOperationBody = {
  "request_id": string;
  [key: string]: unknown;
};
export type WonderSearchRetryImportOperationInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { path: WonderSearchRetryImportOperationPath; body: WonderSearchRetryImportOperationBody; };
export type WonderSearchRetryImportOperationResponse = Record<string, unknown>;
export type WonderSearchGetAutoTopupPath = { "organization_id": string; };
export type WonderSearchGetAutoTopupInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { path: WonderSearchGetAutoTopupPath; };
export type WonderSearchGetAutoTopupResponse = {
  "organization_id"?: string;
  "name"?: string;
  "monthly_usd"?: string;
  "monthly_credits_usd"?: string;
  "credits_expire"?: boolean;
  "next_charge_at"?: string | null;
  "status"?: string;
  "eligible"?: boolean;
  "cancel_at_period_end"?: boolean;
  "period_start"?: string | null;
  "period_end"?: string | null;
  "paid_until"?: string | null;
  "checkout_url"?: string | null;
  [key: string]: unknown;
};
export type WonderSearchCheckoutAutoTopupPath = { "organization_id": string; };
export type WonderSearchCheckoutAutoTopupHeaders = { "Idempotency-Key": string; };
export type WonderSearchCheckoutAutoTopupBody = {
  "amount_usd"?: number;
  "workspace_id"?: string;
  "selected_gb"?: number;
  [key: string]: unknown;
};
export type WonderSearchCheckoutAutoTopupInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { path: WonderSearchCheckoutAutoTopupPath; headers: WonderSearchCheckoutAutoTopupHeaders; body: WonderSearchCheckoutAutoTopupBody; };
export type WonderSearchCheckoutAutoTopupResponse = {
  "organization_id"?: string;
  "name"?: string;
  "monthly_usd"?: string;
  "monthly_credits_usd"?: string;
  "credits_expire"?: boolean;
  "next_charge_at"?: string | null;
  "status"?: string;
  "eligible"?: boolean;
  "cancel_at_period_end"?: boolean;
  "period_start"?: string | null;
  "period_end"?: string | null;
  "paid_until"?: string | null;
  "checkout_url"?: string | null;
  [key: string]: unknown;
};
export type WonderSearchAmountAutoTopupPath = { "organization_id": string; };
export type WonderSearchAmountAutoTopupHeaders = { "Idempotency-Key": string; };
export type WonderSearchAmountAutoTopupBody = {
  "amount_usd": number;
  [key: string]: unknown;
};
export type WonderSearchAmountAutoTopupInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { path: WonderSearchAmountAutoTopupPath; headers: WonderSearchAmountAutoTopupHeaders; body: WonderSearchAmountAutoTopupBody; };
export type WonderSearchAmountAutoTopupResponse = {
  "organization_id"?: string;
  "name"?: string;
  "monthly_usd"?: string;
  "monthly_credits_usd"?: string;
  "credits_expire"?: boolean;
  "next_charge_at"?: string | null;
  "status"?: string;
  "eligible"?: boolean;
  "cancel_at_period_end"?: boolean;
  "period_start"?: string | null;
  "period_end"?: string | null;
  "paid_until"?: string | null;
  "checkout_url"?: string | null;
  [key: string]: unknown;
};
export type WonderSearchCancelAutoTopupPath = { "organization_id": string; };
export type WonderSearchCancelAutoTopupHeaders = { "Idempotency-Key": string; };
export type WonderSearchCancelAutoTopupBody = Record<string, unknown>;
export type WonderSearchCancelAutoTopupInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { path: WonderSearchCancelAutoTopupPath; headers: WonderSearchCancelAutoTopupHeaders; body: WonderSearchCancelAutoTopupBody; };
export type WonderSearchCancelAutoTopupResponse = {
  "organization_id"?: string;
  "name"?: string;
  "monthly_usd"?: string;
  "monthly_credits_usd"?: string;
  "credits_expire"?: boolean;
  "next_charge_at"?: string | null;
  "status"?: string;
  "eligible"?: boolean;
  "cancel_at_period_end"?: boolean;
  "period_start"?: string | null;
  "period_end"?: string | null;
  "paid_until"?: string | null;
  "checkout_url"?: string | null;
  [key: string]: unknown;
};
export type WonderSearchResumeAutoTopupPath = { "organization_id": string; };
export type WonderSearchResumeAutoTopupHeaders = { "Idempotency-Key": string; };
export type WonderSearchResumeAutoTopupBody = Record<string, unknown>;
export type WonderSearchResumeAutoTopupInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { path: WonderSearchResumeAutoTopupPath; headers: WonderSearchResumeAutoTopupHeaders; body: WonderSearchResumeAutoTopupBody; };
export type WonderSearchResumeAutoTopupResponse = {
  "organization_id"?: string;
  "name"?: string;
  "monthly_usd"?: string;
  "monthly_credits_usd"?: string;
  "credits_expire"?: boolean;
  "next_charge_at"?: string | null;
  "status"?: string;
  "eligible"?: boolean;
  "cancel_at_period_end"?: boolean;
  "period_start"?: string | null;
  "period_end"?: string | null;
  "paid_until"?: string | null;
  "checkout_url"?: string | null;
  [key: string]: unknown;
};

function withoutNullHeaders(input: Omit<NativeRequestInput, "headers"> & { headers?: Readonly<Record<string, string | null | undefined>> }): NativeRequestInput {
  const { headers, ...rest } = input;
  return { ...rest, ...(headers ? { headers: Object.fromEntries(Object.entries(headers).filter((entry): entry is [string, string] => entry[1] !== null && entry[1] !== undefined)) } : {}) };
}

export const wondersearchOperations = Object.freeze({
  searchDrive: Object.freeze({"id":"wondersearch.searchDrive","method":"POST","path":"/v1/drives/{drive_id}/search","retryable":false}),
  getPassage: Object.freeze({"id":"wondersearch.getPassage","method":"GET","path":"/v1/drives/{drive_id}/passages/{passage_id}","retryable":true}),
  getCapabilities: Object.freeze({"id":"wondersearch.getCapabilities","method":"GET","path":"/v1/workspaces/{workspace_id}/capabilities","retryable":true}),
  searchWorkspace: Object.freeze({"id":"wondersearch.searchWorkspace","method":"POST","path":"/v1/workspaces/{workspace_id}/search","retryable":false}),
  bootstrapAccount: Object.freeze({"id":"wondersearch.bootstrapAccount","method":"POST","path":"/v1/account/bootstrap","retryable":false}),
  getMe: Object.freeze({"id":"wondersearch.getMe","method":"GET","path":"/v1/me","retryable":true}),
  listOrganizations: Object.freeze({"id":"wondersearch.listOrganizations","method":"GET","path":"/v1/organizations","retryable":true}),
  getOrganization: Object.freeze({"id":"wondersearch.getOrganization","method":"GET","path":"/v1/organizations/{organization_id}","retryable":true}),
  getOrganizationRaw: Object.freeze({"id":"wondersearch.getOrganizationRaw","method":"GET","path":"/v1/organizations/{organization_id}","retryable":true,"response":"raw"}),
  updateOrganization: Object.freeze({"id":"wondersearch.updateOrganization","method":"PATCH","path":"/v1/organizations/{organization_id}","retryable":false}),
  listOrganizationMembers: Object.freeze({"id":"wondersearch.listOrganizationMembers","method":"GET","path":"/v1/organizations/{organization_id}/members","retryable":true}),
  updateOrganizationMember: Object.freeze({"id":"wondersearch.updateOrganizationMember","method":"PATCH","path":"/v1/organizations/{organization_id}/members/{user_id}","retryable":false}),
  deleteOrganizationMember: Object.freeze({"id":"wondersearch.deleteOrganizationMember","method":"DELETE","path":"/v1/organizations/{organization_id}/members/{user_id}","retryable":false}),
  listOrganizationWorkspaces: Object.freeze({"id":"wondersearch.listOrganizationWorkspaces","method":"GET","path":"/v1/organizations/{organization_id}/workspaces","retryable":true}),
  createOrganizationWorkspace: Object.freeze({"id":"wondersearch.createOrganizationWorkspace","method":"POST","path":"/v1/organizations/{organization_id}/workspaces","retryable":false}),
  getWorkspace: Object.freeze({"id":"wondersearch.getWorkspace","method":"GET","path":"/v1/workspaces/{workspace_id}","retryable":true}),
  getWorkspaceRaw: Object.freeze({"id":"wondersearch.getWorkspaceRaw","method":"GET","path":"/v1/workspaces/{workspace_id}","retryable":true,"response":"raw"}),
  updateWorkspace: Object.freeze({"id":"wondersearch.updateWorkspace","method":"PATCH","path":"/v1/workspaces/{workspace_id}","retryable":false}),
  listWorkspaceInheritedMembers: Object.freeze({"id":"wondersearch.listWorkspaceInheritedMembers","method":"GET","path":"/v1/workspaces/{workspace_id}/inherited-members","retryable":true}),
  listWorkspaceMembers: Object.freeze({"id":"wondersearch.listWorkspaceMembers","method":"GET","path":"/v1/workspaces/{workspace_id}/members","retryable":true}),
  createWorkspaceMember: Object.freeze({"id":"wondersearch.createWorkspaceMember","method":"POST","path":"/v1/workspaces/{workspace_id}/members","retryable":false}),
  updateWorkspaceMember: Object.freeze({"id":"wondersearch.updateWorkspaceMember","method":"PATCH","path":"/v1/workspaces/{workspace_id}/members/{user_id}","retryable":false}),
  deleteWorkspaceMember: Object.freeze({"id":"wondersearch.deleteWorkspaceMember","method":"DELETE","path":"/v1/workspaces/{workspace_id}/members/{user_id}","retryable":false}),
  listOrganizationInvitations: Object.freeze({"id":"wondersearch.listOrganizationInvitations","method":"GET","path":"/v1/organizations/{organization_id}/invitations","retryable":true}),
  createOrganizationInvitation: Object.freeze({"id":"wondersearch.createOrganizationInvitation","method":"POST","path":"/v1/organizations/{organization_id}/invitations","retryable":false}),
  getOrganizationInvitation: Object.freeze({"id":"wondersearch.getOrganizationInvitation","method":"GET","path":"/v1/organizations/{organization_id}/invitations/{invitation_id}","retryable":true}),
  getOrganizationInvitationRaw: Object.freeze({"id":"wondersearch.getOrganizationInvitationRaw","method":"GET","path":"/v1/organizations/{organization_id}/invitations/{invitation_id}","retryable":true,"response":"raw"}),
  deleteOrganizationInvitation: Object.freeze({"id":"wondersearch.deleteOrganizationInvitation","method":"DELETE","path":"/v1/organizations/{organization_id}/invitations/{invitation_id}","retryable":false}),
  resendOrganizationInvitation: Object.freeze({"id":"wondersearch.resendOrganizationInvitation","method":"POST","path":"/v1/organizations/{organization_id}/invitations/{invitation_id}/resend","retryable":false}),
  previewInvitation: Object.freeze({"id":"wondersearch.previewInvitation","method":"POST","path":"/v1/invitations/preview","retryable":false}),
  acceptInvitation: Object.freeze({"id":"wondersearch.acceptInvitation","method":"POST","path":"/v1/invitations/accept","retryable":false}),
  listWorkspaceApiKeys: Object.freeze({"id":"wondersearch.listWorkspaceApiKeys","method":"GET","path":"/v1/workspaces/{workspace_id}/api-keys","retryable":true}),
  createWorkspaceApiKey: Object.freeze({"id":"wondersearch.createWorkspaceApiKey","method":"POST","path":"/v1/workspaces/{workspace_id}/api-keys","retryable":false}),
  deleteWorkspaceApiKey: Object.freeze({"id":"wondersearch.deleteWorkspaceApiKey","method":"DELETE","path":"/v1/workspaces/{workspace_id}/api-keys/{key_id}","retryable":false}),
  getWorkspaceOverview: Object.freeze({"id":"wondersearch.getWorkspaceOverview","method":"GET","path":"/v1/workspaces/{workspace_id}/overview","retryable":true}),
  getOrganizationUsage: Object.freeze({"id":"wondersearch.getOrganizationUsage","method":"GET","path":"/v1/organizations/{organization_id}/usage","retryable":true}),
  listWorkspaceDrives: Object.freeze({"id":"wondersearch.listWorkspaceDrives","method":"GET","path":"/v1/workspaces/{workspace_id}/drives","retryable":true}),
  createWorkspaceDrive: Object.freeze({"id":"wondersearch.createWorkspaceDrive","method":"POST","path":"/v1/workspaces/{workspace_id}/drives","retryable":false}),
  getDrive: Object.freeze({"id":"wondersearch.getDrive","method":"GET","path":"/v1/drives/{drive_id}","retryable":true}),
  getDriveRaw: Object.freeze({"id":"wondersearch.getDriveRaw","method":"GET","path":"/v1/drives/{drive_id}","retryable":true,"response":"raw"}),
  updateDrive: Object.freeze({"id":"wondersearch.updateDrive","method":"PATCH","path":"/v1/drives/{drive_id}","retryable":false}),
  deleteDrive: Object.freeze({"id":"wondersearch.deleteDrive","method":"DELETE","path":"/v1/drives/{drive_id}","retryable":false}),
  listDriveFolders: Object.freeze({"id":"wondersearch.listDriveFolders","method":"GET","path":"/v1/drives/{drive_id}/folders","retryable":true}),
  createDriveFolder: Object.freeze({"id":"wondersearch.createDriveFolder","method":"POST","path":"/v1/drives/{drive_id}/folders","retryable":false}),
  getDriveFolder: Object.freeze({"id":"wondersearch.getDriveFolder","method":"GET","path":"/v1/drives/{drive_id}/folders/{folder_id}","retryable":true}),
  getDriveFolderRaw: Object.freeze({"id":"wondersearch.getDriveFolderRaw","method":"GET","path":"/v1/drives/{drive_id}/folders/{folder_id}","retryable":true,"response":"raw"}),
  updateDriveFolder: Object.freeze({"id":"wondersearch.updateDriveFolder","method":"PATCH","path":"/v1/drives/{drive_id}/folders/{folder_id}","retryable":false}),
  deleteDriveFolder: Object.freeze({"id":"wondersearch.deleteDriveFolder","method":"DELETE","path":"/v1/drives/{drive_id}/folders/{folder_id}","retryable":false}),
  createDriveDocument: Object.freeze({"id":"wondersearch.createDriveDocument","method":"POST","path":"/v1/drives/{drive_id}/documents","retryable":false}),
  listDriveDocuments: Object.freeze({"id":"wondersearch.listDriveDocuments","method":"GET","path":"/v1/drives/{drive_id}/documents","retryable":true}),
  getDriveDocument: Object.freeze({"id":"wondersearch.getDriveDocument","method":"GET","path":"/v1/drives/{drive_id}/documents/{document_id}","retryable":true}),
  replaceDocument: Object.freeze({"id":"wondersearch.replaceDocument","method":"PUT","path":"/v1/drives/{drive_id}/documents/{document_id}","retryable":false}),
  deleteDriveDocument: Object.freeze({"id":"wondersearch.deleteDriveDocument","method":"DELETE","path":"/v1/drives/{drive_id}/documents/{document_id}","retryable":false}),
  getDriveDocumentSource: Object.freeze({"id":"wondersearch.getDriveDocumentSource","method":"GET","path":"/v1/drives/{drive_id}/documents/{document_id}/source","retryable":true,"response":"bytes"}),
  getWorkspaceDefaultDrive: Object.freeze({"id":"wondersearch.getWorkspaceDefaultDrive","method":"GET","path":"/v1/workspaces/{workspace_id}/default-drive","retryable":true}),
  getWorkspaceDefaultDriveRaw: Object.freeze({"id":"wondersearch.getWorkspaceDefaultDriveRaw","method":"GET","path":"/v1/workspaces/{workspace_id}/default-drive","retryable":true,"response":"raw"}),
  setDefaultDrive: Object.freeze({"id":"wondersearch.setDefaultDrive","method":"PUT","path":"/v1/workspaces/{workspace_id}/default-drive","retryable":false}),
  getSdkContext: Object.freeze({"id":"wondersearch.getSdkContext","method":"GET","path":"/v1/sdk/context","retryable":true}),
  getDriveUploadCapabilities: Object.freeze({"id":"wondersearch.getDriveUploadCapabilities","method":"GET","path":"/v1/drives/{drive_id}/uploads/capabilities","retryable":true}),
  createUploadBatch: Object.freeze({"id":"wondersearch.createUploadBatch","method":"POST","path":"/v1/drives/{drive_id}/uploads/batch","retryable":false}),
  completeUploadBatch: Object.freeze({"id":"wondersearch.completeUploadBatch","method":"POST","path":"/v1/drives/{drive_id}/uploads/batch/complete","retryable":false}),
  getUploadBatchStatus: Object.freeze({"id":"wondersearch.getUploadBatchStatus","method":"POST","path":"/v1/drives/{drive_id}/uploads/batch/status","retryable":false}),
  createDriveUpload: Object.freeze({"id":"wondersearch.createDriveUpload","method":"POST","path":"/v1/drives/{drive_id}/uploads","retryable":false}),
  getDriveUpload: Object.freeze({"id":"wondersearch.getDriveUpload","method":"GET","path":"/v1/drives/{drive_id}/uploads/{upload_id}","retryable":true}),
  uploadContent: Object.freeze({"id":"wondersearch.uploadContent","method":"PUT","path":"/v1/drives/{drive_id}/uploads/{upload_id}/content","retryable":false,"headers":{"Content-Type":"application/octet-stream"}}),
  createUploadTransfer: Object.freeze({"id":"wondersearch.createUploadTransfer","method":"POST","path":"/v1/drives/{drive_id}/uploads/{upload_id}/transfer","retryable":false}),
  completeUpload: Object.freeze({"id":"wondersearch.completeUpload","method":"POST","path":"/v1/drives/{drive_id}/uploads/{upload_id}/complete","retryable":false}),
  getWorkspaceOperation: Object.freeze({"id":"wondersearch.getWorkspaceOperation","method":"GET","path":"/v1/workspaces/{workspace_id}/operations/{operation_id}","retryable":true}),
  createImport: Object.freeze({"id":"wondersearch.createImport","method":"PUT","path":"/v1/drives/{drive_id}/imports/{import_id}","retryable":false}),
  getImport: Object.freeze({"id":"wondersearch.getImport","method":"GET","path":"/v1/drives/{drive_id}/imports/{import_id}","retryable":true}),
  declareImportChunks: Object.freeze({"id":"wondersearch.declareImportChunks","method":"POST","path":"/v1/drives/{drive_id}/imports/{import_id}/chunks","retryable":false}),
  acknowledgeImportChunk: Object.freeze({"id":"wondersearch.acknowledgeImportChunk","method":"POST","path":"/v1/drives/{drive_id}/imports/{import_id}/chunks/{sequence}/acknowledge","retryable":false}),
  sealImport: Object.freeze({"id":"wondersearch.sealImport","method":"POST","path":"/v1/drives/{drive_id}/imports/{import_id}/seal","retryable":false}),
  getIngestionMetrics: Object.freeze({"id":"wondersearch.getIngestionMetrics","method":"GET","path":"/v1/drives/{drive_id}/ingestion-metrics","retryable":true}),
  getOrganizationBilling: Object.freeze({"id":"wondersearch.getOrganizationBilling","method":"GET","path":"/v1/organizations/{organization_id}/billing","retryable":true}),
  setBillingLimits: Object.freeze({"id":"wondersearch.setBillingLimits","method":"POST","path":"/v1/organizations/{organization_id}/billing/limits","retryable":false}),
  getOrganizationBillingLimits: Object.freeze({"id":"wondersearch.getOrganizationBillingLimits","method":"GET","path":"/v1/organizations/{organization_id}/billing/limits","retryable":true}),
  getOrganizationBillingUsage: Object.freeze({"id":"wondersearch.getOrganizationBillingUsage","method":"GET","path":"/v1/organizations/{organization_id}/billing/usage","retryable":true}),
  createBillingPortal: Object.freeze({"id":"wondersearch.createBillingPortal","method":"POST","path":"/v1/organizations/{organization_id}/billing/portal","retryable":false}),
  getOrganizationBillingWallet: Object.freeze({"id":"wondersearch.getOrganizationBillingWallet","method":"GET","path":"/v1/organizations/{organization_id}/billing/wallet","retryable":true}),
  getOrganizationBillingActivity: Object.freeze({"id":"wondersearch.getOrganizationBillingActivity","method":"GET","path":"/v1/organizations/{organization_id}/billing/activity","retryable":true}),
  createOrganizationBillingPurchase: Object.freeze({"id":"wondersearch.createOrganizationBillingPurchase","method":"POST","path":"/v1/organizations/{organization_id}/billing/purchases","retryable":false}),
  getOrganizationBillingPurchase: Object.freeze({"id":"wondersearch.getOrganizationBillingPurchase","method":"GET","path":"/v1/organizations/{organization_id}/billing/purchases/{purchase_id}","retryable":true}),
  listOrganizationBillingInvoices: Object.freeze({"id":"wondersearch.listOrganizationBillingInvoices","method":"GET","path":"/v1/organizations/{organization_id}/billing/invoices","retryable":true}),
  getWorkspaceStorage: Object.freeze({"id":"wondersearch.getWorkspaceStorage","method":"GET","path":"/v1/workspaces/{workspace_id}/storage","retryable":true}),
  setWorkspaceStorage: Object.freeze({"id":"wondersearch.setWorkspaceStorage","method":"POST","path":"/v1/workspaces/{workspace_id}/storage","retryable":false}),
  quoteWorkspaceStorage: Object.freeze({"id":"wondersearch.quoteWorkspaceStorage","method":"POST","path":"/v1/workspaces/{workspace_id}/storage/quote","retryable":false}),
  closeImport: Object.freeze({"id":"wondersearch.closeImport","method":"POST","path":"/v1/drives/{drive_id}/imports/{import_id}/close","retryable":false}),
  recoverImport: Object.freeze({"id":"wondersearch.recoverImport","method":"POST","path":"/v1/drives/{drive_id}/imports/{import_id}/recover","retryable":false}),
  retryImportOperation: Object.freeze({"id":"wondersearch.retryImportOperation","method":"POST","path":"/v1/drives/{drive_id}/imports/{import_id}/operations/{operation_id}/retry","retryable":false}),
  getAutoTopup: Object.freeze({"id":"wondersearch.getAutoTopup","method":"GET","path":"/v1/organizations/{organization_id}/billing/auto-topup","retryable":true}),
  checkoutAutoTopup: Object.freeze({"id":"wondersearch.checkoutAutoTopup","method":"POST","path":"/v1/organizations/{organization_id}/billing/auto-topup/checkout","retryable":false}),
  amountAutoTopup: Object.freeze({"id":"wondersearch.amountAutoTopup","method":"POST","path":"/v1/organizations/{organization_id}/billing/auto-topup/amount","retryable":false}),
  cancelAutoTopup: Object.freeze({"id":"wondersearch.cancelAutoTopup","method":"POST","path":"/v1/organizations/{organization_id}/billing/auto-topup/cancel","retryable":false}),
  resumeAutoTopup: Object.freeze({"id":"wondersearch.resumeAutoTopup","method":"POST","path":"/v1/organizations/{organization_id}/billing/auto-topup/resume","retryable":false}),
} satisfies Record<string, NativeOperation>);

export function createWonderSearchClient(options: WonderSearchClientOptions) {
  if (!options || typeof options !== "object" || Array.isArray(options)) throw new SearchError("configuration");
  exactFields(options, ["apiKey", "fetch", "timeoutMs", "retry", "maxResponseBytes", "maxConcurrency"], "configuration");
  const { apiKey, fetch } = adapterOptions({ apiKey: options.apiKey, ...(options.fetch !== undefined ? { fetch: options.fetch } : {}) });
  const { timeoutMs, retry, maxResponseBytes, maxConcurrency } = options;
  const config = { fetch, ...(timeoutMs !== undefined ? { timeoutMs } : {}), ...(retry !== undefined ? { retry } : {}),
    ...(maxResponseBytes !== undefined ? { maxResponseBytes } : {}), ...(maxConcurrency !== undefined ? { maxConcurrency } : {}) };
  const transport0 = createNativeTransport({ ...config, provider: "wondersearch", baseUrl: "https://api.wondersearch.ai", headers: { "X-API-Key": apiKey } });
  return Object.freeze({
    operations: wondersearchOperations,
    /** searchDrive */
    async searchDrive(input: WonderSearchSearchDriveInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.body === undefined) throw new SearchError("invalid_request");
      if (input.headers?.["Idempotency-Key"] == null) throw new SearchError("invalid_request");
      return transport0.request<WonderSearchSearchDriveResponse>(wondersearchOperations.searchDrive, withoutNullHeaders(input));
    },
    /** getPassage */
    async getPassage(input: WonderSearchGetPassageInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.query?.["index_snapshot_id"] == null) throw new SearchError("invalid_request");
      return transport0.request<WonderSearchGetPassageResponse>(wondersearchOperations.getPassage, input);
    },
    /** getCapabilities */
    async getCapabilities(input: WonderSearchGetCapabilitiesInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      return transport0.request<WonderSearchGetCapabilitiesResponse>(wondersearchOperations.getCapabilities, input);
    },
    /** searchWorkspace */
    async searchWorkspace(input: WonderSearchSearchWorkspaceInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.body === undefined) throw new SearchError("invalid_request");
      if (input.headers?.["Idempotency-Key"] == null) throw new SearchError("invalid_request");
      return transport0.request<WonderSearchSearchWorkspaceResponse>(wondersearchOperations.searchWorkspace, withoutNullHeaders(input));
    },
    /** bootstrapAccount */
    async bootstrapAccount(input: WonderSearchBootstrapAccountInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.headers?.["Idempotency-Key"] == null) throw new SearchError("invalid_request");
      return transport0.request<WonderSearchBootstrapAccountResponse>(wondersearchOperations.bootstrapAccount, withoutNullHeaders(input));
    },
    /** getMe */
    async getMe(input: WonderSearchGetMeInput = {}) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      return transport0.request<WonderSearchGetMeResponse>(wondersearchOperations.getMe, input);
    },
    /** listOrganizations */
    async listOrganizations(input: WonderSearchListOrganizationsInput = {}) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      return transport0.request<WonderSearchListOrganizationsResponse>(wondersearchOperations.listOrganizations, input);
    },
    /** getOrganization */
    async getOrganization(input: WonderSearchGetOrganizationInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      return transport0.request<WonderSearchGetOrganizationResponse>(wondersearchOperations.getOrganization, input);
    },
    /** getOrganization with response headers */
    async getOrganizationRaw(input: WonderSearchGetOrganizationRawInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      return transport0.request<WonderSearchGetOrganizationRawResponse>(wondersearchOperations.getOrganizationRaw, input);
    },
    /** updateOrganization */
    async updateOrganization(input: WonderSearchUpdateOrganizationInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.body === undefined) throw new SearchError("invalid_request");
      if (input.headers?.["If-Match"] == null) throw new SearchError("invalid_request");
      return transport0.request<WonderSearchUpdateOrganizationResponse>(wondersearchOperations.updateOrganization, withoutNullHeaders(input));
    },
    /** listOrganizationMembers */
    async listOrganizationMembers(input: WonderSearchListOrganizationMembersInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      return transport0.request<WonderSearchListOrganizationMembersResponse>(wondersearchOperations.listOrganizationMembers, input);
    },
    /** updateOrganizationMember */
    async updateOrganizationMember(input: WonderSearchUpdateOrganizationMemberInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.body === undefined) throw new SearchError("invalid_request");
      if (input.headers?.["If-Match"] == null) throw new SearchError("invalid_request");
      return transport0.request<WonderSearchUpdateOrganizationMemberResponse>(wondersearchOperations.updateOrganizationMember, withoutNullHeaders(input));
    },
    /** deleteOrganizationMember */
    async deleteOrganizationMember(input: WonderSearchDeleteOrganizationMemberInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.headers?.["If-Match"] == null) throw new SearchError("invalid_request");
      return transport0.request<WonderSearchDeleteOrganizationMemberResponse>(wondersearchOperations.deleteOrganizationMember, withoutNullHeaders(input));
    },
    /** listOrganizationWorkspaces */
    async listOrganizationWorkspaces(input: WonderSearchListOrganizationWorkspacesInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      return transport0.request<WonderSearchListOrganizationWorkspacesResponse>(wondersearchOperations.listOrganizationWorkspaces, input);
    },
    /** createOrganizationWorkspace */
    async createOrganizationWorkspace(input: WonderSearchCreateOrganizationWorkspaceInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.body === undefined) throw new SearchError("invalid_request");
      if (input.headers?.["Idempotency-Key"] == null) throw new SearchError("invalid_request");
      return transport0.request<WonderSearchCreateOrganizationWorkspaceResponse>(wondersearchOperations.createOrganizationWorkspace, withoutNullHeaders(input));
    },
    /** getWorkspace */
    async getWorkspace(input: WonderSearchGetWorkspaceInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      return transport0.request<WonderSearchGetWorkspaceResponse>(wondersearchOperations.getWorkspace, input);
    },
    /** getWorkspace with response headers */
    async getWorkspaceRaw(input: WonderSearchGetWorkspaceRawInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      return transport0.request<WonderSearchGetWorkspaceRawResponse>(wondersearchOperations.getWorkspaceRaw, input);
    },
    /** updateWorkspace */
    async updateWorkspace(input: WonderSearchUpdateWorkspaceInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.body === undefined) throw new SearchError("invalid_request");
      if (input.headers?.["If-Match"] == null) throw new SearchError("invalid_request");
      return transport0.request<WonderSearchUpdateWorkspaceResponse>(wondersearchOperations.updateWorkspace, withoutNullHeaders(input));
    },
    /** listWorkspaceInheritedMembers */
    async listWorkspaceInheritedMembers(input: WonderSearchListWorkspaceInheritedMembersInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      return transport0.request<WonderSearchListWorkspaceInheritedMembersResponse>(wondersearchOperations.listWorkspaceInheritedMembers, input);
    },
    /** listWorkspaceMembers */
    async listWorkspaceMembers(input: WonderSearchListWorkspaceMembersInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      return transport0.request<WonderSearchListWorkspaceMembersResponse>(wondersearchOperations.listWorkspaceMembers, input);
    },
    /** createWorkspaceMember */
    async createWorkspaceMember(input: WonderSearchCreateWorkspaceMemberInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.body === undefined) throw new SearchError("invalid_request");
      if (input.headers?.["Idempotency-Key"] == null) throw new SearchError("invalid_request");
      return transport0.request<WonderSearchCreateWorkspaceMemberResponse>(wondersearchOperations.createWorkspaceMember, withoutNullHeaders(input));
    },
    /** updateWorkspaceMember */
    async updateWorkspaceMember(input: WonderSearchUpdateWorkspaceMemberInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.body === undefined) throw new SearchError("invalid_request");
      if (input.headers?.["If-Match"] == null) throw new SearchError("invalid_request");
      return transport0.request<WonderSearchUpdateWorkspaceMemberResponse>(wondersearchOperations.updateWorkspaceMember, withoutNullHeaders(input));
    },
    /** deleteWorkspaceMember */
    async deleteWorkspaceMember(input: WonderSearchDeleteWorkspaceMemberInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.headers?.["If-Match"] == null) throw new SearchError("invalid_request");
      return transport0.request<WonderSearchDeleteWorkspaceMemberResponse>(wondersearchOperations.deleteWorkspaceMember, withoutNullHeaders(input));
    },
    /** listOrganizationInvitations */
    async listOrganizationInvitations(input: WonderSearchListOrganizationInvitationsInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      return transport0.request<WonderSearchListOrganizationInvitationsResponse>(wondersearchOperations.listOrganizationInvitations, input);
    },
    /** createOrganizationInvitation */
    async createOrganizationInvitation(input: WonderSearchCreateOrganizationInvitationInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.body === undefined) throw new SearchError("invalid_request");
      if (input.headers?.["Idempotency-Key"] == null) throw new SearchError("invalid_request");
      return transport0.request<WonderSearchCreateOrganizationInvitationResponse>(wondersearchOperations.createOrganizationInvitation, withoutNullHeaders(input));
    },
    /** getOrganizationInvitation */
    async getOrganizationInvitation(input: WonderSearchGetOrganizationInvitationInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      return transport0.request<WonderSearchGetOrganizationInvitationResponse>(wondersearchOperations.getOrganizationInvitation, input);
    },
    /** getOrganizationInvitation with response headers */
    async getOrganizationInvitationRaw(input: WonderSearchGetOrganizationInvitationRawInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      return transport0.request<WonderSearchGetOrganizationInvitationRawResponse>(wondersearchOperations.getOrganizationInvitationRaw, input);
    },
    /** deleteOrganizationInvitation */
    async deleteOrganizationInvitation(input: WonderSearchDeleteOrganizationInvitationInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.headers?.["If-Match"] == null) throw new SearchError("invalid_request");
      return transport0.request<WonderSearchDeleteOrganizationInvitationResponse>(wondersearchOperations.deleteOrganizationInvitation, withoutNullHeaders(input));
    },
    /** resendOrganizationInvitation */
    async resendOrganizationInvitation(input: WonderSearchResendOrganizationInvitationInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.headers?.["Idempotency-Key"] == null) throw new SearchError("invalid_request");
      return transport0.request<WonderSearchResendOrganizationInvitationResponse>(wondersearchOperations.resendOrganizationInvitation, withoutNullHeaders(input));
    },
    /** previewInvitation */
    async previewInvitation(input: WonderSearchPreviewInvitationInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.body === undefined) throw new SearchError("invalid_request");
      return transport0.request<WonderSearchPreviewInvitationResponse>(wondersearchOperations.previewInvitation, input);
    },
    /** acceptInvitation */
    async acceptInvitation(input: WonderSearchAcceptInvitationInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.body === undefined) throw new SearchError("invalid_request");
      if (input.headers?.["Idempotency-Key"] == null) throw new SearchError("invalid_request");
      return transport0.request<WonderSearchAcceptInvitationResponse>(wondersearchOperations.acceptInvitation, withoutNullHeaders(input));
    },
    /** listWorkspaceApiKeys */
    async listWorkspaceApiKeys(input: WonderSearchListWorkspaceApiKeysInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      return transport0.request<WonderSearchListWorkspaceApiKeysResponse>(wondersearchOperations.listWorkspaceApiKeys, input);
    },
    /** createWorkspaceApiKey */
    async createWorkspaceApiKey(input: WonderSearchCreateWorkspaceApiKeyInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.body === undefined) throw new SearchError("invalid_request");
      if (input.headers?.["Idempotency-Key"] == null) throw new SearchError("invalid_request");
      return transport0.request<WonderSearchCreateWorkspaceApiKeyResponse>(wondersearchOperations.createWorkspaceApiKey, withoutNullHeaders(input));
    },
    /** deleteWorkspaceApiKey */
    async deleteWorkspaceApiKey(input: WonderSearchDeleteWorkspaceApiKeyInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      return transport0.request<WonderSearchDeleteWorkspaceApiKeyResponse>(wondersearchOperations.deleteWorkspaceApiKey, input);
    },
    /** getWorkspaceOverview */
    async getWorkspaceOverview(input: WonderSearchGetWorkspaceOverviewInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      return transport0.request<WonderSearchGetWorkspaceOverviewResponse>(wondersearchOperations.getWorkspaceOverview, input);
    },
    /** getOrganizationUsage */
    async getOrganizationUsage(input: WonderSearchGetOrganizationUsageInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      return transport0.request<WonderSearchGetOrganizationUsageResponse>(wondersearchOperations.getOrganizationUsage, input);
    },
    /** listWorkspaceDrives */
    async listWorkspaceDrives(input: WonderSearchListWorkspaceDrivesInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      return transport0.request<WonderSearchListWorkspaceDrivesResponse>(wondersearchOperations.listWorkspaceDrives, input);
    },
    /** createWorkspaceDrive */
    async createWorkspaceDrive(input: WonderSearchCreateWorkspaceDriveInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.body === undefined) throw new SearchError("invalid_request");
      if (input.headers?.["Idempotency-Key"] == null) throw new SearchError("invalid_request");
      return transport0.request<WonderSearchCreateWorkspaceDriveResponse>(wondersearchOperations.createWorkspaceDrive, withoutNullHeaders(input));
    },
    /** getDrive */
    async getDrive(input: WonderSearchGetDriveInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      return transport0.request<WonderSearchGetDriveResponse>(wondersearchOperations.getDrive, input);
    },
    /** getDrive with response headers */
    async getDriveRaw(input: WonderSearchGetDriveRawInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      return transport0.request<WonderSearchGetDriveRawResponse>(wondersearchOperations.getDriveRaw, input);
    },
    /** updateDrive */
    async updateDrive(input: WonderSearchUpdateDriveInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.body === undefined) throw new SearchError("invalid_request");
      if (input.headers?.["If-Match"] == null) throw new SearchError("invalid_request");
      return transport0.request<WonderSearchUpdateDriveResponse>(wondersearchOperations.updateDrive, withoutNullHeaders(input));
    },
    /** deleteDrive */
    async deleteDrive(input: WonderSearchDeleteDriveInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.headers?.["Idempotency-Key"] == null) throw new SearchError("invalid_request");
      if (input.headers?.["If-Match"] == null) throw new SearchError("invalid_request");
      return transport0.request<WonderSearchDeleteDriveResponse>(wondersearchOperations.deleteDrive, withoutNullHeaders(input));
    },
    /** listDriveFolders */
    async listDriveFolders(input: WonderSearchListDriveFoldersInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      return transport0.request<WonderSearchListDriveFoldersResponse>(wondersearchOperations.listDriveFolders, input);
    },
    /** createDriveFolder */
    async createDriveFolder(input: WonderSearchCreateDriveFolderInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.body === undefined) throw new SearchError("invalid_request");
      if (input.headers?.["Idempotency-Key"] == null) throw new SearchError("invalid_request");
      return transport0.request<WonderSearchCreateDriveFolderResponse>(wondersearchOperations.createDriveFolder, withoutNullHeaders(input));
    },
    /** getDriveFolder */
    async getDriveFolder(input: WonderSearchGetDriveFolderInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      return transport0.request<WonderSearchGetDriveFolderResponse>(wondersearchOperations.getDriveFolder, input);
    },
    /** getDriveFolder with response headers */
    async getDriveFolderRaw(input: WonderSearchGetDriveFolderRawInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      return transport0.request<WonderSearchGetDriveFolderRawResponse>(wondersearchOperations.getDriveFolderRaw, input);
    },
    /** updateDriveFolder */
    async updateDriveFolder(input: WonderSearchUpdateDriveFolderInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.body === undefined) throw new SearchError("invalid_request");
      if (input.headers?.["If-Match"] == null) throw new SearchError("invalid_request");
      return transport0.request<WonderSearchUpdateDriveFolderResponse>(wondersearchOperations.updateDriveFolder, withoutNullHeaders(input));
    },
    /** deleteDriveFolder */
    async deleteDriveFolder(input: WonderSearchDeleteDriveFolderInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.headers?.["Idempotency-Key"] == null) throw new SearchError("invalid_request");
      if (input.headers?.["If-Match"] == null) throw new SearchError("invalid_request");
      return transport0.request<WonderSearchDeleteDriveFolderResponse>(wondersearchOperations.deleteDriveFolder, withoutNullHeaders(input));
    },
    /** createDriveDocument */
    async createDriveDocument(input: WonderSearchCreateDriveDocumentInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.body === undefined) throw new SearchError("invalid_request");
      if (input.headers?.["Idempotency-Key"] == null) throw new SearchError("invalid_request");
      return transport0.request<WonderSearchCreateDriveDocumentResponse>(wondersearchOperations.createDriveDocument, withoutNullHeaders(input));
    },
    /** listDriveDocuments */
    async listDriveDocuments(input: WonderSearchListDriveDocumentsInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      return transport0.request<WonderSearchListDriveDocumentsResponse>(wondersearchOperations.listDriveDocuments, input);
    },
    /** getDriveDocument */
    async getDriveDocument(input: WonderSearchGetDriveDocumentInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      return transport0.request<WonderSearchGetDriveDocumentResponse>(wondersearchOperations.getDriveDocument, input);
    },
    /** replaceDocument */
    async replaceDocument(input: WonderSearchReplaceDocumentInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.body === undefined) throw new SearchError("invalid_request");
      if (input.headers?.["Idempotency-Key"] == null) throw new SearchError("invalid_request");
      return transport0.request<WonderSearchReplaceDocumentResponse>(wondersearchOperations.replaceDocument, withoutNullHeaders(input));
    },
    /** deleteDriveDocument */
    async deleteDriveDocument(input: WonderSearchDeleteDriveDocumentInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.headers?.["Idempotency-Key"] == null) throw new SearchError("invalid_request");
      return transport0.request<WonderSearchDeleteDriveDocumentResponse>(wondersearchOperations.deleteDriveDocument, withoutNullHeaders(input));
    },
    /** getDriveDocumentSource */
    async getDriveDocumentSource(input: WonderSearchGetDriveDocumentSourceInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      return transport0.request<WonderSearchGetDriveDocumentSourceResponse>(wondersearchOperations.getDriveDocumentSource, input);
    },
    /** getWorkspaceDefaultDrive */
    async getWorkspaceDefaultDrive(input: WonderSearchGetWorkspaceDefaultDriveInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      return transport0.request<WonderSearchGetWorkspaceDefaultDriveResponse>(wondersearchOperations.getWorkspaceDefaultDrive, input);
    },
    /** getWorkspaceDefaultDrive with response headers */
    async getWorkspaceDefaultDriveRaw(input: WonderSearchGetWorkspaceDefaultDriveRawInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      return transport0.request<WonderSearchGetWorkspaceDefaultDriveRawResponse>(wondersearchOperations.getWorkspaceDefaultDriveRaw, input);
    },
    /** setDefaultDrive */
    async setDefaultDrive(input: WonderSearchSetDefaultDriveInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.body === undefined) throw new SearchError("invalid_request");
      if (input.headers?.["Idempotency-Key"] == null) throw new SearchError("invalid_request");
      if (input.headers?.["If-Match"] == null) throw new SearchError("invalid_request");
      return transport0.request<WonderSearchSetDefaultDriveResponse>(wondersearchOperations.setDefaultDrive, withoutNullHeaders(input));
    },
    /** getSdkContext */
    async getSdkContext(input: WonderSearchGetSdkContextInput = {}) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      return transport0.request<WonderSearchGetSdkContextResponse>(wondersearchOperations.getSdkContext, input);
    },
    /** getDriveUploadCapabilities */
    async getDriveUploadCapabilities(input: WonderSearchGetDriveUploadCapabilitiesInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      return transport0.request<WonderSearchGetDriveUploadCapabilitiesResponse>(wondersearchOperations.getDriveUploadCapabilities, input);
    },
    /** createUploadBatch */
    async createUploadBatch(input: WonderSearchCreateUploadBatchInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.body === undefined) throw new SearchError("invalid_request");
      return transport0.request<WonderSearchCreateUploadBatchResponse>(wondersearchOperations.createUploadBatch, input);
    },
    /** completeUploadBatch */
    async completeUploadBatch(input: WonderSearchCompleteUploadBatchInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.body === undefined) throw new SearchError("invalid_request");
      return transport0.request<WonderSearchCompleteUploadBatchResponse>(wondersearchOperations.completeUploadBatch, input);
    },
    /** getUploadBatchStatus */
    async getUploadBatchStatus(input: WonderSearchGetUploadBatchStatusInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.body === undefined) throw new SearchError("invalid_request");
      return transport0.request<WonderSearchGetUploadBatchStatusResponse>(wondersearchOperations.getUploadBatchStatus, input);
    },
    /** createDriveUpload */
    async createDriveUpload(input: WonderSearchCreateDriveUploadInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.body === undefined) throw new SearchError("invalid_request");
      if (input.headers?.["Idempotency-Key"] == null) throw new SearchError("invalid_request");
      return transport0.request<WonderSearchCreateDriveUploadResponse>(wondersearchOperations.createDriveUpload, withoutNullHeaders(input));
    },
    /** getDriveUpload */
    async getDriveUpload(input: WonderSearchGetDriveUploadInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      return transport0.request<WonderSearchGetDriveUploadResponse>(wondersearchOperations.getDriveUpload, input);
    },
    /** uploadContent */
    async uploadContent(input: WonderSearchUploadContentInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.rawBody === undefined) throw new SearchError("invalid_request");
      if (input.headers?.["Idempotency-Key"] == null) throw new SearchError("invalid_request");
      return transport0.request<WonderSearchUploadContentResponse>(wondersearchOperations.uploadContent, withoutNullHeaders(input));
    },
    /** createUploadTransfer */
    async createUploadTransfer(input: WonderSearchCreateUploadTransferInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.body === undefined) throw new SearchError("invalid_request");
      if (input.headers?.["Idempotency-Key"] == null) throw new SearchError("invalid_request");
      return transport0.request<WonderSearchCreateUploadTransferResponse>(wondersearchOperations.createUploadTransfer, withoutNullHeaders(input));
    },
    /** completeUpload */
    async completeUpload(input: WonderSearchCompleteUploadInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.body === undefined) throw new SearchError("invalid_request");
      if (input.headers?.["Idempotency-Key"] == null) throw new SearchError("invalid_request");
      return transport0.request<WonderSearchCompleteUploadResponse>(wondersearchOperations.completeUpload, withoutNullHeaders(input));
    },
    /** getWorkspaceOperation */
    async getWorkspaceOperation(input: WonderSearchGetWorkspaceOperationInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      return transport0.request<WonderSearchGetWorkspaceOperationResponse>(wondersearchOperations.getWorkspaceOperation, input);
    },
    /** createImport */
    async createImport(input: WonderSearchCreateImportInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.body === undefined) throw new SearchError("invalid_request");
      return transport0.request<WonderSearchCreateImportResponse>(wondersearchOperations.createImport, input);
    },
    /** getImport */
    async getImport(input: WonderSearchGetImportInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      return transport0.request<WonderSearchGetImportResponse>(wondersearchOperations.getImport, input);
    },
    /** declareImportChunks */
    async declareImportChunks(input: WonderSearchDeclareImportChunksInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.body === undefined) throw new SearchError("invalid_request");
      return transport0.request<WonderSearchDeclareImportChunksResponse>(wondersearchOperations.declareImportChunks, input);
    },
    /** acknowledgeImportChunk */
    async acknowledgeImportChunk(input: WonderSearchAcknowledgeImportChunkInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.body === undefined) throw new SearchError("invalid_request");
      return transport0.request<WonderSearchAcknowledgeImportChunkResponse>(wondersearchOperations.acknowledgeImportChunk, input);
    },
    /** sealImport */
    async sealImport(input: WonderSearchSealImportInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.body === undefined) throw new SearchError("invalid_request");
      return transport0.request<WonderSearchSealImportResponse>(wondersearchOperations.sealImport, input);
    },
    /** getIngestionMetrics */
    async getIngestionMetrics(input: WonderSearchGetIngestionMetricsInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      return transport0.request<WonderSearchGetIngestionMetricsResponse>(wondersearchOperations.getIngestionMetrics, input);
    },
    /** getOrganizationBilling */
    async getOrganizationBilling(input: WonderSearchGetOrganizationBillingInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      return transport0.request<WonderSearchGetOrganizationBillingResponse>(wondersearchOperations.getOrganizationBilling, input);
    },
    /** setBillingLimits */
    async setBillingLimits(input: WonderSearchSetBillingLimitsInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.body === undefined) throw new SearchError("invalid_request");
      if (input.headers?.["Idempotency-Key"] == null) throw new SearchError("invalid_request");
      return transport0.request<WonderSearchSetBillingLimitsResponse>(wondersearchOperations.setBillingLimits, withoutNullHeaders(input));
    },
    /** getOrganizationBillingLimits */
    async getOrganizationBillingLimits(input: WonderSearchGetOrganizationBillingLimitsInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      return transport0.request<WonderSearchGetOrganizationBillingLimitsResponse>(wondersearchOperations.getOrganizationBillingLimits, input);
    },
    /** getOrganizationBillingUsage */
    async getOrganizationBillingUsage(input: WonderSearchGetOrganizationBillingUsageInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      return transport0.request<WonderSearchGetOrganizationBillingUsageResponse>(wondersearchOperations.getOrganizationBillingUsage, input);
    },
    /** createBillingPortal */
    async createBillingPortal(input: WonderSearchCreateBillingPortalInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.headers?.["Idempotency-Key"] == null) throw new SearchError("invalid_request");
      return transport0.request<WonderSearchCreateBillingPortalResponse>(wondersearchOperations.createBillingPortal, withoutNullHeaders(input));
    },
    /** getOrganizationBillingWallet */
    async getOrganizationBillingWallet(input: WonderSearchGetOrganizationBillingWalletInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      return transport0.request<WonderSearchGetOrganizationBillingWalletResponse>(wondersearchOperations.getOrganizationBillingWallet, input);
    },
    /** getOrganizationBillingActivity */
    async getOrganizationBillingActivity(input: WonderSearchGetOrganizationBillingActivityInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      return transport0.request<WonderSearchGetOrganizationBillingActivityResponse>(wondersearchOperations.getOrganizationBillingActivity, input);
    },
    /** createOrganizationBillingPurchase */
    async createOrganizationBillingPurchase(input: WonderSearchCreateOrganizationBillingPurchaseInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.body === undefined) throw new SearchError("invalid_request");
      if (input.headers?.["Idempotency-Key"] == null) throw new SearchError("invalid_request");
      return transport0.request<WonderSearchCreateOrganizationBillingPurchaseResponse>(wondersearchOperations.createOrganizationBillingPurchase, withoutNullHeaders(input));
    },
    /** getOrganizationBillingPurchase */
    async getOrganizationBillingPurchase(input: WonderSearchGetOrganizationBillingPurchaseInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      return transport0.request<WonderSearchGetOrganizationBillingPurchaseResponse>(wondersearchOperations.getOrganizationBillingPurchase, input);
    },
    /** listOrganizationBillingInvoices */
    async listOrganizationBillingInvoices(input: WonderSearchListOrganizationBillingInvoicesInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      return transport0.request<WonderSearchListOrganizationBillingInvoicesResponse>(wondersearchOperations.listOrganizationBillingInvoices, input);
    },
    /** getWorkspaceStorage */
    async getWorkspaceStorage(input: WonderSearchGetWorkspaceStorageInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      return transport0.request<WonderSearchGetWorkspaceStorageResponse>(wondersearchOperations.getWorkspaceStorage, input);
    },
    /** setWorkspaceStorage */
    async setWorkspaceStorage(input: WonderSearchSetWorkspaceStorageInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.body === undefined) throw new SearchError("invalid_request");
      if (input.headers?.["Idempotency-Key"] == null) throw new SearchError("invalid_request");
      return transport0.request<WonderSearchSetWorkspaceStorageResponse>(wondersearchOperations.setWorkspaceStorage, withoutNullHeaders(input));
    },
    /** quoteWorkspaceStorage */
    async quoteWorkspaceStorage(input: WonderSearchQuoteWorkspaceStorageInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.body === undefined) throw new SearchError("invalid_request");
      return transport0.request<WonderSearchQuoteWorkspaceStorageResponse>(wondersearchOperations.quoteWorkspaceStorage, input);
    },
    /** closeImport */
    async closeImport(input: WonderSearchCloseImportInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.body === undefined) throw new SearchError("invalid_request");
      return transport0.request<WonderSearchCloseImportResponse>(wondersearchOperations.closeImport, input);
    },
    /** recoverImport */
    async recoverImport(input: WonderSearchRecoverImportInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.body === undefined) throw new SearchError("invalid_request");
      return transport0.request<WonderSearchRecoverImportResponse>(wondersearchOperations.recoverImport, input);
    },
    /** retryImportOperation */
    async retryImportOperation(input: WonderSearchRetryImportOperationInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.body === undefined) throw new SearchError("invalid_request");
      return transport0.request<WonderSearchRetryImportOperationResponse>(wondersearchOperations.retryImportOperation, input);
    },
    /** getAutoTopup */
    async getAutoTopup(input: WonderSearchGetAutoTopupInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      return transport0.request<WonderSearchGetAutoTopupResponse>(wondersearchOperations.getAutoTopup, input);
    },
    /** checkoutAutoTopup */
    async checkoutAutoTopup(input: WonderSearchCheckoutAutoTopupInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.body === undefined) throw new SearchError("invalid_request");
      if (input.headers?.["Idempotency-Key"] == null) throw new SearchError("invalid_request");
      return transport0.request<WonderSearchCheckoutAutoTopupResponse>(wondersearchOperations.checkoutAutoTopup, withoutNullHeaders(input));
    },
    /** amountAutoTopup */
    async amountAutoTopup(input: WonderSearchAmountAutoTopupInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.body === undefined) throw new SearchError("invalid_request");
      if (input.headers?.["Idempotency-Key"] == null) throw new SearchError("invalid_request");
      return transport0.request<WonderSearchAmountAutoTopupResponse>(wondersearchOperations.amountAutoTopup, withoutNullHeaders(input));
    },
    /** cancelAutoTopup */
    async cancelAutoTopup(input: WonderSearchCancelAutoTopupInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.body === undefined) throw new SearchError("invalid_request");
      if (input.headers?.["Idempotency-Key"] == null) throw new SearchError("invalid_request");
      return transport0.request<WonderSearchCancelAutoTopupResponse>(wondersearchOperations.cancelAutoTopup, withoutNullHeaders(input));
    },
    /** resumeAutoTopup */
    async resumeAutoTopup(input: WonderSearchResumeAutoTopupInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.body === undefined) throw new SearchError("invalid_request");
      if (input.headers?.["Idempotency-Key"] == null) throw new SearchError("invalid_request");
      return transport0.request<WonderSearchResumeAutoTopupResponse>(wondersearchOperations.resumeAutoTopup, withoutNullHeaders(input));
    },
  });
}
export type WonderSearchClient = ReturnType<typeof createWonderSearchClient>;
