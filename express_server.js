const express = require("express");
const cookieParser = require("cookie-parser");
const { __express } = require("ejs");
const morgan = require('morgan')
const app = express();
const PORT = 8080; // default port 8080
app.set("view engine", "ejs");
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser())
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
  const urlsOfUser = userUrlsLookup(req.cookies["userid"]);
  if (urlsOfUser.hasOwnProperty(req.params.id)) {
    return true
  } else {
    return false
  }
}

const userRegister = function(email, password) {
  if (!password) {
    return "badpass";
  }
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

const isLoggedIn = function(req) {
  if (req.cookies["userid"]) {
    if (userLookup(req.cookies["userid"])) {
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
  if (status !== "bademail" && status !== "badpass") {
    res.cookie('userid', `${status}`)
    res.redirect('/urls/new')
  }
  if (status === "bademail") {
    res.sendStatus(400)
  }
  if (status === "badpass") {
    res.sendStatus(400)
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
  if (!isLoggedIn(req)) {
    const templateVars = { 
      user: userLookup(req.cookies["userid"]),
    };
    res.render("login", templateVars);
  } else {
    res.redirect('/urls')
  }
});

app.get("/register", (req, res) => {
  const templateVars = {
    user: userLookup(req.cookies["userid"]),
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
    user: userLookup(req.cookies["userid"]),
    urls: userUrlsLookup(req.cookies["userid"])
  };
  if (!isLoggedIn(req)) {
    res.redirect("/login")
  } else {
  res.render("urls_index", templateVars);
}
});

app.get("/urls/new", (req, res) => {
  const templateVars = {
    user: userLookup(req.cookies["userid"]),
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
      user: userLookup(req.cookies["userid"]),
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
  }
  catch {
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
    userID: req.cookies["userid"],
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


