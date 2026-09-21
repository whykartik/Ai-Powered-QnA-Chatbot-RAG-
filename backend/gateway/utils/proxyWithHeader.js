import proxy from "express-http-proxy"

export const proxyWithHeader = (serviceUrl) => {
    return proxy(serviceUrl, {
        parseReqBody: false,
        reqAsBuffer: true,
        reqBodyEncoding: null,
        limit: "25mb",
        proxyErrorHandler: (error, res, next) => {
            console.error(`[Gateway Proxy Error] Target: ${serviceUrl}`, {
                code: error?.code,
                message: error?.message,
                stack: error?.stack
            })

            if (!res.headersSent) {
                return res.status(502).json({
                    error: "Bad Gateway",
                    message: `Target service at ${serviceUrl} is unreachable or down.`,
                    details: error?.code || error?.message
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

