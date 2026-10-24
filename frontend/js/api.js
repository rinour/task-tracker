// ==============================================================================
// frontend/js/api.js: Giao diện kết nối REST API tập trung
// ==============================================================================

const API_BASE = '/api';

class ApiClient {
  constructor() {
    this.token = localStorage.getItem('task_tracker_token') || null;
  }

  setToken(token) {
    this.token = token;
    if (token) {
      localStorage.setItem('task_tracker_token', token);
    } else {
      localStorage.removeItem('task_tracker_token');
    }
  }

  async request(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const config = {
      ...options,
      headers,
      credentials: 'include', // Gửi kèm cookie HttpOnly
    };

    try {
      const res = await fetch(url, config);
      let data = null;
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await res.json();
      } else {
        data = await res.text();
      }

      if (!res.ok) {
        const errorMsg = (data && data.error) ? data.error : `Lỗi ${res.status}: ${res.statusText}`;
        const err = new Error(errorMsg);
        err.status = res.status;
        err.data = data;
        throw err;
      }

      return data;
    } catch (err) {
      console.error(`API Error [${options.method || 'GET'} ${endpoint}]:`, err);
      throw err;
    }
  }

  // --- Auth APIs ---
  async login(email, password) {
    const data = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    if (data.token) {
      this.setToken(data.token);
    }
    return data;
  }

  async logout() {
    try {
      await this.request('/auth/logout', { method: 'POST' });
    } finally {
      this.setToken(null);
    }
  }

  async getMe() {
    return await this.request('/auth/me');
  }

  async updateProfile(fullName) {
    return await this.request('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify({ full_name: fullName }),
    });
  }

  async changePassword(oldPassword, newPassword) {
    return await this.request('/auth/change-password', {
      method: 'PUT',
      body: JSON.stringify({ old_password: oldPassword, new_password: newPassword }),
    });
  }

  // --- Tasks APIs ---
  async getTasks(params = {}) {
    const query = new URLSearchParams();
    Object.keys(params).forEach(key => {
      if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
        query.append(key, params[key]);
      }
    });
    const queryString = query.toString() ? `?${query.toString()}` : '';
    return await this.request(`/tasks${queryString}`);
  }

  async getTask(id) {
    return await this.request(`/tasks/${id}`);
  }

  async createTask(taskData) {
    return await this.request('/tasks', {
      method: 'POST',
      body: JSON.stringify(taskData),
    });
  }

  async updateTask(id, taskData) {
    return await this.request(`/tasks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(taskData),
    });
  }

  async updateTaskStatus(id, status) {
    return await this.request(`/tasks/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }

  async deleteTask(id) {
    return await this.request(`/tasks/${id}`, {
      method: 'DELETE',
    });
  }

  // --- Stats APIs ---
  async getStats(teamId = null) {
    const query = teamId ? `?team_id=${teamId}` : '';
    return await this.request(`/stats/summary${query}`);
  }

  // --- Teams APIs ---
  async getTeams() {
    return await this.request('/teams');
  }

  async getTeam(id) {
    return await this.request(`/teams/${id}`);
  }

  async createTeam(name, description) {
    return await this.request('/teams', {
      method: 'POST',
      body: JSON.stringify({ name, description }),
    });
  }

  async updateTeam(id, name, description) {
    return await this.request(`/teams/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ name, description }),
    });
  }

  async addTeamMember(teamId, userId, memberRole) {
    return await this.request(`/teams/${teamId}/members`, {
      method: 'POST',
      body: JSON.stringify({ user_id: userId, member_role: memberRole }),
    });
  }

  async removeTeamMember(teamId, userId) {
    return await this.request(`/teams/${teamId}/members/${userId}`, {
      method: 'DELETE',
    });
  }

  // --- Comments APIs ---
  async getComments(taskId) {
    return await this.request(`/tasks/${taskId}/comments`);
  }

  async createComment(taskId, content) {
    return await this.request(`/tasks/${taskId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    });
  }

  // --- Users APIs ---
  async getUsers() {
    return await this.request('/users');
  }

  async getAdminUsers() {
    return await this.request('/users/admin/all');
  }

  async toggleUserStatus(userId, isActive) {
    return await this.request(`/users/admin/${userId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ is_active: isActive }),
    });
  }

  // --- Healthcheck ---
  async checkHealth() {
    return await this.request('/health');
  }
}

const api = new ApiClient();
window.api = api;
