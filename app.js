//jshint esversion:6
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const encrypt = require("mongoose-encryption"); // Encryption package

const app = express();

app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));

mongoose.connect("mongodb://localhost:27017/userDB", { useNewUrlParser: true }); // userDB is the name of the database

const userSchema = new mongoose.Schema({
  // Schema for the database
  email: String, // email and password are the fields in the database
  password: String,
});

const secret = "Thisisourlittlesecret"; // Secret key for encryption
userSchema.plugin(encrypt, { secret: secret, encryptedFields: ["password"] }); // Encrypting the password field

const User = new mongoose.model("User", userSchema); // Model for the database

app.get("/", function (req, res) {
  // Home route
  res.render("home");
});

app.get("/login", (req, res) => {
  // Login route
  res.render("login", { errMsg: "", username: "", password: "" }); // errMsg is the error message to be displayed
});

app.get("/register", function (req, res) {
  // Register route
  res.render("register");
});

app.post("/register", function (req, res) {
  // Register route
  const newUser = new User({
    // Creating a new user
    email: req.body.username, // username and password are the fields in the form
    password: req.body.password,
  });

  newUser // Saving the new user to the database
    .save()
    .then(() => {
      res.render("secrets"); // Redirecting to the secrets page
    })
    .catch((err) => {
      // Catching the error
      console.log(err); // Logging the error
    });
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
  const username = req.body.username; // username and password are the fields in the form
  const password = req.body.password;

  User.findOne({ email: username }) // Finding the user in the database
    .then((foundUser) => {
      // If the user is found
      if (foundUser) {
        if (foundUser.password === password) {
          // If the password is correct
          res.render("secrets"); // Redirecting to the secrets page
          console.log("New login (" + username + ")"); // Logging the login
        } else {
          res.render("login", {
            // If the password is incorrect
            errMsg: "Email or password is incorrect", // Displaying the error message
            username: username,
            password: password,
          });
        }
      } else {
        res.render("login", {
          // If the user is not found
          errMsg: "Entered Email id does not exist", // Displaying the error message
          username: username,
          password: password,
        });
      }
    })
    .catch((err) => {
      console.log(err);
    });
});

app.listen(3000, function () {
  console.log("Server started on port 3000");
});
