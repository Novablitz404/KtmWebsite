// Shared react-query definitions for the Club Manager tabs in a member's profile. The profile prefetches these when it
// opens, so by the time someone clicks Membership or Attendance the data is usually already there.
import { getMembership } from '@/app/club/manager'
import { getMemberAttendance } from '@/app/club/attendance'

export const membershipQuery = (memberId: string) => ({
    queryKey: ['member-membership', memberId],
    queryFn: async () => {
        const res = await getMembership(memberId)
        if (res.error || !res.membership) throw new Error(res.error || 'Could not load membership')
        return res.membership
    },
    staleTime: 30_000,
})

export const memberAttendanceQuery = (memberId: string) => ({
    queryKey: ['member-attendance', memberId],
    queryFn: async () => {
        const res = await getMemberAttendance(memberId)
        if (res.error) throw new Error(res.error)
        return res.records || []
    },
    staleTime: 30_000,
})
