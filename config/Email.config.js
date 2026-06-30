const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs');
const handlebars = require('handlebars');
const { getLogoBase64 } = require('../utils/logoBase64');

const createTransporter = () => {
    return nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
        tls: { rejectUnauthorized: false }
    });
};

const loadTemplate = (templateName, data) => {
    const templatePath = path.join(__dirname, '../templates/emails', `${templateName}.html`);
    const source = fs.readFileSync(templatePath, 'utf8');
    const template = handlebars.compile(source);
    return template(data);
};

const sendEmail = async (to, subject, html, attachments = []) => {
    try {
        const transporter = createTransporter();
        const mailOptions = {
            from: `"${process.env.EMAIL_SENDER_NAME}" <${process.env.SMTP_FROM}>`,
            to,
            subject,
            html,
            attachments,
        };
        const info = await transporter.sendMail(mailOptions);
        console.log('✅ Correo enviado:', info.messageId);
        return info;
    } catch (error) {
        console.error('❌ Error enviando correo:', error);
        throw error;
    }
};

module.exports = { createTransporter, loadTemplate, sendEmail, getLogoBase64 };