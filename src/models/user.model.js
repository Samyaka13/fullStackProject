import mongoose, { Schema } from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
const userSchema = new Schema(
  {
    userName: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true, ///This makes searchable it optimises search//Read about it
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true, /// Index is expensive cannot use everytime
    },
    fullName: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    avatar: {
      type: String,
      required: true,
    },
    coverImage: {
      type: String,
    },
    watchHistory: [
      {
        type: Schema.Types.ObjectId,
        ref: "Video",
      },
    ],
    password: {
      type: String,
      required: [true, "Password is requried"],
    },
    refreshToken: {
      type: String,
    },
  },
  { timestamps: true }
);
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});
userSchema.methods.isPasswordCorrect = async function (password)
 {
 return await bcrypt.compare(password,this.password);
 };
 userSchema.methods.generateAccessToken = function(){
  return jwt.sign({
    _id:this.id,
    email:this.email,
    fullName:this.fullName
  },
process.env.ACCESS_TOKEN_SECRET,
{
  expiresIn : process.env.ACCESS_TOKEN_EXPIRY
} 
)
 }
userSchema.methods.generateRefreshToken = function(){
    return jwt.sign({
      _id:this.id,
    },
    process.env.REFRESH_TOKEN_SECRET,
    {
      expiresIn:  process.env.REFRESH_TOKEN_EXPIRY
    }
  )
}
export const User = mongoose.model("User", userSchema);
///EVerything about refresh token and access token is written here
//Refresh token is saved in dataBase already 