import { z } from "zod";

import {
  createTRPCRouter,
  publicProcedure,
  protectedProcedure,
} from "../../../server/api/trpc";
import { Configuration, OpenAIApi } from "openai";

import { env } from "../../../env.mjs";
import {
  TextToSpeechLongAudioSynthesizeClient,
  TextToSpeechClient,
  protos,
} from "@google-cloud/text-to-speech";
import { writeFile, appendFile, readFile, unlink } from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { spawn } from "child_process";

const configuration = new Configuration({
  organization: "org-t5dP0nOpiguUMjpXABIiyJuq",
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

// const ffmpeg = require("../../../ffmpeg-mp4");
// import ffmpeg from "./ffmpeg.js"

const executeFFmpegCommand = (fileNameList: string, audioID: string) => {
  return new Promise((res, rej) => {
    const cmd = "ffmpeg";
    // ffmpeg -i "concat:file1.mp3|file2.mp3" -acodec copy output.mp3
    // ffmpeg -f concat -safe 0 -i filenames.txt -c copy output.wav

    const args = [
      "-f",
      "concat",
      "-safe",
      "0",
      "-i",
      fileNameList,
      "-c",
      "copy",
      path.join(`${audioID}_output.wav`),
    ];

    const ffmpeg = spawn(cmd, args);

    ffmpeg.stdout.on("data", (data: string) => {
      console.log(`stdout: ${data}`);
    });

    ffmpeg.stderr.on("data", (data: string) => {
      console.error(`stderr: ${data}`);
    });

    ffmpeg.on("close", (code) => {
      if (code !== 0) {
        console.log(`ffmpeg process exited with code ${code ?? 1}`);
        rej();
      } else {
        res("");
        console.log("ffmpeg process completed successfully");
      }
    });
  });
};
function rmFiles(filenames: string[]) {
  filenames.forEach((file) => {
    unlink(file, (err) => {
      if (err) {
        console.error(`Error deleting ${file}:`, err.message);
      } else {
        console.log(`Deleted ${file}`);
      }
    });
  });
}

/**
 *
 * @param text The full text to split
 * @param start the starting point in the text to search
 * @param end the end point to consider
 *
 * getLastGoodIdx will find the index near 'end' that lands on the end of a word.
 *
 * For example, the following sentence would be split up like so if our limit for 9 chars.
 * * I want some chicken soup is hot
 *    - I want (start=0, end=9) return 6
 *    - some (start=6, end=15) return 11
 *    - chicken (start=11, end=20) return 6
 *    - soup is
 *    - hot
 *
 */
function getLastGoodIdx(text: string, start: number, end: number): number {
  if (end >= text.length - 1) return text.length;

  let lgi = end;
  while (lgi > start && text[lgi] !== " ") {
    lgi -= 1;
  }
  return lgi;
}

const getMultiAudio = (
  fullAnswer: string,
  voiceName: string
): Promise<string> => {
  return new Promise<string>((res, rej) => {
    (async () => {
      const audioID: string = uuidv4();
      const client = new TextToSpeechClient();
      let gcpRes = null;
      const request: protos.google.cloud.texttospeech.v1.SynthesizeSpeechRequest =
        new protos.google.cloud.texttospeech.v1.SynthesizeSpeechRequest({
          voice: {
            languageCode: "en-US",
            name: voiceName,
          },
        });
      const audioConfig = new protos.google.cloud.texttospeech.v1.AudioConfig();
      audioConfig.audioEncoding = "LINEAR16";
      audioConfig.effectsProfileId = ["small-bluetooth-speaker-class-device"];
      audioConfig.pitch = 0;
      audioConfig.speakingRate = 1;
      request.audioConfig = audioConfig;

      const CHLEN = 600; // char length
      console.log("Requesting multiple... ");
      const filenames = [] as string[];

      // I want to maintain the word but limit to a 1000 char size
      /**
       *  1. Split into words = ['I', "want", "some", "chicken", "soup", "is", "hot"]
       *  2. Lets say we want to split into 9 chars.
       *  3. I need to create:
       *
       *  A. I want
       *  B. want
       *  C. some
       *  D.
       *
       * Cant use words becase we need to account for spaces as well. Might as well seach through string. with while i < j loop
       *
       * I want some chicken soup is hot
       *
       * 1. Lets say we want to split into 9 chars.
       * 2. 'I want so'
       *    - we cant take all of 'some' so we will find the index where we get the last word
       *    - we will get 'I want' => 6 return length
       *
       * 3. Then we would end up with segments like:
       * I want some chicken soup is hot
       *    - I want
       *    - some
       *    - chicken
       *    - soup is
       *    - hot
       *
       *
       */
      let i = 0;
      let j = CHLEN;
      // const words = fullAnswer.split(" ");
      // for (let i = 0; i < words.length; i += CHLEN) {
      while (i < fullAnswer.length) {
        // const substr = fullAnswer.substring(i, i + CHLEN);
        const z = getLastGoodIdx(fullAnswer, i, j);
        j = z; // update range with the proper index
        const substr = fullAnswer.substring(i, z);

        console.log("Translating: ", substr.length, substr);
        request.input = new protos.google.cloud.texttospeech.v1.SynthesisInput({
          text: substr,
        });

        gcpRes = await client.synthesizeSpeech(request);
        console.log("gcpRes: ", gcpRes);
        if (gcpRes[0].audioContent) {
          const audio: Uint8Array = gcpRes[0].audioContent as Uint8Array;

          const filename = path.join(process.cwd(), `${audioID}_${i}.wav`);
          writeFile(path.join(filename), audio, () =>
            console.log("Done writing audio segment...")
          );
          filenames.push(filename);
          console.log("Wrote wav segment: ", filename);
        }

        i = j;
        j += CHLEN;
      }

      // Write file names so FFMPEG can use as arg
      const fileNameList = filenames
        .map((fn: string) => {
          return `file '${fn}'\n`;
        })
        .join("");

      const files = `${audioID}_files.txt`;
      writeFile(files, fileNameList, (err) => {
        console.log("Done writing fileNameList: ", err);
        if (err) {
          rej();
          return;
        }
      });

      try {
        await executeFFmpegCommand(files, audioID);
      } catch (err) {
        rej();
        return;
      }

      let outputData: string;
      // Read output file and convert to base64
      readFile(path.join(`${audioID}_output.wav`), (err, data: Uint8Array) => {
        if (err) {
          rej();
          return;
        }

        outputData = btoa(
          data.reduce((data, byte) => data + String.fromCharCode(byte), "")
        );

        rmFiles([...filenames, path.join(`${audioID}_output.wav`), files]);
        res(outputData);
      });
    })().catch(rej); // immediately invoked function expression (IIFE) for async operations
  });
};
function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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
      let answer = "";
      let errMsg = "";
      if (input.text.length <= 5) return { answer: "" };
      const start = performance.now();

      try {
        // const response = await openai.listEngines();
        console.log("ASKING: ", input.text);
        const completion = await openai.createChatCompletion({
          model: "gpt-3.5-turbo",
          messages: [{ role: "user", content: input.text }],
        });

        if (
          completion &&
          completion.data &&
          completion.data.choices &&
          completion.data.choices.length > 0
        ) {
          answer = completion.data.choices[0]?.message?.content ?? "";
        }
      } catch (error: any) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        const errObj = error.toJSON();
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/restrict-template-expressions
        errMsg = `${errObj["status"]} - ${errObj["message"]}`;
        console.log("OpenAI error: ", errMsg);
      }

      const end = performance.now();
      console.log(`ChatGPT took: ${end - start} ms`);
      return {
        answer,
        error: errMsg,
      };
    }),

  ttsGCP: protectedProcedure
    .input(z.object({ text: z.string(), voiceName: z.string() }))
    .mutation(async ({ input }) => {
      if (input.text.length <= 5) return { answer: "" };
      const start = performance.now();
      try {
        const answer = input.text;
        console.log("Synthesizing ans: ", answer);
        // TODO() Splits text into at least 5k byte chunks. lets limit to 2k char chunks 1 char = 2 bytes
        const stringData = await getMultiAudio(answer, input.voiceName);
        const end = performance.now();
        console.log(`GCP took: ${end - start} ms`);

        return {
          gcpRes: stringData,
        };
      } catch (error) {
        console.log("GCP error: ", error);
      }

      return {
        gcpRes: null,
      };
    }),

  getAll: publicProcedure.query(({ ctx }) => {
    return ctx.prisma.example.findMany();
  }),

  getSecretMessage: protectedProcedure.query(() => {
    return "you can now see this secret message!";
  }),
});
