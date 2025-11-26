
import React, { useState } from 'react';
import { Task } from '../types';
import { breakDownTask } from '../services/geminiService';

interface TaskBoardProps {
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
}

const TaskBoard: React.FC<TaskBoardProps> = ({ tasks, setTasks }) => {
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [loadingAi, setLoadingAi] = useState<string | null>(null);
  const [showPrioritySelect, setShowPrioritySelect] = useState(false);

  const addTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    const task: Task = {
      id: crypto.randomUUID(),
      title: newTaskTitle,
      isCompleted: false,
      priority: newTaskPriority,
      subtasks: [],
      createdAt: Date.now()
    };
    setTasks(prev => [task, ...prev]);
    setNewTaskTitle('');
    setNewTaskPriority('medium');
    setShowPrioritySelect(false);
  };

  const toggleTask = (id: string) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, isCompleted: !t.isCompleted } : t));
  };

  const deleteTask = (id: string) => {
    setTasks(tasks.filter(t => t.id !== id));
  };

  const handleAiBreakdown = async (task: Task) => {
    setLoadingAi(task.id);
    const subtaskTitles = await breakDownTask(task.title);
    if (subtaskTitles.length > 0) {
      const newSubtasks = subtaskTitles.map(title => ({
        id: crypto.randomUUID(),
        title,
        isCompleted: false
      }));
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, subtasks: [...t.subtasks, ...newSubtasks] } : t));
    }
    setLoadingAi(null);
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-500/20 text-red-300 border-red-500/30';
      case 'medium': return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
      case 'low': return 'bg-green-500/20 text-green-300 border-green-500/30';
      default: return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
    }
  };
  
  const getPriorityDot = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]';
      case 'medium': return 'bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.6)]';
      case 'low': return 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="bg-promodo-card/50 backdrop-blur-sm rounded-2xl p-6 border border-white/5 h-full flex flex-col">
      <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
        <svg className="w-5 h-5 text-promodo-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
        Tasks & Goals
      </h2>

      <form onSubmit={addTask} className="mb-6 relative z-20">
        <input
          type="text"
          value={newTaskTitle}
          onChange={(e) => setNewTaskTitle(e.target.value)}
          placeholder="Add a new task..."
          className="w-full bg-black/20 border border-white/10 rounded-xl pl-4 pr-32 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-promodo-accent focus:ring-1 focus:ring-promodo-accent transition-all"
        />
        <div className="absolute right-2 top-2 bottom-2 flex items-center gap-2">
           {/* Priority Selector */}
           <div className="relative">
               <button 
                  type="button" 
                  onClick={() => setShowPrioritySelect(!showPrioritySelect)}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:bg-white/10 border border-transparent ${showPrioritySelect ? 'bg-white/10' : ''}`}
                  title={`Priority: ${newTaskPriority}`}
               >
                   <div className={`w-3 h-3 rounded-full ${getPriorityDot(newTaskPriority)}`}></div>
               </button>
               
               {showPrioritySelect && (
                 <>
                   <div className="fixed inset-0 z-10" onClick={() => setShowPrioritySelect(false)}></div>
                   <div className="absolute right-0 top-10 bg-gray-900 border border-white/10 rounded-xl p-2 flex flex-col gap-1 w-32 shadow-2xl z-20 animate-fade-in">
                     <span className="text-[10px] uppercase text-gray-500 font-bold px-2 py-1">Set Priority</span>
                     {(['high', 'medium', 'low'] as const).map(p => (
                       <button
                         key={p}
                         type="button"
                         onClick={() => { setNewTaskPriority(p); setShowPrioritySelect(false); }}
                         className={`flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/10 text-left transition-colors ${newTaskPriority === p ? 'bg-white/5' : ''}`}
                       >
                         <div className={`w-2 h-2 rounded-full ${getPriorityDot(p)}`}></div>
                         <span className="text-sm text-gray-300 capitalize font-medium">{p}</span>
                       </button>
                     ))}
                   </div>
                 </>
               )}
           </div>

          <button type="submit" className="h-full aspect-square bg-promodo-accent rounded-lg hover:bg-blue-400 transition-colors flex items-center justify-center shadow-lg shadow-blue-500/20">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          </button>
        </div>
      </form>

      <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
        {tasks.length === 0 && (
          <div className="text-center text-gray-500 py-8 italic">No tasks yet. Start by adding one!</div>
        )}
        {tasks.map(task => (
          <div key={task.id} className={`group p-4 rounded-xl bg-white/5 border border-white/5 hover:border-white/20 transition-all ${task.isCompleted ? 'opacity-50' : ''}`}>
            <div className="flex items-start gap-3">
              <button
                onClick={() => toggleTask(task.id)}
                className={`mt-1 w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${task.isCompleted ? 'bg-promodo-accent border-promodo-accent' : 'border-gray-500 hover:border-promodo-accent'}`}
              >
                {task.isCompleted && <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
              </button>
              
              <div className="flex-1">
                <div className="flex items-start justify-between gap-2">
                   <h3 className={`font-medium leading-tight ${task.isCompleted ? 'line-through text-gray-400' : 'text-gray-100'}`}>{task.title}</h3>
                   <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border shrink-0 ${getPriorityBadge(task.priority)}`}>
                      {task.priority}
                   </span>
                </div>
                
                {/* Subtasks */}
                {task.subtasks.length > 0 && (
                  <div className="mt-3 space-y-2 pl-2 border-l-2 border-white/10">
                    {task.subtasks.map(sub => (
                      <div key={sub.id} className="text-sm text-gray-400 flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-gray-600"></div>
                        {sub.title}
                      </div>
                    ))}
                  </div>
                )}
                
                {/* Actions */}
                <div className="flex items-center gap-3 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  {!task.isCompleted && task.subtasks.length === 0 && (
                    <button 
                      onClick={() => handleAiBreakdown(task)}
                      disabled={loadingAi === task.id}
                      className="text-xs text-promodo-accent hover:text-blue-300 flex items-center gap-1"
                    >
                      {loadingAi === task.id ? (
                        <span className="animate-spin">⏳</span>
                      ) : (
                        <>
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                          AI Breakdown
                        </>
                      )}
                    </button>
                  )}
                  <button onClick={() => deleteTask(task.id)} className="text-xs text-red-400 hover:text-red-300">Delete</button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TaskBoard;
