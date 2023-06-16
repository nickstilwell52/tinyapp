const express = require("express");
const cookieSession = require("cookie-session");
const { __express } = require("ejs");
const morgan = require('morgan')
const bcrypt = require("bcryptjs");
const app = express();
const PORT = 8080; // default port 8080
app.set("view engine", "ejs");
app.use(express.urlencoded({ extended: true }));
app.use(cookieSession({
  secret: 'cookierecipe'
}))
app.use(morgan('dev'));

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

const userUrlsLookup = function(id) {
  const urlsForUser = {};
  for (const [key, value] of Object.entries(urlDatabase)) {
    if (urlDatabase[key].userID === id) {
      urlsForUser[key] = value;
    }
  }
  return urlsForUser;
}

const doesUserOwnUrl = function(req) {
  const urlsOfUser = userUrlsLookup(req.session.userid);
  if (urlsOfUser.hasOwnProperty(req.params.id)) {
    return true
  } else {
    return false
  }
}

const userRegister = function(email, password) {
  if (!password) {
    return {isBurnt: "badpass"};
  }
  for (const [key, value] of Object.entries(users)) {
    if (users[key].email === email) {
      return {isBurnt: "bademail"};
    }
  }
  const id = generateRandomString();
  users[id] = {
    id: id,
    email: email,
    password: bcrypt.hashSync(password, 10)
  };
  return {id: id};
}

const userLogin = function(email, password) {
  for (const [key, value] of Object.entries(users)) {
    if (users[key].email === email && bcrypt.compareSync(password, users[key].password)) {
      return {id: users[key].id};
    } else if (users[key].email === email && !bcrypt.compareSync(password, users[key].password)) {
      return {isBurnt: "badpass"};
    }
  }
  return {isBurnt: "bademail"} ;
}

/* example of the cookie, the keys are mutually exclusive
const cookieState = {
  id: asdf
  isBurnt: badpass
}
*/

const isLoggedIn = function(req) {
  if (req.session.userid) {
    if (userLookup(req.session.userid)) {
    return true;
    }
  } else {
    return false;
  }
}

const urlDatabase = {
  b6UTxQ: {
    longURL: "https://www.tsn.ca",
    userID: "aJ48lW",
  },
  i3BoGr: {
    longURL: "https://www.google.ca",
    userID: "aJ48lW",
  },
  b2xVn2: {
    longURL: "http://www.lighthouselabs.ca",
    userID: "123",
  },
  "9sm5xK": {
    longURL: "http://www.google.com",
    userID: "123",
  },
};

const users = {
  userRandomID: {
    id: "userRandomID",
    email: "user@example.com",
    password: bcrypt.hashSync("purple-monkey-dinosaur", 10),
  },
  user2RandomID: {
    id: "user2RandomID",
    email: "user2@example.com",
    password: bcrypt.hashSync("dishwasher-funk", 10),
  },
  123: {
    id: "123",
    email: "a@a.a",
    password: bcrypt.hashSync("a", 10),
  },
};

app.post("/logout", (req, res) => {
  req.session = null
  res.redirect('/login')
});

app.post("/register", (req, res) => {
  const cookieState = userRegister(req.body.email, req.body.password);
  if (!cookieState.isBurnt) {
    req.session.userid = `${cookieState.id}`;
    res.redirect('/urls/new')
  }
  else {
    res.sendStatus(400,`${cookieState.isBurnt}`)
  }
});

app.post("/login", (req, res) => {
  const cookieState = userLogin(req.body.email, req.body.password);
  if (!cookieState.isBurnt) {
    req.session.userid = `${cookieState.id}`;
    res.redirect('/urls/new')
  }
  else {
    res.sendStatus(400,`${cookieState.isBurnt}`)
  }
});

app.get("/login", (req, res) => {
  if (!isLoggedIn(req)) {
    const templateVars = { 
      user: userLookup(req.session.userid),
    };
    res.render("login", templateVars);
  } else {
    res.redirect('/urls')
  }
});

app.get("/register", (req, res) => {
  const templateVars = {
    user: userLookup(req.session.userid),
  };
  if (!isLoggedIn(req)) {
  res.render("register", templateVars);
  } else {
    res.redirect('/urls')
  }
});

app.post("/urls/:id/delete", (req, res) => {
  if (!doesUserOwnUrl(req)) {
    res.redirect(400, "/login")
  } else {
    delete urlDatabase[req.params.id]
    res.redirect('/urls')
  }
});

app.get("/urls", (req, res) => {
  const templateVars = { 
    user: userLookup(req.session.userid),
    urls: userUrlsLookup(req.session.userid)
  };
  if (!isLoggedIn(req)) {
    res.redirect("/login")
  } else {
  res.render("urls_index", templateVars);
}
});

app.get("/urls/new", (req, res) => {
  const templateVars = {
    user: userLookup(req.session.userid),
  }
  if (!isLoggedIn(req)) {
    res.redirect("/login")
  } else {
  res.render("urls_new", templateVars);
}
});

app.get("/urls/:id", (req, res) => {
  if (!isLoggedIn(req)) {
    res.redirect(400, "/login")
  }
  else if (!doesUserOwnUrl(req)) {
    res.redirect(400, "/login")
  } else {
    const templateVars = {
      user: userLookup(req.session.userid),
      id: req.params.id,
      longURL: urlDatabase[req.params.id].longURL
    };
    res.render("urls_show", templateVars);
  }
});

app.get("/u/:id", (req, res) => {
  try {
  const longURL = urlDatabase[req.params.id].longURL;
  res.redirect(longURL);
  } catch {
    res.status(404).send('error, shortened URL not found')
  }
});

app.post("/urls", (req, res) => {
  if (!isLoggedIn(req)) {
  res.status(400).send('bad request, not signed in.')
  } else {
  const id = generateRandomString();
  urlDatabase[id] = {
    longURL: req.body.longURL,
    userID: req.session.userid,
  },
  res.redirect('/urls')
  }
});

app.post("/urls/:id", (req, res) => {
  if (!isLoggedIn(req)) {
    res.status(400).send('bad request, not signed in.')
  }
  else if (!doesUserOwnUrl(req)) {
    res.status(400).send('bad request, not signed in.')
  } else {
  urlDatabase[req.params.id].longURL = req.body.longURL
  res.redirect('/urls')
  }
});

app.get("/", (req, res) => {
  res.send("Hello!");
});

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});