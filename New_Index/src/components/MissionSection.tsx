import { Users, MessageCircle, Lightbulb } from 'lucide-react';

export function MissionSection() {
  const pillars = [
    {
      icon: Users,
      title: 'Empowerment',
      description: 'Providing patients with tools and knowledge to take control of their medication management and health outcomes.',
      color: 'bg-blue-500',
      hoverColor: 'group-hover:bg-blue-600'
    },
    {
      icon: MessageCircle,
      title: 'Communication',
      description: 'Facilitating seamless connections between patients, caregivers, and healthcare providers for better coordination.',
      color: 'bg-purple-500',
      hoverColor: 'group-hover:bg-purple-600'
    },
    {
      icon: Lightbulb,
      title: 'Innovation',
      description: 'Leveraging cutting-edge technology to create intuitive solutions that make medication adherence simple and effective.',
      color: 'bg-indigo-500',
      hoverColor: 'group-hover:bg-indigo-600'
    }
  ];

  return (
    <section id="about" className="py-20 lg:py-32 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
            Our Mission
          </h2>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            Take Your Medicine Innovations is committed to transforming healthcare through three core pillars
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {pillars.map((pillar, index) => {
            const Icon = pillar.icon;
            return (
              <div
                key={index}
                className="group bg-white border-2 border-gray-200 rounded-2xl p-8 hover:border-blue-300 hover:shadow-xl transition-all duration-300 cursor-pointer"
              >
                <div className={`${pillar.color} ${pillar.hoverColor} w-16 h-16 rounded-full flex items-center justify-center mb-6 transition-colors`}>
                  <Icon size={32} className="text-white" />
                </div>
                
                <h3 className="text-2xl font-bold text-gray-900 mb-4">
                  {pillar.title}
                </h3>
                
                <p className="text-gray-600 leading-relaxed">
                  {pillar.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
