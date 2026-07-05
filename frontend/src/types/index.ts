// ============================================================
// TECHNOVA — Comprehensive Type Definitions
// AI Organizational Intelligence Platform
// ============================================================

// ── Enums / Literal Types ─────────────────────────────────────────────────────

export type Role =
  | 'ADMIN'
  | 'MANAGER'
  | 'TEAM_LEAD'
  | 'EMPLOYEE';

export type ProjectStatus =
  | 'PLANNING'
  | 'ACTIVE'
  | 'ON_HOLD'
  | 'COMPLETED'
  | 'CANCELLED';

export type TaskStatus =
  | 'TODO'
  | 'IN_PROGRESS'
  | 'IN_REVIEW'
  | 'DONE'
  | 'BLOCKED';

export type TaskPriority =
  | 'LOW'
  | 'MEDIUM'
  | 'HIGH'
  | 'CRITICAL';

export type BugSeverity =
  | 'LOW'
  | 'MEDIUM'
  | 'HIGH'
  | 'CRITICAL';

export type BugStatus =
  | 'OPEN'
  | 'IN_PROGRESS'
  | 'RESOLVED'
  | 'CLOSED'
  | 'WONT_FIX';

export type AttendanceStatus =
  | 'PRESENT'
  | 'ABSENT'
  | 'HALF_DAY'
  | 'WORK_FROM_HOME'
  | 'ON_LEAVE';

export type InsightType =
  | 'PROJECT_RISK'
  | 'EMPLOYEE_BURNOUT'
  | 'TEAM_VELOCITY'
  | 'ORG_HEALTH'
  | 'PROMOTION_RECOMMENDATION'
  | 'KNOWLEDGE_GAP';

// ── Base Model ────────────────────────────────────────────────────────────────

export interface BaseModel {
  id: string;
  createdAt: string;   // ISO 8601
  updatedAt: string;   // ISO 8601
}

// ── Organization ─────────────────────────────────────────────────────────────

export interface Organization extends BaseModel {
  name: string;
  slug: string;
  logoUrl?: string;
  industry?: string;
  size?: number;              // total headcount
  website?: string;
  description?: string;
  plan: 'FREE' | 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE';
  isActive: boolean;
  settings?: OrganizationSettings;
}

export interface OrganizationSettings {
  allowSelfSignup: boolean;
  defaultRole: Role;
  workingHoursPerDay: number;
  timezone: string;
  fiscalYearStart: number;    // 1-12 (month)
  enableAiInsights: boolean;
  slackWebhookUrl?: string;
  teamsWebhookUrl?: string;
}

// ── Department ────────────────────────────────────────────────────────────────

export interface Department extends BaseModel {
  organizationId: string;
  organization?: Organization;
  name: string;
  description?: string;
  headId?: string;            // Employee id of dept head
  head?: Employee;
  parentDepartmentId?: string;
  parentDepartment?: Department;
  budget?: number;
  headcount?: number;
  isActive: boolean;
}

// ── Team ──────────────────────────────────────────────────────────────────────

export interface Team extends BaseModel {
  organizationId: string;
  organization?: Organization;
  departmentId?: string;
  department?: Department;
  name: string;
  description?: string;
  leadId?: string;
  lead?: Employee;
  avatarUrl?: string;
  isActive: boolean;
  memberCount?: number;
  currentSprintId?: string;
}

// ── User ──────────────────────────────────────────────────────────────────────

export interface User extends BaseModel {
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;           // computed: firstName + lastName
  avatarUrl?: string;
  role: Role;
  organizationId: string;
  organization?: Organization;
  isActive: boolean;
  lastLoginAt?: string;       // ISO 8601
  emailVerifiedAt?: string;   // ISO 8601
  preferences?: UserPreferences;
}

export interface UserPreferences {
  theme: 'dark' | 'light' | 'system';
  language: string;           // e.g. 'en-US'
  notifications: NotificationPreferences;
  dashboardLayout?: DashboardLayoutItem[];
}

export interface NotificationPreferences {
  email: boolean;
  inApp: boolean;
  slack: boolean;
  teams: boolean;
  digestFrequency: 'real_time' | 'hourly' | 'daily' | 'weekly';
}

export interface DashboardLayoutItem {
  widgetId: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

// ── Employee ──────────────────────────────────────────────────────────────────

export interface Employee extends BaseModel {
  userId: string;
  user?: User;
  organizationId: string;
  organization?: Organization;
  departmentId?: string;
  department?: Department;
  teamId?: string;
  team?: Team;
  managerId?: string;
  manager?: Employee;

  // Professional details
  employeeCode: string;
  jobTitle: string;
  level?: string;             // e.g. 'L3', 'Senior', 'Principal'
  band?: string;              // compensation band
  employmentType: 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | 'INTERN';
  joinedAt: string;           // ISO 8601
  exitedAt?: string;          // ISO 8601

  // Skills & metadata
  skills?: string[];
  certifications?: string[];
  bio?: string;
  linkedinUrl?: string;
  githubUsername?: string;

  // Performance metrics (aggregated / cached)
  performanceScore?: number;  // 0-100
  burnoutRisk?: number;       // 0-100
  velocityTrend?: 'UP' | 'DOWN' | 'STABLE';
  isActive: boolean;
}

// ── Project ───────────────────────────────────────────────────────────────────

export interface Project extends BaseModel {
  organizationId: string;
  organization?: Organization;
  teamId?: string;
  team?: Team;
  managerId: string;
  manager?: Employee;

  name: string;
  key: string;                // short identifier, e.g. 'TN-01'
  description?: string;
  status: ProjectStatus;
  priority: TaskPriority;

  startDate?: string;         // ISO 8601
  targetEndDate?: string;     // ISO 8601
  actualEndDate?: string;     // ISO 8601

  budget?: number;
  spentBudget?: number;
  currency?: string;          // ISO 4217

  githubRepoUrl?: string;
  jiraProjectKey?: string;
  confluenceSpaceKey?: string;

  tags?: string[];
  isPublic: boolean;

  // Aggregated metrics
  taskCount?: number;
  completedTaskCount?: number;
  bugCount?: number;
  openBugCount?: number;
  completionPercentage?: number;
  healthScore?: number;       // 0-100
  riskLevel?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

// ── Sprint ─────────────────────────────────────────────────────────────────────

export interface Sprint extends BaseModel {
  projectId: string;
  project?: Project;
  name: string;
  goal?: string;
  status: 'PLANNED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  startDate: string;          // ISO 8601
  endDate: string;            // ISO 8601
  capacity?: number;          // story points
  committedPoints?: number;
  completedPoints?: number;
  velocityPoints?: number;
  carryoverTaskIds?: string[];
  retrospectiveNotes?: string;
}

// ── Task ──────────────────────────────────────────────────────────────────────

export interface Task extends BaseModel {
  projectId: string;
  project?: Project;
  sprintId?: string;
  sprint?: Sprint;
  parentTaskId?: string;      // for subtasks
  parentTask?: Task;

  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;

  assigneeId?: string;
  assignee?: Employee;
  reporterId: string;
  reporter?: Employee;

  estimatedHours?: number;
  loggedHours?: number;
  storyPoints?: number;

  dueDate?: string;           // ISO 8601
  startedAt?: string;         // ISO 8601
  completedAt?: string;       // ISO 8601

  tags?: string[];
  attachmentUrls?: string[];
  externalId?: string;        // Jira issue key, GitHub PR, etc.

  blockedBy?: string[];       // task IDs
  blocksTaskIds?: string[];   // task IDs
  subtasks?: Task[];
  commentCount?: number;
}

// ── Bug ───────────────────────────────────────────────────────────────────────

export interface Bug extends BaseModel {
  projectId: string;
  project?: Project;
  sprintId?: string;
  sprint?: Sprint;
  taskId?: string;            // related task

  title: string;
  description?: string;
  stepsToReproduce?: string;
  expectedBehavior?: string;
  actualBehavior?: string;

  severity: BugSeverity;
  status: BugStatus;

  reporterId: string;
  reporter?: Employee;
  assigneeId?: string;
  assignee?: Employee;

  environment?: string;       // 'production', 'staging', 'dev'
  version?: string;
  platform?: string;          // 'web', 'ios', 'android', 'api'
  browserInfo?: string;

  resolvedAt?: string;        // ISO 8601
  closedAt?: string;          // ISO 8601
  dueDate?: string;           // ISO 8601

  attachmentUrls?: string[];
  externalId?: string;        // e.g. GitHub issue number
  tags?: string[];
}

// ── Attendance ────────────────────────────────────────────────────────────────

export interface Attendance extends BaseModel {
  employeeId: string;
  employee?: Employee;
  organizationId: string;

  date: string;               // YYYY-MM-DD
  status: AttendanceStatus;
  checkInAt?: string;         // ISO 8601 datetime
  checkOutAt?: string;        // ISO 8601 datetime
  workHours?: number;         // computed
  overtimeHours?: number;
  leaveType?: string;         // 'SICK', 'CASUAL', 'EARNED', etc.
  notes?: string;
  approvedById?: string;
  approvedAt?: string;        // ISO 8601
  location?: string;          // office name / remote location
}

// ── Daily Report ──────────────────────────────────────────────────────────────

export interface DailyReport extends BaseModel {
  employeeId: string;
  employee?: Employee;
  projectId?: string;
  project?: Project;
  date: string;               // YYYY-MM-DD

  summary: string;            // what was done today
  plannedForTomorrow?: string;
  blockers?: string;
  mood?: 1 | 2 | 3 | 4 | 5; // 1=very bad, 5=great
  workHoursLogged?: number;
  tasksCompleted?: string[];  // task IDs
  tasksInProgress?: string[]; // task IDs

  // AI analysis
  aiSentimentScore?: number;  // -1 to 1
  aiKeyTopics?: string[];
  aiBurnoutSignal?: boolean;
  aiProductivityScore?: number; // 0-100
}

// ── Notification ──────────────────────────────────────────────────────────────

export type NotificationType =
  | 'TASK_ASSIGNED'
  | 'TASK_COMPLETED'
  | 'BUG_REPORTED'
  | 'SPRINT_STARTED'
  | 'SPRINT_ENDED'
  | 'AI_INSIGHT'
  | 'MENTION'
  | 'LEAVE_APPROVED'
  | 'LEAVE_REJECTED'
  | 'DEADLINE_APPROACHING'
  | 'SYSTEM';

export interface Notification extends BaseModel {
  userId: string;
  organizationId: string;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  readAt?: string;            // ISO 8601
  actionUrl?: string;         // deep link
  metadata?: Record<string, unknown>;
  priority: 'LOW' | 'NORMAL' | 'HIGH';
  expiresAt?: string;         // ISO 8601
}

// ── AI Insight ────────────────────────────────────────────────────────────────

export interface AiInsight extends BaseModel {
  organizationId: string;
  type: InsightType;
  subjectId: string;          // employeeId or projectId depending on type
  subjectName: string;        // display name of the subject
  subjectType: 'EMPLOYEE' | 'PROJECT' | 'TEAM' | 'DEPARTMENT' | 'ORGANIZATION';

  title: string;
  verdict: string;            // e.g. 'High Burnout Risk Detected'
  summary: string;            // 1-2 sentence summary
  recommendation: string;     // actionable recommendation
  confidence: number;         // 0-1 confidence score
  severity: 'INFO' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

  evidence: InsightEvidence[];
  metrics?: Record<string, number | string | boolean>;
  tags?: string[];

  isActionable: boolean;
  isDismissed: boolean;
  dismissedAt?: string;       // ISO 8601
  dismissedById?: string;

  resolvedAt?: string;        // ISO 8601
  resolvedById?: string;

  generatedAt: string;        // ISO 8601 — when AI produced this
  modelVersion?: string;      // AI model version that generated it
  nextReviewAt?: string;      // ISO 8601
}

export interface InsightEvidence {
  label: string;              // e.g. 'Overtime Hours (Last 14 days)'
  value: string | number;
  benchmark?: string | number;
  status: 'NORMAL' | 'WARNING' | 'CRITICAL';
}

// ── Health Score ──────────────────────────────────────────────────────────────

export interface HealthScore extends BaseModel {
  organizationId: string;
  subjectId: string;
  subjectType: 'EMPLOYEE' | 'PROJECT' | 'TEAM' | 'DEPARTMENT' | 'ORGANIZATION';
  subjectName: string;

  score: number;              // 0-100
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  trend: 'IMPROVING' | 'DECLINING' | 'STABLE';
  trendDelta: number;         // points change from previous period

  dimensions: HealthScoreDimension[];
  period: string;             // e.g. 'LAST_30_DAYS', 'LAST_7_DAYS'
  calculatedAt: string;       // ISO 8601
}

export interface HealthScoreDimension {
  name: string;               // e.g. 'Attendance', 'Task Completion', 'Bug Rate'
  score: number;              // 0-100
  weight: number;             // 0-1, weights sum to 1
  trend: 'UP' | 'DOWN' | 'STABLE';
  details?: string;
}

// ── Dashboard Summary ─────────────────────────────────────────────────────────

export interface DashboardSummary {
  organizationId: string;
  generatedAt: string;        // ISO 8601

  // High-level counters
  totalEmployees: number;
  activeEmployees: number;
  totalProjects: number;
  activeProjects: number;
  openTasks: number;
  completedTasksThisWeek: number;
  openBugs: number;
  criticalBugs: number;

  // Rates / percentages
  attendanceRateToday: number;       // 0-100
  sprintVelocity: number;            // story points / sprint
  avgTaskCompletionRate: number;     // 0-100
  bugResolutionRate: number;         // 0-100
  employeeEngagementScore: number;   // 0-100

  // Health scores
  orgHealthScore: HealthScore;
  projectHealthScores: HealthScore[];
  teamHealthScores: HealthScore[];

  // AI Insights summary
  totalInsights: number;
  criticalInsights: number;
  unresolvedInsights: number;
  recentInsights: AiInsight[];

  // Recent activity
  recentActivity: ActivityItem[];

  // Charts data
  taskCompletionByDay: TimeSeriesPoint[];
  bugsByDay: TimeSeriesPoint[];
  attendanceByDay: TimeSeriesPoint[];
  velocityBySprintHistory: SprintVelocityPoint[];
}

export interface ActivityItem {
  id: string;
  type: string;
  actorId: string;
  actorName: string;
  actorAvatarUrl?: string;
  description: string;
  entityType?: string;
  entityId?: string;
  entityName?: string;
  timestamp: string;          // ISO 8601
}

export interface TimeSeriesPoint {
  date: string;               // YYYY-MM-DD
  value: number;
  label?: string;
}

export interface SprintVelocityPoint {
  sprintName: string;
  committed: number;
  completed: number;
  carryover: number;
}

// ── API Responses ─────────────────────────────────────────────────────────────

export interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ApiError {
  message: string;
  code?: string;
  field?: string;
  details?: Record<string, string[]>;
}

// ── Filter / Query Types ──────────────────────────────────────────────────────

export interface PaginationParams {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface TaskFilters extends PaginationParams {
  projectId?: string;
  sprintId?: string;
  assigneeId?: string;
  status?: TaskStatus | TaskStatus[];
  priority?: TaskPriority | TaskPriority[];
  dueAfter?: string;
  dueBefore?: string;
  search?: string;
  tags?: string[];
}

export interface BugFilters extends PaginationParams {
  projectId?: string;
  assigneeId?: string;
  severity?: BugSeverity | BugSeverity[];
  status?: BugStatus | BugStatus[];
  environment?: string;
  search?: string;
}

export interface EmployeeFilters extends PaginationParams {
  departmentId?: string;
  teamId?: string;
  role?: Role;
  employmentType?: Employee['employmentType'];
  isActive?: boolean;
  search?: string;
}

export interface InsightFilters extends PaginationParams {
  type?: InsightType | InsightType[];
  severity?: AiInsight['severity'] | AiInsight['severity'][];
  subjectType?: AiInsight['subjectType'];
  isDismissed?: boolean;
  isActionable?: boolean;
  dateFrom?: string;
  dateTo?: string;
}
