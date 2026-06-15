export interface User {
  id: number;
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  gender: "Male" | "Female";
  latitude: number | null;
  longitude: number | null;
  location_label?: string | null;
  bio: string | null;
  sexual_preference: "Male" | "Female";
  is_verified: boolean;
  is_profile_completed: boolean;
  fame_rating: number;
  birthdate: string;
  profile_picture?: string;
  images?: string[];
  interests?: string[];
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  setLoading: (isLoading: boolean) => void;
  logout: () => void;
}

export interface APIError {
  response?: {
    data?: {
      detail?: string;
      error?: string;
    };
  };
  message?: string;
}

export interface SignInResponse {
  user: User;
  access_token: string;
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
