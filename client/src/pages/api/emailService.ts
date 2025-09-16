import sgMail from '@sendgrid/mail';

// Initialize SendGrid with your API key
sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

export const sendVerificationEmail = async (email: string, token: string, username: string) => {
  const msg = {
    to: email,
    from: process.env.EMAIL_FROM!,
    subject: 'Verify your Ilaw ng Bayan Learning Institute account',
    html: `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%); color: white;">
        <!-- Header -->
        <div style="text-align: center; padding: 40px 20px; background: linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%);">
          <div style="background: rgba(251, 191, 36, 0.1); border: 2px solid #fbbf24; border-radius: 50%; width: 80px; height: 80px; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
            🎓
          </div>
          <h1 style="color: #fbbf24; margin: 0; font-size: 28px; font-weight: bold;">Ilaw ng Bayan</h1>
          <p style="color: #fbbf24; margin: 5px 0 0; font-size: 16px;">Learning Institute</p>
        </div>
        
        <!-- Content -->
        <div style="background: white; padding: 40px 30px; color: #374151;">
          <h2 style="color: #1e3a8a; margin: 0 0 20px; font-size: 24px;">Welcome, ${username}! ✨</h2>
          <p style="font-size: 16px; line-height: 1.6; margin: 0 0 25px;">
            Thank you for joining Ilaw ng Bayan Learning Institute! We're excited to have you as part of our educational community.
          </p>
          <p style="font-size: 16px; line-height: 1.6; margin: 0 0 30px;">
            Please verify your email address to complete your registration and start your learning journey:
          </p>
          
          <!-- Button -->
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL}/verify-email?token=${token}" 
               style="display: inline-block; background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%); color: #1e3a8a; padding: 16px 32px; text-decoration: none; border-radius: 12px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 15px rgba(251, 191, 36, 0.3); transition: all 0.3s ease;">
              ✅ Verify Email Address
            </a>
          </div>
          
          <div style="background: #fef3c7; border-left: 4px solid #fbbf24; padding: 15px; margin: 25px 0; border-radius: 8px;">
            <p style="margin: 0; color: #92400e; font-size: 14px;">
              ⏰ <strong>Important:</strong> This verification link will expire in 24 hours for security purposes.
            </p>
          </div>
          
          <p style="font-size: 14px; color: #6b7280; margin: 25px 0 0; line-height: 1.5;">
            If you didn't create this account, please ignore this email or contact our support team.
          </p>
        </div>
        
        <!-- Footer -->
        <div style="background: #1e3a8a; padding: 30px; text-align: center; color: #fbbf24;">
          <p style="margin: 0 0 10px; font-style: italic; font-size: 16px;">
            "Liwanag, Kaalaman, Paglilingkod"
          </p>
          <p style="margin: 0; font-size: 14px; opacity: 0.8;">
            Light • Knowledge • Service
          </p>
        </div>
      </div>
    `
  };
  
  try {
    await sgMail.send(msg);
    console.log('Verification email sent successfully to:', email);
  } catch (error) {
    console.error('SendGrid error:', error);
    throw error;
  }
};

export const sendPasswordResetEmail = async (email: string, token: string, username: string) => {
  const msg = {
    to: email,
    from: process.env.EMAIL_FROM!,
    subject: 'Reset your Ilaw ng Bayan Learning Institute password',
    html: `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto;">
        <!-- Header -->
        <div style="text-align: center; padding: 40px 20px; background: linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%); color: white;">
          <div style="background: rgba(220, 53, 69, 0.2); border: 2px solid #dc3545; border-radius: 50%; width: 80px; height: 80px; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center; font-size: 30px;">
            🔐
          </div>
          <h1 style="color: #fbbf24; margin: 0; font-size: 28px; font-weight: bold;">Password Reset</h1>
          <p style="color: #fbbf24; margin: 5px 0 0; font-size: 16px;">Ilaw ng Bayan Learning Institute</p>
        </div>
        
        <!-- Content -->
        <div style="background: white; padding: 40px 30px; color: #374151;">
          <h2 style="color: #1e3a8a; margin: 0 0 20px; font-size: 24px;">Hello ${username},</h2>
          <p style="font-size: 16px; line-height: 1.6; margin: 0 0 25px;">
            We received a request to reset your password. If you made this request, click the button below to set a new password:
          </p>
          
          <!-- Button -->
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL}/reset-password?token=${token}"
               style="display: inline-block; background: linear-gradient(135deg, #dc3545 0%, #c82333 100%); color: white; padding: 16px 32px; text-decoration: none; border-radius: 12px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 15px rgba(220, 53, 69, 0.3);">
              🔄 Reset Password
            </a>
          </div>
          
          <div style="background: #fee2e2; border-left: 4px solid #dc3545; padding: 15px; margin: 25px 0; border-radius: 8px;">
            <p style="margin: 0; color: #991b1b; font-size: 14px;">
              ⚠️ <strong>Security Notice:</strong> This link will expire in 15 minutes. If you didn't request this reset, please ignore this email.
            </p>
          </div>
        </div>
        
        <!-- Footer -->
        <div style="background: #1e3a8a; padding: 30px; text-align: center; color: #fbbf24;">
          <p style="margin: 0 0 10px; font-style: italic; font-size: 16px;">
            "Liwanag, Kaalaman, Paglilingkod"
          </p>
          <p style="margin: 0; font-size: 14px; opacity: 0.8;">
            Light • Knowledge • Service
          </p>
        </div>
      </div>
    `
  };
  
  try {
    await sgMail.send(msg);
    console.log('Password reset email sent successfully to:', email);
  } catch (error) {
    console.error('SendGrid error:', error);
    throw error;
  }
};

export const sendWelcomeEmail = async (email: string, username: string, role: string) => {
  const msg = {
    to: email,
    from: process.env.EMAIL_FROM!,
    subject: 'Welcome to Ilaw ng Bayan Learning Institute! 🎉',
    html: `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto;">
        <!-- Header -->
        <div style="text-align: center; padding: 40px 20px; background: linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%); color: white;">
          <div style="background: rgba(34, 197, 94, 0.2); border: 2px solid #22c55e; border-radius: 50%; width: 80px; height: 80px; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center; font-size: 30px;">
            🎓
          </div>
          <h1 style="color: #fbbf24; margin: 0; font-size: 28px; font-weight: bold;">Welcome Aboard!</h1>
          <p style="color: #fbbf24; margin: 5px 0 0; font-size: 16px;">Ilaw ng Bayan Learning Institute</p>
        </div>
        
        <!-- Content -->
        <div style="background: white; padding: 40px 30px; color: #374151;">
          <h2 style="color: #1e3a8a; margin: 0 0 20px; font-size: 24px;">Congratulations, ${username}! 🌟</h2>
          <p style="font-size: 16px; line-height: 1.6; margin: 0 0 25px;">
            Your <strong>${role}</strong> account has been successfully verified! You're now part of the Ilaw ng Bayan Learning Institute community.
          </p>
          <p style="font-size: 16px; line-height: 1.6; margin: 0 0 30px;">
            Get ready to explore our interactive educational content and begin your learning journey!
          </p>
          
          <!-- Button -->
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL}" 
               style="display: inline-block; background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); color: white; padding: 16px 32px; text-decoration: none; border-radius: 12px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 15px rgba(34, 197, 94, 0.3);">
              🚀 Start Learning Now
            </a>
          </div>
          
          <div style="background: #f0f9ff; border-left: 4px solid #0ea5e9; padding: 20px; margin: 25px 0; border-radius: 8px;">
            <h3 style="color: #0c4a6e; margin: 0 0 10px; font-size: 18px;">What's Next?</h3>
            <ul style="margin: 0; padding-left: 20px; color: #0c4a6e;">
              <li>Explore our educational programs</li>
              <li>Access interactive learning materials</li>
              <li>Connect with fellow learners</li>
              <li>Track your progress</li>
            </ul>
          </div>
          
          <p style="font-size: 16px; color: #374151; margin: 25px 0 0; text-align: center;">
            Happy learning! 📚✨
          </p>
        </div>
        
        <!-- Footer -->
        <div style="background: #1e3a8a; padding: 30px; text-align: center; color: #fbbf24;">
          <p style="margin: 0 0 10px; font-style: italic; font-size: 16px;">
            "Liwanag, Kaalaman, Paglilingkod"
          </p>
          <p style="margin: 0; font-size: 14px; opacity: 0.8;">
            Light • Knowledge • Service
          </p>
        </div>
      </div>
    `
  };
  
  try {
    await sgMail.send(msg);
    console.log('Welcome email sent successfully to:', email);
  } catch (error) {
    console.error('SendGrid error:', error);
    throw error;
  }
};