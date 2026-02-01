import { Menu, X } from 'lucide-react';
import { useState } from 'react';

export function Navigation() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
      setIsMenuOpen(false);
    }
  };

  return (
    <nav className="fixed top-0 left-0 right-0 bg-white shadow-sm z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex-shrink-0">
            <span className="text-2xl font-bold text-blue-600">TYM</span>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <button onClick={() => scrollToSection('home')} className="text-gray-700 hover:text-blue-600 transition-colors">
              Home
            </button>
            <button onClick={() => scrollToSection('about')} className="text-gray-700 hover:text-blue-600 transition-colors">
              About
            </button>
            <button onClick={() => scrollToSection('solutions')} className="text-gray-700 hover:text-blue-600 transition-colors">
              Solutions
            </button>
            <button onClick={() => scrollToSection('contact')} className="text-gray-700 hover:text-blue-600 transition-colors">
              Contact
            </button>
          </div>

          {/* Auth Buttons */}
          <div className="hidden md:flex items-center space-x-4">
            <button className="px-4 py-2 text-blue-600 hover:text-blue-700 transition-colors">
              Login
            </button>
            <button className="px-6 py-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors">
              Sign Up
            </button>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-gray-700 hover:text-blue-600"
            >
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isMenuOpen && (
        <div className="md:hidden bg-white border-t">
          <div className="px-4 pt-2 pb-4 space-y-2">
            <button
              onClick={() => scrollToSection('home')}
              className="block w-full text-left px-3 py-2 text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded transition-colors"
            >
              Home
            </button>
            <button
              onClick={() => scrollToSection('about')}
              className="block w-full text-left px-3 py-2 text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded transition-colors"
            >
              About
            </button>
            <button
              onClick={() => scrollToSection('solutions')}
              className="block w-full text-left px-3 py-2 text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded transition-colors"
            >
              Solutions
            </button>
            <button
              onClick={() => scrollToSection('contact')}
              className="block w-full text-left px-3 py-2 text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded transition-colors"
            >
              Contact
            </button>
            <div className="pt-4 space-y-2">
              <button className="block w-full px-4 py-2 text-blue-600 border border-blue-600 rounded-full hover:bg-blue-50 transition-colors">
                Login
              </button>
              <button className="block w-full px-4 py-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors">
                Sign Up
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
