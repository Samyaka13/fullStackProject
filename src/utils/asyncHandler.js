const asyncHandler = (requestHandler) => {
    return (req,res,next)=>{
        Promise.resolve(requestHandler(req,res,next)).catch((err)=> next(err));
    }
};
export { asyncHandler };











////////////////////or we can do this 
// const asyncHandler =  (fn)=> async (req,res,next) =>{
//     try{
//         await fn(req,res,next)
//     }catch(error){
//         res.status(err.code || 500).json({
//             success:false,
//             message:err.message
//         })
//     }
// } //What is this is explained below





// const explain = (func) => {()=>{}}  Explaination