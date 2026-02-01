import { ArrowRight } from 'lucide-react';

export function HeroSection() {
  return (
    <section id="home" className="pt-16 bg-gradient-to-br from-blue-50 to-indigo-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32">
        <div className="text-center">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
            Empowering Patients,
            <br />
            <span className="text-blue-600">Supporting Care</span>
          </h1>
          
          <p className="text-lg sm:text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Revolutionizing medication adherence through innovative technology that connects patients, caregivers, and healthcare providers.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button className="px-8 py-3 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors flex items-center gap-2 group">
              Get Started
              <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </button>
            <a href="#about" className="px-8 py-3 bg-white text-blue-600 border-2 border-blue-600 rounded-full hover:bg-blue-50 transition-colors">
              Learn More
            </a>
          </div>

          {/* Decorative elements */}
          <div className="mt-16 grid grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="text-3xl sm:text-4xl font-bold text-blue-600">125M+</div>
              <div className="text-sm text-gray-600 mt-2">Americans Affected</div>
            </div>
            <div className="text-center">
              <div className="text-3xl sm:text-4xl font-bold text-blue-600">$290B</div>
              <div className="text-sm text-gray-600 mt-2">Annual Cost</div>
            </div>
            <div className="text-center">
              <div className="text-3xl sm:text-4xl font-bold text-blue-600">50%</div>
              <div className="text-sm text-gray-600 mt-2">Nonadherence Rate</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}