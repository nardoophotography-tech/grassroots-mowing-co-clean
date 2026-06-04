import express from 'express';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const port = Number(process.env.PORT ?? 8080);

app.use(express.json());

app.get('/', (_req, res) => {
  res.json({ status: 'Cherry is online', agent: 'Cherry' });
});

app.post('/think', (req, res) => {
  const input = req.body?.input;
  if (typeof input !== 'string' || !input.trim()) {
    return res.status(400).json({ error: 'Invalid request: input text is required' });
  }
  const answer = `Cherry received: ${input}`;
  return res.json({ input, answer });
});

app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.listen(port, () => {
  console.log(`Cherry Core running on port ${port}`);
});
