import nodemailer from 'nodemailer'
import handlerbars from 'handlebars'
import fs from 'fs'
import path from 'path'
import { User } from '../../types'

interface EmailOptions {
    link: string,
}

export const sendMail = async (
    subject: string, text: string,
    receiver: User, options: EmailOptions
) => {
    try {
        const transport = nodemailer.createTransport({
            host: process.env.EMAIL_HOST,
            service: process.env.EMAIL_SERVICE,
            secure: true,
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASSWORD,
            }
        })
        const emailTemplateSource = fs.readFileSync(
            path.join(__dirname, "templates/verify.hbs"), 'utf-8'
        );
        const emailTemplate = handlerbars.compile(emailTemplateSource);
        const data = {
            username: receiver.username,
            subject: subject,
            message: text,
            link: options.link
        }
        const htmlContent = emailTemplate(data)
        await transport.sendMail({
            from: process.env.EMAIL_USER,
            to: receiver.email,
            subject: subject,
            html: htmlContent
        })
    }
    catch (e) {
        throw e
    }
}