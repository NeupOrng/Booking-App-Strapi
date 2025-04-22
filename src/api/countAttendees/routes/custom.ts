/**
 * count-attendees router
 */

import { factories } from '@strapi/strapi';

export default {
  routes: [
    {
      method: 'GET',
      path: '/event/schedule/count-attendees',
      handler: 'custom.countByScheduleAndTimeslot',
      config: {
        policies: [],
        auth: false,
      },
    },
    {
      method: 'POST',
      path: '/attendee/register',
      handler: 'custom.registerAttendee',
      config: {
        policies: [],
        auth: false,
      },
    }
  ],
}; 