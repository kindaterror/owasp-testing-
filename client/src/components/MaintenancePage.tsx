import { Wrench, Clock } from 'lucide-react';

export function MaintenancePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-ilaw-navy to-ilaw-gold flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl p-8 max-w-md w-full text-center">
        <div className="mb-6">
          <Wrench className="w-16 h-16 text-ilaw-gold mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-ilaw-navy mb-2">
            Site Under Maintenance
          </h1>
          <p className="text-gray-600">
            We're currently performing scheduled maintenance to improve your experience.
          </p>
        </div>
        
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-center mb-2">
            <Clock className="w-5 h-5 text-amber-600 mr-2" />
            <span className="text-amber-800 font-medium">Expected Duration</span>
          </div>
          <p className="text-amber-700 text-sm">
            Maintenance typically takes 15-30 minutes
          </p>
        </div>

        <div className="text-sm text-gray-500">
          <p>Thank you for your patience!</p>
          <p className="mt-2">- The Ilaw ng Bayan Learning Institute </p>
        </div>
      </div>
    </div>
  );
}