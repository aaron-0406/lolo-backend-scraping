"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteFileBucket = exports.createFolder = exports.readFile = exports.uploadFile = void 0;
const client_s3_1 = require("@aws-sdk/client-s3");
const fs_1 = __importDefault(require("fs"));
const config_1 = __importDefault(require("../config/config"));
const path_1 = __importDefault(require("path"));
const { AWS_BUCKET_REGION, AWS_BUCKET_NAME, AWS_PUBLIC_KEY, AWS_SECRET_KEY } = config_1.default;
const client = new client_s3_1.S3Client({
    region: AWS_BUCKET_REGION,
    credentials: { accessKeyId: AWS_PUBLIC_KEY, secretAccessKey: AWS_SECRET_KEY },
});
const uploadFile = async (file, pathname) => {
    // Reading File
    const stream = fs_1.default.createReadStream(path_1.default.join(__dirname, "../public/docs/", file.filename));
    const uploadParam = {
        Bucket: AWS_BUCKET_NAME,
        Key: `${pathname}/${file.filename}`,
        Body: stream,
    };
    // UPLOAD TO AWS
    const command = new client_s3_1.PutObjectCommand(uploadParam);
    return await client.send(command);
};
exports.uploadFile = uploadFile;
const readFile = async (filename) => {
    const getParam = {
        Bucket: AWS_BUCKET_NAME,
        Key: filename,
    };
    const pathName = filename.split("/");
    const command = new client_s3_1.GetObjectCommand(getParam);
    const result = await client.send(command);
    if (result.Body) {
        const stream = result.Body;
        const newFile = fs_1.default.createWriteStream(path_1.default.join(__dirname, "../public/download", pathName[pathName.length - 1]));
        stream.pipe(newFile);
        let end = new Promise(function (resolve, reject) {
            stream.on("end", () => resolve(stream.read()));
            stream.on("error", reject); // or something like that. might need to close `hash`
        });
        await end;
        return;
    }
};
exports.readFile = readFile;
const createFolder = async (folderName) => {
    const uploadParam = {
        Bucket: AWS_BUCKET_NAME,
        Key: folderName,
    };
    const command = new client_s3_1.PutObjectCommand(uploadParam);
    return await client.send(command);
};
exports.createFolder = createFolder;
const deleteFileBucket = async (fileName) => {
    const commandListParams = {
        Bucket: AWS_BUCKET_NAME,
        Prefix: fileName,
    };
    const commandList = new client_s3_1.ListObjectVersionsCommand(commandListParams);
    await client.send(commandList).then((data) => {
        var _a;
        const latestVersion = (_a = data.Versions) === null || _a === void 0 ? void 0 : _a[0];
        const commandDeleteParam = {
            Bucket: AWS_BUCKET_NAME,
            Key: fileName,
            VersionId: latestVersion === null || latestVersion === void 0 ? void 0 : latestVersion.VersionId,
        };
        const commandDelete = new client_s3_1.DeleteObjectCommand(commandDeleteParam);
        return client.send(commandDelete);
    });
};
exports.deleteFileBucket = deleteFileBucket;
