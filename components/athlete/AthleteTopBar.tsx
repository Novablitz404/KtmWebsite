'use client'



interface AthleteTopBarProps {
    userName?: string
    userImageUrl?: string
}

export default function AthleteTopBar({
    userName = 'Athlete',
    userImageUrl,
}: AthleteTopBarProps) {
    return (
        <div className="hidden md:flex items-center justify-between h-16 px-6 bg-gray-50">
            {/* Search Bar */}
            <div />

            {/* Right Side: Notifications & User Profile */}
            <div className="flex items-center gap-4">


                {/* User Profile - Display only */}
                <div className="flex items-center gap-3 px-3 py-1.5">
                    <span className="text-sm font-medium text-gray-700">{userName}</span>
                    {userImageUrl ? (
                        <img
                            src={userImageUrl}
                            alt={userName}
                            className="w-9 h-9 rounded-full object-cover border-2 border-gray-100"
                        />
                    ) : (
                        <div className="w-9 h-9 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-sm font-bold">
                            {userName.charAt(0)}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
