import { useEffect } from 'react';
import { useAuthStore } from '@/store/auth';
import { useGetMe } from './useGetMe';

export const useAuthCheck = () => {
  const { setUser } = useAuthStore();
  const { data: user, isError, isFetched, isFetching } = useGetMe();

  useEffect(() => {
    if (user) {
      setUser(user);
      return;
    }

    if (isFetched && isError && !isFetching) {
      setUser(null);
    }
  }, [user, isError, isFetched, isFetching, setUser]);
};
