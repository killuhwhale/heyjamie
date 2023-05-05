import { z } from "zod";

import {
  createTRPCRouter,
  publicProcedure,
  protectedProcedure,
} from "../../../server/api/trpc";
import { Configuration, OpenAIApi } from "openai";

import { env } from "../../../env.mjs";
import { TextToSpeechLongAudioSynthesizeClient, TextToSpeechClient, protos } from '@google-cloud/text-to-speech'
import { writeFile } from "fs";
import path from "path";

const configuration = new Configuration({
  organization: "org-t5dP0nOpiguUMjpXABIiyJuq",
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);



export const exampleRouter = createTRPCRouter({
  hello: publicProcedure
    .input(z.object({ text: z.string() }))
    .query(({ input }) => {
      return {
        greeting: `Hello ${input.text}`,
      };
    }),

    openai: protectedProcedure
    .input(z.object({ text: z.string() }))
    .mutation(async ({ input }) => {
      let answer = ""
      if(input.text.length <= 5) return {answer: ''}
      const start = performance.now()

      try{
        // const response = await openai.listEngines();
        const completion = await openai.createChatCompletion({
          model: "gpt-3.5-turbo",
          messages: [{role: "user", content: input.text}],
        });


        if(completion && completion.data && completion.data.choices && completion.data.choices.length > 0){
          answer = completion.data.choices[0]?.message?.content ?? ''
        }

      }catch(error){
        console.log("OpenAI error: ", error)
      }

      const end = performance.now()
      console.log(`ChatGPT took: ${end - start} ms`)
      return {
        answer
      };
    }),

    ttsGCP: protectedProcedure
    .input(z.object({ text: z.string(), voiceName: z.string() }))

    .mutation(async ({ input }) => {

      let gcpRes = null
      if(input.text.length <= 5) return {answer: ''}
      const start = performance.now()

      try{
        const answer = input.text
        console.log('Synthesizing ans: ', answer)
        const client = new TextToSpeechClient()

        const request: protos.google.cloud.texttospeech.v1.SynthesizeSpeechRequest =
             new protos.google.cloud.texttospeech.v1.SynthesizeSpeechRequest({
              voice: {
                 languageCode: 'en-US', name: input.voiceName
                }
             })
        request.input = new protos.google.cloud.texttospeech.v1.SynthesisInput({text: answer})
        const audioConfig = new protos.google.cloud.texttospeech.v1.AudioConfig()
        audioConfig.audioEncoding = "LINEAR16"
        audioConfig.effectsProfileId = ["small-bluetooth-speaker-class-device"]
        audioConfig.pitch = 0
        audioConfig.speakingRate = 1
        request.audioConfig = audioConfig
        gcpRes = await client.synthesizeSpeech(request)
        // console.log("Returning GCP ", gcpRes[0].audioContent)

        if(gcpRes[0].audioContent){
          // writeFile(path.join(`output.mp3`), gcpRes[0].audioContent, () => console.log("Done writing...") )
          const audio: Uint8Array = gcpRes[0].audioContent as Uint8Array
          const base64 = btoa(
            audio
            .reduce((data, byte) => data + String.fromCharCode(byte), '')
            );
          // writeFile(path.join(`base64.txt`), base64, () => console.log("Done writing...") )

          return {
            gcpRes: base64
          };
        }
      }catch(error){
        console.log("GCP error: ", error)
      }

      const end = performance.now()
      console.log(`GCP took: ${end - start} ms`)
      console.log(`GCP: `, gcpRes)
      return {
        gcpRes: null
      };
    }),

  getAll: publicProcedure.query(({ ctx }) => {
    return ctx.prisma.example.findMany();
  }),

  getSecretMessage: protectedProcedure.query(() => {
    return "you can now see this secret message!";
  }),
});
