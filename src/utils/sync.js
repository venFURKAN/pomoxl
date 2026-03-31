import { supabase } from './supabase';
import { loadData, saveData } from './storage';

/** Upload current localStorage data to Supabase (for logged-in user) */
export const pushToCloud = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const local = loadData();
  const { error } = await supabase.from('user_data').upsert({
    user_id: user.id,
    sessions: local.sessions,
    tasks: local.tasks,
    settings: local.settings,
    active_task_id: local.activeTaskId || null,
    updated_at: new Date().toISOString(),
  });

  if (error) console.error('Sync push failed:', error.message);
};

/** Download data from Supabase and merge into localStorage */
export const pullFromCloud = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('user_data')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (error || !data) {
    // First login — push local data to cloud instead
    await pushToCloud();
    return null;
  }

  const merged = {
    sessions: data.sessions || [],
    tasks: data.tasks || [],
    settings: { ...loadData().settings, ...data.settings },
    activeTaskId: data.active_task_id || null,
  };

  saveData(merged);
  return merged;
};

/** Debounced auto-sync: call anywhere after data changes */
let syncTimer = null;
export const scheduleSync = () => {
  clearTimeout(syncTimer);
  syncTimer = setTimeout(() => { pushToCloud(); }, 2000);
};
