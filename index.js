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

app.get('/', (req, res) => {
  res.send('Healthy!');
});

app.use("/api", apiRoutes);

const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});