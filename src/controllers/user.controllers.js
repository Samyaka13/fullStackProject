import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponses.js";
const registerUser = asyncHandler(async (req, res) => {
  //Get user details from frontend ()
  //validation - not empty
  //check if user is already there:  username,email
  //check for images ,check for avtar then upload it to cloudinary,avtar check
  //create user object-create entry DB
  //remove password and refresh token field from response
  //check for user creation
  //return response
  const { fullName, email, userName, password } = req.body;
  console.log(req.body);
  console.log("email:", email);
  // if(fullName === ""){
  //   throw new ApiError(400,"fullName is required")
  // }
  //The above mentioned way is one way such that individually applying to each parameter
  //Or we can use the method mentioned below
  if (
    [fullName, email, userName, password].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(404, "All fields are required");
  }
  const existedUser = await User.findOne({
    $or: [{ userName }, { email }],
  });
  if (existedUser) {
    throw new ApiError(409, "User with user Name or email exists ");
  }
  //In most of the cases middleware gives us more fields to req
  //req.body => int this body was given by express and here req.file file is given by multer
  // optinallly chainning the fields given by middleware is a goood practice that is why we used the question mark there
  const avatarLocalPath = req.files?.avatar[0]?.path;
  // **************************console.log(req.files)
// const coverImagePath = req.files?.coverImage[0]?.path;
let coverImagePath ;
if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length>0){
  coverImagePath = req.files.coverImage[0].path
}
if (!avatarLocalPath) {
  throw new ApiError(404, "Avatar file is required");
}
const avatar = await uploadOnCloudinary(avatarLocalPath);
const coverImage = await uploadOnCloudinary(coverImagePath);
if (!avatar) {
  throw new ApiError(404, "Avatar file is required");
}
const user = await User.create({
  fullName,
  avatar: avatar.url,
  coverImage: coverImage?.url || "",
  email,
  password,
  userName: userName.toLowerCase(),
});
const createdUser = await   User.findById(user._id).select(
  "-password -refreshToken"
); //In this select method eveyone is by default but only a signle
if (!createdUser) {
  throw new ApiError(505, "Something went wrong while registering the user");
}
return res.status(201).json(
  new ApiResponse(200,createdUser,"User registered succesfully")
)
});
export { registerUser };
