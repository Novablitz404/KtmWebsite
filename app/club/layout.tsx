export default async function ClubLayout({ children }: { children: React.ReactNode }) {
    // Club dashboard uses its own sidebar (ClubSidebar + ClubTopBar),
    // so no WOTF Navbar/Footer wrapping needed — just render as-is.
    return <>{children}</>
}
