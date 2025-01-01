export interface User {
  id: number;
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  gender: "Male" | "Female";
  is_profile_completed: boolean;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  setUser: (user: User | null) => void;
  logout: () => void;
}

export interface APIError {
  response?: {
    data?: {
      detail?: string;
    };
  };
  message?: string;
}

export interface SignInResponse {
  user: User;
}

export interface UserRegistration {
  username: string;
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  gender: string;
}

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordResetConfirm {
  new_password: string;
}
