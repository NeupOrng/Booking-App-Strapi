/**
 * count-attendees router
 */

import { factories } from '@strapi/strapi';

export default {
  routes: [
    {
      method: 'GET',
      path: '/schedule/count-attendees',
      handler: 'count-attendees.countByScheduleAndTimeslot',
      config: {
        policies: [],
        auth: false,
      },
    },
  ],
}; 