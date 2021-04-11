require('dotenv').config({ path: 'variables.env' });

module.exports = {
  user: process.env.GMAILUSSER,
  pass: process.env.GMAILPASS,
  host: 'smtp.gmail.com',
  port: 465,
};
