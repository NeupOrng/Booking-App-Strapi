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

      console.log('event', event)

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
          for (const t of s.timeslots) {
            const attendees = await strapi.db.query('api::attendee.attendee').count({
              where: {
                event: e.id,
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
    const requestObj = ctx.request.body;
    const eventId = requestObj.data.event.connect[0];
    const scheduleId = requestObj.data.schedule.connect[0];
    const timeslotId = requestObj.data.timeslot.connect[0];

    requestObj.data.phone = requestObj.data.phone.replace(/[()-\s]/g, '');

    const timeslot = await strapi.db.query('api::timeslot.timeslot').findOne({
      where: {
        documentId: timeslotId
      }
    })

    console.log('timeslot', timeslot)

    const countAttendee = await strapi.db.query('api::attendee.attendee').count({
      where: {
        event: {
          documentId: eventId
        },
        schedule: {
          documentId: scheduleId
        },
        timeslot: {
          documentId: timeslotId
        }
      }
    });

    if (countAttendee >= timeslot.limit_participant) {
      return ctx.tooManyRequests('Timeslot is full', { error: 'Timeslot is full' });
    }

    const attendees = await strapi.db.query('api::attendee.attendee').findMany({
      where: {
        event: {
          documentId: eventId
        },
        schedule: {
          documentId: scheduleId
        },
        timeslot: {
          documentId: timeslotId
        },
        phone: requestObj.data.phone
      }
    })

    if (attendees.length > 0) {
      return ctx.conflict('Telegram phone number already registered for this timeslot', { error: 'Telegram phone number already registered for this timeslot' });
    }


    const attendee = await strapi.service('api::attendee.attendee').create(requestObj)

    return {
      status: "success",
      data: attendee
    }
  }
}; 