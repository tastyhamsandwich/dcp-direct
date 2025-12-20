import mongoose, { Schema, Document } from "mongoose";

export interface IEmailVerification extends Document {
  user_id: mongoose.Types.ObjectId;
  new_email: string;
  token: string;
  verified: boolean;
  expires_at: Date;
  created_at: Date;
}

const emailVerificationSchema = new Schema({
  user_id: { type: Schema.Types.ObjectId, ref: "User", required: true },
  new_email: { type: String, required: true },
  token: { type: String, required: true, unique: true },
  verified: { type: Boolean, default: false },
  expires_at: { type: Date, required: true },
  created_at: { type: Date, default: Date.now },
});

emailVerificationSchema.index({ token: 1 });
emailVerificationSchema.index({ user_id: 1 });

export const EmailVerification = mongoose.model<IEmailVerification>(
  "EmailVerification",
  emailVerificationSchema
);
