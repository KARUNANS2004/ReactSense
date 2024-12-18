const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const app = express();

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/yourdbname', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Define a schema for storing images
const imageSchema = new mongoose.Schema({
  name: String,
  data: Buffer,
  contentType: String,
});

const Image = mongoose.model('Image', imageSchema);

// Set up multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Set up a route for file uploads
app.post('/upload', upload.single('file'), async (req, res) => {
  const newImage = new Image({
    name: req.file.originalname,
    data: req.file.buffer,
    contentType: req.file.mimetype,
  });

  try {
    await newImage.save();
    res.status(201).send('File uploaded successfully.');
  } catch (error) {
    res.status(500).send('Failed to upload file.');
  }
});

app.listen(5173, () => {
  console.log('Server started on port 3000');
});
