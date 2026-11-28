/**
 * Future insights include overall analysis, most improved and strongest skills,
 * areas for improvement, recurring difficulties, and recommended practice topics.
 * The backend resolves authorized interview history, submitted answers,
 * evaluations, career goals, and profile context under the user's permissions.
 *
 * A future practice plan carries recommended interview types and topics,
 * priority skills, difficulty, frequency, estimated duration, short- and
 * long-term goals, dated checkpoints, and editable session configurations.
 * The provider can regenerate or update a plan as the user's goals evolve.
 */
export function createInterviewCoachingProvider({ requestInsights, requestPracticePlan } = {}) {
  return {
    async getInsights(request) {
      return requestInsights ? requestInsights(request) : { status: 'unavailable' }
    },
    async getPracticePlan(request) {
      return requestPracticePlan ? requestPracticePlan(request) : { status: 'unavailable' }
    }
  }
}
