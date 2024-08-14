import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import {
  deleteFromCloudinary,
  uploadOnCloudinary,
} from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponses.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
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
  let coverImagePath;
  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  ) {
    coverImagePath = req.files.coverImage[0].path;
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
  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  ); //In this select method eveyone is by default but only a signle
  if (!createdUser) {
    throw new ApiError(505, "Something went wrong while registering the user");
  }
  return res
    .status(201)
    .json(new ApiResponse(200, createdUser, "User registered succesfully"));
});
const generateAccessTokenAndRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false }); /// All these are MONGODB methods
    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      "Something went wrong while generating refresh and access token "
    );
  }
};
const loginUser = asyncHandler(async (req, res) => {
  //req body -> data
  //username or email
  //find the user
  //password check
  //generate access and refresh token
  //send these tokens in cookies

  const { email, userName, password } = req.body;
  if (!(email || userName)) {
    throw new ApiError(400, "userName or email is requried");
  }
  const user = await User.findOne({
    $or: [{ userName }, { email }],
  });
  if (!user) {
    throw new ApiError(404, "User does not exist");
  }
  const isPasswordCorrect = await user.isPasswordCorrect(password);
  //capital User should not be used it is of moongose and small user is the user instance that we took from the database
  if (!isPasswordCorrect) {
    throw new ApiError(401, "Invalid user credentials");
  }
  const { accessToken, refreshToken } =
    await generateAccessTokenAndRefreshToken(user._id);

  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );
  //now cookies
  const options = {
    //we are defining these options beacuse the cookies are generally modifiable by default so it can be changed from frontend also but when we define the following two options then  the cookies are not modfiable
    httpOnly: true,
    secure: true,
  };
  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedInUser,
          accessToken,
          refreshToken,
        },
        "User logged in successfully "
      )
    );
});
const logOutUser = asyncHandler(async (req, res) => {
  //req.user._id   //we got this user because of the middleware we are using
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        refreshToken: undefined,
      },
    },
    {
      new: true, //this tells me that it will return us the new value instead of old one
    }
  );
  const options = {
    httpOnly: true,
    secure: true,
  };
  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User Logged Out successfully"));
});
const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies.refreshAccessToken || req.body.refreshToken;
  if (!incomingRefreshToken) {
    throw new ApiError(404, "Unauthorized request");
  }
  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );
    const user = await User.findById(decodedToken?._id);
    if (!user) {
      throw new ApiError(401, "Invalid refresh token");
    }
    if (incomingRefreshToken !== user?.refreshToken) {
      throw new ApiError(401, "Refresh token is expired or used");
    }
    const options = {
      httpOnly: true,
      secure: true,
    };
    const { accessToken, newRefreshToken } =
      await generateAccessTokenAndRefreshToken(user._id);
    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .json(
        new ApiResponse(
          200,
          { accessToken, refreshToken: newRefreshToken },
          "Access token refreshed"
        )
      );
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid refresh token");
  }
});
const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  const user = await User.findById(req.user?._id);
  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword); //coz the isPasswordCorrect method a async method then we will be using await
  if (!isPasswordCorrect) {
    throw new ApiError(400, "Invalid old password");
  }
  user.password = newPassword; //here we have setted the passoword but not saved in order to save we have to use the hook(middleware) userSchem.pre in models
  await user.save({ validateBeforeSave: false });
  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password changed successfully"));
});
const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, req.user, "current user fetched successfully"));
});
const updateAccountDetails = asyncHandler(async (req, res) => {
  const { fullName, email } = req.body;
  if (!(fullName || email)) {
    throw new ApiError(400, "All fields are required");
  }
  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        fullName, //these both methods are true
        email: email,
      },
    },
    { new: true }
  ).select("-password"); //this new:true will return the updated information
  return res
    .status(200)
    .json(new ApiResponse(200, user, "Account details updated successfully "));
});
//For updating files good practice will be if we write another controller instead of updating in the controller that is updating text based data
const updateUserAvatar = asyncHandler(async (req, res) => {
  const avatarLocalPath = req.file?.path; //here we used file because we wanted a single file but previously we used files because we wanted two files
  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is missing");
  }
  const avatar = await uploadOnCloudinary(avatarLocalPath);
  if (!avatar.url) {
    throw new ApiError(400, "Error while uploading it on cloudinary");
  }
  const currentUser = await User.findById(req.user?._id);
  const oldAvatar = currentUser.avatar;

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        avatar: avatar.url,
      },
    },
    { new: true }
  ).select("-password");
  if (oldAvatar) {
    await deleteFromCloudinary(oldAvatar);
  }else{
    throw new ApiError(404,"Cannot find the old Avatar file");
  }
  return res
    .status(200)
    .json(new ApiResponse(200, user, "Avatar updated successfully"));
});
const updateUserCoverImage = asyncHandler(async (req, res) => {
  const coverImageLocal = req.file?.path;
  if (!coverImageLocal) {
    throw new ApiError(400, "Cover Image file is missing");
  }
  const coverImage = await uploadOnCloudinary(coverImageLocal);
  if (!coverImage.url) {
    throw new ApiError(400, "Error while uploading coverImage on cloudinary");
  }
  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        coverImage: coverImage.url,
      },
    },
    { new: true }
  ).select("-password");
  return res
    .status(200)
    .json(new ApiResponse(200, user, "Cover Image updated succesfully"));
});
const getUserChannelProfile = asyncHandler(async (req, res) => {
  const { userName } = req.params; // params is extracting from URL
  if (!userName?.trim()) {
    throw new ApiError(400, "User name is missing");
  }
  // User.find({userName})
  // it is checking for the above userName is present in the documents it is shortHand for userName: userName **** well instead of doing this we can directly apply aggregation pipeline
  // ************************** //
  //User.aggregate([{first pipeline},{second pipeline}]) the value we get after using aggregate pipelines that is in arrays
  const channel = await User.aggregate([
    {
      $match: {
        userName: userName?.toLowerCase(), //In this line of code we have selected a document based on the userName
      },
    },
    {
      $lookup: {
        from: "subscriptions", //It should be "Subscription" but acc to MongoDb's nomenclature it became "subscriptions"  all in small and plural
        localField: "_id",
        foreignField: "channel",
        as: "subscribers", //here all the documents are collected
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "subscriber",
        as: "subscribedTo", //here all the documents are collected
      },
    },
    {
      $addFields: {
        subscribersCount: {
          $size: "$subscribers",
        },
        channelsSubscribedToCount: {
          $size: "$subscribedTo",
        },
        isSubscribed: {
          $cond: {
            if: { $in: [req.user?._id, "$subscribers.subscriber"] }, //It will be showing that if the user have subscribed to a particular channel or not
            then: true,
            else: false,
          },
        },
      },
    },
    {
      $project: {
        //This helps us to show only selected values no other values
        fullName: 1,
        userName: 1,
        subscribersCount: 1,
        channelsSubscribedToCount: 1,
        isSubscribed: 1,
        coverImage: 1,
        avatar: 1,
        email: 1,
      },
    },
  ]);
  if (!channel?.length) {
    throw new ApiError(404, "Channel does not exists");
  }
  console.log(channel);

  return res
    .status(200)
    .json(new ApiResponse(200, channel[0], "User channel fetched succesfully"));
});
const getWatchHistory = asyncHandler(async (req, res) => {
  //********req.user_id this statment gives you entire string not just the ID but what User.findByID method automatically converts that string to ID******
  //******We can convert this string to ID if we are not using Moongose*********/
  const user = await User.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(req.user._id),
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "watchHistory",
        foreignField: "_id",
        as: "watchHistory",
        pipeline: [
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "owner", //using pipeline again after this beacause I don't want to show all the data I only want selected fields in my video model from my User model
              pipeline: [
                {
                  $project: {
                    fullName: 1,
                    userName: 1,
                    avatar: 1,
                  },
                },
              ],
            },
          },
          {
            //using this pipeline to order the data that we are populating in the owner field
            $addFields: {
              owner: {
                //overwriting it
                $first: "$owner", //through this we are giving the frontend an object of owner that will help him to get all the values using owner.
              },
            },
          },
        ],
      },
    },
  ]);
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        user[0].watchHistory,
        "watch history fetched successfully"
      )
    );
});
export {
  registerUser,
  loginUser,
  logOutUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateAccountDetails,
  updateUserAvatar,
  updateUserCoverImage,
  getUserChannelProfile,
  getWatchHistory,
};
