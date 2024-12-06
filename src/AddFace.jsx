import React, { useState } from 'react';
import axios from 'axios';
import * as faceapi from 'face-api.js';

const AddFace = () => {
  const [label, setLabel] = useState('');
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState('');

  const loadModels = async () => {
    await faceapi.nets.tinyFaceDetector.loadFromUri('/models');
    await faceapi.nets.faceLandmark68Net.loadFromUri('/models');
    await faceapi.nets.faceRecognitionNet.loadFromUri('/models');
  };

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const generateDescriptor = async (image) => {
    // Detect the face and generate its descriptor
    const detections = await faceapi
      .detectSingleFace(image)
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (!detections) {
      setMessage('No face detected in the image.');
      return null;
    }

    return detections.descriptor;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!label || !file) {
      setMessage('Please provide both a label and an image.');
      return;
    }

    try {
      setMessage('Loading models and processing image...');
      await loadModels();

      const image = await faceapi.bufferToImage(file);
      const descriptor = await generateDescriptor(image);

      if (!descriptor) {
        setMessage('No face detected. Please try with another image.');
        return;
      }

      // Send label and descriptor to the backend
      const response = await axios.post('http://localhost:5000/api/faces/add', {
        label,
        descriptor: Array.from(descriptor), // Convert Float32Array to a regular array
      });

      setMessage(response.data.message || 'Face added successfully!');
    } catch (err) {
      console.error('Error adding face:', err);
      setMessage(err.response?.data?.error || 'An error occurred.');
    }
  };

  return (
    <div>
      <h1>Add New Face</h1>
      <form onSubmit={handleSubmit}>
        <label>
          Name/Label:
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            required
          />
        </label>
        <label>
          Upload Image:
          <input type="file" accept="image/*" onChange={handleFileChange} required />
        </label>
        <button type="submit">Add Face</button>
      </form>
      {message && <p>{message}</p>}
    </div>
  );
};

export default AddFace;
