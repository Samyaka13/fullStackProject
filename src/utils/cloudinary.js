import {v2 as cloudinary} from 'cloudinary'
import fs from 'fs' // This is inbuild from NODEJS used for filehandling (Fs= file system)
cloudinary.config({ 
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
    api_key: process.env.CLOUDINARY_API_KEY, 
    api_secret: process.env.CLOUDINARY_API_SECRET
});
//we will first upload the file on our local server than we will go and upload it on cloudinary
const uploadOnCloudinary = async(localFilePath)=>{
    try{
        //along with the file path we can get many other options also that are mentioned inside curley braces
        if(!localFilePath)return null;
        const response = await cloudinary.uploader.upload(localFilePath,{
            resource_type: "auto"
        })
        //file has been uploaded successfully
        console.log("file is uploaded on cloudinary",response.url)  
        //If we print response we will get a lots of information about the resource efg mentioned below 
        // response.url;
        return response.url; 
    }catch(error){
        fs.unlinkSync(localFilePath) // remove the locally saved temporary file as the upload operation got fail
    }
}
export {uploadOnCloudinary}