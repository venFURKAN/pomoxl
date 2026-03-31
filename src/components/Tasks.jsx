import React, { useState, useEffect } from 'react';
import { CheckSquare, Trash2, Plus, GripVertical } from 'lucide-react';
import { loadData, saveData } from '../utils/storage';
import { Reorder } from 'framer-motion';

const Tasks = () => {
  const [tasks, setTasks] = useState([]);
  const [inputValue, setInputValue] = useState('');

  const loadAll = () => {
    const data = loadData();
    setTasks(data.tasks || []);
  };

  useEffect(() => {
    loadAll();
    window.addEventListener('active_task_updated', loadAll);
    return () => window.removeEventListener('active_task_updated', loadAll);
  }, []);

  const saveTasks = (newTasks) => {
    const data = loadData();
    data.tasks = newTasks;
    
    // Automatically set the first incomplete task as active
    const activeTask = newTasks.find(t => !t.completed);
    data.activeTaskId = activeTask ? activeTask.id : null;
    
    saveData(data);
    setTasks(newTasks);
    
    window.dispatchEvent(new Event('tasks_updated'));
    window.dispatchEvent(new Event('active_task_updated'));
  };

  const addTask = (e) => {
    e.preventDefault();
    if (!inputValue.trim()) return;
    
    const newTask = {
      id: Date.now().toString(),
      text: inputValue.trim(),
      completed: false
    };
    
    // New task is added to the top and becomes active immediately
    saveTasks([newTask, ...tasks]);
    setInputValue('');
  };

  const toggleTask = (id) => {
    const newTasks = tasks.map(t => 
      t.id === id ? { ...t, completed: !t.completed } : t
    );
    saveTasks(newTasks);
  };

  const deleteTask = (id) => {
    const newTasks = tasks.filter(t => t.id !== id);
    saveTasks(newTasks);
  };

  // Find the active task for UI highlighting (first incomplete task)
  const activeTaskId = tasks.find(t => !t.completed)?.id || null;

  return (
    <div className="panel animate-fade-in" style={{ marginTop: '24px' }}>
      <h2 className="panel-title">
        <CheckSquare size={20} />
        Tasks
        <span style={{ marginLeft: 'auto', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          {tasks.filter(t => !t.completed).length} Remaining
        </span>
      </h2>

      <form onSubmit={addTask} className="task-input-container">
        <input 
          type="text" 
          className="task-input" 
          placeholder="What are you working on?" 
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
        />
        <button type="submit" className="btn btn-primary" style={{ padding: '14px 20px' }}>
          <Plus size={18} /> Add
        </button>
      </form>

      {/* Framer Motion ile muazzam kalitede drag-drop animasyonu */}
      <Reorder.Group 
        axis="y" 
        values={tasks} 
        onReorder={setTasks}
        className="task-list"
        style={{ listStyle: 'none', margin: 0, padding: 0 }}
      >
        {tasks.map((task) => {
          const isActive = task.id === activeTaskId;
          return (
            <Reorder.Item
              key={task.id} 
              value={task}
              onDragEnd={() => saveTasks(tasks)} // Persist order when drag ends
              whileDrag={{ 
                scale: 1.05, 
                boxShadow: "0px 10px 30px rgba(0,0,0,0.15)",
                zIndex: 999 
              }}
              className={`task-item ${task.completed ? 'completed' : ''}`} 
              style={{ 
                background: isActive ? 'var(--primary-transparent)' : 'var(--bg-color)',
                padding: isActive ? '12px' : '8px 8px',
                borderRadius: '12px',
                transition: 'background 0.2s',
                cursor: 'grab',
                border: '1px solid var(--panel-border)',
                marginBottom: '10px'
              }}
            >
              <div style={{ color: 'var(--text-muted)', cursor: 'grab', display: 'flex', alignItems: 'center' }}>
                <GripVertical size={16} />
              </div>
              
              <input 
                type="checkbox" 
                className="task-checkbox" 
                checked={task.completed} 
                onChange={() => toggleTask(task.id)}
              />
              <span className="task-text" style={{ fontWeight: isActive ? 800 : 600 }}>
                {task.text}
              </span>
              
              <button 
                className="task-delete" 
                onClick={(e) => { 
                  e.stopPropagation(); 
                  deleteTask(task.id); 
                }} 
                title="Delete Task"
              >
                <Trash2 size={16} />
              </button>
            </Reorder.Item>
          );
        })}
        {tasks.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem', padding: '20px 0' }}>
            No tasks yet. Add one above!
          </div>
        )}
      </Reorder.Group>
    </div>
  );
};

export default Tasks;
