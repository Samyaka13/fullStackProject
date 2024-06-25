// require('dotenv').config({path:'./env'}) It will run like this also but in order to maintain the consistency of code we can are changing the way of code
import dotenv from 'dotenv'
import connectDB from './db/index.js';
dotenv.config({
  path:'./env'
})



connectDB()



























// const app = express();
// ;(async ()=>{
//     try{
//       await  mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}` );
//       app.on("error",(error)=>{
//         console.log("ERR: ",error);
//         throw error
//       })
//       app.listen(process.env.PORT,()=>{
//         console.log(`App is listening on port ${process.env.PORT}`);
//       })  
//     }catch(error){
//         console.error("Error: " , error)
//         throw error
//     }
// })()