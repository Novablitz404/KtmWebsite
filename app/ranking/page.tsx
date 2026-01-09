export default function RankingPage() {
    return (
        <main className="min-h-screen bg-gray-50">
            {/* Hero Section */}
            <div className="relative bg-gradient-to-br from-red-600 via-red-700 to-red-800 py-16">
                <div className="absolute inset-0 opacity-10" style={{
                    backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
                    backgroundSize: '40px 40px'
                }} />
                <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <h1 className="text-4xl sm:text-5xl font-black text-white">Ranking</h1>
                    <p className="mt-4 text-lg text-red-100">
                        Athlete and club rankings across all tournaments
                    </p>
                </div>
            </div>

            {/* Coming Soon */}
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
                <div className="text-center bg-white rounded-2xl border border-gray-200 p-16 shadow-sm">
                    <div className="text-7xl mb-6">📊</div>
                    <h2 className="text-3xl font-bold text-gray-900 mb-4">Coming Soon</h2>
                    <p className="text-gray-500 text-lg max-w-md mx-auto">
                        We're working on a comprehensive ranking system to track athlete performance
                        and club standings across all tournament events.
                    </p>
                    <div className="mt-8 inline-flex items-center gap-2 px-5 py-2.5 bg-gray-100 text-gray-600 rounded-full text-sm font-medium">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                        </span>
                        In Development
                    </div>
                </div>
            </div>

            {/* Footer */}
            <footer className="bg-white border-t border-gray-200 py-10 mt-auto">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <p className="text-gray-400 text-sm">
                        © {new Date().getFullYear()} KTM Tournament Manager. Built for the Taekwondo community.
                    </p>
                </div>
            </footer>
        </main>
    )
}
