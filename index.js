import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ message: "Debbie's Awesome Pawsome backend is running!" });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/services', (req, res) => {
  const services = [
    { id: 1, name: 'Dog Walking', price: '$25/hour', description: 'Daily walks for your furry friend' },
    { id: 2, name: 'Pet Sitting', price: '$40/day', description: "In-home care while you're away" },
    { id: 3, name: 'Pet Grooming', price: '$60/session', description: 'Professional grooming services' }
  ];
  res.json({ services });
});


app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
