import { AnalysisSession, Dataset, SqlHistoryItem } from '../types';

const STORAGE_KEYS = {
  SESSIONS: 'workforceiq_sessions',
  SAVED_QUERIES: 'workforceiq_saved_queries',
  SETTINGS: 'workforceiq_settings',
};

// Retrieve all stored analysis sessions
export function getSavedSessions(): AnalysisSession[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SESSIONS);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (err) {
    console.error('Failed to load saved sessions from storage:', err);
    return [];
  }
}

// Save or update an analysis session
export function saveSession(session: AnalysisSession): void {
  try {
    const existing = getSavedSessions();
    const index = existing.findIndex((s) => s.id === session.id);
    if (index >= 0) {
      existing[index] = session;
    } else {
      existing.unshift(session);
    }
    localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(existing.slice(0, 30)));
  } catch (err) {
    console.error('Failed to save session to storage:', err);
  }
}

// Delete an analysis session
export function deleteSession(sessionId: string): void {
  try {
    const existing = getSavedSessions().filter((s) => s.id !== sessionId);
    localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(existing));
  } catch (err) {
    console.error('Failed to delete session:', err);
  }
}

// Rename an analysis session
export function renameSession(sessionId: string, newName: string): void {
  try {
    const existing = getSavedSessions().map((s) => {
      if (s.id === sessionId) {
        return { ...s, name: newName, updatedAt: new Date().toISOString() };
      }
      return s;
    });
    localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(existing));
  } catch (err) {
    console.error('Failed to rename session:', err);
  }
}

// Retrieve saved SQL queries
export function getSavedSqlQueries(): SqlHistoryItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SAVED_QUERIES);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (err) {
    return [];
  }
}

// Save SQL query to history
export function saveSqlQuery(query: SqlHistoryItem): void {
  try {
    const existing = getSavedSqlQueries();
    const updated = [query, ...existing.filter((q) => q.id !== query.id)].slice(0, 50);
    localStorage.setItem(STORAGE_KEYS.SAVED_QUERIES, JSON.stringify(updated));
  } catch (err) {
    console.error('Failed to save SQL query:', err);
  }
}

// Delete SQL query
export function deleteSqlQuery(queryId: string): void {
  try {
    const existing = getSavedSqlQueries().filter((q) => q.id !== queryId);
    localStorage.setItem(STORAGE_KEYS.SAVED_QUERIES, JSON.stringify(existing));
  } catch (err) {
    console.error('Failed to delete query:', err);
  }
}
