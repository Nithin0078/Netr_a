import os
import cv2
import numpy as np
from ultralytics import YOLO
from typing import Dict, List, Any, Tuple

class YOLODetector:
    def __init__(self, model_name: str = "yolov8n.pt"):
        # Load YOLOv8 Model (will auto-download to cache if not present)
        self.model = YOLO(model_name)
        
        # Load Haar Cascade for Face Detection
        self.face_cascade = cv2.CascadeClassifier(
            cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
        )

        # Class ID mapping from COCO dataset
        self.PERSON_CLASS = 0
        self.VEHICLE_CLASSES = [2, 3, 5, 7]  # car, motorcycle, bus, truck
        self.BAG_CLASSES = [24, 26]          # backpack, handbag/suitcase

    def detect_frame(self, frame: np.ndarray) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
        """
        Runs object detection on a single frame.
        Returns:
            detections: List of dictionaries of all tracked/detected objects.
            alerts: List of generated alerts (e.g. crowd, suspicious activity).
        """
        results = self.model(frame, verbose=False)
        detections = []
        alerts = []
        
        if not results:
            return detections, alerts
            
        result = results[0]
        boxes = result.boxes
        
        # Get Frame Dimensions
        h, w = frame.shape[:2]
        
        person_count = 0
        vehicles = []
        bags = []

        # 1. Parse YOLOv8 bounding boxes
        for box in boxes:
            cls_id = int(box.cls[0].item())
            conf = float(box.conf[0].item())
            xyxy = box.xyxy[0].tolist() # [x1, y1, x2, y2] relative to frame pixels
            
            # Normalize bounding box coordinates for frontend visualization
            norm_box = [
                round(xyxy[0] / w, 4),
                round(xyxy[1] / h, 4),
                round(xyxy[2] / w, 4),
                round(xyxy[3] / h, 4)
            ]
            
            if cls_id == self.PERSON_CLASS:
                person_count += 1
                detections.append({
                    "type": "Person",
                    "confidence": round(conf, 2),
                    "box": norm_box
                })
                
            elif cls_id in self.VEHICLE_CLASSES:
                vehicle_type = self.model.names[cls_id].capitalize()
                detections.append({
                    "type": vehicle_type,
                    "confidence": round(conf, 2),
                    "box": norm_box
                })
                vehicles.append(xyxy)
                
            elif cls_id in self.BAG_CLASSES:
                bag_type = self.model.names[cls_id].capitalize()
                detections.append({
                    "type": "Bag",
                    "confidence": round(conf, 2),
                    "box": norm_box
                })
                bags.append(xyxy)

        # 2. Face Detection (Haar Cascades) in grayscale
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        faces = self.face_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(30, 30))
        for (fx, fy, fw, fh) in faces:
            detections.append({
                "type": "Face",
                "confidence": 0.85, # Haar cascades does not return explicit confidence, mock it
                "box": [
                    round(fx / w, 4),
                    round(fy / h, 4),
                    round((fx + fw) / w, 4),
                    round((fy + fh) / h, 4)
                ]
            })

        # 3. ANPR-Ready License Plate Crop Bounding Boxes
        # Heuristic: Crop the bottom middle 35% of detected vehicles to find plates
        for vx1, vy1, vx2, vy2 in vehicles:
            vw = vx2 - vx1
            vh = vy2 - vy1
            # Standard license plate region: bottom half, horizontally centered
            lpx1 = int(vx1 + vw * 0.2)
            lpy1 = int(vy1 + vh * 0.6)
            lpx2 = int(vx1 + vw * 0.8)
            lpy2 = int(vy1 + vh * 0.95)
            
            # Bound check
            if lpx1 >= 0 and lpy1 >= 0 and lpx2 <= w and lpy2 <= h:
                detections.append({
                    "type": "License Plate Region (ANPR)",
                    "confidence": 0.90,
                    "box": [
                        round(lpx1 / w, 4),
                        round(lpy1 / h, 4),
                        round(lpx2 / w, 4),
                        round(lpy2 / h, 4)
                    ]
                })

        # 4. Crowd Monitoring Alert Trigger
        if person_count >= 10:
            alerts.append({
                "type": "Crowd Monitoring",
                "message": f"Crowd detected: {person_count} individuals congregated in frame.",
                "severity": "Medium" if person_count < 20 else "High"
            })

        # 5. Abandoned Object Heuristic
        # If a bag is detected and there are no persons close to it (Euclidean distance threshold)
        for bx1, by1, bx2, by2 in bags:
            bcx, bcy = (bx1 + bx2) / 2, (by1 + by2) / 2
            is_abandoned = True
            
            # Scan all person boxes
            for box in boxes:
                if int(box.cls[0].item()) == self.PERSON_CLASS:
                    px1, py1, px2, py2 = box.xyxy[0].tolist()
                    pcx, pcy = (px1 + px2) / 2, (py1 + py2) / 2
                    
                    distance = np.sqrt((bcx - pcx) ** 2 + (bcy - pcy) ** 2)
                    # If person is closer than 15% of frame width, bag is not abandoned
                    if distance < (w * 0.15):
                        is_abandoned = False
                        break
            
            if is_abandoned:
                alerts.append({
                    "type": "Abandoned Object",
                    "message": "Unattended bag/backpack identified with no owner in close proximity.",
                    "severity": "High"
                })

        # 6. Suspicious loitering/activity simulation
        # In frame-by-frame, loitering is flag-triggered when multiple people occupy the frame
        if person_count >= 3 and len(vehicles) == 0:
            alerts.append({
                "type": "Suspicious Activity",
                "message": f"Multiple pedestrians loitering in restricted surveillance sector.",
                "severity": "Low"
            })

        return detections, alerts
