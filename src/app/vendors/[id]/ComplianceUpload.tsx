'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ComplianceUpload({ vendorId }: { vendorId: string }) {
  const [isUploading, setIsUploading] = useState(false);
  const router = useRouter();

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(`/api/vendors/${vendorId}/compliance`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Upload failed');

      router.refresh();
    } catch (error) {
      console.error(error);
      alert('Failed to analyze document');
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div className="relative">
      <input 
        type="file" 
        id="file-upload"
        className="hidden"
        onChange={handleFileChange}
        disabled={isUploading}
        accept=".pdf,.png,.jpg,.jpeg"
      />
      <label 
        htmlFor="file-upload"
        className={`
          cursor-pointer text-sm bg-blue-50 text-blue-600 px-3 py-1 rounded border border-blue-200 hover:bg-blue-100 transition
          ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        {isUploading ? 'Analyzing with Claude...' : 'Upload Security Doc'}
      </label>
    </div>
  );
}
