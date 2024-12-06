import { useRef, useEffect, useState } from 'react';
import * as faceapi from 'face-api.js';

function App() {
  const videoRef = useRef();
  const canvasRef = useRef();
  const labeledDescriptors = useRef();
  const isDetectionActiveRef = useRef(false);
  const [videoWidth, setVideoWidth] = useState(0);
  const [videoHeight, setVideoHeight] = useState(0);
  const [startDetectionButton, setStartDetectionButton] = useState('Start Detection');

  // Load models when the component mounts
  useEffect(() => {
    const loadModelsAndStartVideo = async () => {
      try {
        await startVideo();
        await loadModels();
        await loadLabeledDescriptors();
        console.log("App initialized. Click 'Start Detection' to begin.");
      } catch (err) {
        console.error("Error initializing the app:", err);
      }
    };

    loadModelsAndStartVideo();
  }, []);

  const startVideo = async () => {
    try {
      const currentStream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = currentStream;
        videoRef.current.addEventListener("loadedmetadata", () => {
          setVideoWidth(videoRef.current.videoWidth);
          setVideoHeight(videoRef.current.videoHeight);
          console.log("Video is ready", videoRef.current.videoWidth, videoRef.current.videoHeight);
        });
      }
    } catch (err) {
      console.error("Error accessing webcam:", err);
    }
  };

  const loadModels = async () => {
    try {
      await faceapi.nets.tinyFaceDetector.loadFromUri("/models");
      await faceapi.nets.faceLandmark68Net.loadFromUri("/models");
      await faceapi.nets.faceRecognitionNet.loadFromUri("/models");
      await faceapi.nets.faceExpressionNet.loadFromUri("/models");
      await faceapi.nets.ssdMobilenetv1.loadFromUri("/models");
      console.log("All models loaded successfully");
    } catch (err) {
      console.error("Error loading models:", err);
    }
  };

  const loadLabeledDescriptors = async () => {
    const labels = ['Karuna']; // Add more labels as needed
    try {
      labeledDescriptors.current = await Promise.all(
        labels.map(async (label) => {
          const img = await faceapi.fetchImage(`/images/${label}.jpg`);
          const detections = await faceapi.detectSingleFace(img)
            .withFaceLandmarks()
            .withFaceDescriptor();
          if (!detections) {
            console.warn(`No faces detected for ${label}`);
            return null;
          }
          return new faceapi.LabeledFaceDescriptors(label, [detections.descriptor]);
        })
      ).then((results) => results.filter(Boolean));
      console.log("Labeled descriptors loaded:", labeledDescriptors.current);
    } catch (err) {
      console.error("Error loading labeled descriptors:", err);
    }
  };

  const startFaceDetection = () => {
    // Check if the video is ready and the models are loaded
    if (videoRef.current.readyState !== 4 || !labeledDescriptors.current) {
      console.log("Video not ready or labeled descriptors not loaded");
      return; // Skip detection if the video is not ready or labeled descriptors aren't loaded
    }

    // Set detection state to true and start detection
    isDetectionActiveRef.current = true;
    setStartDetectionButton('Detection Running');
    console.log("Detection started:", isDetectionActiveRef.current);

    const detectFaces = async () => {
      if (!isDetectionActiveRef.current || !videoRef.current || videoRef.current.readyState !== 4) {
        console.log("Detection skipped: Video not ready or detection inactive");
        return;
      }

      try {
        const detections = await faceapi.detectAllFaces(
          videoRef.current,
          new faceapi.TinyFaceDetectorOptions()
        )
          .withFaceLandmarks()
          .withFaceDescriptors()
          .withFaceExpressions();

        const displaySize = { width: videoWidth, height: videoHeight };
        faceapi.matchDimensions(canvasRef.current, displaySize);

        const resizedDetections = faceapi.resizeResults(detections, displaySize);

        const context = canvasRef.current.getContext('2d');
        context.clearRect(0, 0, displaySize.width, displaySize.height);

        faceapi.draw.drawDetections(canvasRef.current, resizedDetections);
        faceapi.draw.drawFaceLandmarks(canvasRef.current, resizedDetections);
        faceapi.draw.drawFaceExpressions(canvasRef.current, resizedDetections);

        if (resizedDetections.length > 0) {
          const faceMatcher = new faceapi.FaceMatcher(labeledDescriptors.current, 0.6);

          resizedDetections.forEach((detection) => {
            const box = detection.detection.box;
            const bestMatch = faceMatcher.findBestMatch(detection.descriptor);
            const drawBox = new faceapi.draw.DrawBox(box, { label: bestMatch.toString() });
            drawBox.draw(canvasRef.current);
          });
        }
      } catch (err) {
        console.error("Error during detection:", err);
      }

      if (isDetectionActiveRef.current) {
        requestAnimationFrame(detectFaces); // Continue detection loop
      }
    };

    detectFaces();
  };

  const stopFaceDetection = () => {
    isDetectionActiveRef.current = false; // Deactivate detection
    setStartDetectionButton('Start Detection');
    console.log("Detection stopped:", isDetectionActiveRef.current);

    // Clear the canvas
    const context = canvasRef.current.getContext('2d');
    context.clearRect(0, 0, videoWidth, videoHeight);
  };

  return (
    <div className="myapp">
      <h1>Face Detection</h1>
      <div className="appvide" style={{ position: 'relative' }}>
        <video ref={videoRef} autoPlay muted width={videoWidth} height={videoHeight}></video>
        <canvas
          ref={canvasRef}
          width={videoWidth}
          height={videoHeight}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            pointerEvents: 'none',
            zIndex: 1,
          }}
        />
      </div>
      <div className="buttons">
        <button onClick={startFaceDetection} disabled={isDetectionActiveRef.current}>
          {startDetectionButton}
        </button>
        <button onClick={stopFaceDetection} disabled={!isDetectionActiveRef.current}>
          Stop Detection
        </button>
      </div>
    </div>
  );
}

export default App;
