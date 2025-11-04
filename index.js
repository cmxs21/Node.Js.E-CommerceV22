import express from 'express';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import i18next from 'i18next';
import i18nextBackend from 'i18next-fs-backend';
import i18nextMiddleware from 'i18next-http-middleware';
import cors from 'cors';
import morgan from 'morgan';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;
const api = process.env.API;

import categoryRouter from './routes/categories.routes.js';
// import productRouter from './routes/products.routes.js';
import authRouter from './routes/auth.routes.js';
// import orderRouter from './routes/orders.routes.js';
import usersRouter from './routes/users.routes.js';

import { authMiddleware } from './middlewares/auth.middleware.js';

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
app.use(express.json());
app.use(morgan('tiny')); //Tiny contains methods, URLs, status codes, content lengths and response times
app.use(
  cors({
    origin: ['http://localhost:3000', 'https://mydomain.com'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept-Language'],
  })
);

app.use(authMiddleware);

app.use(`${api}/categories`, categoryRouter);
// app.use(`${api}/products`, productRouter);
app.use(`${api}/auth`, authRouter);
// app.use(`${api}/orders`, orderRouter);
app.use(`${api}/users`, usersRouter);

//Test route
app.get(`${api}/`, (req, res) => {
  res.send('Hello World!');
});

mongoose
  .connect(process.env.CONNECTION_STRING)
  .then(() => console.log('Connected to MongoDB Successfully ^_^'))
  .catch((err) => console.error('Could not connect to MongoDB...', err));

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}${api}/`);
});
