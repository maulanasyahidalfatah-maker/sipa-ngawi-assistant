"use client";

import React, { useEffect, useRef, useState } from "react";
import Webcam from "react-webcam";
import * as ort from "onnxruntime-web";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

// Setup ONNX Runtime Web
ort.env.wasm.wasmPaths = "/";
ort.env.wasm.numThreads = 1;

const labels = [
  "person", "bicycle", "car", "motorcycle", "airplane", "bus", "train", "truck", "boat",
  "traffic light", "fire hydrant", "stop sign", "parking meter", "bench", "bird", "cat",
  "dog", "horse", "sheep", "cow", "elephant", "bear", "zebra", "giraffe", "backpack",
  "umbrella", "handbag", "tie", "suitcase", "frisbee", "skis", "snowboard", "sports ball",
  "kite", "baseball bat", "baseball glove", "skateboard", "surfboard", "tennis racket",
  "bottle", "wine glass", "cup", "fork", "knife", "spoon", "bowl", "banana", "apple",
  "sandwich", "orange", "broccoli", "carrot", "hot dog", "pizza", "donut", "cake",
  "chair", "couch", "potted plant", "bed", "dining table", "toilet", "tv", "laptop",
  "mouse", "remote", "keyboard", "cell phone", "microwave", "oven", "toaster", "sink",
  "refrigerator", "book", "clock", "vase", "scissors", "teddy bear", "hair drier", "toothbrush"
];

interface ObjectDetectionProps {
  onClose: () => void;
}

type DetectionBox = {
  x: number;
  y: number;
  width: number;
  height: number;
  score: number;
  class: number;
  label: string;
};

export function ObjectDetection({ onClose }: ObjectDetectionProps) {
  const webcamRef = useRef<Webcam>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [model, setModel] = useState<ort.InferenceSession | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Load the model
  useEffect(() => {
    const loadModel = async () => {
      try {
        setLoading(true);
        console.log("Attempting to load model from: /models/yolo.onnx");
        
        // Try WASM first (more stable for YOLOv8)
        const session = await ort.InferenceSession.create(
          "/models/yolo.onnx",
          {
            executionProviders: ["wasm"],
          }
        );
        console.log("Model loaded with WASM");
        console.log("Input names:", session.inputNames);
        console.log("Output names:", session.outputNames);
        setModel(session);
        setLoading(false);
      } catch (e: unknown) {
        console.error("Failed to load model:", e);
        const message = e instanceof Error ? e.message : String(e);
        setError(`Failed to load model: ${message}`);
        setLoading(false);
      }
    };

    loadModel();
  }, []);

  // Inference loop
  useEffect(() => {
    if (!model || !webcamRef.current?.video) return;

    let animationId: number;

    const runInference = async () => {
      const canvas = canvasRef.current;
      const video = webcamRef.current?.video;
      
      if (!video || !model || !canvas) {
        animationId = requestAnimationFrame(runInference);
        return;
      }

      if (video.readyState !== 4) {
        animationId = requestAnimationFrame(runInference);
        return;
      }

      const { videoWidth, videoHeight } = video;
      canvas.width = videoWidth;
      canvas.height = videoHeight;

      // Preprocess
      const input = preprocess(video, 640, 640);

      try {
        const feeds: Record<string, ort.Tensor> = {};
        feeds[model.inputNames[0]] = input;
        
        const outputMap = await model.run(feeds);
        // Use the first output name dynamically (handles "output0", "output", etc.)
        const outputName = model.outputNames[0];
        const output = outputMap[outputName];
        
        // Postprocess and draw
        if (canvas && output) {
          drawBoxes(output, canvas, videoWidth, videoHeight);
        }
      } catch (e) {
        console.error("Inference error:", e);
      }

      animationId = requestAnimationFrame(runInference);
    };

    runInference();

    return () => cancelAnimationFrame(animationId);
  }, [model]);

  return (
    <div className="relative w-full h-full bg-black flex items-center justify-center overflow-hidden">
      <Button 
        className="absolute top-4 right-4 z-50 bg-red-600 hover:bg-red-700 text-white"
        onClick={onClose}
      >
        <X className="mr-2 h-4 w-4" /> Close Camera
      </Button>

      {loading && (
        <div className="absolute inset-0 flex items-center justify-center z-50 bg-black/80 text-white">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
            <p>Loading YOLO Model (WebGPU)...</p>
          </div>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex items-center justify-center z-50 bg-black/90 text-red-500 p-4 text-center">
          <div>
            <p className="text-xl font-bold mb-2">Error</p>
            <p>{error}</p>
            <Button className="mt-4" onClick={onClose}>Go Back</Button>
          </div>
        </div>
      )}

      <Webcam
        ref={webcamRef}
        className="absolute inset-0 w-full h-full object-contain"
        muted={true}
        screenshotFormat="image/jpeg"
        videoConstraints={{
            facingMode: "environment"
        }}
      />
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full object-contain pointer-events-none"
      />
    </div>
  );
}

// Helper functions

function preprocess(image: HTMLVideoElement, modelWidth: number, modelHeight: number): ort.Tensor {
  const canvas = document.createElement("canvas");
  canvas.width = modelWidth;
  canvas.height = modelHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not get context");

  ctx.drawImage(image, 0, 0, modelWidth, modelHeight);
  const imageData = ctx.getImageData(0, 0, modelWidth, modelHeight);
  const { data } = imageData;

  const input = new Float32Array(modelWidth * modelHeight * 3);
  
  for (let i = 0; i < modelWidth * modelHeight; i++) {
    const r = data[i * 4] / 255.0;
    const g = data[i * 4 + 1] / 255.0;
    const b = data[i * 4 + 2] / 255.0;

    // CHW Layout: RRR...GGG...BBB...
    input[i] = r;
    input[i + modelWidth * modelHeight] = g;
    input[i + 2 * modelWidth * modelHeight] = b;
  }

  return new ort.Tensor("float32", input, [1, 3, modelHeight, modelWidth]);
}

let loggedOnce = false;

function drawBoxes(output: ort.Tensor, canvas: HTMLCanvasElement, imgWidth: number, imgHeight: number) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const data = output.data as Float32Array;
  const dims = output.dims;

  // Debug: log output shape once
  if (!loggedOnce) {
    console.log("Output shape:", dims);
    console.log("Output type:", output.type);
    console.log("Sample data (first 20):", Array.from(data.slice(0, 20)));
    loggedOnce = true;
  }

  let boxes: DetectionBox[] = [];

  // Detect output format
  if (dims.length === 3 && dims[2] === 6) {
    // Format: [1, N, 6] - End2End with NMS (x1, y1, x2, y2, score, class_id)
    const numDet = dims[1];
    
    for (let i = 0; i < numDet; i++) {
      const x1 = data[i * 6 + 0];
      const y1 = data[i * 6 + 1];
      const x2 = data[i * 6 + 2];
      const y2 = data[i * 6 + 3];
      const score = data[i * 6 + 4];
      const classId = Math.round(data[i * 6 + 5]);

      if (score < 0.25) continue;

      const scaleX = imgWidth / 640;
      const scaleY = imgHeight / 640;

      boxes.push({
        x: x1 * scaleX,
        y: y1 * scaleY,
        width: (x2 - x1) * scaleX,
        height: (y2 - y1) * scaleY,
        score,
        class: classId,
        label: labels[classId] || `cls ${classId}`,
      });
    }
  } else if (dims.length === 3 && dims[1] === 84 && dims[2] === 8400) {
    // Format: [1, 84, 8400] - Raw YOLOv8 output
    // YOLOv8 ONNX outputs are already decoded to [x_center, y_center, width, height] in pixel coordinates
    const numAnchors = dims[2]; // 8400
    const numClass = dims[1] - 4; // 80

    // Process each anchor
    for (let i = 0; i < numAnchors; i++) {
      // Find max class score
      let maxScore = 0;
      let maxClass = -1;
      
      for (let c = 0; c < numClass; c++) {
        const score = data[(4 + c) * numAnchors + i];
        if (score > maxScore) {
          maxScore = score;
          maxClass = c;
        }
      }

      if (maxScore > 0.25) {
        // YOLOv8 ONNX already outputs decoded coordinates in pixel space (0-640)
        const x_center = data[0 * numAnchors + i];
        const y_center = data[1 * numAnchors + i];
        const width = data[2 * numAnchors + i];
        const height = data[3 * numAnchors + i];

        // Scale from 640x640 to actual image size
        const scaleX = imgWidth / 640;
        const scaleY = imgHeight / 640;

        boxes.push({
          x: (x_center - width / 2) * scaleX,
          y: (y_center - height / 2) * scaleY,
          width: width * scaleX,
          height: height * scaleY,
          score: maxScore,
          class: maxClass,
          label: labels[maxClass] || `cls ${maxClass}`,
        });
      }
    }

    // Apply NMS for raw format
    const sortedBoxes = boxes.sort((a, b) => b.score - a.score);
    const resultBoxes = [];
    
    while (sortedBoxes.length > 0) {
      const current = sortedBoxes.shift();
      if (!current) break;
      resultBoxes.push(current);

      for (let i = sortedBoxes.length - 1; i >= 0; i--) {
        if (sortedBoxes[i].class === current.class && iou(current, sortedBoxes[i]) > 0.45) {
          sortedBoxes.splice(i, 1);
        }
      }
    }
    boxes = resultBoxes;
  }

  // Debug: log detections
  if (boxes.length > 0 && !loggedOnce) {
    console.log(`Found ${boxes.length} detections:`, boxes.slice(0, 3));
  }

  // Draw all boxes
  boxes.forEach(box => {
    ctx.strokeStyle = "#00FF00";
    ctx.lineWidth = 3;
    ctx.strokeRect(box.x, box.y, box.width, box.height);
    
    const label = `${box.label} ${(box.score * 100).toFixed(0)}%`;
    ctx.font = "16px Arial";
    const textWidth = ctx.measureText(label).width;
    
    ctx.fillStyle = "#00FF00";
    const labelY = box.y > 25 ? box.y - 25 : box.y;
    ctx.fillRect(box.x, labelY, textWidth + 10, 25);
    
    ctx.fillStyle = "#000000";
    ctx.fillText(label, box.x + 5, labelY + 18);
  });
}

function iou(box1: DetectionBox, box2: DetectionBox) {
    const x1 = Math.max(box1.x, box2.x);
    const y1 = Math.max(box1.y, box2.y);
    const x2 = Math.min(box1.x + box1.width, box2.x + box2.width);
    const y2 = Math.min(box1.y + box1.height, box2.y + box2.height);

    const intersection = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
    const area1 = box1.width * box1.height;
    const area2 = box2.width * box2.height;

    return intersection / (area1 + area2 - intersection);
}
