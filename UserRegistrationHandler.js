(function() {
  var Analytics, AuthenticationManager, EmailHandler, NewsLetterManager, OneTimeTokenHandler, User, UserCreator, UserRegistrationHandler, async, crypto, logger, sanitize, settings;

  sanitize = require('sanitizer');

  User = require("../../models/User").User;

  UserCreator = require("./UserCreator");

  AuthenticationManager = require("../Authentication/AuthenticationManager");

  NewsLetterManager = require("../Newsletter/NewsletterManager");

  async = require("async");

  logger = require("logger-sharelatex");

  crypto = require("crypto");

  EmailHandler = require("../Email/EmailHandler");

  OneTimeTokenHandler = require("../Security/OneTimeTokenHandler");

  Analytics = require("../Analytics/AnalyticsManager");

  settings = require("settings-sharelatex");

  module.exports = UserRegistrationHandler = {
    validateEmail: function(email) {
      var re;
      re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\ ".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA -Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
      return re.test(email);
    },
    hasZeroLengths: function(props) {
      var hasZeroLength;
      hasZeroLength = false;
      props.forEach(function(prop) {
        if (prop.length === 0) {
          return hasZeroLength = true;
        }
      });
      return hasZeroLength;
    },
    _registrationRequestIsValid: function(body, callback) {
      var email, password, username;
      email = sanitize.escape(body.email).trim().toLowerCase();
      password = body.password;
      username = email.match(/^[^@]*/);
      if (this.hasZeroLengths([password, email])) {
        return false;
      } else if (!this.validateEmail(email)) {
        return false;
      } else {
        return true;
      }
    },
    _createNewUserIfRequired: function(user, userDetails, callback) {
      if (user == null) {
        userDetails.holdingAccount = false;
        return UserCreator.createNewUser({
          holdingAccount: false,
          email: userDetails.email,
          first_name: userDetails.first_name,
          last_name: userDetails.last_name
        }, callback);
      } else {
        return callback(null, user);
      }
    },
    registerNewUser: function(userDetails, callback) {
      var requestIsValid, self, _ref, _ref1;
      self = this;
      requestIsValid = this._registrationRequestIsValid(userDetails);
      if (!requestIsValid) {
        return callback(new Error("request is not valid"));
      }
      userDetails.email = (_ref = userDetails.email) != null ? (_ref1 = _ref.trim()) != null ? _ref1.toLowerCase() : void 0 : void 0;
      return User.findOne({
        email: userDetails.email
      }, function(err, user) {
        if (err != null) {
          return callback(err);
        }
        if ((user != null ? user.holdingAccount : void 0) === false) {
          return callback(new Error("EmailAlreadyRegistered"), user);
        }
        return self._createNewUserIfRequired(user, userDetails, function(err, user) {
          if (err != null) {
            return callback(err);
          }
          return async.series([
            function(cb) {
              return User.update({
                _id: user._id
              }, {
                "$set": { 
                  holdingAccount: false
                }
              }, cb);
            }, function(cb) {
              return AuthenticationManager.setUserPassword(user._id, userDetails.password, cb);
            }, function(cb) {
              NewsLetterManager.subscribe(user, function() {});
              return cb();
            }
          ], function(err) {
            logger.log({
              user: user
            }, "registered");
            Analytics.recordEvent(user._id, "user-registered");
            return callback(err, user);
          });
        });
      });
    },
    registerNewUserAndSendActivationEmail: function(email, callback) {
      if (callback == null) {
        callback = function(error, user, setNewPasswordUrl) {};
      }
      logger.log({
        email: email
      }, "registering new user");
      return UserRegistrationHandler.registerNewUser({
        email: email,
        password: crypto.randomBytes(32).toString("hex")
      }, function(err, user) {
        var ONE_WEEK;
        if ((err != null) && (err != null ? err.message : void 0) !== "EmailAlreadyRegistered") {
          return callback(err);
        }
        if ((err != null ? err.message : void 0) === "EmailAlreadyRegistered") {
          logger.log({
            email: email
          }, "user already exists, resending welcome email");
        }
        ONE_WEEK = 7 * 24 * 60 * 60;
        return OneTimeTokenHandler.getNewToken(user._id, {
          expiresIn: ONE_WEEK
        }, function(err, token) {
          var setNewPasswordUrl;
          if (err != null) {
            return callback(err);
          }
          //setNewPasswordUrl = "" + settings.siteUrl + "/user/activate?token=" + token + "&user_id=" + user._id;
          setNewPasswordUrl = "" + "http://35.233.2.219" + "/user/activate?token=" + token + "&user_id=" + user._id;
          EmailHandler.sendEmail("registered", {
            to: user.email,
            setNewPasswordUrl: setNewPasswordUrl
          }, function() {});
          return callback(null, user, setNewPasswordUrl);
        });
      });
    }
  };

}).call(this);
