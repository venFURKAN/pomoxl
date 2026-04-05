import React, { useState, useEffect, useRef } from 'react';
import { CheckSquare, Trash2, Plus, GripVertical, Pencil, Check, X } from 'lucide-react';
import { loadData, saveData } from '../utils/storage';
import { Reorder } from 'framer-motion';

const Tasks = () => {
  const [tasks, setTasks] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editingText, setEditingText] = useState('');
  const editInputRef = useRef(null);

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
    const newTask = { id: Date.now().toString(), text: inputValue.trim(), completed: false };
    saveTasks([newTask, ...tasks]);
    setInputValue('');
  };

  const toggleTask = (id) => {
    const newTasks = tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t);
    saveTasks(newTasks);
  };

  const deleteTask = (id) => {
    saveTasks(tasks.filter(t => t.id !== id));
  };

  const startEditing = (task) => {
    setEditingId(task.id);
    setEditingText(task.text);
    setTimeout(() => editInputRef.current?.focus(), 50);
  };

  const confirmEdit = (id) => {
    if (!editingText.trim()) { cancelEdit(); return; }
    const newTasks = tasks.map(t => t.id === id ? { ...t, text: editingText.trim() } : t);
    saveTasks(newTasks);
    setEditingId(null);
    setEditingText('');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingText('');
  };

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

      <Reorder.Group
        axis="y"
        values={tasks}
        onReorder={setTasks}
        className="task-list"
        style={{ listStyle: 'none', margin: 0, padding: 0 }}
      >
        {tasks.map((task) => {
          const isActive = task.id === activeTaskId;
          const isEditing = task.id === editingId;
          return (
            <Reorder.Item
              key={task.id}
              value={task}
              onDragEnd={() => saveTasks(tasks)}
              whileDrag={{ scale: 1.05, boxShadow: "0px 10px 30px rgba(0,0,0,0.15)", zIndex: 999 }}
              className={`task-item ${task.completed ? 'completed' : ''}`}
              style={{
                background: isActive ? 'var(--primary-transparent)' : 'var(--bg-color)',
                padding: isActive ? '12px' : '8px 8px',
                borderRadius: '12px',
                transition: 'background 0.2s',
                cursor: isEditing ? 'default' : 'grab',
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

              {isEditing ? (
                <input
                  ref={editInputRef}
                  value={editingText}
                  onChange={(e) => setEditingText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') confirmEdit(task.id);
                    if (e.key === 'Escape') cancelEdit();
                  }}
                  style={{
                    flex: 1,
                    border: 'none',
                    borderBottom: '2px solid var(--accent-color)',
                    background: 'transparent',
                    fontSize: '0.9rem',
                    fontWeight: 700,
                    color: 'var(--text-strong)',
                    outline: 'none',
                    padding: '2px 4px',
                    fontFamily: 'inherit'
                  }}
                />
              ) : (
                <span
                  className="task-text"
                  style={{ fontWeight: isActive ? 800 : 600 }}
                  onDoubleClick={() => !task.completed && startEditing(task)}
                >
                  {task.text}
                </span>
              )}

              {isEditing ? (
                <div style={{ display: 'flex', gap: '4px', marginLeft: 'auto' }}>
                  <button
                    className="task-delete"
                    onClick={() => confirmEdit(task.id)}
                    title="Save"
                    style={{ color: 'var(--primary)' }}
                  >
                    <Check size={16} />
                  </button>
                  <button
                    className="task-delete"
                    onClick={cancelEdit}
                    title="Cancel"
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: '4px', marginLeft: 'auto' }}>
                  {!task.completed && (
                    <button
                      className="task-delete"
                      onClick={(e) => { e.stopPropagation(); startEditing(task); }}
                      title="Edit Task"
                    >
                      <Pencil size={14} />
                    </button>
                  )}
                  <button
                    className="task-delete"
                    onClick={(e) => { e.stopPropagation(); deleteTask(task.id); }}
                    title="Delete Task"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              )}
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
