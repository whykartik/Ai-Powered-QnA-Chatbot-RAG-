import proxy from "express-http-proxy"

export const proxyWithHeader = (serviceUrl) => {
    return proxy(serviceUrl, {
        parseReqBody: false,
        reqAsBuffer: true,
        reqBodyEncoding: null,
        limit: "25mb",
        proxyErrorHandler: (error, res, next) => {
            console.error("proxy request failed", {
                serviceUrl,
                code: error?.code,
                message: error?.message
            })

            // A connection/DNS failure to a microservice must be reported as a
            // gateway failure, rather than passing an unhelpful Express error
            // page back to the frontend.
            if (!res.headersSent) {
                return res.status(502).json({
                    message: "The requested service is temporarily unavailable. Please try again shortly."
                })
            }

            next(error)
        },
        proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
            if (srcReq.user) {
                proxyReqOpts.headers["x-user-id"] = srcReq.user.userId
            }
            return proxyReqOpts
        }
    })
}
