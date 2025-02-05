import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import crypto from "crypto"

if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
  throw new Error("AWS credentials are not configured")
}

const s3 = new S3Client({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
})

export async function uploadToS3(
  file: File,
  folder: "icons" | "screenshots" | "apps"
): Promise<string> {
  const fileExtension = file.name.split(".").pop()
  const fileName = `${folder}/${crypto.randomUUID()}.${fileExtension}`

  const command = new PutObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET,
    Key: fileName,
    ContentType: file.type,
  })

  // Get a pre-signed URL for uploading
  const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 3600 })

  // Upload the file using the pre-signed URL
  const response = await fetch(uploadUrl, {
    method: "PUT",
    body: file,
    headers: {
      "Content-Type": file.type,
    },
  })

  if (!response.ok) {
    throw new Error("Failed to upload file to S3")
  }

  // Return the public URL of the uploaded file
  return `https://${process.env.AWS_S3_BUCKET}.s3.${
    process.env.AWS_REGION || "us-east-1"
  }.amazonaws.com/${fileName}`
} 