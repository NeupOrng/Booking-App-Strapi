/**
 * count-attendees controller
 */

export default {
  async countByScheduleAndTimeslot(ctx) {
    try {
      const schedule = await strapi.db.query('api::schedule.schedule').findMany({
        populate: true
      });
      
      for (const s of schedule) {
        for(const t of s.timeslots) {
          const attendees = await strapi.db.query('api::attendee.attendee').count({
            where: {
              schedule: s.id,
              timeslot: t.id
            }
          });
          t.attendee_count = attendees;
          t.is_reach_limit = attendees >= t.limit_participant;
        }
      }

      return {
        data: {
          schedule: schedule,
        },
      };
    } catch (error) {
      return ctx.badRequest('Error counting attendees', { error: error.message });
    }
  },
}; 