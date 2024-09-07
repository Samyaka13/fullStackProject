import { v2 as cloudinary } from "cloudinary";
import fs from "fs"; // This is inbuild from NODEJS used for filehandling (Fs= file system)
import { ApiError } from "./ApiError.js";
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});
//we will first upload the file on our local server than we will go and upload it on cloudinary
const uploadOnCloudinary = async (localFilePath) => {
  try {
    //along with the file path we can get many other options also that are mentioned inside curley braces
    if (!localFilePath) return null;
    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
    });
    //file has been uploaded successfully
    // console.log("file is uploaded on cloudinary",response.url)
    //If we print response we will get a lots of information about the resource efg mentioned below
    // response.url;
    fs.unlinkSync(localFilePath);
    return response;
  } catch (error) {
    fs.unlinkSync(localFilePath); // remove the locally saved temporary file as the upload operation got fail
    console.log(error);
    return null;
  }
};
const deleteFromCloudinary = async (url) => {
  try {
    const publicId = url.split("/").pop().split(".")[0];
    if (!publicId) {
      throw new ApiError(400, "The ID for avatar image is invalid");
    }
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    throw new ApiError(500, "Some error occured");
  }
};
export { uploadOnCloudinary, deleteFromCloudinary };
