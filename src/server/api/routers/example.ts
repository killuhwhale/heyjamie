import { z } from "zod";

import {
  createTRPCRouter,
  publicProcedure,
  protectedProcedure,
} from "../../../server/api/trpc";
import { Configuration, OpenAIApi } from "openai";


const configuration = new Configuration({
  organization: "org-t5dP0nOpiguUMjpXABIiyJuq",
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

const cache  = new Set();

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
    .query(async ({ input }) => {
      let answer = ""
      if(input.text.length <= 0 || cache.has(input.text)) return {answer: ''}

      cache.add(input.text)

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

      return {
        answer,
      };
    }),

  getAll: publicProcedure.query(({ ctx }) => {
    return ctx.prisma.example.findMany();
  }),

  getSecretMessage: protectedProcedure.query(() => {
    return "you can now see this secret message!";
  }),
});
