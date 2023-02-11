const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const passport = require('passport');
const nodemailer = require('nodemailer');
// Load User model
const user = require('../models/User');
const { forwardAuthenticated } = require('../config/auth');
const { JsonWebTokenError } = require('jsonwebtoken');
const SendmailTransport = require('nodemailer/lib/sendmail-transport');
const { transformAuthInfo } = require('passport');

// Login Page
router.get('/login', forwardAuthenticated, (req, res) => res.render('login'));

// Register Page
router.get('/register', forwardAuthenticated, (req, res) => res.render('register'));

var transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'maissabenjoud@gmail.com',
    pass: 'ilycvxsyimhjmzdg'
  },
  tls: {
    rejectUnauthorized: false
  }
})


// Register
router.post('/register', (req, res) => {
  const { name, email, password, password2 } = req.body;
  // activation code aleatoire
  const characters = "1234567890";
  let activationCode = ""
  for (let i = 0; i < 4; i++) {
    activationCode += characters[Math.floor(Math.random() * characters.length)];
  }
  let errors = [];




  if (!name || !email || !password || !password2) {
    errors.push({ msg: 'Please enter all fields' });
  }

  if (password != password2) {
    errors.push({ msg: 'Passwords do not match' });
  }

  if (password.length < 6) {
    errors.push({ msg: 'Password must be at least 6 characters' });
  }

  if (User.email && password == password2 && !User.email.isActive) {
    errors.push({ msg: 'check your email for the activation' });
  }

  if (errors.length > 0) {
    res.render('register', {
      errors,
      name,
      email,
      password,
      password2
    });
  } else {
    User.findOne({ email: email }).then(user => {
      if (user) {
        errors.push({ msg: 'Email already exists' });
        res.render('register', {
          errors,
          name,
          email,
          password,
          password2
        });
      } else {
        const newUser = new User({
          name,
          email,
          password,
          activationCode: activationCode,
        });

        bcrypt.genSalt(10, (err, salt) => {
          bcrypt.hash(newUser.password, salt, (err, hash) => {
            if (err) throw err;
            newUser.password = hash;
            newUser
              .save()
              .then(user => {
                req.flash(
                  'success_msg',
                  'You are now registered and can log in'
                );

                var Configoptions = {
                  from: 'maissabenjoud@gmail.com',
                  to: email,
                  subject: "Lost and found",
                  html: `
                  <div>
                  <h1>confirme your account </h1>
                    <p> this is your activation code  ${activationCode}  </p>
                    </div>`,
                }

                transporter.sendMail(Configoptions, function (err, info) {
                  if (err) {
                    console.log(err);
                  }
                  else {
                    console.log(' the activation code is sent successfully ');
                  }
                })



                res.redirect('/users/login');
              })
              .catch(err => console.log(err));
          });
        });
      }
    });
  }

});

// Login
router.post('/login', (req, res, next) => {
  passport.authenticate('local', {
    successRedirect: '/dashboard',
    failureRedirect: '/users/login',
    failureFlash: true
  })(req, res, next);
});

// Logout
router.get('/logout', (req, res) => {
  req.logout();
  req.flash('success_msg', 'You are logged out');
  res.redirect('/users/login');
});

module.exports = router;