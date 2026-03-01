import { Session, SessionReport, CategoryRecord } from './types';

const sessions = new Map<string, Session>();
const reports = new Map<string, SessionReport>();
const categoryHistoryByUser = new Map<string, CategoryRecord[]>();

export const store = {
  getSession: (id: string) => sessions.get(id),
  setSession: (id: string, session: Session) => sessions.set(id, session),

  getReport: (id: string) => reports.get(id),
  setReport: (id: string, report: SessionReport) => reports.set(id, report),

  getReportsByUser: (userName: string): SessionReport[] => {
    const userReports: SessionReport[] = [];
    reports.forEach((r) => {
      if (r.userName === userName) userReports.push(r);
    });
    return userReports.sort((a, b) => a.createdAt - b.createdAt);
  },

  // Local category history — primary source for stats + adaptive logic
  getCategoryHistory: (userName: string): CategoryRecord[] => {
    return categoryHistoryByUser.get(userName) || [];
  },

  addCategoryRecord: (userName: string, record: CategoryRecord): void => {
    const history = categoryHistoryByUser.get(userName) || [];
    history.push(record);
    categoryHistoryByUser.set(userName, history);
  },

  clearUser: (userName: string): void => {
    const sessionIdsToDelete: string[] = [];
    sessions.forEach((s, id) => {
      if (s.config.userName === userName) sessionIdsToDelete.push(id);
    });
    for (const id of sessionIdsToDelete) {
      sessions.delete(id);
      reports.delete(id);
    }
    categoryHistoryByUser.delete(userName);
  },
};
