import nodemailer from "nodemailer";
import {
  NEWS_SUMMARY_EMAIL_TEMPLATE,
  WELCOME_EMAIL_TEMPLATE,
} from "./templates";

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

export const sendNewsSummaryEmail = async ({
  email,
  date,
  newsContent,
}: {
  email: string;
  date: string;
  newsContent: string;
}): Promise<void> => {
  const htmlTemplate = NEWS_SUMMARY_EMAIL_TEMPLATE.replace(
    "{{date}}",
    date,
  ).replace("{{newsContent}}", newsContent);

  const mailOptions = {
    from: `"InsightX" <${process.env.NODEMAILER_SENDER_EMAIL}>`,
    to: email,
    subject: `📈 Market News Summary Today - ${date}`,
    text: `Today's market news summary from InsightX`,
    html: htmlTemplate,
  };

  await transporter.sendMail(mailOptions);
};
