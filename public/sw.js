// This is a placeholder service worker to prevent 404 errors causing Clerk middleware issues.
self.addEventListener('install', () => {
    self.skipWaiting();
});
self.addEventListener('activate', () => {
    // Unregister/claim immediately
    // self.registration.unregister();
});
