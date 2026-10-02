import cv2
detector = cv2.FaceDetectorYN.create('models/face_detection_yunet.onnx', '', (320, 320))
detector.setScoreThreshold(0.6)
img = cv2.imread('test_face.jpg')
detector.setInputSize((img.shape[1], img.shape[0]))
ok, faces = detector.detect(img)
print('Rostros detectados:', 0 if faces is None else len(faces))
