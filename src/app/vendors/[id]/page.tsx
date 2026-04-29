import { prisma } from '@/lib/db';
import { notFound } from 'next/navigation';
import RefreshButton from './RefreshButton';
import ComplianceUpload from './ComplianceUpload';

async function getVendor(id: string) {
  return await prisma.vendor.findUnique({
    where: { id },
    include: {
      breaches: { orderBy: { date: 'desc' } },
      vulnerabilities: { orderBy: { severity: 'desc' } },
      complianceDocs: { orderBy: { createdAt: 'desc' } },
    },
  });
}

export default async function VendorDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const vendor = await getVendor(id);

  if (!vendor) {
    notFound();
  }

  return (
    <main className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-4xl mx-auto">
        <header className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{vendor.name}</h1>
            <p className="text-gray-600">{vendor.domain}</p>
          </div>
          <div className="flex items-center gap-4">
            <RefreshButton vendorId={vendor.id} />
            <div className={`
              w-20 h-20 rounded-full flex items-center justify-center text-white font-bold text-2xl shadow-lg
              ${vendor.overallScore > 80 ? 'bg-green-500' : vendor.overallScore > 50 ? 'bg-yellow-500' : 'bg-red-500'}
            `}>
              {vendor.overallScore}
            </div>
          </div>
        </header>

        <div className="grid gap-8">
          {/* Compliance Section */}
          <section className="bg-white p-6 rounded-xl shadow-sm border">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Compliance Documents</h2>
              <ComplianceUpload vendorId={vendor.id} />
            </div>
            {vendor.complianceDocs.length === 0 ? (
              <p className="text-gray-500 text-sm">No compliance documents analyzed yet.</p>
            ) : (
              <div className="space-y-4">
                {vendor.complianceDocs.map((doc: any) => (
                  <div key={doc.id} className="p-4 bg-gray-50 rounded-lg border">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium">{doc.name}</span>
                      <span className={`px-2 py-1 rounded text-xs font-bold ${
                        doc.status === 'Compliant' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {doc.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">{(doc.parsedStatus as any).summary}</p>
                    {((doc.parsedStatus as any).keyFindings || []).length > 0 && (
                      <ul className="mt-2 text-xs text-red-600 list-disc list-inside">
                        {(doc.parsedStatus as any).keyFindings.map((finding: string, i: number) => (
                          <li key={i}>{finding}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Breaches Section */}
          <section className="bg-white p-6 rounded-xl shadow-sm border">
            <h2 className="text-xl font-semibold mb-4 text-red-700">Recent Breaches</h2>
            {vendor.breaches.length === 0 ? (
              <p className="text-gray-500 text-sm">No known breaches found.</p>
            ) : (
              <div className="space-y-3">
                {vendor.breaches.map((breach: any) => (
                  <div key={breach.id} className="text-sm border-l-4 border-red-500 pl-4 py-1">
                    <p className="font-semibold text-gray-800">{new Date(breach.date).toLocaleDateString()}</p>
                    <p className="text-gray-600">{breach.description}</p>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Vulnerabilities Section */}
          <section className="bg-white p-6 rounded-xl shadow-sm border">
            <h2 className="text-xl font-semibold mb-4 text-yellow-700">Known Vulnerabilities (CVEs)</h2>
            {vendor.vulnerabilities.length === 0 ? (
              <p className="text-gray-500 text-sm">No active vulnerabilities found for this tech stack.</p>
            ) : (
              <div className="grid gap-3">
                {vendor.vulnerabilities.map((vuln: any) => (
                  <div key={vuln.id} className="p-3 bg-gray-50 rounded border flex justify-between items-center">
                    <div>
                      <span className="font-mono font-bold text-xs bg-gray-200 px-2 py-1 rounded mr-2">{vuln.cveId}</span>
                      <span className="text-sm text-gray-700">{vuln.description?.substring(0, 100)}...</span>
                    </div>
                    <span className={`text-xs font-bold px-2 py-1 rounded ${
                      vuln.severity === 'CRITICAL' ? 'bg-red-600 text-white' : 
                      vuln.severity === 'HIGH' ? 'bg-orange-500 text-white' : 'bg-yellow-400 text-black'
                    }`}>
                      {vuln.severity}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
