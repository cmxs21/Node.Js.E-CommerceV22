export const emailVerifiedSuccessfully = (req) => htmlContent = `
        <!DOCTYPE html>
        <html lang="${req.locale}">
        <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${req.t('emailVerifiedSuccessfully')} - ${req.t('appName')}</title>

        <style>
            body {
            font-family: Arial, Helvetica, sans-serif;
            background-color: #f4f4f7;
            padding: 0;
            margin: 0;
            color: #333;
            }

            .container {
            max-width: 600px;
            margin: 40px auto;
            background: white;
            padding: 40px;
            border-radius: 12px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.1);
            text-align: center;
            }

            h1 {
            font-size: 28px;
            color: #2c3e50;
            margin-bottom: 10px;
            }

            p {
            font-size: 16px;
            margin: 10px 0 20px;
            color: #555;
            }

            .success-icon {
            font-size: 60px;
            color: #2ecc71;
            margin-bottom: 20px;
            }

            .btn {
            display: inline-block;
            margin-top: 25px;
            background: #3498db;
            color: white;
            padding: 14px 26px;
            border-radius: 6px;
            text-decoration: none;
            font-size: 16px;
            font-weight: bold;
            }

            .btn:hover {
            background: #2980b9;
            }

            .footer {
            margin-top: 35px;
            font-size: 13px;
            color: #aaa;
            }
        </style>
        </head>

        <body>
        <div class="container">

            <div class="success-icon">✔</div>

            <h1>${req.t('emailVerifiedSuccessfully')}</h1>

            <p>${req.t('emailVerifiedMessage')}</p>

            <div class="footer">
            © ${new Date().getFullYear()} ${req.t('appName')} — ${req.t('allRightsReserved')}
            </div>

        </div>
        </body>
        </html>
        `;

/*
            //after emailVerifiedMessage
            <a href="${process.env.FRONTEND_URL}/login" class="btn">
            ${req.t('goToLogin')}
            </a>
*/

export const emailVerificationError = (req) => `
        <!DOCTYPE html>
        <html lang="en" style="font-family: Arial, sans-serif; background:#f8d7da; padding:0; margin:0;">
        <head>
        <meta charset="UTF-8" />
        <title>${req.t('emailVerificationErrorTitle')}</title>
        </head>

        <body style="display:flex; justify-content:center; align-items:center; height:100vh;">

        <div style="background:white; padding:40px; border-radius:12px; 
                    box-shadow:0 4px 15px rgba(0,0,0,0.15); max-width:500px; text-align:center;">

            <h1 style="color:#c0392b; margin-bottom:10px;">
                ${req.t('emailVerificationErrorHeading')}
            </h1>

            <p style="font-size:16px; color:#333;">
                ${req.t('emailVerificationErrorMessage')}
            </p>

        </div>

        </body>
        </html>
    `;
/*
            //after emailVerificationErrorMessage
            <a href="${process.env.FRONTEND_URL || '#'}"
                style="display:inline-block; margin-top:25px; padding:12px 24px;
                        background:#e74c3c; color:white; text-decoration:none;
                        border-radius:6px; font-weight:bold;">
                ${req.t('returnToApp')}
            </a>
*/

export const emailVerificationUserNotFound = (req) => `
        <!DOCTYPE html>
        <html lang="${req.locale}">
        <head>
        <meta charset="UTF-8" />
        <title>${req.t('userNotFound')}</title>
        <style>
            body { font-family: Arial; background: #fff3f3; padding: 40px; }
            .card {
            max-width: 460px; margin: auto; padding: 30px; background: white;
            border-radius: 12px; border-left: 6px solid #d32f2f;
            text-align: center; box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            }
            h1 { color: #d32f2f; }
        </style>
        </head>
        <body>
        <div class="card">
            <h1>${req.t('userNotFound')}</h1>
            <p>${req.t('userNotFoundMessage')}</p>
        </div>
        </body>
        </html>
    `;

export const emailVerificationSuspendedAccount = (req) => `
        <!DOCTYPE html>
        <html lang="${req.locale}">
        <head>
        <meta charset="UTF-8" />
        <title>${req.t('userAccountSuspendedTitle')}</title>
        <style>
            body { font-family: Arial; background: #fff7e6; padding: 40px; }
            .card {
            max-width: 460px; margin: auto; padding: 30px; background: white;
            border-radius: 12px; border-left: 6px solid #ff9800;
            text-align: center; box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            }
            h1 { color: #ff9800; }
        </style>
        </head>
        <body>
        <div class="card">
            <h1>${req.t('userAccountSuspendedTitle')}</h1>
            <p>${req.t('userAccountSuspended')}</p>
        </div>
        </body>
        </html>
    `;

export const emailVerificationEmailAlreadyVerified = (req) => `
        <!DOCTYPE html>
        <html lang="${req.locale}">
        <head>
        <meta charset="UTF-8" />
        <title>${req.t('emailAlreadyVerifiedTitle')}</title>
        <style>
            body { font-family: Arial; background: #e7f5ff; padding: 40px; }
            .card {
            max-width: 460px; margin: auto; padding: 30px; background: white;
            border-radius: 12px; border-left: 6px solid #1976d2;
            text-align: center; box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            }
            h1 { color: #1976d2; }
            .btn {
            display: inline-block; margin-top: 20px; padding: 12px 20px;
            background: #1976d2; color: white; border-radius: 6px; text-decoration: none;
            }
        </style>
        </head>
        <body>
        <div class="card">
            <h1>${req.t('emailAlreadyVerifiedTitle')}</h1>
            <p>${req.t('emailAlreadyVerifiedMessage')}</p>
        </div>
        </body>
        </html>
    `;
/*
            //after emailVerifiedMessage
            <a href="${process.env.FRONTEND_LOGIN_URL}" class="btn">
            ${req.t('goToLogin')}
            </a>
*/

export const EmailVerificationNoToken = (req) => `
    <html lang="${req.language}">
        <head>
        <meta charset="UTF-8" />
        <title>${req.t('emailVerificationErrorTitle')}</title>
        <style>
            body {
            font-family: Arial, sans-serif;
            background-color: #f8f9fa;
            margin: 0;
            padding: 0;
            }
            .container {
            max-width: 480px;
            background: white;
            margin: 50px auto;
            padding: 30px;
            border-radius: 12px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            text-align: center;
            }
            h1 {
            color: #d9534f;
            font-size: 24px;
            margin-bottom: 10px;
            }
            p {
            font-size: 16px;
            color: #333;
            line-height: 1.5;
            }
            .btn {
            display: inline-block;
            padding: 12px 18px;
            margin-top: 20px;
            background-color: #0275d8;
            color: white;
            text-decoration: none;
            border-radius: 6px;
            font-size: 16px;
            }
            .btn:hover {
            background-color: #025aa5;
            }
        </style>
        </head>

        <body>
        <div class="container">
            <h1>${req.t('emailVerificationErrorTitle')}</h1>
            <p>${req.t('verificationTokenMissing')}</p>
        </div>
        </body>
    </html>
  `;
/*
            //after verificationTokenMissing
            <a href="${process.env.FRONTEND_LOGIN_URL}" class="btn">
            ${req.t('goToLogin')}
            </a>
*/