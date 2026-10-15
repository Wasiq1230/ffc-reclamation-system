/**
 * Industrial-grade camera utility for FFC Valve Reclamation Management System.
 * Works seamlessly across mobile devices (Android, iOS), tablets, laptops, and desktop USB webcams.
 */

export async function getCameraStream(preferredFacing: "environment" | "user" = "environment"): Promise<MediaStream> {
  if (typeof window === "undefined" || !navigator?.mediaDevices?.getUserMedia) {
    throw new Error(
      "Camera access is not supported by your browser in this context. " +
      "Please ensure you are accessing via localhost or HTTPS and camera permissions are granted."
    );
  }

  // Tier 1: Try with preferred ideal facingMode and high resolution
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: { ideal: preferredFacing },
        width: { ideal: 1920 },
        height: { ideal: 1080 },
      },
      audio: false,
    });
    return stream;
  } catch (err1) {
    console.warn("Tier 1 camera constraint failed, attempting alternate lens...", err1);
  }

  // Tier 2: Try alternate ideal facingMode without resolution constraints
  try {
    const altFacing = preferredFacing === "environment" ? "user" : "environment";
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: { ideal: altFacing },
      },
      audio: false,
    });
    return stream;
  } catch (err2) {
    console.warn("Tier 2 camera constraint failed, falling back to basic video stream...", err2);
  }

  // Tier 3: Simple video: true (universal fallback for laptop / desktop USB webcams)
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: false,
    });
    return stream;
  } catch (err3: any) {
    console.error("All camera initialization attempts failed:", err3);
    if (err3.name === "NotAllowedError" || err3.name === "PermissionDeniedError") {
      throw new Error("Camera permission was denied. Please allow camera access in your browser site settings.");
    }
    if (err3.name === "NotFoundError" || err3.name === "DevicesNotFoundError") {
      throw new Error("No physical camera device was detected on your device.");
    }
    throw new Error(`Could not access camera (${err3.name || err3.message}). Please use file upload instead.`);
  }
}

export function stopCameraStream(stream: MediaStream | null): void {
  if (!stream) return;
  try {
    stream.getTracks().forEach((track) => {
      try {
        track.stop();
      } catch {}
    });
  } catch {}
}

export function captureVideoFrame(
  video: HTMLVideoElement,
  fileNamePrefix = "valve_capture"
): Promise<{ file: File; dataUrl: string }> {
  return new Promise((resolve, reject) => {
    try {
      if (!video) {
        reject(new Error("Camera video feed is not available."));
        return;
      }

      // Check that the video has actual frame data
      if (video.readyState < 2) {
        reject(new Error("Camera feed is still initializing. Please wait a moment and try again."));
        return;
      }

      const width = video.videoWidth || 1280;
      const height = video.videoHeight || 720;

      if (width <= 0 || height <= 0) {
        reject(new Error("Camera video frame has invalid dimensions. Please try again."));
        return;
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Could not initialize 2D canvas context for camera capture."));
        return;
      }

      ctx.drawImage(video, 0, 0, width, height);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.95);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("Failed to encode camera snapshot into image blob."));
            return;
          }
          const file = new File([blob], `${fileNamePrefix}_${Date.now()}.jpg`, {
            type: "image/jpeg",
            lastModified: Date.now(),
          });
          resolve({ file, dataUrl });
        },
        "image/jpeg",
        0.95
      );
    } catch (err) {
      reject(err);
    }
  });
}
