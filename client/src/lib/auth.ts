// == IMPORTS & DEPENDENCIES ==
import { queryClient } from "./queryClient";
import { apiRequest } from "./queryClient";

// == TYPE DEFINITIONS ==
interface User {
  id: number;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  gradeLevel?: string;
}

interface AuthResponse {
  user: User;
  token: string;
  message: string;
  requiresApproval?: boolean;
  emailSent?: boolean;
}

// == AUTHENTICATION FUNCTIONS ==
export async function loginUser(email: string, password: string): Promise<AuthResponse> {
  const data = await apiRequest<AuthResponse>("POST", "/api/auth/login", { email, password });
  
  localStorage.setItem("token", data.token);
  console.log("Login successful, token stored:", data.token);
  
  return data;
}

export async function registerUser(userData: {
  username: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role?: string;
  gradeLevel?: string;
  securityQuestion?: string;
  securityAnswer?: string;
}): Promise<AuthResponse> {
  try {
    const data = await apiRequest<AuthResponse>("POST", "/api/auth/register", userData);
    
    if (data.token) {
      localStorage.setItem("token", data.token);
      console.log("Registration successful, token stored:", data.token);
    } else {
      localStorage.removeItem("token");
      console.log("Registration successful but no token provided (pending approval).");
    }
    
    return data;
  } catch (error) {
    console.error("Registration error:", error);
    throw error;
  }
}

export function logoutUser(): void {
  localStorage.removeItem("token");
  
  queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
  queryClient.clear();
}

// == UTILITY FUNCTIONS ==
export function getAuthToken(): string | null {
  return localStorage.getItem("token");
}

export function isAuthenticated(): boolean {
  return !!getAuthToken();
}

export function getAuthHeaders(): HeadersInit {
  const token = getAuthToken();
  return token ? { "Authorization": `Bearer ${token}` } : {};
}