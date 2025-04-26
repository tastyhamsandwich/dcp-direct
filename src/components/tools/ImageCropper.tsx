import React, { useState, useRef } from 'react';
import ReactCrop, { makeAspectCrop, centerCrop, type Crop, convertToPixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { imageConfig } from '@lib/image';
import { Autour_One } from 'next/font/google';

const ASPECT_RATIO = 1;
const MIN_DIMENSION = 100;

interface ImageCropperProps {
  file: File;
  onCropComplete: (croppedBlob: Blob) => void;
  onCancel: () => void;
}

const ImageCropper: React.FC<ImageCropperProps> = ({ file, onCropComplete, onCancel }) => {
  const [imgSrc, setImgSrc] = useState<string>('');
  const [error, setError] = useState('');
  const imgRef = useRef<HTMLImageElement>(null);
  const [crop, setCrop] = useState<Crop>({
    unit: '%',
    width: 100,
    height: 100,
    x: 0,
    y: 0
  });

  const onSelectFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.addEventListener('load', () => {
      const imageElement = new Image();
      const imageUrl = reader.result?.toString() || "";
      imageElement.src = imageUrl;
      imageElement.addEventListener('load', (e) => {
        const { naturalWidth, naturalHeight } = e.currentTarget as HTMLImageElement;
        if (naturalWidth < MIN_DIMENSION || naturalHeight < MIN_DIMENSION) {
          setError("Image must be at least 150x150 pixels.");
          return setImgSrc("");  
        }
      });

      setImgSrc(imageUrl);
    });

    reader.readAsDataURL(file);
  }

  const onImageLoad = (e) => {
    const { width, height } = e.currentTarget;

    const crop = makeAspectCrop(
      {
        unit: "%",
        width: 25 //MIN_DIMENSION,
      }, 
      ASPECT_RATIO,
      width,
      height
    );
    const centeredCrop = centerCrop(crop, width, height)
    setCrop(centeredCrop);
  }
  /* Load the image when file is provided
  React.useEffect(() => {
    if (!file) return;
    
    const reader = new FileReader();
    reader.addEventListener('load', () => {
      setImgSrc(reader.result?.toString() || '');
    });
    reader.readAsDataURL(file);
  }, [file]);*/

  // Function to get the cropped image
  const getCroppedImg = async (image: HTMLImageElement, crop: Crop): Promise<Blob> => {
    const canvas = document.createElement('canvas');
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    const pixelRatio = window.devicePixelRatio;
    
    // Set canvas size to match our config dimensions
    canvas.width = imageConfig.avatar.width;
    canvas.height = imageConfig.avatar.height;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('No 2d context');
    }

    // Set the canvas transform for high DPI displays
    ctx.scale(pixelRatio, pixelRatio);
    ctx.imageSmoothingQuality = 'high';

    // Calculate the actual crop dimensions
    const cropX = crop.x * scaleX;
    const cropY = crop.y * scaleY;
    const cropWidth = crop.width * scaleX;
    const cropHeight = crop.height * scaleY;

    // Draw the cropped image
    ctx.drawImage(
      image,
      cropX,
      cropY,
      cropWidth,
      cropHeight,
      0,
      0,
      imageConfig.avatar.width,
      imageConfig.avatar.height
    );

    // Convert canvas to blob
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Canvas is empty'));
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
      onCropComplete(croppedBlob);
    } catch (error) {
      console.error('Error cropping image:', error);
    }
  };

  if (!imgSrc) {
    return <div>Loading...</div>;
  }

  
    /*
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full">
              <h3 className="text-lg font-semibold mb-4">Crop Your Avatar</h3>
              <div className="mb-4">*/
  return (
    <>
      <label className="block mb-3 w-fit">
        <span className="sr-only">Choose profile picture</span>
        <input type="file"
          accept="image/*"
          onChange={onSelectFile}
          className="block w-full text-sm text-slate-500 file:mr-4 file:py-1 file:px-2 file:rounded-full file:border-0 file:text-xs file:bg-gray-700 file:text-sky-300 hover:file:bg-gray-600"
        />
      </label>
      { error && <p className="text-red-400 text-xs">{error}</p> }
      {imgSrc && (
        <div className="flex flex-col items-center">
          <ReactCrop
            crop={crop}
            onChange={(pixelCrop, percentCrop) => setCrop(percentCrop)}
            aspect={ASPECT_RATIO}
            circularCrop
            keepSelection
            minWidth={MIN_DIMENSION}
          >
            <img
                src={imgSrc}
                alt="Uploaded Image"
                style={{ maxHeight: "70%", width: "auto" }}
                onLoad={onImageLoad}
            />
          </ReactCrop>
        </div>
      )}
      <div className="flex justify-end gap-2">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-gray-600 hover:text-gray-800"
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
    </>
  );
}

export default ImageCropper;