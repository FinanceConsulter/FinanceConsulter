import { useState, useEffect } from 'react';
import { MOCK_DASHBOARD_DATA } from '../data/mockDashboardData';

export function useDashboardData(period = 'month') {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      await new Promise(resolve => setTimeout(resolve, 800));
      
      //Mockdaten
      const result = MOCK_DASHBOARD_DATA;
      
      setData(result);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [period]);

  return { data, loading, error, refetch: fetchData };
}
