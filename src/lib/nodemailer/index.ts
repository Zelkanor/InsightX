import nodemailer from "nodemailer";
import { WELCOME_EMAIL_TEMPLATE } from "./templates";

export const transporter = nodemailer.createTransport({
  host: process.env.NODEMAILER_HOST,
  port: Number(process.env.NODEMAILER_PORT),
  auth: {
    user: process.env.NODEMAILER_LOGIN,
    pass: process.env.NODEMAILER_PASSWORD,
  },
});

export const sendWelcomeEmail = async ({
  email,
  name,
  intro,
}: WelcomeEmailData) => {
  const htmlTemplate = WELCOME_EMAIL_TEMPLATE.replaceAll(
    "{{name}}",
    name,
  ).replace("{{intro}}", intro);

  const mailOptions = {
    from: `"InsightX" <${process.env.NODEMAILER_SENDER_EMAIL}>`,
    to: email,
    subject: `Welcome to InsightX - your stock market toolkit is ready!`,
    text: "Thanks for joining InsightX!",
    html: htmlTemplate,
  };

  await transporter.sendMail(mailOptions);
};
