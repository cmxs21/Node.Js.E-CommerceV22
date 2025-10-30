const express = require('express');
require('dotenv').config();
const mongoose = require('mongoose');
const i18next = require('i18next');
const i18nextBackend = require('i18next-fs-backend');
const i18nextMiddleware = require('i18next-http-middleware');

const app = express();
const port = process.env.PORT || 3000;
const api = process.env.API;

i18next
  .use(i18nextBackend)
  .use(i18nextMiddleware.LanguageDetector)
  .init({
    fallbackLng: 'en',
    backend: {
      loadPath: 'locales/{{lng}}.json',
    },
  });

app.use(i18nextMiddleware.handle(i18next));

//Create test route
app.get(`${api}/`, (req, res) => {
  res.send('Hello World!');
});

//Create the mongoose connect method
mongoose
  .connect(process.env.CONNECTION_STRING)
  .then(() => console.log('Connected to MongoDB Successfully ^_^'))
  .catch((err) => console.error('Could not connect to MongoDB...', err));

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
