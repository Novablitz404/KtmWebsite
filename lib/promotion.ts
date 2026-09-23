// Examiner links normally expire 3 days after the test date. An organizer can
// push the deadline out further (see extendExaminerLink in app/promotions/actions.ts),
// which is stored as an override on examinerLinkExpiresAt.
export const EXAMINER_LINK_DEFAULT_VALID_DAYS = 3

export function getExaminerLinkExpiration(promotionTest: { testDate: Date | string; examinerLinkExpiresAt?: Date | string | null }): Date {
    if (promotionTest.examinerLinkExpiresAt) {
        return new Date(promotionTest.examinerLinkExpiresAt)
    }
    const expiration = new Date(promotionTest.testDate)
    expiration.setDate(expiration.getDate() + EXAMINER_LINK_DEFAULT_VALID_DAYS)
    return expiration
}
