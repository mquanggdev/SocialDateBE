import nodemailer from 'nodemailer';

export const sendEmail = async (email: string, subject: string, html: string): Promise<void> => {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.SEND_MAIL_EMAIL!,
      pass: process.env.SEND_MAIL_PASSWORD!
    }
  } as nodemailer.TransportOptions);

  const mailOptions: nodemailer.SendMailOptions = {
    from: process.env.SEND_MAIL_EMAIL!,
    to: email,
    subject: subject,
    html: html
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent: ' + info.response);
  } catch (error) {
    console.log('Error sending email:', error);
    throw error; // Re-throw nếu muốn handle ở nơi gọi hàm
  }
};