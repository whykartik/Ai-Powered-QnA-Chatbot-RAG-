import redis from "../../shared/redis/redis.js"

const protect=async (req,res,next) => {
    try {
        const sessionId=req.cookies?.session
        if(!sessionId){
            return res.status(401).json({message:"unauthorized"})
        }
        const session=await redis.get(`session-${sessionId}`)
        if(!session){
            return res.status(401).json({message:"session expired"})
        }
        req.user=JSON.parse(session)
        next()
       
    } catch (error) {
        return res.status(500).json({message:`protect error ${error?.message || error}`})
    }
}

export const optionalAuth = async (req, res, next) => {
    try {
        const sessionId = req.cookies?.session
        if (!sessionId) {
            return next()
        }

        const session = await redis.get(`session-${sessionId}`)
        if (session) {
            req.user = JSON.parse(session)
        }
        return next()
    } catch (error) {
        return res.status(500).json({ message: `session lookup error ${error?.message || error}` })
    }
}

export default protect