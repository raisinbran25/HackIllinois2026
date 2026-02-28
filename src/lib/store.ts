import { Session, SessionReport } from './types';

const sessions = new Map<string, Session>();
const reports = new Map<string, SessionReport>();

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
};
