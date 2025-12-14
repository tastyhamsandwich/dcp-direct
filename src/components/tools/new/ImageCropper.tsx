import { useState, useRef } from "react";
import NextImage from "next/image";
import ReactCrop, { type Crop, makeAspectCrop, centerCrop, convertToPixelCrop } from "react-image-crop";
import setCanvasPreview from "./setCanvasPreview";
import { imageConfig } from "@lib/image";

const ASPECT_RATIO = 1;
const MIN_DIMENSION = 150;
const ImageCropper = ({closeModal, updateAvatar}) => {

	const imgRef = useRef<HTMLImageElement>(null);
	const previewCanvasRef = useRef<HTMLCanvasElement>(null);
	const fileSelectRef = useRef<HTMLInputElement>(null);
	const [imgSrc, setImgSrc] = useState<string>("");
	const [crop, setCrop] = useState<Crop>({
		unit: "%",
		x: 25,
		y: 25,
		width: 50,
		height: 50,
	});
	const [error, setError] = useState<string>("");


	const onSelectFile = (e) => {
		const file = e.target.files?.[0];
		if (!file) return;
	
		const reader = new FileReader();
			
		reader.addEventListener("load", () => {
			const imageElement = new Image();
			const imageUrl = reader.result?.toString() || "";
			imageElement.src = imageUrl;

			imageElement.addEventListener("load", () => {
				if (error) setError("");
				const { naturalWidth, naturalHeight } = imageElement;
				if (naturalWidth < MIN_DIMENSION || naturalHeight < MIN_DIMENSION) {
					setError("Image must be at least 150x150 pixels.");
					return setImgSrc("");
				}
			});

			setImgSrc(imageUrl);
		});
		reader.readAsDataURL(file);
	};

	const onImageLoad = (e) => {
		const { width, height } = e.currentTarget;
		const cropWidthInPercent = (MIN_DIMENSION / width) * 100;
		
		const crop = makeAspectCrop(
			{
				unit: "%",
				width: cropWidthInPercent,
			}, ASPECT_RATIO,
			width, 
			height
		);
		const centeredCrop = centerCrop(crop, width, height);
		setCrop(centeredCrop);
	}

	return (
		<>
			<label className="block mb3 w-fit">
				<span className="sr-only">Choose Avatar</span>
				<input
					type="file"
					ref={fileSelectRef}
					accept="image/*"
					className="absolute right-[9999px]"
					onChange={onSelectFile}
				/>
				<button
					className="block w-full text-sm text-slate-500
						file:mr-4 file:py-1 file:px-2
						file:rounded-full file:border-0
						file:text-xs file:font-semibold
						file:bg-violet-50 file:text-violet-700
						hover:file:bg-violet-100"
					onClick={() => {
						fileSelectRef.current?.click();
					}}
				>
					Upload Image
				</button>
			</label>
			{error && <p className="text-red-400 text-xs">{error}</p>}
			{imgSrc && (
				<div className="flex flex-col items-center">
					<ReactCrop
						crop={crop}
						onChange={(pixelCrop, percentCrop) => setCrop(percentCrop)}
						circularCrop
						keepSelection
						aspect={ASPECT_RATIO}
						minWidth={MIN_DIMENSION}
					>
						<NextImage
							ref={imgRef}
							src={imgSrc}
							alt="Upload"
							style={{ maxHeight: "70vh" }}
							onLoad={onImageLoad}
						/>
					</ReactCrop>
					<button
						className="text-white font-mono ext-xs py-2 px-4 rounded-2xl mt-4 bg-sky-500 hover:bg-sky-600"
						onClick={() => {
							if (imgRef.current && previewCanvasRef.current) {
								setCanvasPreview(
									imgRef.current,
									previewCanvasRef.current,
									convertToPixelCrop(
										crop,
										imgRef.current.width,
										imgRef.current.height
									)
								);
								updateAvatar(previewCanvasRef.current.toDataURL());
								closeModal();
							}
						}}
					>
						Confirm
					</button>
				</div>
			)}
			{crop && (
				<canvas
					className="mt-4"
					ref={previewCanvasRef}
					style={{
						border: "1px solid black",
						display: "none",
						objectFit: "contain",
						width: "150",
						height: "150",
					}}
				/>
			)}
		</>
	);
};

export default ImageCropper;