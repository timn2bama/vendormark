'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function RefreshButton({ vendorId }: { vendorId: string }) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const router = useRouter();

  async function handleRefresh() {
    setIsRefreshing(true);
    try {
      const response = await fetch(`/api/vendors/${vendorId}/refresh`, {
        method: 'POST',
      });

      if (!response.ok) throw new Error('Refresh failed');
      
      router.refresh();
    } catch (error) {
      console.error(error);
      alert('Failed to refresh data');
    } finally {
      setIsRefreshing(false);
    }
  }

  return (
    <button 
      onClick={handleRefresh}
      disabled={isRefreshing}
      className="text-sm bg-gray-200 hover:bg-gray-300 text-gray-800 px-3 py-1 rounded transition disabled:opacity-50"
    >
      {isRefreshing ? 'Refreshing...' : 'Refresh Data'}
    </button>
  );
}
