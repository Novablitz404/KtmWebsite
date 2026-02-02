export default function PageTransition({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className="flex-1 w-full">
            {children}
        </div>
    )
}
