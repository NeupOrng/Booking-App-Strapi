import type { Core } from '@strapi/strapi';
import TelegramBot from "node-telegram-bot-api"

const TelebotFactory = (() => {
  let instance;
  return {
    getInstance: () => {
      if (instance == null) {
        instance = new TelegramBot(
          process.env.TELEGRAM_TOKEN,
          {
            polling: true,
          }
        );
        // Hide the constructor so the returned object can't be new'd...
        instance.constructor = null;
      }
      return instance;
    },
  };
})();

const successfulRegisterTemplate = (order) => {
  const message = [
      "You have received a new register!\n",
      `Customer: ${order.fullname}`,
      `Phone Number: ${order.phone}`,
      `Event: ${order.event_date.title}`,
      `Amount to Pay: $${order.paid_amount}`,
      `Schedule: ${order.schedule.date}`,
      `Time: ${order.timeslot.event_time}`,
    ].join("\n");

    return message;

}

const telebot = (strapi: Core.Strapi, bot) => {
  bot.on('message', async (message) => {
    /**
     * ! Abort
     */
    if (message.text !== '/start' && !message.contact) {
      bot.sendMessage(
        message.chat.id,
        `
            Unrecognized message/command! 😅 \nPlease try again!
            `,
      );
    }

    /**
     * * Main Flow
     */
    if (message.contact) {
      strapi.log.info(
        `User ${message.contact.first_name} ${message.contact.last_name} with phone number ${message.contact.phone_number} has shared their contact!`,
      );
      strapi.log.info(`strapi: ${strapi}`);
      const existingCustomer = await strapi.db.query('api::telegram.telegram').findOne({
        where: { phone: message.contact.phone_number, }
      });

      strapi.log.info(`Existing customer: ${existingCustomer}`);

      if (existingCustomer) {
        /**
         * * Update chat id of the phone_number if they change account
         */
        if (existingCustomer.chatId !== message.chat.id) {

          await strapi.db.query('api::telegram.telegram').update(
            {
              where: { id: existingCustomer.id },
              data: {
                chatId: message.chat.id.toString()
              }
            }
          )

          bot.sendMessage(
            message.chat.id.toString(),
            `It seems you changed your account! 
              \n\nWelcome back to our service, ${message.contact.first_name} 🥰`,
          );

          return;
        }

        bot.sendMessage(
          message.chat.id.toString(),
          `You have already registered! 🥰 
            \n\nIf there's any inconvience. Please contact AMK MFI Support!`,
        );

        return;
      }

      /**
       * * Register Customer in Bot Database
       */
      try {
        await strapi.documents('api::telegram.telegram').create({
          data: {
            firstname: message.contact?.first_name,
            lastname: message.contact?.last_name,
            phone: message.contact.phone_number,
            chatId: message.chat.id.toString(),
          }
        });
      } catch (error) {
        bot.sendMessage(
          message.chat.id,
          `There was a problem with registeration! Please retry /start command in a few moments. 
                \n\nIf there's any inconvience. Please contact AMK MFI Support!`,
        );

        throw new Error(error.message);
      }

      /**
       * * Remove custom keyboard
       */
      bot.sendMessage(
        message.chat.id,
        `Thank you for sharing! 🙏🏻 
              \n\nWelcome aboard our service, ${message.contact.first_name}! 🥰`,
        {
          reply_markup: {
            remove_keyboard: true,
          },
        },
      );
    }
  });

  /**
   * * On text /start which is the first command when user initialize conversation with bot
   */
  bot.onText(/\/start/, (message) => {
    /**
     * * Request user phone number/location
     */
    bot.sendMessage(
      message.chat.id,
      'Welcome to our service! 😍 \n\nPlease share your phone number in order to recieve custom personal notifications! 🥳',
      {
        reply_markup: {
          keyboard: [
            [
              {
                text: 'Share Contact',
                request_contact: true,
              },
            ],
          ],
          one_time_keyboard: true,
        },
      },
    );
  });

  /**
   * * Error Handling
   */
  bot.on('polling_error', (error) => {
    strapi.log.error(error);
  });

}

export default {
  /**
   * An asynchronous register function that runs before
   * your application is initialized.
   *
   * This gives you an opportunity to extend code.
   */
  register(/* { strapi }: { strapi: Core.Strapi } */) { },

  /**
   * An asynchronous bootstrap function that runs before
   * your application gets started.
   *
   * This gives you an opportunity to set up your data model,
   * run jobs, or perform some special logic.
   */
  async bootstrap({ strapi }: { strapi: Core.Strapi }) {
    const bot = TelebotFactory.getInstance();
    telebot(strapi, bot);
    const telegram = await strapi.db.query('api::telegram.telegram').findMany();
    strapi.log.info('Telegram bot is running!', telegram);

    strapi.db.lifecycles.subscribe({
      models: ['api::attendee.attendee'],
      async afterCreate(event) {
        const { result } = event;
        if(result.publishedAt === null) {
          strapi.log.info('Attendee is not published yet!');
          return;
        }
        const data = await strapi.documents('api::attendee.attendee').findFirst({
          filters: { documentId: result.documentId },
          populate: ['event_date', 'schedule','timeslot']
        });
        const message = successfulRegisterTemplate(data);
        const telegrams = await strapi.db.query('api::telegram.telegram').findMany();
        telegrams.forEach((telegram) => {
          bot.sendMessage(
            telegram.chatId,
            message,
            {
              reply_markup: {
                remove_keyboard: true,
              },
            },
          );
          strapi.log.info(`Telegram message sent to ${telegram.phone}`);
        });
        strapi.log.info(`Telegram bot is running! ${telegram.length}`);
      }
    })
  },
  
  destroy() {
    const bot = TelebotFactory.getInstance();
    bot.stopPolling();
    strapi.log.info('Telegram bot is stopped!');
  }
};
