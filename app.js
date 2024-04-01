const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const bcrypt = require('bcrypt');

const File = require('./models/File');

const app = express();
const upload = multer({ dest: 'uploads' }); // Configure multer to store uploaded files in the 'uploads' directory

const PORT = process.env.PORT || 5000;

const MONGODB_URI =
  'mongodb+srv://*******************.net/uplodes?retryWrites=true&w=majority'
// const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/UrlShortner';

const handleDownload = async (req, res) => {
  try {
    const file = await File.findById(req.params.id);

    if (!file) {
      return res.status(404).send('File not found');
    }

    if (file.password) {
      if (!req.body.password) {
        return res.render('password');
      }

      const match = await bcrypt.compare(req.body.password, file.password);
      if (!match) {
        return res.render('password', { error: true });
      }
    }

    file.downloadCount++;
    await file.save();
    res.download(file.path, file.originalName);
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
};

mongoose.connect(MONGODB_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: false })); // Parse URL-encoded bodies (normal form data)

app.get('/', (req, res) => {
  res.render('index');
});

// Handle file uploads
app.post('/upload', upload.single('file'), async (req, res) => {
  try {
    const fileData = {
      path: req.file.path,
      originalName: req.file.originalname
    };

    if (req.body.password) {
      const encryptedPassword = await bcrypt.hash(req.body.password, 12);
      fileData.password = encryptedPassword;
    }

    const file = await File.create(fileData);
    res.render('index', { fileLink: `${req.headers.origin}/file/${file._id}` });
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});

// Routes to handle file downloads
app.get('/file/:id', handleDownload);
app.post('/file/:id', handleDownload);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).send(err.message || 'Internal Server Error');
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
