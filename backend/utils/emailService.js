// Email service for sending invitations and notifications
const nodemailer = require('nodemailer');

// Create reusable transporter
const createTransporter = () => {
  // Check if email service is configured
  if (process.env.EMAIL_SERVICE === 'gmail' && process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    // Remove spaces from app password if present
    const appPassword = process.env.EMAIL_PASS.replace(/\s+/g, '');
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: appPassword // Use App Password for Gmail
      }
    });
  } else if (process.env.SMTP_HOST && process.env.SMTP_PORT && process.env.SMTP_USER && process.env.SMTP_PASS) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  } else if (process.env.SENDGRID_API_KEY) {
    // SendGrid via SMTP
    return nodemailer.createTransport({
      host: 'smtp.sendgrid.net',
      port: 587,
      secure: false,
      auth: {
        user: 'apikey',
        pass: process.env.SENDGRID_API_KEY
      }
    });
  }
  
  // Return null if no email service configured (will log instead)
  return null;
};

const emailService = {
  /**
   * Send expense invitation email
   */
  async sendExpenseInvite({ to, expenseDetails, inviteLink, userName, payerEmail, payerPhone, paymentDetails = {}, groupName = null }) {
    try {
      const subject = groupName 
        ? `🎉 You're invited to join "${groupName}" splitting group!`
        : `${userName} invited you to join their splitting group - Pay ₹${expenseDetails.share}`;
      const html = this.getExpenseInviteEmailTemplate({ expenseDetails, inviteLink, userName, payerEmail, payerPhone, paymentDetails, groupName });
      
      const transporter = createTransporter();
      
      if (transporter) {
        // Actually send email
        const emailFrom = process.env.EMAIL_FROM || process.env.EMAIL_USER || process.env.SMTP_USER || 'noreply@financepro.ai';
        
        await transporter.sendMail({
          from: `"FinancePro AI" <${emailFrom}>`,
          to: to,
          subject: subject,
          html: html
        });
        
        console.log(`✅ Email sent successfully to ${to}`);
        return { success: true };
      } else {
        // Log email details if no email service configured
        console.log('📧 Email Invitation (Email service not configured - logging only):', {
          to,
          subject,
          body: html.substring(0, 200) + '...'
        });
        console.log('⚠️ To enable email sending, configure EMAIL_USER/EMAIL_PASS (Gmail) or SMTP_HOST/SMTP_PORT (SMTP) or SENDGRID_API_KEY in .env');
        return { success: true, note: 'Email service not configured - logged only' };
      }
    } catch (error) {
      console.error('❌ Email send error:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Send payment reminder email
   */
  async sendPaymentReminder({ to, expenseDetails, amount, userName, payerEmail, payerPhone, paymentDetails = {} }) {
    try {
      const subject = `⏰ Reminder: You owe ${userName} ₹${amount}`;
      const html = this.getPaymentReminderEmailTemplate({ expenseDetails, amount, userName, payerEmail, payerPhone, paymentDetails });
      
      const transporter = createTransporter();
      
      if (transporter) {
        const emailFrom = process.env.EMAIL_FROM || process.env.EMAIL_USER || process.env.SMTP_USER || 'noreply@financepro.ai';
        
        await transporter.sendMail({
          from: `"FinancePro AI" <${emailFrom}>`,
          to: to,
          subject: subject,
          html: html
        });
        
        console.log(`✅ Payment reminder email sent successfully to ${to}`);
        return { success: true };
      } else {
        console.log('📧 Payment Reminder (Email service not configured - logging only):', {
          to,
          subject,
          body: html.substring(0, 200) + '...'
        });
        console.log('⚠️ To enable email sending, configure EMAIL_USER/EMAIL_PASS (Gmail) or SMTP_HOST/SMTP_PORT (SMTP) or SENDGRID_API_KEY in .env');
        return { success: true, note: 'Email service not configured - logged only' };
      }
    } catch (error) {
      console.error('❌ Email send error:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Email template for expense invitation (Group-focused)
   */
  getExpenseInviteEmailTemplate({ expenseDetails, inviteLink, userName, payerEmail, payerPhone, paymentDetails = {}, groupName = null }) {
    // Build payment methods section
    let paymentMethodsHTML = '';
    
    if (paymentDetails.showPaymentDetails) {
      if (paymentDetails.upiId) {
        paymentMethodsHTML += `
          <div class="payment-method">
            <strong>1. UPI Payment (Recommended)</strong><br>
            <div style="background: #e7f3ff; padding: 10px; border-radius: 5px; margin: 10px 0;">
              <strong>UPI ID:</strong> <span style="font-family: monospace; font-size: 16px; color: #667eea;">${paymentDetails.upiId}</span><br>
              <small>Send ₹${expenseDetails.share} to this UPI ID using any UPI app (PhonePe, Google Pay, Paytm, etc.)</small>
            </div>
          </div>`;
      }
      
      if (paymentDetails.bankAccountNumber && paymentDetails.bankIFSC) {
        paymentMethodsHTML += `
          <div class="payment-method">
            <strong>2. Bank Transfer</strong><br>
            <div style="background: #e7f3ff; padding: 10px; border-radius: 5px; margin: 10px 0;">
              <strong>Account Holder:</strong> ${paymentDetails.accountHolderName || userName}<br>
              <strong>Account Number:</strong> <span style="font-family: monospace;">${paymentDetails.bankAccountNumber}</span><br>
              <strong>IFSC Code:</strong> <span style="font-family: monospace;">${paymentDetails.bankIFSC}</span><br>
              ${paymentDetails.bankName ? `<strong>Bank Name:</strong> ${paymentDetails.bankName}<br>` : ''}
              <small>Transfer ₹${expenseDetails.share} to this bank account</small>
            </div>
          </div>`;
      }
    }
    
    // If no payment details shared, show contact info
    if (!paymentMethodsHTML) {
      paymentMethodsHTML = `
        <div class="payment-method">
          <strong>1. Online Payment (Recommended)</strong><br>
          Click the button below to pay online via the app
        </div>
        <div class="payment-method">
          <strong>2. Contact ${userName} for Payment Details</strong><br>
          ${payerEmail ? `📧 Email: ${payerEmail}<br>` : ''}
          ${payerPhone ? `📱 Phone: ${payerPhone}` : ''}
        </div>`;
    } else {
      // Add online payment as first option
      paymentMethodsHTML = `
        <div class="payment-method">
          <strong>1. Online Payment (Recommended)</strong><br>
          Click the button below to pay online via the app
        </div>
        ${paymentMethodsHTML}
        <div class="payment-method">
          <strong>${paymentDetails.upiId || paymentDetails.bankAccountNumber ? '3' : '2'}. Cash/Other</strong><br>
          Pay directly to ${userName} and mark as paid in the app
        </div>`;
    }
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; padding: 14px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; font-size: 16px; }
          .expense-details { background: white; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #667eea; }
          .payment-info { background: #fff3cd; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #ffc107; }
          .contact-info { background: #e7f3ff; padding: 15px; border-radius: 5px; margin: 15px 0; }
          .payment-methods { margin-top: 15px; }
          .payment-method { padding: 10px; margin: 8px 0; background: white; border-radius: 5px; border: 1px solid #ddd; }
          .highlight { color: #667eea; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${groupName ? '👥 Join Splitting Group' : '💰 Expense Invitation'}</h1>
            <p style="margin: 10px 0 0 0; font-size: 18px;">${groupName ? `"${groupName}"` : `You owe ₹${expenseDetails.share}`}</p>
          </div>
          <div class="content">
            <p>Hi there! 👋</p>
            ${groupName 
              ? `<p><strong>${userName}</strong> has invited you to join their splitting group <strong>"${groupName}"</strong>! 🎉</p>
                 <p>This makes it easy to split expenses with your friends, family, or roommates. You can track who paid what and settle up easily.</p>`
              : `<p><strong>${userName}</strong> has invited you to join their splitting group and added you to a shared expense.</p>
                 <p>This makes it easy to split expenses with friends, family, or roommates. You can track who paid what and settle up easily.</p>`}
            
            <div class="expense-details">
              <h3 style="margin-top: 0; color: #667eea;">${groupName ? '📋 First Expense in Group' : '💰 Expense Details'}</h3>
              <p><strong>Description:</strong> ${expenseDetails.description}</p>
              <p><strong>Total Amount:</strong> ₹${expenseDetails.amount}</p>
              <p><strong>Your Share:</strong> <span class="highlight">₹${expenseDetails.share}</span></p>
              <p><strong>Paid By:</strong> ${userName}</p>
            </div>
            
            ${groupName ? `
            <div style="background: #e7f3ff; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #667eea;">
              <h3 style="margin-top: 0; color: #667eea;">✨ What is a Splitting Group?</h3>
              <p style="margin: 5px 0;">A splitting group lets you:</p>
              <ul style="margin: 10px 0; padding-left: 20px;">
                <li>Split expenses easily with multiple people</li>
                <li>Track who owes whom automatically</li>
                <li>Get reminders for pending payments</li>
                <li>View all group expenses in one place</li>
                <li>Settle up with just a few clicks</li>
              </ul>
            </div>
            ` : ''}

            <div class="payment-info">
              <h3 style="margin-top: 0; color: #856404;">💳 How to Pay ${userName}</h3>
              <div class="contact-info">
                <p style="margin: 5px 0;"><strong>📧 Email:</strong> ${payerEmail || 'Contact via app'}</p>
                ${payerPhone ? `<p style="margin: 5px 0;"><strong>📱 Phone:</strong> ${payerPhone}</p>` : ''}
              </div>
              
              <div class="payment-methods">
                <p><strong>Payment Methods:</strong></p>
                ${paymentMethodsHTML}
              </div>
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${inviteLink}" class="button">👉 View & Pay Online</a>
            </div>

            <p style="text-align: center; margin-top: 20px; font-size: 12px; color: #666;">
              Or copy this link: <a href="${inviteLink}" style="color: #667eea;">${inviteLink}</a>
            </p>
            
            <div style="margin-top: 20px; padding: 15px; background: #e7f3ff; border-radius: 5px; font-size: 14px;">
              <strong>📝 Getting Started:</strong>
              <ul style="margin: 10px 0; padding-left: 20px;">
                <li>Click the button above to join the ${groupName ? `"${groupName}" ` : ''}splitting group</li>
                <li>If you don't have an account, you can create one for free</li>
                <li>Once you join, you'll see all group expenses and can track payments</li>
                <li>You can pay online directly through the app</li>
              </ul>
            </div>

            <p style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666;">
              Best regards,<br>
              <strong>FinancePro AI</strong><br>
              <em>Smart expense splitting made easy</em>
            </p>
          </div>
        </div>
      </body>
      </html>
    `;
  },

  /**
   * Email template for payment reminder
   */
  getPaymentReminderEmailTemplate({ expenseDetails, amount, userName, payerEmail, payerPhone, paymentDetails = {} }) {
    // Build payment methods section
    let paymentMethodsHTML = '';
    
    if (paymentDetails.showPaymentDetails) {
      if (paymentDetails.upiId) {
        paymentMethodsHTML += `
          <div class="payment-method">
            <strong>2. UPI Payment</strong><br>
            <div style="background: #e7f3ff; padding: 10px; border-radius: 5px; margin: 10px 0;">
              <strong>UPI ID:</strong> <span style="font-family: monospace; font-size: 16px; color: #667eea;">${paymentDetails.upiId}</span><br>
              <small>Send ₹${amount} to this UPI ID</small>
            </div>
          </div>`;
      }
      
      if (paymentDetails.bankAccountNumber && paymentDetails.bankIFSC) {
        paymentMethodsHTML += `
          <div class="payment-method">
            <strong>3. Bank Transfer</strong><br>
            <div style="background: #e7f3ff; padding: 10px; border-radius: 5px; margin: 10px 0;">
              <strong>A/C:</strong> <span style="font-family: monospace;">${paymentDetails.bankAccountNumber}</span><br>
              <strong>IFSC:</strong> <span style="font-family: monospace;">${paymentDetails.bankIFSC}</span><br>
              ${paymentDetails.bankName ? `<strong>Bank:</strong> ${paymentDetails.bankName}<br>` : ''}
              <small>Transfer ₹${amount} to this account</small>
            </div>
          </div>`;
      }
    } else {
      paymentMethodsHTML = `
        <div class="payment-method">
          <strong>2. UPI</strong><br>
          Contact ${userName} for UPI ID
        </div>
        <div class="payment-method">
          <strong>3. Bank Transfer</strong><br>
          Contact ${userName} for account details
        </div>`;
    }
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; padding: 14px 30px; background: #f5576c; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; font-size: 16px; }
          .amount-box { background: white; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #f5576c; text-align: center; }
          .contact-info { background: #fff3cd; padding: 15px; border-radius: 5px; margin: 15px 0; }
          .payment-methods { margin-top: 15px; }
          .payment-method { padding: 10px; margin: 8px 0; background: white; border-radius: 5px; border: 1px solid #ddd; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>⏰ Payment Reminder</h1>
            <p style="margin: 10px 0 0 0; font-size: 18px;">Outstanding Amount: ₹${amount}</p>
          </div>
          <div class="content">
            <p>Hi there,</p>
            <p>This is a friendly reminder that you owe <strong>${userName}</strong> <strong>₹${amount}</strong> for:</p>
            
            <div class="amount-box">
              <h3 style="margin-top: 0; color: #f5576c;">${expenseDetails.description}</h3>
              <p style="font-size: 24px; font-weight: bold; color: #f5576c; margin: 10px 0;">₹${amount}</p>
              <p style="margin: 0;">Outstanding Amount</p>
            </div>

            <div class="contact-info">
              <h3 style="margin-top: 0; color: #856404;">💳 Pay ${userName}</h3>
              ${paymentDetails.showPaymentDetails && paymentDetails.upiId ? `
                <div style="background: #e7f3ff; padding: 10px; border-radius: 5px; margin: 10px 0;">
                  <strong>📱 UPI ID:</strong> <span style="font-family: monospace; font-size: 16px; color: #667eea;">${paymentDetails.upiId}</span><br>
                  <small>Send ₹${amount} to this UPI ID</small>
                </div>
              ` : ''}
              ${paymentDetails.showPaymentDetails && paymentDetails.bankAccountNumber && paymentDetails.bankIFSC ? `
                <div style="background: #e7f3ff; padding: 10px; border-radius: 5px; margin: 10px 0;">
                  <strong>🏦 Bank Transfer:</strong><br>
                  <strong>A/C:</strong> <span style="font-family: monospace;">${paymentDetails.bankAccountNumber}</span><br>
                  <strong>IFSC:</strong> <span style="font-family: monospace;">${paymentDetails.bankIFSC}</span><br>
                  ${paymentDetails.bankName ? `<strong>Bank:</strong> ${paymentDetails.bankName}<br>` : ''}
                  <small>Transfer ₹${amount} to this account</small>
                </div>
              ` : ''}
              ${!paymentDetails.showPaymentDetails ? `
                <p style="margin: 5px 0;"><strong>📧 Email:</strong> ${payerEmail || 'Contact via app'}</p>
                ${payerPhone ? `<p style="margin: 5px 0;"><strong>📱 Phone:</strong> ${payerPhone}</p>` : ''}
              ` : ''}
            </div>

            <div class="payment-methods">
              <p><strong>Quick Payment Options:</strong></p>
              <div class="payment-method">
                <strong>1. Online Payment</strong><br>
                Pay directly through the app
              </div>
              ${paymentMethodsHTML}
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/splitexpenses" class="button">Pay Now</a>
            </div>

            <p style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666;">
              Best regards,<br>
              <strong>FinancePro AI</strong>
            </p>
          </div>
        </div>
      </body>
      </html>
    `;
  },

  /**
   * Send budget insight email notification
   */
  async sendBudgetInsight({ to, userName, budgetInsights }) {
    try {
      const subject = `💰 Budget Alert: ${budgetInsights.title}`;
      const html = this.getBudgetInsightEmailTemplate({ userName, budgetInsights });
      
      const transporter = createTransporter();
      
      if (transporter) {
        const emailFrom = process.env.EMAIL_FROM || process.env.EMAIL_USER || process.env.SMTP_USER || 'noreply@financepro.ai';
        
        await transporter.sendMail({
          from: `"FinancePro AI" <${emailFrom}>`,
          to: to,
          subject: subject,
          html: html
        });
        
        console.log(`✅ Budget insight email sent successfully to ${to}`);
        return { success: true };
      } else {
        console.log('📧 Budget Insight (Email service not configured - logging only):', {
          to,
          subject,
          insights: budgetInsights
        });
        return { success: true, note: 'Email service not configured - logged only' };
      }
    } catch (error) {
      console.error('❌ Budget insight email error:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Email template for budget insights
   */
  getBudgetInsightEmailTemplate({ userName, budgetInsights }) {
    const { title, message, budgets, totalBudget, totalSpent, totalRemaining, actionItems } = budgetInsights;
    
    let budgetsHTML = '';
    if (budgets && budgets.length > 0) {
      budgetsHTML = budgets.map(budget => {
        const percentage = (budget.spent / budget.amount) * 100;
        const status = percentage >= 100 ? 'Over Budget' : percentage >= 80 ? 'Warning' : 'On Track';
        const statusColor = percentage >= 100 ? '#dc3545' : percentage >= 80 ? '#ffc107' : '#28a745';
        
        return `
          <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 10px 0; border-left: 4px solid ${statusColor};">
            <h4 style="margin: 0 0 10px 0; color: #333;">${budget.category}</h4>
            <p style="margin: 5px 0;"><strong>Budget:</strong> ₹${budget.amount.toLocaleString()}</p>
            <p style="margin: 5px 0;"><strong>Spent:</strong> ₹${budget.spent.toLocaleString()}</p>
            <p style="margin: 5px 0;"><strong>Remaining:</strong> ₹${(budget.amount - budget.spent).toLocaleString()}</p>
            <p style="margin: 5px 0;"><strong>Status:</strong> <span style="color: ${statusColor}; font-weight: bold;">${status} (${percentage.toFixed(1)}%)</span></p>
          </div>
        `;
      }).join('');
    }

    let actionItemsHTML = '';
    if (actionItems && actionItems.length > 0) {
      actionItemsHTML = `
        <div style="background: #e7f3ff; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #667eea;">💡 Recommended Actions</h3>
          <ul style="margin: 10px 0; padding-left: 20px;">
            ${actionItems.map(item => `<li>${item}</li>`).join('')}
          </ul>
        </div>
      `;
    }

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center; }
          .content { background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          .summary { background: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0; }
          .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 10px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${title}</h1>
          </div>
          <div class="content">
            <p>Hi ${userName || 'there'}! 👋</p>
            <p>${message}</p>
            
            <div class="summary">
              <h3 style="margin-top: 0; color: #667eea;">📊 Budget Summary</h3>
              <p><strong>Total Budget:</strong> ₹${totalBudget.toLocaleString()}</p>
              <p><strong>Total Spent:</strong> ₹${totalSpent.toLocaleString()}</p>
              <p><strong>Remaining:</strong> ₹${totalRemaining.toLocaleString()}</p>
            </div>

            ${budgetsHTML ? `
            <div>
              <h3 style="color: #667eea;">📋 Category Details</h3>
              ${budgetsHTML}
            </div>
            ` : ''}

            ${actionItemsHTML}

            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/budgets" class="button">View Budget Dashboard</a>
            </div>

            <p style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666;">
              Best regards,<br>
              <strong>FinancePro AI</strong><br>
              <em>Smart budgeting made easy</em>
            </p>
          </div>
        </div>
      </body>
      </html>
    `;
  },

  /**
   * Send group invitation email
   */
  async sendGroupInvite({ to, groupName, inviterName, inviteLink }) {
    try {
      const subject = `${inviterName} invited you to join "${groupName}" group`;
      const html = this.getGroupInviteEmailTemplate({ groupName, inviterName, inviteLink });
      
      const transporter = createTransporter();
      
      if (transporter) {
        const emailFrom = process.env.EMAIL_FROM || process.env.EMAIL_USER || process.env.SMTP_USER || 'noreply@financepro.ai';
        
        await transporter.sendMail({
          from: `"FinancePro AI" <${emailFrom}>`,
          to: to,
          subject: subject,
          html: html
        });
        
        console.log(`✅ Group invitation email sent successfully to ${to}`);
        return { success: true };
      } else {
        console.log('📧 Group Invitation (Email service not configured - logging only):', {
          to,
          subject,
          body: html.substring(0, 200) + '...'
        });
        return { success: true, note: 'Email service not configured - logged only' };
      }
    } catch (error) {
      console.error('❌ Group invitation email send error:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Email template for group invitation
   */
  getGroupInviteEmailTemplate({ groupName, inviterName, inviteLink }) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; padding: 14px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; font-size: 16px; }
          .group-info { background: white; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #667eea; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>👥 Group Invitation</h1>
            <p style="margin: 10px 0 0 0; font-size: 18px;">You've been invited!</p>
          </div>
          <div class="content">
            <p>Hi there,</p>
            <p><strong>${inviterName}</strong> has invited you to join the <strong>"${groupName}"</strong> group.</p>
            
            <div class="group-info">
              <h3 style="margin-top: 0; color: #667eea;">${groupName}</h3>
              <p>Join this group to split expenses and manage shared costs together.</p>
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${inviteLink}" class="button">👉 Accept Invitation</a>
            </div>

            <p style="text-align: center; margin-top: 20px; font-size: 12px; color: #666;">
              Or copy this link: <a href="${inviteLink}" style="color: #667eea;">${inviteLink}</a>
            </p>
            
            <p style="margin-top: 20px; padding: 15px; background: #e7f3ff; border-radius: 5px; font-size: 14px;">
              <strong>📝 Note:</strong> If you don't have an account, you'll be able to create one after clicking the link. Once you sign up, you'll automatically join this group.
            </p>

            <p style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666;">
              Best regards,<br>
              <strong>FinancePro AI</strong><br>
              <em>Smart expense splitting made easy</em>
            </p>
          </div>
        </div>
      </body>
      </html>
    `;
  },

  /**
   * Send group created notification email
   */
  async sendGroupCreatedNotification({ to, userName, groupName, groupDescription, groupLink }) {
    try {
      console.log('📧 sendGroupCreatedNotification called with:', { to, userName, groupName });
      
      const subject = `🎉 Group Created: ${groupName}`;
      const html = this.getGroupCreatedEmailTemplate({ userName, groupName, groupDescription, groupLink });
      
      console.log('📧 Checking email configuration...');
      console.log('  EMAIL_SERVICE:', process.env.EMAIL_SERVICE);
      console.log('  EMAIL_USER:', process.env.EMAIL_USER ? '***configured***' : 'NOT SET');
      console.log('  EMAIL_PASS:', process.env.EMAIL_PASS ? '***configured***' : 'NOT SET');
      console.log('  SMTP_HOST:', process.env.SMTP_HOST || 'NOT SET');
      console.log('  SENDGRID_API_KEY:', process.env.SENDGRID_API_KEY ? '***configured***' : 'NOT SET');
      
      const transporter = createTransporter();
      
      if (transporter) {
        const emailFrom = process.env.EMAIL_FROM || process.env.EMAIL_USER || process.env.SMTP_USER || 'noreply@financepro.ai';
        
        console.log(`📧 Sending email from: ${emailFrom} to: ${to}`);
        console.log(`📧 Subject: ${subject}`);
        
        const mailResult = await transporter.sendMail({
          from: `"FinancePro AI" <${emailFrom}>`,
          to: to,
          subject: subject,
          html: html
        });
        
        console.log(`✅ Group creation email sent successfully to ${to}`);
        console.log('📧 Mail result:', {
          messageId: mailResult.messageId,
          response: mailResult.response
        });
        return { success: true, messageId: mailResult.messageId };
      } else {
        console.log('⚠️ Email service not configured!');
        console.log('📧 Group Created Notification (Email service not configured - logging only):', {
          to,
          subject,
          groupName
        });
        console.log('💡 To enable email, configure EMAIL_USER/EMAIL_PASS (Gmail) or SMTP_HOST/SMTP_PORT (SMTP) or SENDGRID_API_KEY in .env');
        return { success: false, error: 'Email service not configured', note: 'Email service not configured - logged only' };
      }
    } catch (error) {
      console.error('❌ Group creation email error:', error);
      console.error('❌ Error message:', error.message);
      console.error('❌ Error stack:', error.stack);
      console.error('❌ Error details:', {
        message: error.message,
        code: error.code,
        command: error.command,
        response: error.response
      });
      return { success: false, error: error.message };
    }
  },

  /**
   * Email template for group creation
   */
  getGroupCreatedEmailTemplate({ userName, groupName, groupDescription, groupLink }) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center; }
          .content { background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .group-info { background: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Group Created Successfully!</h1>
          </div>
          <div class="content">
            <p>Hi ${userName}! 👋</p>
            <p>Your group <strong>"${groupName}"</strong> has been created successfully!</p>
            
            <div class="group-info">
              <h3 style="margin-top: 0; color: #667eea;">📋 Group Details</h3>
              <p><strong>Group Name:</strong> ${groupName}</p>
              ${groupDescription ? `<p><strong>Description:</strong> ${groupDescription}</p>` : ''}
              <p><strong>Status:</strong> Active ✅</p>
            </div>

            <p>You can now:</p>
            <ul>
              <li>Invite members to join your group</li>
              <li>Create and split expenses with group members</li>
              <li>Track payments and balances</li>
              <li>Manage group settings</li>
            </ul>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${groupLink}" class="button">View Group</a>
            </div>

            <p style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666;">
              Best regards,<br>
              <strong>FinancePro AI</strong><br>
              <em>Smart expense splitting made easy</em>
            </p>
          </div>
        </div>
      </body>
      </html>
    `;
  }
};

module.exports = emailService;
