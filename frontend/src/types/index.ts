export interface Ticket {
  id: string;
  title: string;
  description: string;
  labels: string[];
  story_points: number | null;
  status: string;
  assignee: string | null;
  estimate?: LLMEstimate;
  similar_tickets?: HistoricalTicket[];
  blocks?: DependencyEdge[];
  blocked_by?: DependencyEdge[];
}

export interface HistoricalTicket {
  id: string;
  title: string;
  labels: string[];
  story_points: number;
  actual_cycle_days: number;
  completed_date: string;
}

export interface LLMEstimate {
  points: number;
  low: number;
  high: number;
  rationale: string;
}

export interface DependencyEdge {
  from: string;
  to: string;
  reason: string;
}

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  capacity_hours: number;
  avatar: string;
}

export interface SprintHistoryItem {
  sprint: number;
  start: string;
  end: string;
  committed: number;
  completed: number;
  velocity: number;
}

export interface SprintTicket {
  id: string;
  title: string;
  labels: string[];
  assignee: string;
  sprint_day_start: number;
  estimated_days: number;
  status: string;
  estimate?: LLMEstimate;
}

export interface SprintPlan {
  sprint_number: number;
  start_date: string;
  end_date: string;
  total_capacity_points: number;
  tickets: SprintTicket[];
  deferred: string[];
  notes: string;
}

export interface SlippageForecastPoint {
  day: number;
  date: string;
  completion_probability: number;
  remaining_points: number;
}

export interface AtRiskItem {
  ticket_id: string;
  title: string;
  risk_level: "high" | "medium" | "low";
  reason: string;
}

export interface BoardState {
  todo: Ticket[];
  in_progress: Ticket[];
  review: Ticket[];
  done: Ticket[];
}

export interface BurndownData {
  total_points: number;
  ideal: (number | null)[];
  actual: (number | null)[];
  days: string[];
}

export interface IntegrationFieldStatus {
  [envVar: string]: boolean;
}

export interface IntegrationStatus {
  configured: boolean;
  fields: IntegrationFieldStatus;
}

export interface AllIntegrationStatus {
  jira:   IntegrationStatus;
  slack:  IntegrationStatus;
  github: IntegrationStatus;
  linear: IntegrationStatus;
}

export interface IntegrationConfig {
  jira_url?:          string;
  jira_email?:        string;
  jira_api_token?:    string;
  jira_project_key?:  string;
  jira_board_id?:     string;
  slack_webhook_url?: string;
  slack_bot_token?:   string;
  github_token?:      string;
  github_owner?:      string;
  github_repo?:       string;
  linear_api_key?:    string;
  linear_team_id?:    string;
}
