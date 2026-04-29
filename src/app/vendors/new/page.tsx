'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function NewVendor() {
  const [name, setName] = useState('');
  const [domain, setDomain] = useState('');
  const [isPending, setIsPending] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsPending(true);

    try {
      const response = await fetch('/api/vendors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, domain }),
      });

      if (!response.ok) throw new Error('Failed to create vendor');

      const data = await response.json();
      router.push(`/vendors/${data.id}`);
    } catch (error) {
      console.error(error);
      alert('Error creating vendor');
    } finally {
      setIsPending(false);
    }
  }

  return (
    <main className="min-h-screen p-8 bg-gray-50 flex items-center justify-center">
      <div className="bg-white p-8 rounded-xl shadow-sm border w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6">Add New Vendor</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Vendor Name
            </label>
            <input 
              type="text" 
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="e.g. Acme Corp"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Domain
            </label>
            <input 
              type="text" 
              required
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="e.g. acme.com"
            />
          </div>
          <button 
            type="submit"
            disabled={isPending}
            className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:bg-blue-300 transition"
          >
            {isPending ? 'Adding...' : 'Add Vendor'}
          </button>
        </form>
      </div>
    </main>
  );
}
