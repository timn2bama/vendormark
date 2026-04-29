import Link from 'next/link';
import { prisma } from '@/lib/db';

async function getVendors() {
  // In a real app, we'd filter by the logged-in user
  return await prisma.vendor.findMany({
    orderBy: { overallScore: 'asc' }, // Lower score = higher risk
    include: {
      _count: {
        select: { breaches: true, vulnerabilities: true, complianceDocs: true }
      }
    }
  });
}

export default async function Dashboard() {
  const vendors = await getVendors();

  return (
    <main className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-6xl mx-auto">
        <header className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">VendorMark</h1>
            <p className="text-gray-600">Continuous Vendor Risk Monitoring</p>
          </div>
          <Link 
            href="/vendors/new"
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
          >
            Add New Vendor
          </Link>
        </header>

        <div className="grid gap-6">
          {vendors.length === 0 ? (
            <div className="bg-white p-12 rounded-xl shadow-sm border text-center">
              <p className="text-gray-500 mb-4">No vendors added yet.</p>
              <Link href="/vendors/new" className="text-blue-600 hover:underline">
                Start by adding your first vendor
              </Link>
            </div>
          ) : (
            vendors.map((vendor: any) => (
              <Link 
                key={vendor.id} 
                href={`/vendors/${vendor.id}`}
                className="bg-white p-6 rounded-xl shadow-sm border hover:border-blue-300 transition group"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900 group-hover:text-blue-600">
                      {vendor.name}
                    </h2>
                    <p className="text-sm text-gray-500">{vendor.domain}</p>
                  </div>
                  
                  <div className="text-right flex items-center gap-6">
                    <div className="text-sm text-gray-500 space-x-4">
                      <span>{vendor._count.breaches} Breaches</span>
                      <span>{vendor._count.vulnerabilities} Vulns</span>
                      <span>{vendor._count.complianceDocs} Docs</span>
                    </div>
                    <div className={`
                      w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-xl
                      ${vendor.overallScore > 80 ? 'bg-green-500' : vendor.overallScore > 50 ? 'bg-yellow-500' : 'bg-red-500'}
                    `}>
                      {vendor.overallScore}
                    </div>
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </main>
  );
}
