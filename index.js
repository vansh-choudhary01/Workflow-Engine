import express from 'express';
import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import apiRoutes from './routes/index.js';

const app = express();

function connectDB() {
  mongoose.connect(process.env.DBURI)
    .then(() => console.log('Connected to MongoDB'))
}
connectDB();

app.use(express.json());

app.get('/', (req, res) => {
  res.send('Healthy!');
});

app.use("/api", apiRoutes);

app.use((err, req, res, next) => {
  return res.status(500).json({ message: err.message });
});

app.use((req, res, next) => {
  return res.status(404).json({ message: 'Not found' });
});

const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});