//jshint esversion:6
require("dotenv").config(); // To use the .env file
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
// const encrypt = require("mongoose-encryption"); // Encryption package?
const md5 = require("md5"); // Hashing package
// const bcrypt = require("bcrypt"); // Hashing package
// const saltRounds = 10; // Number of rounds for hashing
const session = require("express-session"); // Session package
const passport = require("passport"); // Passport package
const passportLocalMongoose = require("passport-local-mongoose"); // Passport package
const GoogleStrategy = require("passport-google-oauth20").Strategy; // Passport package
const findOrCreate = require("mongoose-findorcreate"); // Passport package

const app = express();

// console.log(process.env.API_KEY); // To use the .env file

app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));

app.use(
  session({
    // Session package
    secret: "Chota secret", // Secret key
    resave: false, // To prevent the session from being resaved
    saveUninitialized: false, // To prevent the session from being saved if nothing is initialized
  })
);

app.use(passport.initialize()); // Initializing passport
app.use(passport.session()); // Using passport for session

mongoose.connect("mongodb://localhost:27017/userDB", { useNewUrlParser: true }); // userDB is the name of the database
// mongoose.set("useCreateIndex", true); // To remove the deprecation warning

const userSchema = new mongoose.Schema({
  // Schema for the database
  email: String, // email and password are the fields in the database
  password: String,
  googleId: {
    type: String,
    unique: true,
  },
  secret: [{ type: String }],
});

userSchema.plugin(passportLocalMongoose); // Using passport for local mongoose
userSchema.plugin(findOrCreate); // Using findOrCreate for mongoose

//removed for md5 hashing
// userSchema.plugin(encrypt, {
//   secret: process.env.SECRET,
//   encryptedFields: ["password"],
// }); // Encrypting the password field

const User = new mongoose.model("User", userSchema); // Model for the database

passport.use(User.createStrategy()); // Creating a local strategy for passport

passport.serializeUser(User.serializeUser()); // Serializing the user
passport.deserializeUser(User.deserializeUser()); // Deserializing the user

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.CLIENT_ID, // Client ID and Client Secret are obtained from Google
      clientSecret: process.env.CLIENT_SECRET, // Client ID and Client Secret are obtained from Google
      callbackURL: "http://localhost:3000/auth/google/secrets", // Redirecting to the secrets page
    },
    function (accessToken, refreshToken, profile, cb) {
      // Creating a new user or finding the user
      console.log(profile);
      User.findOrCreate(
        { googleId: profile.id, username: profile.displayName },
        function (err, user) {
          return cb(err, user);
        }
      );
    }
  )
);

app.get("/", function (req, res) {
  // Home route
  res.render("home"); // Rendering the home page
});

app
  .route("/auth/google") // Google authentication route

  .get(
    passport.authenticate("google", {
      // Authenticating the user
      scope: ["profile"], // Getting the profile of the user
    })
  );

app.get(
  "/auth/google/secrets",
  passport.authenticate("google", { failureRedirect: "/login" }),
  function (req, res) {
    // Successful authentication, redirect home.
    res.redirect("/secrets");
  }
);

app.get("/login", (req, res) => {
  // Login route
  res.render("login", { errMsg: "", username: "", password: "" }); // errMsg is the error message to be displayed
});

app.get("/register", function (req, res) {
  // Register route
  res.render("register"); // Rendering the register page
});

app.get("/secrets", function (req, res) {
  // Secrets route
  // if (req.isAuthenticated()) {
  //   // If the user is authenticated
  //   res.render("secrets"); // Rendering the secrets page
  // } else {
  //   res.redirect("/login"); // Redirecting to the login page
  // }
  User.find({ secret: { $ne: null } })
    .then((foundUsers) => {
      // Finding the users with secrets
      let innerHTML = "Loading";
      let href = "/secrets";

      // Fixed: Log Out button even if user is not logged in.
      if (req.isAuthenticated()) {
        innerHTML = "Log Out";
        href = "/logout";
      } else {
        innerHTML = "Log In";
        href = "/login";
      }
      if (foundUsers) {
        // If the users are found
        res.render("secrets", {
          usersWithSecrets: foundUsers,
          logOutBtnText: innerHTML,
          logOutBtnLink: href,
        }); // Rendering the secrets page
      }
    })
    .catch((err) => {
      // Handling any errors that occur during the process
      console.log(err);
    });
});

app.get("/submit", function (req, res) {
  // Submit route
  if (req.isAuthenticated()) {
    // If the user is authenticated
    res.render("submit"); // Rendering the submit page
  } else {
    res.redirect("/login"); // Redirecting to the login page
  }
});

app.get("/logout", function (req, res) {
  // Logout route
  req.logout(function (err) {
    // Logging out the user
    if (err) {
      console.log(err); // Logging the error
    }
    res.redirect("/"); // Redirecting to the home page
  });
});

app.post("/register", function (req, res) {
  // Register route
  // bcrypt.hash(req.body.password, saltRounds, function (err, hash) {
  //   // Hashing the password
  //   // Store hash in your password DB.
  //   const newUser = new User({
  //     // Creating a new user
  //     email: req.body.username, // username and password are the fields in the form
  //     // password: req.body.password,
  //     password: hash, // Hashing the password
  //     // password: md5(req.body.password), // Hashing the password
  //   });
  //   newUser // Saving the new user to the database
  //     .save()
  //     .then(() => {
  //       res.render("secrets"); // Redirecting to the secrets page
  //     })
  //     .catch((err) => {
  //       // Catching the error
  //       console.log(err); // Logging the error
  //     });
  // });

  User.register(
    { username: req.body.username },
    req.body.password,
    function (err, user) {
      // Registering the user
      if (err) {
        console.log(err); // Logging the error
        res.redirect("/register"); // Redirecting to the register page
      } else {
        passport.authenticate("local")(req, res, function () {
          // Authenticating the user
          res.redirect("/secrets"); // Redirecting to the secrets page
        });
      }
    }
  );
});

// Alternate way

// app.post("/login", async function (req, res) {
//   const username = req.body.username;
//   const password = req.body.password;

//   try {
//     const foundUser = await User.findOne({ email: username });
//     if (foundUser) {
//       if (foundUser.password === password) {
//         res.render("secrets");
//         console.log("New login (" + username + ")");
//       } else {
//         res.render("login", {
//           errMsg: "Email or password is incorrect",
//           username: username,
//           password: password,
//         });
//       }
//     } else {
//       res.render("login", {
//         errMsg: "Email or password is incorrect",
//         username: username,
//         password: password,
//       });
//     }
//   } catch (err) {
//     console.log(err);
//   }
// });

// Alternative way to login

app.post("/login", function (req, res) {
  // Login route
  // const username = req.body.username; // username and password are the fields in the form
  // const password = req.body.password;
  // User.findOne({ email: username }) // Finding the user in the database
  //   .then((foundUser) => {
  //     // If the user is found
  //     if (foundUser) {
  //       bcrypt.compare(password, foundUser.password, function (err, result) {
  //         if (result) {
  //           // If the password is correct
  //           res.render("secrets"); // Redirecting to the secrets page
  //           console.log("New login (" + username + ")"); // Logging the login
  //         } else {
  //           res.render("login", {
  //             // If the password is incorrect
  //             errMsg: "Entered Email or Password is incorrect", // Displaying the error message
  //             username: username,
  //             password: password,
  //           });
  //         }
  //       });
  //     } else {
  //       res.render("login", {
  //         // If the user is not found
  //         errMsg: "Entered Email id does not exist", // Displaying the error message
  //         username: username,
  //         password: password,
  //       });
  //     }
  //   })
  //   .catch((err) => {
  //     console.log(err);
  //   });

  const user = new User({
    username: req.body.username,
    password: req.body.password,
  });

  req.login(user, function (err) {
    if (err) {
      console.log(err);
    } else {
      passport.authenticate("local", { failureRedirect: "/login" })(
        req,
        res,
        function (err) {
          if (err) console.log(err);
          else {
            res.redirect("/secrets");
          }
        }
      );
    }
  });
});

app.post("/submit", function (req, res) {
  // Submit route
  const submittedSecret = req.body.secret; // Getting the secret from the form

  User.findById(req.user.id)
    .then((foundUser) => {
      // Finding the user
      if (foundUser) {
        // If the user is found
        foundUser.secret.push(submittedSecret);
        return foundUser.save(); // Saving the secret and returning the promise
      }
    })
    .then(() => {
      // Redirecting to the secrets page after the secret is saved
      res.redirect("/secrets");
    })
    .catch((err) => {
      // Handling any errors that occur during the process
      console.log(err);
    });
});

app.listen(process.env.PORT || 3000, function () {
  console.log("Server started on port 3000");
});
