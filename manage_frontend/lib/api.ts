const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface LoginRequest {
  username: string;
  password: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    
    const token = localStorage.getItem('access_token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    return headers;
  }

  async login(data: LoginRequest): Promise<TokenResponse> {
    const response = await fetch(`${this.baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error('登录失败');
    }

    return response.json();
  }

  async get(path: string) {
    const response = await fetch(`${this.baseUrl}${path}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      if (response.status === 401) {
        localStorage.removeItem('access_token');
        window.location.href = '/login';
      }
      throw new Error(`请求失败: ${response.statusText}`);
    }

    return response.json();
  }

  async post(path: string, data: any) {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      if (response.status === 401) {
        localStorage.removeItem('access_token');
        window.location.href = '/login';
      }
      throw new Error(`请求失败: ${response.statusText}`);
    }

    return response.json();
  }

  async put(path: string, data: any) {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      if (response.status === 401) {
        localStorage.removeItem('access_token');
        window.location.href = '/login';
      }
      throw new Error(`请求失败: ${response.statusText}`);
    }

    return response.json();
  }

  async delete(path: string) {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      if (response.status === 401) {
        localStorage.removeItem('access_token');
        window.location.href = '/login';
      }
      throw new Error(`请求失败: ${response.statusText}`);
    }

    return response.json();
  }
}

export const apiClient = new ApiClient(API_BASE_URL);

