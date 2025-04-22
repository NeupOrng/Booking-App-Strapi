/**
 * count-attendees controller
 */

export default {
  async countByScheduleAndTimeslot(ctx) {
    try {
      const event = await strapi.db.query('api::event-date.event-date').findMany({
        where: {
          state: 'open'
        }
      });

      console.log('event',event)

      for (const e of event) {
        const schedules = await strapi.db.query('api::schedule.schedule').findMany({
          populate: ['timeslots'],
          where: {
            events: e.id,
            is_expired: false
          }
        });

        console.log('schedules', schedules)
        
        for (const s of schedules) {
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
        e.schedules = schedules;
      }

      return {
        data: {
          event: event
        },
      };
    } catch (error) {
      return ctx.badRequest('Error counting attendees', { error: error.message });
    }
  },
  async registerAttendee(ctx) {
    const requestObj = ctx.request.body.data;
    
    return {
      status: "success"
    }
  }
}; 