export const TASK_STATUS_OPTIONS = [
  "TO_DO",
  "IN_PROGRESS",
  "WAITING_CUSTOMER",
  "WAITING_INTERNAL",
  "BLOCKED",
  "COMPLETED",
  "CANCELLED",
] as const;

export type TaskStatusValue = (typeof TASK_STATUS_OPTIONS)[number];

export const TASK_PRIORITY_OPTIONS = ["LOW", "NORMAL", "HIGH", "URGENT"] as const;

export type TaskPriorityValue = (typeof TASK_PRIORITY_OPTIONS)[number];
