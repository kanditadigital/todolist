
export interface User {
  id: string;
  email: string;
  name: string;
  picture: string;
}

export interface TeamMember {
  email: string;
  role: string;
  level: number;
}

export interface Category {
  id: string;
  name: string;
  color: string;
  ownerEmail: string;
  members: string[]; // List of emails who have access
}

export type TaskStatus = 'backlog' | 'todo' | 'in-progress' | 'review' | 'done';

export interface Todo {
  id: string;
  text: string;
  workspaceId: string; // Linked to Category.id
  completed: boolean;
  status: TaskStatus;
  createdAt: number;
  deadline?: number;
  assignedTo?: string; // Email of the assignee
}

export interface NoteTodo {
  id: string;
  text: string;
  completed: boolean;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  items: NoteTodo[];
  workspaceId: string; // Linked to Category.id
  completed: boolean;
  status: TaskStatus;
  createdAt: number;
  deadline?: number;
  assignedTo?: string;
}

export type FilterType = 'all' | 'active' | 'completed';
export type ViewMode = 'tasks' | 'notes';

export interface AdviceResponse {
  advice: string;
  npcName: string;
}

export interface PartyMemberResponse {
  role: string;
  startingLevel: number;
}
