export default function OnboardingLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className="min-h-[80vh] flex items-center justify-center p-4">
            <div className="w-full max-w-2xl">
                {children}
            </div>
        </div>
    )
}
