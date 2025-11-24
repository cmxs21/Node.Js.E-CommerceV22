export const emailRegisterConfirmation = (req, user, verificationUrl) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; color: #333;">
        <h2 style="text-align: center; color: #2c3e50;">
          ${req.t('welcomeToApp', { appName: req.t('appName') })}
        </h2>

        <p>${req.t('hello')}, <strong>${user.userName}</strong></p>

        <p>${req.t('emailVerificationMessage')}</p>

        <div style="text-align: center; margin-top: 30px;">
          <a href="${verificationUrl}"
             style="
               background-color: #1abc9c;
               color: white;
               padding: 12px 25px;
               text-decoration: none;
               border-radius: 8px;
               font-size: 16px;
             ">
            ${req.t('verifyEmailButton')}
          </a>
        </div>

        <p style="margin-top: 30px;">
          ${req.t('userInfoSummary')}:
        </p>

        <ul>
          <li><strong>${req.t('userName')}:</strong> ${user.userName}</li>
          <li><strong>${req.t('email')}:</strong> ${user.email}</li>
          <li><strong>${req.t('phoneNumber')}:</strong> ${user.phoneNumber}</li>
          <li><strong>${req.t('role')}:</strong> ${user.role}</li>
        </ul>

        <p style="margin-top: 40px; font-size: 12px; color: #777; text-align: center;">
          ${req.t('emailFooterNote', { appName: req.t('appName') })}
        </p>
      </div>
    `;