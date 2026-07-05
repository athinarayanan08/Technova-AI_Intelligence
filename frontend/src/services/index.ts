import api from './api';

export const authService = {
  login: (email: string, password: string) =>
    api.post('/api/auth/login', { email, password }),

  register: (data: any) => api.post('/api/auth/register', data),

  getMe: () => api.get('/api/auth/me'),

  refresh: (refreshToken: string) =>
    api.post('/api/auth/refresh', { refresh_token: refreshToken }),
};

export const orgService = {
  getAll: () => api.get('/api/organizations'),
  create: (data: any) => api.post('/api/organizations', data),
  update: (id: number, data: any) => api.put(`/api/organizations/${id}`, data),
  delete: (id: number) => api.delete(`/api/organizations/${id}`),
};

export const departmentService = {
  getAll: (orgId?: number) => api.get('/api/departments', { params: { organization_id: orgId } }),
  create: (data: any) => api.post('/api/departments', data),
  update: (id: number, data: any) => api.put(`/api/departments/${id}`, data),
  delete: (id: number) => api.delete(`/api/departments/${id}`),
};

export const teamService = {
  getAll: (deptId?: number) => api.get('/api/teams', { params: { department_id: deptId } }),
  create: (data: any) => api.post('/api/teams', data),
  update: (id: number, data: any) => api.put(`/api/teams/${id}`, data),
};

export const employeeService = {
  getAll: (params?: any) => api.get('/api/employees', { params }),
  getById: (id: number) => api.get(`/api/employees/${id}`),
  create: (data: any) => api.post('/api/employees', data),
  update: (id: number, data: any) => api.put(`/api/employees/${id}`, data),
  delete: (id: number) => api.delete(`/api/employees/${id}`),
  getTasks: (id: number) => api.get(`/api/employees/${id}/tasks`),
  getAttendance: (id: number) => api.get(`/api/employees/${id}/attendance`),
};

export const projectService = {
  getAll: () => api.get('/api/projects'),
  getById: (id: number) => api.get(`/api/projects/${id}`),
  create: (data: any) => api.post('/api/projects', data),
  update: (id: number, data: any) => api.put(`/api/projects/${id}`, data),
  delete: (id: number) => api.delete(`/api/projects/${id}`),
};

export const sprintService = {
  getAll: (projectId?: number) => api.get('/api/sprints', { params: { project_id: projectId } }),
  getById: (id: number) => api.get(`/api/sprints/${id}`),
  create: (data: any) => api.post('/api/sprints', data),
  update: (id: number, data: any) => api.put(`/api/sprints/${id}`, data),
};

export const taskService = {
  getAll: (params?: any) => api.get('/api/tasks', { params }),
  getMyTasks: () => api.get('/api/tasks/my'),
  getById: (id: number) => api.get(`/api/tasks/${id}`),
  create: (data: any) => api.post('/api/tasks', data),
  update: (id: number, data: any) => api.put(`/api/tasks/${id}`, data),
  delete: (id: number) => api.delete(`/api/tasks/${id}`),
};

export const bugService = {
  getAll: (projectId?: number) => api.get('/api/bugs', { params: { project_id: projectId } }),
  getById: (id: number) => api.get(`/api/bugs/${id}`),
  create: (data: any) => api.post('/api/bugs', data),
  update: (id: number, data: any) => api.put(`/api/bugs/${id}`, data),
};

export const attendanceService = {
  getAll: (params?: any) => api.get('/api/attendance', { params }),
  markAttendance: (data: any) => api.post('/api/attendance', data),
  update: (id: number, data: any) => api.put(`/api/attendance/${id}`, data),
  getToday: (dateStr?: string) => api.get('/api/attendance/my/today', { params: { date: dateStr } }),
};

export const reportService = {
  getAll: (params?: any) => api.get('/api/daily-reports', { params }),
  getMy: () => api.get('/api/daily-reports/my'),
  submit: (data: any) => api.post('/api/daily-reports', data),
  sendReport: (message: string) => api.post('/api/daily-reports/send-report', { message }),
};

export const notificationService = {
  getAll: (unreadOnly?: boolean) => api.get('/api/notifications', { params: { unread_only: unreadOnly } }),
  markRead: (id: number) => api.put(`/api/notifications/${id}/read`),
  markAllRead: () => api.put('/api/notifications/mark-all-read'),
};

export const aiService = {
  getHealthScore: (orgId?: number) => api.get('/api/ai/health-score/latest', { params: { org_id: orgId } }),
  getHealthHistory: (orgId?: number, days?: number) =>
    api.get('/api/ai/health-score/history', { params: { org_id: orgId, days } }),
  refreshHealthScore: (orgId?: number) => api.post('/api/ai/health-score/refresh', null, { params: { org_id: orgId } }),
  getInsights: (params?: any) => api.get('/api/ai/insights', { params }),
  analyzeProject: (projectId: number) => api.post(`/api/ai/insights/analyze-project/${projectId}`),
  analyzeEmployee: (employeeId: number) => api.post(`/api/ai/insights/analyze-employee/${employeeId}`),
  askAssistant: (data: { question: string; context_entity?: string; context_id?: number }) =>
    api.post('/api/ai/assistant', data),
  getDashboardSummary: (orgId?: number) => api.get('/api/ai/dashboard/summary', { params: { org_id: orgId } }),
  runAgenticAnalysis: (data: { date: string; team_id?: number }) => api.post('/api/ai/agentic-team-analysis', data),
  analyzeBug: (bugId: number) => api.post(`/api/ai/analyze-bug/${bugId}`),
};
