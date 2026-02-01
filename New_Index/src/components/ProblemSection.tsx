import { AlertCircle, TrendingUp, DollarSign, Heart } from 'lucide-react';

export function ProblemSection() {
  const statistics = [
    {
      icon: AlertCircle,
      value: '50%',
      label: 'Medication Nonadherence Rate',
      description: 'Half of all patients do not take medications as prescribed',
      color: 'text-red-600',
      bgColor: 'bg-red-100'
    },
    {
      icon: DollarSign,
      value: '$290B',
      label: 'Annual Healthcare Cost',
      description: 'Spent annually in the US due to medication nonadherence',
      color: 'text-orange-600',
      bgColor: 'bg-orange-100'
    },
    {
      icon: Heart,
      value: '125M',
      label: 'Americans Affected',
      description: 'Living with chronic conditions requiring medication management',
      color: 'text-pink-600',
      bgColor: 'bg-pink-100'
    },
    {
      icon: TrendingUp,
      value: '10%',
      label: 'Hospitalizations',
      description: 'Of all hospitalizations are due to medication nonadherence',
      color: 'text-purple-600',
      bgColor: 'bg-purple-100'
    }
  ];

  return (
    <section id="solutions" className="py-20 lg:py-32 bg-gradient-to-br from-gray-50 to-blue-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <div className="inline-block px-4 py-2 bg-red-100 text-red-600 rounded-full mb-4">
            The Challenge
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
            The Problem
          </h2>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            Medication nonadherence is a critical healthcare crisis affecting millions of Americans and costing the healthcare system billions annually
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {statistics.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div
                key={index}
                className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow duration-300"
              >
                <div className={`${stat.bgColor} w-12 h-12 rounded-lg flex items-center justify-center mb-4`}>
                  <Icon size={24} className={stat.color} />
                </div>
                
                <div className={`text-4xl font-bold ${stat.color} mb-2`}>
                  {stat.value}
                </div>
                
                <div className="text-sm font-semibold text-gray-900 mb-2">
                  {stat.label}
                </div>
                
                <p className="text-sm text-gray-600">
                  {stat.description}
                </p>
              </div>
            );
          })}
        </div>

        <div className="mt-16 bg-white rounded-2xl p-8 shadow-lg">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                Why This Matters
              </h3>
              <ul className="space-y-3 text-gray-600">
                <li className="flex items-start gap-3">
                  <span className="text-blue-600 mt-1">✓</span>
                  <span>Poor medication adherence leads to worsening health conditions</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-blue-600 mt-1">✓</span>
                  <span>Increased hospitalizations and emergency room visits</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-blue-600 mt-1">✓</span>
                  <span>Higher healthcare costs for patients and the system</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-blue-600 mt-1">✓</span>
                  <span>Reduced quality of life and preventable complications</span>
                </li>
              </ul>
            </div>
            <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl p-8 text-white">
              <h3 className="text-2xl font-bold mb-4">Our Solution</h3>
              <p className="mb-6">
                We're addressing this crisis through innovative technology that makes medication management simple, accessible, and effective for everyone.
              </p>
              <button className="px-6 py-3 bg-white text-blue-600 rounded-full hover:bg-gray-100 transition-colors">
                Learn How We Help
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
