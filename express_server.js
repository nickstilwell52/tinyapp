const express = require("express");
const cookieParser = require("cookie-parser");
const { __express } = require("ejs");
const app = express();
const PORT = 8080; // default port 8080
app.set("view engine", "ejs");
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser())

const generateRandomString = function() {
  return Math.random().toString(36).substring(2,8);
}

const userLookup = function(useridCookie) {
  for (const [key, value] of Object.entries(users)) {
    if (key === useridCookie) {
      return value;
    }
  }
}

const userRegister = function(email, password) {
  for (const [key, value] of Object.entries(users)) {
    if (users[key].email === email) {
      return "bademail";
    }
  }
  const id = generateRandomString();
  users[id] = {
    id: id,
    email: email,
    password: password
  };
  return true;
}

const userLogin = function(email, password) {
  for (const [key, value] of Object.entries(users)) {
    if (users[key].email === email && users[key].password === password) {
      return users[key].id;
    } else if (users[key].email === email && users[key].password !== password) {
      return "badpass";
    }
  }
  return "bademail";
}

const urlDatabase = {
  "b2xVn2": "http://www.lighthouselabs.ca",
  "9sm5xK": "http://www.google.com"
};

const users = {
  userRandomID: {
    id: "userRandomID",
    email: "user@example.com",
    password: "purple-monkey-dinosaur",
  },
  user2RandomID: {
    id: "user2RandomID",
    email: "user2@example.com",
    password: "dishwasher-funk",
  },
  123: {
    id: "123",
    email: "a@a.a",
    password: "a",
  },
};


app.post("/logout", (req, res) => {
  res.clearCookie('userid')
  res.redirect('/urls')
});

app.post("/register", (req, res) => {
  const status = userRegister(req.body.email, req.body.password);
  if (status !== "bademail") {
    res.cookie('userid', `${status}`)
    res.redirect('/urls')
  }
  if (status === "bademail") {
    res.redirect(400)
  }
});

app.post("/login", (req, res) => {
  const status = userLogin(req.body.email, req.body.password);
  if (status !== "bademail" && status !== "badpass") {
    res.cookie('userid', `${status}`)
    res.redirect('/urls')
  }
  if (status === "bademail" || status === "badpass") {
    res.redirect(400)
  }
});

app.get("/login", (req, res) => {
  const templateVars = { 
    user: userLookup(req.cookies["userid"]),
  };
  res.render("login", templateVars);
});

app.get("/register", (req, res) => {
  const templateVars = { 
    user: userLookup(req.cookies["userid"]),
  };
  res.render("register", templateVars);
});

app.post("/urls/:id/delete", (req, res) => {
  delete urlDatabase[req.params.id]
  res.redirect('/urls')
});

app.get("/urls", (req, res) => {
  const templateVars = { 
    user: userLookup(req.cookies["userid"]),
    urls: urlDatabase
  };
  res.render("urls_index", templateVars);
});

app.get("/urls/new", (req, res) => {
  const templateVars = {
    user: userLookup(req.cookies["userid"]),
  }
  res.render("urls_new", templateVars);
});

app.get("/urls/:id", (req, res) => {
  const templateVars = {
    user: userLookup(req.cookies["userid"]),
    id: req.params.id,
    longURL: urlDatabase[req.params.id]
  };
  res.render("urls_show", templateVars);
});

app.get("/u/:id", (req, res) => {
  const longURL = urlDatabase[req.params.id];
  res.redirect(longURL);
});

app.post("/urls", (req, res) => {
  const id = generateRandomString();
  urlDatabase[id] = req.body.longURL
  res.redirect(`/u/${id}`)
});

app.post("/urls/:id", (req, res) => {
  urlDatabase[req.params.id] = req.body.longURL
  res.redirect('/urls')
});

app.get("/", (req, res) => {
  res.send("Hello!");
});


app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});


