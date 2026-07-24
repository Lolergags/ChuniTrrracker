import express from 'express';
import { router } from './server/routes.js';
import request from 'supertest';

const app = express();
app.use('/', router);

async function run() {
  const res = await request(app).get('/players/Lolergags?diff=MAS,ULT');
  console.log(res.body.levelStats);
}

run();
