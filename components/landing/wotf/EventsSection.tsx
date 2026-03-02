import { Calendar } from 'lucide-react';
import MotionWrapper from './MotionWrapper';

const EventsSection = () => {
    const events = [
        {
            id: 1,
            name: "2026 Philippine Open Taekwondo Championships",
            location: "Manila, Philippines",
            date: "FEB 26 - MAR 01",
            color: "bg-congo-blue",
        },
        {
            id: 2,
            name: "National Team Selections",
            location: "Pasay City",
            date: "APR 15 - APR 18",
            color: "bg-african-turquoise",
        },
        {
            id: 3,
            name: "Visayas Regional Championships",
            location: "Cebu City",
            date: "MAY 20 - MAY 22",
            color: "bg-spanish-red",
        },
        {
            id: 4,
            name: "Mindanao Open",
            location: "Davao City",
            date: "JUN 10 - JUN 12",
            color: "bg-super-green",
        }
    ];

    return (
        <section className="py-12 md:py-20 bg-white">
            <div className="container mx-auto px-6">
                <MotionWrapper className="text-center mb-8 md:mb-16" direction="up">
                    <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-african-turquoise uppercase tracking-tighter mb-4 [-webkit-text-stroke:1px_currentColor]">
                        Upcoming <span className="text-spanish-red">Events</span>
                    </h2>
                    <p className="text-gray-600 max-w-2xl mx-auto">
                        Join the action. Compete against the best. Witness history.
                    </p>
                </MotionWrapper>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {events.map((event, index) => (
                        <MotionWrapper
                            key={event.id}
                            delay={index * 0.1}
                            direction="up"
                        >
                            <div
                                className={`${event.color} relative overflow-hidden group p-6 md:p-8 h-60 md:h-80 flex flex-col justify-between rounded-sm shadow-lg md:hover:shadow-2xl transition-shadow duration-300 md:hover:-translate-y-2 md:transition-all cursor-pointer`}
                            >
                                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                    <Calendar size={120} />
                                </div>

                                <div className="relative z-10">
                                    <span className="inline-block bg-white/20 backdrop-blur-sm text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-widest mb-4">
                                        {event.location}
                                    </span>
                                    <h3 className="text-white text-2xl font-bold uppercase leading-tight mb-2">
                                        {event.name}
                                    </h3>
                                </div>

                                <div className="relative z-10 border-t border-white/30 pt-4">
                                    <p className="text-dashing-yellow font-black text-xl uppercase tracking-wider">
                                        {event.date}
                                    </p>
                                </div>
                            </div>
                        </MotionWrapper>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default EventsSection;
