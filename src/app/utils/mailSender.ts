import nodemailer from 'nodemailer';
import config from '../config';

export const sendEmail = async (to: string, subject: string, html: string) => {
 
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: config.NODE_ENV === 'production',
    auth: {
      // TODO: replace `user` and `pass` values from <https://forwardemail.net>
      user: config.nodemailer_host_email,
      pass: config.nodemailer_host_pass,
    },
  });

// const transporter = nodemailer.createTransport({
//   host: "mail.websupport.sk", // sending SMTP server
//   port: 465,              // SSL port
//   secure: true,           // true for port 465
//   auth: {
//     user: "cvak@frafol.sk",        // your email
//     pass: "GgsNPK@$Ooj6c9uB"    // SMTP/webmail password
//   },
//   tls: {
//     rejectUnauthorized: false  // ⚠️ disables certificate validation
//   }
// });

  

  try {
     console.log('mail send started');
    await transporter.sendMail({
      from: 'team.robust.dev@gmail.com', // sender address
      to, // list of receivers
      subject,
      text: '', // plain text body
      html, // html body
    });

    console.log('mail sended successfully');
    
  } catch (error) {
    console.log('send mail error:', error);
    
  }
  console.log('mail sended stopped');
};



















