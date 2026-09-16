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