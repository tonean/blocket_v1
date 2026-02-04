import { useState, useEffect } from 'react';

interface Theme {
  id: string;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
}

interface InitData {
  postId: string;
  username: string;
  theme: Theme;
}

export const useInit = () => {
  const [data, setData] = useState<InitData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchInit = async () => {
      try {
        const response = await fetch('/api/init');
        if (!response.ok) {
          throw new Error('Failed to initialize');
        }
        const result = await response.json();
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchInit();
  }, []);

  return {
    postId: data?.postId || '',
    username: data?.username || '',
    theme: data?.theme || null,
    loading,
    error,
  };
};
