import { Linkedin, Mail } from 'lucide-react';

export function TeamSection() {
  const teamMembers = [
    {
      name: 'Dr. Sarah Johnson',
      role: 'Chief Executive Officer',
      bio: 'Healthcare innovator with 15+ years of experience in digital health solutions',
      initials: 'SJ',
      color: 'bg-blue-500'
    },
    {
      name: 'Michael Chen',
      role: 'Chief Technology Officer',
      bio: 'Software architect passionate about building scalable healthcare platforms',
      initials: 'MC',
      color: 'bg-purple-500'
    },
    {
      name: 'Dr. Emily Rodriguez',
      role: 'Chief Medical Officer',
      bio: 'Board-certified physician dedicated to improving patient outcomes',
      initials: 'ER',
      color: 'bg-indigo-500'
    },
    {
      name: 'James Williams',
      role: 'VP of Product',
      bio: 'Product leader focused on user-centered design and innovation',
      initials: 'JW',
      color: 'bg-cyan-500'
    },
    {
      name: 'Lisa Thompson',
      role: 'VP of Operations',
      bio: 'Operations expert ensuring seamless delivery of healthcare solutions',
      initials: 'LT',
      color: 'bg-teal-500'
    }
  ];

  return (
    <section className="py-20 lg:py-32 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
            Meet Our Team
          </h2>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            A dedicated group of professionals committed to revolutionizing medication adherence
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-8">
          {teamMembers.map((member, index) => (
            <div
              key={index}
              className="group bg-white border-2 border-gray-200 rounded-xl p-6 hover:border-blue-300 hover:shadow-xl transition-all duration-300"
            >
              {/* Avatar */}
              <div className="flex justify-center mb-4">
                <div className={`${member.color} w-24 h-24 rounded-full flex items-center justify-center text-white text-2xl font-bold group-hover:scale-110 transition-transform duration-300`}>
                  {member.initials}
                </div>
              </div>

              {/* Info */}
              <div className="text-center">
                <h3 className="text-xl font-bold text-gray-900 mb-1">
                  {member.name}
                </h3>
                <p className="text-sm text-blue-600 font-semibold mb-3">
                  {member.role}
                </p>
                <p className="text-sm text-gray-600 mb-4">
                  {member.bio}
                </p>

                {/* Social Links */}
                <div className="flex justify-center gap-3">
                  <button className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors">
                    <Linkedin size={18} />
                  </button>
                  <button className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors">
                    <Mail size={18} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
