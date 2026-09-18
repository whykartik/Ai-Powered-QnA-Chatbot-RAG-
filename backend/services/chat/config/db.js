import mongoose from "mongoose"

const connectDb=async ()=>{
    if (!process.env.MONGODB_URI) {
       throw new Error("MONGODB_URI is not configured")
    }

    await mongoose.connect(process.env.MONGODB_URI, {
       serverSelectionTimeoutMS: 10000
    })
    console.log("db connected")
}

export default connectDb
