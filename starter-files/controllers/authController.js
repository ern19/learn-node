const passport = require('passport')
const crypto = require('crypto')
const mongoose = require('mongoose')
const User = mongoose.model('User')
const promisify = require('es6-promisify')
const mail = require('../handlers/mail')

exports.login = passport.authenticate('local', {
  failureRedirect: '/login',
  failureFlash: 'Failed Login!',
  successRedirect: '/',
  successFlash: 'You are now logged in.'
})

exports.logout = (req,res) => {
  req.logout()
  req.flash('success', 'You are now logged out.')
  res.redirect('/')
}

exports.isLoggedIn = (req,res,next) => {
  if(req.isAuthenticated()) {
    next() //all good mang
    return
  }
  req.flash('error', 'Log in to add a store.')
  res.redirect('/login')
}

exports.forgot = async (req,res) => {
  //does user exist?
  const user = await User.findOne({ email: req.body.email })
  if(!user) {
    req.flash('error', 'A password reset has been sent to you')
    return res.redirect('/login')
  }
  //set reset tokens and expiries
  user.resetPasswordToken = crypto.randomBytes(20).toString('hex')
  user.resetPasswordExpires = Date.now() + 3600000
  await user.save()
  //send email w/ token
  const resetURL = `http://${req.headers.host}/account/reset/${user.resetPasswordToken}`
  await mail.send({
    user,
    subject: 'Password Reset',
    resetURL,
    filename: 'password-reset'
  })
  req.flash('success', `You have been email a password reset link`)
  //redirect to login page after reset
  res.redirect('/login')
}

exports.reset = async (req,res) => {
  const user = await User.findOne({
    resetPasswordToken: req.params.token,
    resetPasswordExpires: { $gt: Date.now() }
  })
  if(!user) {
    req.flash('error', 'Password reset is invalid or has expired')
    return res.redirect('/login')
  }
  res.render('reset', { title: 'Reset your password' })
}

exports.confirmedPasswords = (req,res,next) => {
  if(req.body.password === req.body['password-confirm']) {
    
    next()
    return
  }
  req.flash('error', 'Passwords do not match!')
  res.redirect('back')
}

exports.update = async (req,res) => {
  const user = await User.findOne({
    resetPasswordToken: req.params.token,
    resetPasswordExpires: { $gt: Date.now() }
  })
  if(!user) {
    req.flash('error', 'Password reset is invalid or has expired')
    return res.redirect('/login')
  }
  const setPassword = promisify(user.setPassword, user)
  await setPassword(req.body.password)
  user.resetPasswordToken = undefined
  user.resetPasswordExpires = undefined
  const updatedUser = await user.save()
  await req.login(updatedUser)
  req.flash('Success', 'Nice! You reset your password.')
  res.redirect('/')
}