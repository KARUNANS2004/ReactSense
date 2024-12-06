import { useRef, useEffect, useState } from "react";
import * as faceapi from "face-api.js";

const FaceDetection = () => {
  const videoRef = useRef();
  const canvasRef = useRef();
  const [isDetectionActive, setIsDetectionActive] = useState(false);
  
  // Debugging: Check if faceapi is properly imported
  console.log(faceapi); // Ensure faceapi is properly imported

  // loadModels function to load all models and handle errors
  const loadModels = async () => {
    console.log("Loading models...");

    try {
      const modelPath = "http://localhost:5173/models/ssd_mobilenetv1_model-weights_manifest.json";
      console.log(modelPath)

      // Load models sequentially and log each step
      await faceapi.nets.ssdMobilenetv1.loadFromUri(modelPath);
      console.log("ssdMobilenetv1 loaded.");

      await faceapi.nets.faceLandmark68Net.loadFromUri(modelPath);
      console.log("faceLandmark68Net loaded.");

      await faceapi.nets.faceRecognitionNet.loadFromUri(modelPath);
      console.log("faceRecognitionNet loaded.");

      await faceapi.nets.faceExpressionNet.loadFromUri(modelPath);
      console.log("faceExpressionNet loaded.");

      console.log("All models are loaded.");
    } catch (error) {
      console.error("Error loading models:", error);
    }
  };

  // startVideo function to access webcam and start streaming
  const startVideo = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;

        videoRef.current.addEventListener("loadeddata", () => {
          console.log("Video is ready");
        });
      }
    } catch (err) {
      console.error("Error accessing webcam:", err);
    }
  };

  // Detect faces in the video feed and display them on canvas
  const detectFaces = async () => {
    const displaySize = { width: 940, height: 650 };
    faceapi.matchDimensions(canvasRef.current, displaySize);

    try {
      const detections = await faceapi.detectAllFaces(
        videoRef.current,
        new faceapi.TinyFaceDetectorOptions()
      )
        .withFaceLandmarks()
        .withFaceDescriptors()
        .withFaceExpressions();

      const resizedDetections = faceapi.resizeResults(detections, displaySize);
      const context = canvasRef.current.getContext("2d");

      context.clearRect(0, 0, displaySize.width, displaySize.height); // Clear the canvas
      faceapi.draw.drawDetections(canvasRef.current, resizedDetections);
      faceapi.draw.drawFaceLandmarks(canvasRef.current, resizedDetections);
      faceapi.draw.drawFaceExpressions(canvasRef.current, resizedDetections);
    } catch (err) {
      console.error("Error during face detection:", err);
    }

    if (isDetectionActive) {
      requestAnimationFrame(detectFaces); // Continue detection loop if active
    }
  };

  // Start detection loop
  const startFaceDetection = () => {
    setIsDetectionActive(true);
    detectFaces();
  };

  // Stop detection loop
  const stopFaceDetection = () => {
    setIsDetectionActive(false);
    const context = canvasRef.current.getContext("2d");
    context.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height); // Clear the canvas when detection stops
  };

  useEffect(() => {
    // Load models and start video on component mount
    const initializeApp = async () => {
      try {
        await loadModels();
        await startVideo();
        console.log("App initialized. Click 'Start Detection' to begin.");
      } catch (err) {
        console.error("Error initializing the app:", err);
      }
    };

    initializeApp();
  }, []);

  return (
    <div className="myapp">
      <h1>Face Detection</h1>
      <div className="appvide">
        <video ref={videoRef} autoPlay muted />
        <canvas ref={canvasRef} width="940" height="650" />
      </div>
      <div>
        <button onClick={startFaceDetection} disabled={isDetectionActive}>
          {isDetectionActive ? "Detection Running" : "Start Detection"}
        </button>
        <button onClick={stopFaceDetection} disabled={!isDetectionActive}>
          {isDetectionActive ? "Stop Detection" : "Detection Stopped"}
        </button>
      </div>
    </div>
  );
};

export default FaceDetection;
