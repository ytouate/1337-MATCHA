import { useEffect } from 'react';
import { useAuthStore } from '@/store/auth';
import { useGetMe } from './useGetMe';

export const useAuthCheck = () => {
  const { setUser } = useAuthStore();
  const { data: user, isError } = useGetMe();

  useEffect(() => {
    if (user) {
      setUser(user);
    }
    if (isError) {
      setUser(null);
    }
  }, [user, isError, setUser]);
};
