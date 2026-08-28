import axios from 'axios';

// Instance Axios pointant vers notre futur backend Node.js
export const api = axios.create({
  baseURL: 'http://localhost:3000/api', 
});

// Ajout automatique du token d'authentification s'il existe
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('modulai_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

const createEntityApi = (entityName) => ({
  list: async (sort, limit) => {
    const res = await api.get(`/${entityName.toLowerCase()}`, { params: { sort, limit } });
    return res.data;
  },
  findMany: async (options) => {
    const res = await api.get(`/${entityName.toLowerCase()}`, { params: options });
    return res.data;
  },
  filter: async (filters, sort, limit) => {
    const res = await api.get(`/${entityName.toLowerCase()}`, { params: { ...filters, sort, limit } });
    return res.data;
  },
  findOne: async (id) => {
    const res = await api.get(`/${entityName.toLowerCase()}/${id}`);
    return res.data;
  },
  get: async (id) => {
    const res = await api.get(`/${entityName.toLowerCase()}/${id}`);
    return res.data;
  },
  create: async (data) => {
    const res = await api.post(`/${entityName.toLowerCase()}`, data);
    return res.data;
  },
  update: async (id, data) => {
    const res = await api.patch(`/${entityName.toLowerCase()}/${id}`, data);
    return res.data;
  },
  delete: async (id) => {
    const res = await api.delete(`/${entityName.toLowerCase()}/${id}`);
    return res.data;
  },
});

// "Faux" SDK Base44 qui imite la structure d'origine mais redirige 
// toutes les requêtes vers notre API REST Node.js
export const base44 = {
  auth: {
    loginViaEmailPassword: async (email, password) => {
      const res = await api.post('/auth/login', { email, password });
      localStorage.setItem('modulai_token', res.data.token);
      return res.data;
    },
    login: async (credentials) => {
      const res = await api.post('/auth/login', credentials);
      localStorage.setItem('modulai_token', res.data.token);
      return res.data;
    },
    register: async (data) => {
      const res = await api.post('/auth/register', data);
      localStorage.setItem('modulai_token', res.data.token);
      return res.data;
    },
    logout: async () => {
      localStorage.removeItem('modulai_token');
    },
    getCurrentUser: async () => {
      try {
        const res = await api.get('/auth/me');
        return res.data;
      } catch (e) {
        return null;
      }
    },
    me: async () => {
      try {
        const res = await api.get('/auth/me');
        return res.data;
      } catch (e) {
        return null;
      }
    }
  },
  // Proxy magique : base44.entities.Project renverra les méthodes CRUD pour l'entité "Project"
  entities: new Proxy({}, {
    get: (target, prop) => {
      if (typeof prop === 'string') {
        return createEntityApi(prop);
      }
      return Reflect.get(target, prop);
    }
  }),
  functions: {
    invoke: async (functionName, params) => {
      const res = await api.post(`/functions/${functionName}`, params);
      return res.data;
    }
  },
  ai: {
    execute: async (payload) => {
      const res = await api.post('/ai/execute', payload);
      return res.data;
    }
  }
};
