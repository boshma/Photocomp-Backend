import nodemailer from 'nodemailer';
import { logger } from './logger';
import dotenv from 'dotenv';

dotenv.config();

const sendMail = async (to: string, subject: string, message: string, header: string) => {
    const transporter = nodemailer.createTransport({
        service: process.env.MAIL_HOST,
        auth: {
            user: process.env.MAIL_USERNAME,
            pass: process.env.MAIL_PASSWORD,
        },
    });

    const mailOptions = {
        from: `PhotoComp Admin: ${process.env.MAIL_USERNAME}`,
        template: 'email',
        to: to,
        subject: subject,
        text: `${header}
        ${message}`,
    };

    logger.info(`Sending mail to - ${to}`);
    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            logger.error(error);
        } else {
            logger.info('Email sent: ' + info.response);
        }
    });
};

export { sendMail };
