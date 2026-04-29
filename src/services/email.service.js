import nodemailer from 'nodemailer';
import emailConfig from '../config/email.config.js';
import env from '../config/env.js';
import { logError, logInfo } from '../utils/logger.js';

const transporter = nodemailer.createTransport({
    host: emailConfig.host,
    port: emailConfig.port,
    secure: emailConfig.secure,
    auth: emailConfig.auth,
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 20000
});

let emailHealthy = false;
let lastEmailError = null;

export const verifyConnection = async () => {
    if (!env.verifyEmailOnStartup) {
        emailHealthy = false;
        lastEmailError = 'Email verification skipped by configuration';
        logInfo('Skipping email verification because startup verification is disabled.');
        return false;
    }

    if (!emailConfig.auth.user || !emailConfig.auth.pass) {
        emailHealthy = false;
        lastEmailError = 'Missing EMAIL_USER or EMAIL_PASS';
        logInfo('Email verification skipped because SMTP credentials are missing.');
        return false;
    }

    try {
        await transporter.verify();
        emailHealthy = true;
        lastEmailError = null;
        logInfo(`Email service connected: ${emailConfig.auth.user}`);
        return true;
    } catch (error) {
        emailHealthy = false;
        lastEmailError = error.message;
        logError('Email service connection failed:', error.message);
        return false;
    }
};

export const sendEmail = async ({ to, subject, html, text }) => {
    try {
        if (!to || !subject || !html) {
            throw new Error('Thiếu thông tin bắt buộc: to, subject, html');
        }

        if (!emailConfig.auth.user || !emailConfig.auth.pass) {
            throw new Error('SMTP credentials are not configured');
        }

        const info = await transporter.sendMail({
            from: `"${emailConfig.from.name}" <${emailConfig.from.address}>`,
            to,
            subject,
            html,
            text: text || ''
        });

        emailHealthy = true;
        lastEmailError = null;
        logInfo(`Email sent to ${to} | messageId: ${info.messageId}`);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        emailHealthy = false;
        lastEmailError = error.message;
        logError(`Send email failed to ${to}:`, error.message);
        return { success: false, error: error.message };
    }
};

export const getEmailStatus = () => ({
    configured: Boolean(emailConfig.auth.user && emailConfig.auth.pass),
    healthy: emailHealthy,
    lastError: lastEmailError
});

export default { sendEmail, verifyConnection };
