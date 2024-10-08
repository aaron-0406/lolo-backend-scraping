import dotenv from "dotenv";

dotenv.config();

const config = {
  env: process.env.NODE_ENV || "dev",
  port: process.env.PORT || 5000,
  dbUser: process.env.DB_USER || "",
  dbPassword: process.env.DB_PASSWORD || "",
  dbHost: process.env.DB_HOST,
  dbName: process.env.DB_NAME,
  dbPort: process.env.DB_PORT,
  AWS_BUCKET_NAME: process.env.AWS_BUCKET_NAME,
  AWS_BUCKET_REGION: process.env.AWS_BUCKET_REGION,
  AWS_PUBLIC_KEY: `${process.env.AWS_PUBLIC_KEY}`,
  AWS_SECRET_KEY: `${process.env.AWS_SECRET_KEY}`,
  AWS_CHB_PATH: "CHB/",
  AWS_PLANTILLA_PATH: "PLANTILLAS/",
  AWS_EMAIL: `${process.env.AWS_EMAIL}`,
  AWS_EMAIL_USER: `${process.env.AWS_EMAIL_USER}`,
  AWS_EMAIL_HOST: `${process.env.AWS_EMAIL_HOST}`,
  AWS_EMAIL_PASSWORD: `${process.env.AWS_EMAIL_PASSWORD}`,
  jwtSecret: `${process.env.JWT_SECRET}`,
};

export default config;
