import React, { useRef } from "react";
import { imageConfig } from "@lib/image";
import ImageCropper from "./ImageCropper";
import { useAuth } from "@contexts/authContext";
import { saveFile } from './actions';

export default function AvatarUpload() {
	const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
	const [error, setError] = React.useState<string | null>(null);
	const [isUploading, setIsUploading] = React.useState(false);
	const fileInputRef = useRef<HTMLInputElement>(null);
	const { user } = useAuth();

	const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0];
		setError(null);

		if (!file) return;

		// Validate file type
		const fileExt = file.name.split(".").pop()?.toLowerCase();
		if (!fileExt || !imageConfig.avatar.validExtensions.includes(fileExt)) {
			setError(
				`Please select a valid image file (${imageConfig.avatar.validExtensions.join(
					", "
				)})`
			);
			return;
		}

		// Validate file size
		const fileSizeInMB = file.size / (1024 * 1024);
		if (fileSizeInMB > imageConfig.avatar.maxSizeInMB) {
			setError(
				`File size must be less than ${imageConfig.avatar.maxSizeInMB}MB`
			);
			return;
		}

		setSelectedFile(file);
	};

	const handleCropComplete = async (croppedBlob: Blob) => {
		try {
			setIsUploading(true);
			setError(null);

			

			
			// Clear the file input
			if (fileInputRef.current) {
				fileInputRef.current.value = "";
			}
			setSelectedFile(null);

			// Instead of reloading the page, we could update the profile context
			// For now, we'll use a reload
			window.location.reload();
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to upload avatar");
		} finally {
			setIsUploading(false);
		}
	};

	const handleCancelCrop = () => {
		setSelectedFile(null);
		if (fileInputRef.current) {
			fileInputRef.current.value = "";
		}
	};

	const handleClick = () => {
		fileInputRef.current?.click();
	};

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept={imageConfig.avatar.validExtensions
          .map((ext) => `.${ext}`)
          .join(",")}
        onChange={handleFileSelect}
        className="hidden"
        aria-label="Upload avatar"
      />

      <button
        onClick={handleClick}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        aria-label="Change avatar"
      />

      {error && (
        <div className="absolute bottom-0 left-0 right-0 bg-red-500 text-white text-xs p-1 text-center">
          {error}
        </div>
      )}

      {isUploading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-60 z-50">
          <div className="w-1/2">
            <div className="h-2 bg-gray-300 rounded">
              <div className="h-2 bg-blue-500 rounded animate-pulse" style={{ width: "100%" }} />
            </div>
            <div className="text-white text-center mt-2">Uploading...</div>
          </div>
        </div>
      )}

      {selectedFile && (
        <ImageCropper
          file={selectedFile}
          onCropComplete={handleCropComplete}
          onCancel={handleCancelCrop}
        />
      )}
    </>
  );
}
