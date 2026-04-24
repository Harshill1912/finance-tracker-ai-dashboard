// SMS service for sending invitations and notifications
const twilio = require('twilio');

// Create Twilio client if credentials are available
const getTwilioClient = () => {
  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
    return twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  }
  return null;
};

const smsService = {
  /**
   * Send expense invitation SMS
   */
  async sendExpenseInvite({ to, expenseDetails, inviteLink, userName, payerEmail, payerPhone, paymentDetails = {} }) {
    try {
      let message = `💰 ${userName} added you to an expense:\n\n`;
      message += `📝 ${expenseDetails.description}\n`;
      message += `💵 Your Share: ₹${expenseDetails.share}\n`;
      message += `👤 Paid By: ${userName}\n\n`;
      message += `💳 Pay ${userName}:\n`;
      
      // Add payment details if shared
      if (paymentDetails.showPaymentDetails) {
        if (paymentDetails.upiId) {
          message += `\n📱 UPI ID: ${paymentDetails.upiId}\n`;
          message += `Send ₹${expenseDetails.share} via UPI\n`;
        }
        if (paymentDetails.bankAccountNumber && paymentDetails.bankIFSC) {
          message += `\n🏦 Bank Transfer:\n`;
          message += `A/C: ${paymentDetails.bankAccountNumber}\n`;
          message += `IFSC: ${paymentDetails.bankIFSC}\n`;
          if (paymentDetails.bankName) {
            message += `Bank: ${paymentDetails.bankName}\n`;
          }
        }
      } else {
        if (payerPhone) {
          message += `📱 Phone: ${payerPhone}\n`;
        }
        if (payerEmail) {
          message += `📧 Email: ${payerEmail}\n`;
        }
      }
      
      message += `\n🔗 Pay Online: ${inviteLink}\n\n`;
      message += `Payment Options:\n`;
      message += `1. Click link to pay online\n`;
      if (paymentDetails.upiId) {
        message += `2. UPI: ${paymentDetails.upiId}\n`;
      } else {
        message += `2. UPI (contact ${userName})\n`;
      }
      if (paymentDetails.bankAccountNumber) {
        message += `3. Bank transfer (details above)\n`;
      } else {
        message += `3. Bank transfer (contact ${userName})\n`;
      }
      message += `4. Cash (mark paid in app)`;
      
      const client = getTwilioClient();
      
      if (client) {
        // Actually send SMS via Twilio
        try {
          const messageParams = {
            body: message,
            to: to
          };
          
          // Use Messaging Service SID if available (recommended), otherwise use phone number
          if (process.env.TWILIO_MESSAGING_SERVICE_SID) {
            messageParams.messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;
          } else if (process.env.TWILIO_PHONE_NUMBER) {
            messageParams.from = process.env.TWILIO_PHONE_NUMBER;
          } else {
            throw new Error('TWILIO_MESSAGING_SERVICE_SID or TWILIO_PHONE_NUMBER must be configured');
          }
          
          await client.messages.create(messageParams);
          console.log(`✅ SMS sent successfully to ${to}`);
          return { success: true };
        } catch (twilioError) {
          console.error('❌ Twilio SMS error:', twilioError.message);
          // Fall through to logging
        }
      }
      
      // Log SMS details if Twilio not configured
      console.log('📱 SMS Invitation (SMS service not configured - logging only):', {
        to,
        message: message.substring(0, 100) + '...'
      });
      console.log('⚠️ To enable SMS sending, configure TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_MESSAGING_SERVICE_SID (or TWILIO_PHONE_NUMBER) in .env');
      return { success: true, note: 'SMS service not configured - logged only' };
    } catch (error) {
      console.error('❌ SMS send error:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Send payment reminder SMS
   */
  async sendPaymentReminder({ to, expenseDetails, amount, userName, payerEmail, payerPhone, paymentDetails = {} }) {
    try {
      let message = `⏰ Payment Reminder\n\n`;
      message += `You owe ${userName} ₹${amount}\n`;
      message += `For: ${expenseDetails.description}\n\n`;
      message += `💳 Pay ${userName}:\n`;
      
      if (paymentDetails.showPaymentDetails) {
        if (paymentDetails.upiId) {
          message += `📱 UPI ID: ${paymentDetails.upiId}\n`;
          message += `Send ₹${amount} via UPI\n`;
        }
        if (paymentDetails.bankAccountNumber && paymentDetails.bankIFSC) {
          message += `🏦 Bank Transfer:\n`;
          message += `A/C: ${paymentDetails.bankAccountNumber}\n`;
          message += `IFSC: ${paymentDetails.bankIFSC}\n`;
        }
      } else {
        if (payerPhone) {
          message += `📱 ${payerPhone}\n`;
        }
        if (payerEmail) {
          message += `📧 ${payerEmail}\n`;
        }
      }
      
      message += `\nPayment Options:\n`;
      message += `1. UPI to ${userName}\n`;
      message += `2. Bank transfer\n`;
      message += `3. Cash (mark paid in app)\n`;
      message += `\nPay online: ${process.env.FRONTEND_URL || 'http://localhost:5173'}/splitexpenses`;
      
      const client = getTwilioClient();
      
      if (client) {
        // Actually send SMS via Twilio
        try {
          const messageParams = {
            body: message,
            to: to
          };
          
          // Use Messaging Service SID if available (recommended), otherwise use phone number
          if (process.env.TWILIO_MESSAGING_SERVICE_SID) {
            messageParams.messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;
          } else if (process.env.TWILIO_PHONE_NUMBER) {
            messageParams.from = process.env.TWILIO_PHONE_NUMBER;
          } else {
            throw new Error('TWILIO_MESSAGING_SERVICE_SID or TWILIO_PHONE_NUMBER must be configured');
          }
          
          await client.messages.create(messageParams);
          console.log(`✅ Payment reminder SMS sent successfully to ${to}`);
          return { success: true };
        } catch (twilioError) {
          console.error('❌ Twilio SMS error:', twilioError.message);
          // Fall through to logging
        }
      }
      
      // Log SMS details if Twilio not configured
      console.log('📱 Payment Reminder SMS (SMS service not configured - logging only):', {
        to,
        message: message.substring(0, 100) + '...'
      });
      console.log('⚠️ To enable SMS sending, configure TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_MESSAGING_SERVICE_SID (or TWILIO_PHONE_NUMBER) in .env');
      return { success: true, note: 'SMS service not configured - logged only' };
    } catch (error) {
      console.error('❌ SMS send error:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Send group invitation SMS
   */
  async sendGroupInvite({ to, groupName, inviterName, inviteLink }) {
    try {
      let message = `👥 ${inviterName} invited you to join "${groupName}" group.\n\n`;
      message += `Join to split expenses together.\n\n`;
      message += `Accept: ${inviteLink}\n\n`;
      message += `If you don't have an account, sign up and you'll auto-join!`;
      
      const client = getTwilioClient();
      
      if (client) {
        try {
          const messageParams = {
            body: message,
            to: to
          };
          
          if (process.env.TWILIO_MESSAGING_SERVICE_SID) {
            messageParams.messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;
          } else if (process.env.TWILIO_PHONE_NUMBER) {
            messageParams.from = process.env.TWILIO_PHONE_NUMBER;
          } else {
            throw new Error('TWILIO_MESSAGING_SERVICE_SID or TWILIO_PHONE_NUMBER must be configured');
          }
          
          await client.messages.create(messageParams);
          console.log(`✅ Group invitation SMS sent successfully to ${to}`);
          return { success: true };
        } catch (twilioError) {
          console.error('❌ Twilio SMS error:', twilioError.message);
        }
      }
      
      console.log('📱 Group Invitation SMS (SMS service not configured - logging only):', {
        to,
        message: message.substring(0, 100) + '...'
      });
      return { success: true, note: 'SMS service not configured - logged only' };
    } catch (error) {
      console.error('❌ SMS send error:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Send group created notification SMS
   */
  async sendGroupCreatedNotification({ to, userName, groupName, groupLink }) {
    try {
      let message = `🎉 Group Created!\n\n`;
      message += `Hi ${userName},\n\n`;
      message += `Your group "${groupName}" has been created successfully!\n\n`;
      message += `You can now:\n`;
      message += `• Invite members\n`;
      message += `• Split expenses\n`;
      message += `• Track payments\n\n`;
      message += `View group: ${groupLink}\n\n`;
      message += `Happy splitting! 💰`;
      
      const client = getTwilioClient();
      
      if (client) {
        try {
          const messageParams = {
            body: message,
            to: to
          };
          
          if (process.env.TWILIO_MESSAGING_SERVICE_SID) {
            messageParams.messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;
          } else if (process.env.TWILIO_PHONE_NUMBER) {
            messageParams.from = process.env.TWILIO_PHONE_NUMBER;
          } else {
            throw new Error('TWILIO_MESSAGING_SERVICE_SID or TWILIO_PHONE_NUMBER must be configured');
          }
          
          await client.messages.create(messageParams);
          console.log(`✅ Group creation SMS sent successfully to ${to}`);
          return { success: true };
        } catch (twilioError) {
          console.error('❌ Twilio SMS error:', twilioError.message);
          // Fall through to logging
        }
      }
      
      // Log SMS details if Twilio not configured
      console.log('📱 Group Created SMS (SMS service not configured - logging only):', {
        to,
        message: message.substring(0, 100) + '...'
      });
      console.log('⚠️ To enable SMS sending, configure TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_MESSAGING_SERVICE_SID (or TWILIO_PHONE_NUMBER) in .env');
      return { success: true, note: 'SMS service not configured - logged only' };
    } catch (error) {
      console.error('❌ SMS send error:', error);
      return { success: false, error: error.message };
    }
  }
};

module.exports = smsService;
