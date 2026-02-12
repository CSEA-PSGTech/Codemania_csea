// API Configuration for Codemania Frontend
// Centralized configuration for all backend endpoints

import axios from 'axios';

// Execution Server - runs code and returns results
export const EXECUTION_SERVER_URL = import.meta.env.VITE_EXECUTION_SERVER_URL || 'http://localhost:6001';

// Core Backend - authentication, problems, submissions
export const CORE_BACKEND_URL = import.meta.env.VITE_CORE_BACKEND_URL || 'http://localhost:5000';

// API Endpoints
export const API = {
    // Base URL for core backend
    base: `${CORE_BACKEND_URL}/codemania/api`,

    // Execution Server
    execute: `${EXECUTION_SERVER_URL}/execute`,
    health: `${EXECUTION_SERVER_URL}/health`,

    // Core Backend (for future use)
    login: `${CORE_BACKEND_URL}/codemania/api/auth/login`,
    problems: `${CORE_BACKEND_URL}/codemania/api/problems`,
    submissions: `${CORE_BACKEND_URL}/codemania/api/submissions`,
};

// Default execution settings
export const EXECUTION_CONFIG = {
    defaultTimeLimit: 2000, // ms
    defaultMemoryLimit: 256, // MB
    maxCodeSize: 50000, // characters
};

// Axios instance with base URL
const apiClient = axios.create({
    baseURL: `${CORE_BACKEND_URL}/codemania/api`,
});

// Socket.io configuration
export const SOCKET_CONFIG = {
    url: CORE_BACKEND_URL,
    path: "/codemania",
    options: {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5
    }
};

export default apiClient;
