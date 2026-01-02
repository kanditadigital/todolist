
import React from 'react';
import { Todo, TaskStatus } from '../types';

interface TodoItemProps {
  todo: Todo;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: TaskStatus) => void;
}

const statusColors: Record<TaskStatus, string> = {
  backlog: 'bg-slate-100 text-slate-500 border-slate-200',
  todo: 'bg-indigo-50 text-indigo-600 border-indigo-100',
  'in-progress': 'bg-blue-50 text-blue-600 border-blue-100',
  review: 'bg-amber-50 text-amber-600 border-amber-100',
  done: 'bg-emerald-50 text-emerald-600 border-emerald-100',
};

const STATUS_OPTIONS: TaskStatus[] = ['backlog', 'todo', 'in-progress', 'review', 'done'];

export const getCountdown = (deadline?: number) => {
  if (!deadline) return null;
  const now = Date.now();
  const diff = deadline - now;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

  if (diff < 0) return { text: 'OVERDUE', color: 'text-rose-600 bg-rose-50 border-rose-100', urgent: true };
  if (days === 0) return { text: `${hours}h left`, color: 'text-orange-600 bg-orange-50 border-orange-100', urgent: true };
  if (days < 3) return { text: `${days}d left`, color: 'text-amber-600 bg-amber-50 border-amber-100', urgent: false };
  return { text: `${days}d left`, color: 'text-emerald-600 bg-emerald-50 border-emerald-100', urgent: false };
};

const TodoItem: React.FC<TodoItemProps> = ({ todo, onToggle, onDelete, onStatusChange }) => {
  const countdown = getCountdown(todo.deadline);

  return (
    <div className={`flex items-center gap-3 p-4 hover:bg-slate-50/80 transition-all group border-b border-slate-100 last:border-0 ${todo.completed ? 'bg-slate-50/30' : ''}`}>
      <button 
        onClick={() => onToggle(todo.id)}
        className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all shrink-0 
          ${todo.completed 
            ? 'bg-indigo-600 border-indigo-600 shadow-sm' 
            : 'border-slate-300 bg-white hover:border-indigo-400'}`}
      >
        {todo.completed && (
          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" />
          </svg>
        )}
      </button>
      
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-1.5">
          <span className={`text-[15px] font-bold truncate block transition-all ${todo.completed ? 'line-through text-slate-400' : 'text-slate-800'}`}>
            {todo.text}
          </span>
          
          <div className="flex gap-1.5">
            <select 
              value={todo.status}
              onChange={(e) => onStatusChange(todo.id, e.target.value as TaskStatus)}
              className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-widest border outline-none cursor-pointer hover:brightness-95 transition-all ${statusColors[todo.status]}`}
            >
              {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.replace('-', ' ')}</option>)}
            </select>

            {countdown && (
              <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-widest border flex items-center gap-1 ${countdown.color} ${countdown.urgent ? 'animate-pulse' : ''}`}>
                <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                {countdown.text}
              </span>
            )}
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-y-1 gap-x-3">
          {todo.assignedTo && (
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 rounded-full bg-slate-200 flex items-center justify-center text-[7px] font-bold text-slate-600 border border-slate-300 uppercase">
                {todo.assignedTo[0]}
              </div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">
                {todo.assignedTo.split('@')[0]}
              </span>
            </div>
          )}
          <span className="text-[10px] text-slate-300 font-bold uppercase tracking-widest font-mono">
            LOG: {new Date(todo.createdAt).toLocaleDateString()}
          </span>
          {todo.deadline && (
            <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest font-mono">
              DUE: {new Date(todo.deadline).toLocaleDateString()}
            </span>
          )}
        </div>
      </div>

      <button 
        onClick={() => onDelete(todo.id)}
        className="p-2 text-slate-300 hover:text-rose-500 transition-all rounded-md md:opacity-0 group-hover:opacity-100"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-4v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
    </div>
  );
};

export default TodoItem;
