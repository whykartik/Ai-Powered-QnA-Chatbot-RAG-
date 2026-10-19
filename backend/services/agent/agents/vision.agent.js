import { getModel } from "../config/llmModels.js"
import axios from "axios"
import { uploadToS3 } from "../utils/uploadToS3.js"
import { getFromS3 } from "../utils/getFromS3.js"
import { deductCredits } from "../utils/deductCredits.js"
import { checkAgentLimit } from "../config/agentLimit.js"
export const visionAgent=async (state) => {

    try {
        await checkAgentLimit(state.userId,"image")
         const llm=await getModel("image")
    const res=await llm.invoke(`You turn a user's request into a clear prompt for an image generator.

Preserve the request faithfully:
- Keep every named subject, object, action, relationship, setting, and constraint the user specified.
- Describe the exact requested scene first. Do not replace unusual or surreal details with a more conventional scene.
- Do not omit requested elements, and do not invent a different subject or story.
- Make all important subjects and their interaction fully visible in the frame; avoid close crops that hide part of the requested scene.
- Add only visual details that support the request. Do not force photorealism, cinematic lighting, or any other style unless requested.

Return one detailed but concise image prompt, with no preamble or explanation.

User request:
${state.prompt}`)

const prompt=res.content.trim()

const imageUrl=`https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}`

const imageRes=await axios.get(imageUrl,{responseType:"arraybuffer"})
await deductCredits(state.userId,"vision")
const buffer=Buffer.from(imageRes.data)
const filename=`image-${Date.now()}.png`

await uploadToS3(filename,buffer,"image/png")
const downloadUrl=await getFromS3(filename,24*60)

return {
    ...state,
    aiResponse:`
![Generated Image](${downloadUrl})

📥 [Download Image](${downloadUrl})

⏳ Link expires in 10 minutes.`
}
    } catch (error) {
       console.log(error)
         return {
            ...state,
            aiResponse:error?.data?.message || "failed to generate image"
        }
    }
   


}