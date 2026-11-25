export type Role = "admin" | "editor" | "viewer";
export interface Me {
  user: {
    id: string;
    email: string;
    name: string;
    isSuperAdmin: boolean;
    companyId?: string;
    companyRole?: string;
  };
  company?: { companyId: string; companyDisplayName: string; role: string };
  membership: { teamId: string; teamName: string; role: Role }[];
}
export interface Company {
  id: string;
  displayName: string;
  description: string;
}
export interface Team {
  id: string;
  name: string;
  companyId: string;
  description: string;
}
export interface Flagset {
  id: string;
  teamId: string;
  name: string;
  description: string;
  flagCount: number;
  enabledFlagCount: number;
  apiKeyCount: number;
  evaluationContextEnrichment?: Record<string, unknown>;
  defaultTestingEvaluationContext?: Record<string, unknown>;
}
export interface Rule {
  name?: string;
  query?: string;
  queryFormat?: string;
  variation?: string;
  percentage?: Record<string, number>;
  disable?: boolean;
  progressiveRollout?: {
    initial: { variation: string; percentage: number; date: string };
    end: { variation: string; percentage: number; date: string };
  };
  [key: string]: unknown;
}
export interface Payload {
  variations: Record<string, unknown>;
  defaultRule: Rule;
  targeting?: Rule[];
  metadata?: Record<string, unknown>;
  [key: string]: unknown;
}
export interface Flag {
  id: string;
  flagsetId: string;
  name: string;
  disabled: boolean;
  currentVersion: number;
  updatedAt: string;
  payload: Payload;
}
export interface FlagRow extends Omit<Flag, "payload"> {
  flagsetName: string;
  type: string;
  owner?: string;
  tags?: string[];
  distribution?: Record<string, number>;
  targetingRuleCount: number;
  variations?: string[];
  progressiveRollout?: { from: number; to: number };
}
export interface Page<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
export interface Version {
  id: string;
  versionNumber: number;
  payload: Payload;
  comment: string;
  createdAt: string;
  createdByName?: string;
}
export interface Member {
  id: string;
  userId: string;
  email: string;
  name: string;
  role: string;
}
export interface APIKey {
  id: string;
  label: string;
  apiKey: string;
  createdAt: string;
}
export interface Audit {
  id: number;
  occurredAt: string;
  actorEmail?: string;
  action: string;
  targetType: string;
  targetId: string;
  before?: unknown;
  after?: unknown;
}
