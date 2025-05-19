import React, { useState, useRef } from "react";
import ReactCrop, { type Crop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { imageConfig } from "@lib/image";

interface ImageCropperProps {
	file: File;
	onCropComplete: (croppedBlob: Blob) => void;
	onCancel: () => void;
}

export default function ImageCropper({
	file,
	onCropComplete,
	onCancel,
}: ImageCropperProps) {
  const [imgSrc, setImgSrc] = useState<string>("");
  const imgRef = useRef<HTMLImageElement>(null);
  const [crop, setCrop] = useState<Crop>({
    unit: "%",
    width: 100,
    height: 100,
    x: 0,
    y: 0,
  });

  // Load the image when file is provided
  React.useEffect(() => {
    if (!file) return;

    const reader = new FileReader();
    reader.addEventListener("load", () => {
      setImgSrc(reader.result?.toString() || "");
    });
    reader.readAsDataURL(file);
  }, [file]);

  // Set initial crop in pixels when image loads
  const onImageLoaded = (img: HTMLImageElement) => {
    imgRef.current = img;
    const size = Math.min(img.width, img.height);
    const x = Math.round((img.width - size) / 2);
    const y = Math.round((img.height - size) / 2);
    setCrop({
      unit: "px",
      width: size,
      height: size,
      x,
      y,
    });
    return false; // required by react-image-crop
  };

  // Function to get the cropped image
  const getCroppedImg = async (
    image: HTMLImageElement,
    crop: Crop
  ): Promise<Blob> => {
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;

    // Calculate the actual crop dimensions in the original image
    const cropX = crop.x * scaleX;
    const cropY = crop.y * scaleY;
    const cropWidth = crop.width * scaleX;
    const cropHeight = crop.height * scaleY;

    // Determine the largest possible square size (max 500)
    const maxOutputSize = imageConfig.avatar.width; // 500
    const outputSize = Math.min(
      maxOutputSize,
      Math.floor(Math.min(cropWidth, cropHeight))
    );

    // Set canvas size to outputSize x outputSize
    const canvas = document.createElement("canvas");
    canvas.width = outputSize;
    canvas.height = outputSize;

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("No 2d context");
    }

    ctx.imageSmoothingQuality = "high";

    // Draw the cropped image, scaling to outputSize
    ctx.drawImage(
      image,
      cropX,
      cropY,
      cropWidth, // source width (actual crop size in original image)
      cropHeight, // source height
      0,
      0,
      outputSize, // dest width (canvas)
      outputSize // dest height (canvas)
    );

    // Convert canvas to blob
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("Canvas is empty"));
            return;
          }
          resolve(blob);
        },
        imageConfig.avatar.contentType,
        1 // Quality
      );
    });
  };

  const handleCropComplete = async () => {
    if (!imgRef.current || !crop.width || !crop.height) return;

    try {
      const croppedBlob = await getCroppedImg(imgRef.current, crop);

      // Create a File from the Blob with PNG extension
      const timestamp = Date.now();
      const filename = `avatar-${timestamp}.png`;
      const file = new File([croppedBlob], filename, {
        type: imageConfig.avatar.contentType,
      });

      // Create FormData
      const formData = new FormData();
      formData.append("avatar", file);

      // Upload via server action
      const response = await fetch("/api/upload/avatar", {
        method: "POST",
        body: formData,
      });
      const data = (await response.json()) as {
        success: boolean;
        filename?: string;
        message?: string;
      };

      if (!data.success) {
        throw new Error(data.message || "Failed to upload avatar");
      }

      const avatarFilename = data.filename;

      onCropComplete(croppedBlob);
    } catch (error) {
      console.error("Error cropping image:", error);
    }
  };

  if (!imgSrc) {
    return <div>Loading...</div>;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-slate-700 rounded-lg p-6 max-w-2xl w-full">
        <h3 className="text-lg font-semibold mb-4">Crop Your Avatar</h3>
        <div className="mb-4">
          <ReactCrop
            crop={crop}
            onChange={(c) => setCrop(c)}
            aspect={1}
            circularCrop
          >
            <img
              ref={imgRef}
              src={imgSrc}
              alt="Crop me"
              className="max-h-[60vh] w-auto"
            />
          </ReactCrop>
        </div>
        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-slate-300 hover:text-slate-400"
          >
            Cancel
          </button>
          <button
            onClick={handleCropComplete}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}
