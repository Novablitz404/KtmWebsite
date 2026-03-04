'use client'

export default function AthleteTopBar() {
    return (
        <div className="hidden md:flex items-center justify-between h-16 px-6 bg-gray-50">
            {/* Dashboard Title + Date */}
            <div>
                <h1 className="text-xl font-black text-gray-900 tracking-tight leading-tight">Dashboard</h1>
                <p className="text-xs text-gray-400 font-medium">
                    {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                </p>
            </div>
        </div>
    )
}
