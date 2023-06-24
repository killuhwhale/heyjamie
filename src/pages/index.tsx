import { type NextPage } from "next";
import Head from "next/head";
import { signIn, signOut, useSession } from "next-auth/react";
import { api } from "../utils/api";
import { useEffect, useRef, useState } from "react";
import SpeechRecognition, {
  useSpeechRecognition,
} from "react-speech-recognition";
import { env } from "../env.mjs";
import ActionCancelModal from "src/components/ActionCancelModal";

class CancelablePromise<T> extends Promise<T> {
  private cancelFn?: () => void;

  constructor(
    executor: (
      resolve: (value?: T | PromiseLike<T>) => void,
      reject: (reason?: any) => void
    ) => void
  ) {
    super((resolve, reject) => {
      executor((value?: T | PromiseLike<T>) => {
        if (this.cancelFn) {
          reject("Promise canceled");
        } else {
          if (value) resolve(value);
        }
      }, reject);
    });
  }

  public cancel(): void {
    this.cancelFn = () => {
      // Do nothing
    };
  }
}

interface QueryResultProps {
  question: string;
  voiceName: string;
  startListen(): void;
  stopListen(): void;
}

/** To get better voice maybe setup another server for https://github.com/enhuiz/vall-e?ref=blog.paperspace.com */

const QueryResult: React.FC<QueryResultProps> = (props) => {
  const getAnswer = api.example.openai.useMutation();
  const getSpeech = api.example.ttsGCP.useMutation();
  const audioRef = useRef<HTMLAudioElement>();
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    getAnswer.mutate({ text: props.question });
  }, [props.question]);

  useEffect(() => {
    const answer = getAnswer.data?.answer || "";
    if (!answer) return;
    getSpeech.mutate({ text: answer, voiceName: props.voiceName });
    // const sayMsg = async (msgToSpk: string) => {
    //   return new CancelablePromise((res, rej) => {
    //     console.log("useEffect QR: ", msgToSpk)
    //     const msg = new window.SpeechSynthesisUtterance()
    //     const voices = [2,0,3,9]
    //     // const voiceNum  = voices[parseInt((Math.random() * (voices.length - 1)).toString())] || 0
    //     const voiceNum  = props.voice
    //     console.log(`Voice num ${voiceNum}`)

    //     if(voiceNum == undefined) return
    //     msg.voice = window.speechSynthesis.getVoices()[voiceNum] || null
    //     // msg.voice = window.speechSynthesis.getVoices()[2] || null // Aussie gal
    //     // msg.voice = window.speechSynthesis.getVoices()[3] || null // aussie profession dude
    //     // msg.voice = window.speechSynthesis.getVoices()[9] || null // latin accent funny
    //     // msg.voice = window.speechSynthesis.getVoices()[10] || null // asian accent funny
    //     // msg.voice = window.speechSynthesis.getVoices()[11] || null // asian accent accurate

    //     if(!msgToSpk) return console.log("No msg to speak")
    //     msg.text = msgToSpk

    //     window.speechSynthesis.speak(msg)
    //     msg.onend = res
    //     msg.onerror = rej
    //   })
    // }
    // sayMsg("Ohhh, what cha yall gone do now this is a long message to test the stop button it may or may not work? I need a lot of words so lets see if it breaks early or not!").then(() => {""?'':''}).catch(() => {""?'':''})  // test voice, constant speak on render.

    // // SpeechRecognition.stopListening().then(() => {true?"":""}).catch(err => {true?"":""})  // @typescript-eslint/no-empty-function
    // props.stopListen()
    // const sayMessages =  () => {
    //   const ans = getAnswer.data?.answer || ""
    //   // todo split into word chunks
    //   const words = ans.split(" ")
    //   const sentSize = 16
    //   const promises: any[] = []

    //   for(let i =0; i < words.length; i += sentSize){
    //     const wordsToSpk = words.slice(i, i+sentSize)
    //     promises.push(new CancelablePromise ((_res, _rej) => {
    //       // if someRef.current = false then just resolve early...
    //       console.log("In promise stopRef", stopRef)

    //       if(stopRef.current) _res("") // resovle early if stopRef is set.

    //       sayMsg(wordsToSpk.join(" ")).then(() => {
    //         _res("")
    //       }).catch(err => {
    //         console.log("Error sayMsg", err)
    //         _rej()
    //       })

    //     }))

    //   }

    // return new CancelablePromise((res, rej) => {
    //   Promise.all(promises).then(() => {
    //      window.speechSynthesis.cancel()
    //      res("")
    //    })
    //    .catch(err => {
    //      console.log("SayMessages error: ", err)
    //      rej()
    //    })

    //  })
    // }

    // const msgPromise = sayMessages()

    // msgPromise.then(() => {
    //   window.speechSynthesis.cancel()
    //   props.startListen()
    // })
    // .catch(err => {
    //   console.log("Overall saymessages error: ", err)
    // })
  }, [getAnswer.data?.answer]);

  useEffect(() => {
    // console.log("GCP Res ", getSpeech.data?.gcpRes)
    if (!getSpeech.data?.gcpRes) return;
    const rawData = getSpeech.data?.gcpRes;
    if (!rawData) return;

    const raw = window.atob(rawData);
    const rawLength = raw.length;
    const arr = new Uint8Array(new ArrayBuffer(rawLength));

    for (let i = 0; i < rawLength; i++) {
      arr[i] = raw.charCodeAt(i);
    }

    const blob = new Blob([arr], {
      type: "audio/mp3",
    });
    const blobUrl = URL.createObjectURL(blob);
    const audio = new Audio();
    audioRef.current = audio;
    audio.src = blobUrl;
    setPlaying(true);
    props.stopListen();
    console.log("Playing!!!");
    audio
      .play()
      .then(() => console.log("Done playing"))
      .catch((err) => {
        // alert user that they need to interact

        console.log("onPlayerr", err);
      });

    audio.onerror = (err) => {
      console.log("OnAudio Error: ", err);
      alert(err);
    };

    audio.onended = () => {
      setPlaying(false);
      props.startListen();
    };
  }, [getSpeech.data?.gcpRes]);

  useEffect(() => {
    if (playing) {
      audioRef.current
        ?.play()
        .then(() => console.log("Done playing"))
        .catch((err) => console.log("onPlayerr", err));
      props.stopListen();
    } else {
      audioRef.current?.pause();
      props.startListen();
    }
  }, [playing]);

  return (
    <div className="flex w-full justify-center ">
      <h2 className="w-2/3 text-white"> {getAnswer.data?.answer}</h2>

      <button
        className={`w-1/2 p-1  ${
          playing
            ? "bg-rose-600 text-red-100"
            : "bg-emerald-600 text-emerald-100"
        }   `}
        onClick={() => {
          setPlaying(!playing);
        }}
      >
        {playing ? "Stop speaking" : "Play"}
      </button>
    </div>
  );
};

const AudioBox: React.FC = () => {
  const [isListening, setIsListening] = useState(false);
  const [init, setInit] = useState(true);

  const [question, setQuestion] = useState("");
  const [voice, setVoice] = useState("en-US-Neural2-D");

  const [promptA, setPropmptA] =
    useState(`Reply as if you are Jamie Vernon, Joe Rogan's assistant from the Joe Rogan Podcast
  but dont say this in your response unless asked
  who you are or what your name is, this is for fun,
  please play along and do not mention that you are just
  a Large language model because we already know, thanks!
  Please answer:`);

  const [promptB, setPropmptB] =
    useState(`Reply as if you are Domo Arigato the Robot and are an adavanced robotic intelligence
  but dont say this in your response unless asked
  who you are or what your name is, this is for fun,
  please play along and do not mention that you are just
  a Large language model because we already know, thanks!
  Please answer:`);
  const [promptC, setPropmptC] =
    useState(`Reply as if you are a Ph.D therapist named Betty
  but dont say this in your response unless asked
  who you are or what your name is, this is for fun,
  please play along and do not mention that you are just
  a Large language model because we already know, thanks!
  Please answer:`);

  const commands = [
    {
      command: "Hey Jamie *",
      callback: (msg: string) => {
        setQuestion(`${promptA}  ${msg}`);
        setVoice("en-US-Studio-M");
      },
    },
    {
      command: "Hey Jay Vern *",
      callback: (msg: string) => {
        setQuestion(msg);
        setVoice("en-US-Neural2-F");
      },
    },
    {
      command: "Hey JayBird *",
      callback: (msg: string) => {
        setQuestion(msg);
        setVoice("en-US-Neural2-F");
      },
    },
    {
      command: "Hey Jay Bird *",
      callback: (msg: string) => {
        setQuestion(msg);
        setVoice("en-US-Neural2-F");
      },
    },
    {
      command: "Hey Robot *",
      callback: (msg: string) => {
        setQuestion(`${promptB}  ${msg}`);
        setVoice("en-US-News-N");
      },
    },
    {
      command: "A Robot *",
      callback: (msg: string) => {
        setQuestion(`${promptB}  ${msg}`);
        setVoice("en-US-News-N");
      },
    },
    {
      command: "Hey Betty *",
      callback: (msg: string) => {
        setQuestion(`${promptC}  ${msg}`);
        setVoice("en-US-Neural2-C");
      },
    },
  ];

  const {
    transcript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition,
  } = useSpeechRecognition({ commands });

  useEffect(() => {
    if (question.length <= 0) return;
    resetTranscript();
    console.log("Asking ChatGPT for the answer to: ", question);
  }, [question]);

  useEffect(() => {
    try {
      console.log("CLicked", init, isListening, listening);
      if ((listening && isListening) || listening) {
        SpeechRecognition.stopListening()
          .then(() => {
            true ? "" : "";
          })
          .catch((err) => {
            true ? "" : "";
          });
      } else if (!init && !listening) {
        console.log("starting to listen");
        SpeechRecognition.startListening({ continuous: true })
          .then(() => {
            true ? "" : "";
          })
          .catch((err) => {
            console.log("Start listen error: ", err);
          });
      } else if (init) {
        setInit(false);
      }
    } catch (error) {
      console.log("UseEffect error: ", error);
    }
  }, [isListening]);

  return (
    <div className="border-white-400 items-center justify-center border sm:w-[600px] ">
      <h1 className="text-center text-5xl font-extrabold tracking-tight text-white sm:text-[5rem]">
        Jay <span className="text-[hsl(280,100%,70%)]">Ver</span>N
      </h1>

      <div
        className={`${
          listening ? "bg-rose-500" : "bg-slate-600"
        } rounded-full sm:h-[25px] sm:w-[25px]`}
      />
      <button
        id="record-btn"
        className={`color-white mx-auto sm:w-full ${
          isListening ? "bg-rose-500" : "bg-lime-500"
        }`}
        onClick={() => setIsListening(!isListening)}
      >
        {isListening ? "Stop" : "Start"}
      </button>

      <h3 className="text-2xl text-white">{transcript}</h3>
      <QueryResult
        question={question}
        voiceName={voice}
        startListen={() => setIsListening(true)}
        stopListen={() => setIsListening(false)}
      />

      <h5 className="mt-16 text-white">
        Promptless commands: Hey JayVern * | Hey JayBird * | Hey Jay Bird * (all
        Neural)
      </h5>
      <h4 className="mt-16 text-white">Prompt A (Studio) - Hey Jamie *</h4>
      <textarea
        className="h-[200px] w-full bg-emerald-600 p-2 text-white"
        value={promptA}
        onChange={(ev) => setPropmptA(ev.target.value)}
      />
      <h4 className="mt-16 text-white">
        Prompt B (Wavenet) - Hey Robot * | A Robot *
      </h4>
      <textarea
        className="h-[200px] w-full bg-emerald-600 p-2 text-white"
        value={promptB}
        onChange={(ev) => setPropmptB(ev.target.value)}
      />
      <h4 className="mt-16 text-white">Prompt C (Neural) - Hey Betty *</h4>
      <textarea
        className="h-[200px] w-full bg-emerald-600 p-2 text-white"
        value={promptC}
        onChange={(ev) => setPropmptC(ev.target.value)}
      />
    </div>
  );
};

const Home: NextPage = () => {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <>
      <Head>
        <title>Hey Jamie</title>
        <meta
          name="description"
          content="TTS Hey Jamie assistant for podcasts."
        />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-[#2e026d] to-[#15162c]">
        <div className="container flex flex-col items-center justify-center gap-12 px-4 py-16 ">
          <div className="flex flex-col items-center gap-2">
            <AuthShowcase />
          </div>
          <AudioBox />

          <div className="hover:bg-emerald-700 hover:text-white">
            <p className="text-white">Pricing table - (hover below)</p>

            <h2 className="mt-6">
              {`Expected costs: <$10 per month`} $5 DO + $1.50 ChatGPT + $1.50
              GCPTTS
            </h2>

            <h2 className="mt-6">Digital Ocean hosting</h2>
            <h3>$5/ month flat</h3>

            <h2 className="mt-6">GCP Pricing</h2>
            <h3>
              Feature Free per month Price after free usage limit is reached
            </h3>
            <h3>
              Neural2 voices 0 to 1 million bytes $0.000016 USD per byte ($16.00
              USD per 1 million bytes)
            </h3>
            <h3>
              Studio (Preview) voices 0 to 100K bytes $0.00016 USD per byte
              ($160.00 USD per 1 million bytes)
            </h3>
            <h3>
              Standard voices 0 to 4 million characters $0.000004 USD per
              character ($4.00 USD per 1 million characters)
            </h3>
            <h3>
              WaveNet voices 0 to 1 million characters $0.000016 USD per
              character ($16.00 USD per 1 million characters)
            </h3>

            <h2 className="mt-6">ChatGPT Pricing</h2>
            <h3>gpt-3.5-turbo(Using) $0.002 / 1K tokens</h3>
            <h3>{`gpt-4 8K context =>	$0.03 / 1K tokens |	$0.06 / 1K tokens`}</h3>
            <h3>{`gpt-4 32K context =>	$0.06 / 1K tokens |	$0.12 / 1K tokens`}</h3>
            <h3></h3>
            <h3></h3>
          </div>
        </div>
        <ActionCancelModal
          isOpen={isOpen}
          message="Welcome, click OK to continue"
          onAction={() => setIsOpen(false)}
          onClose={() => setIsOpen(false)}
          note="We need your interaction before autoplaying, thanks!"
        />
      </main>
    </>
  );
};

export default Home;

const AuthShowcase: React.FC = () => {
  const { data: sessionData } = useSession();

  const { data: secretMessage } = api.example.getSecretMessage.useQuery(
    undefined, // no input
    { enabled: sessionData?.user !== undefined }
  );

  return (
    <div className="flex flex-col items-center justify-center gap-4">
      <p className="text-center text-2xl text-white">
        {sessionData && <span>Logged in as {sessionData.user?.name}</span>}
        {secretMessage && <span> - {secretMessage}</span>}
      </p>
      <button
        className="rounded-full bg-white/10 px-10 py-3 font-semibold text-white no-underline transition hover:bg-white/20"
        onClick={sessionData ? () => void signOut() : () => void signIn()}
      >
        {sessionData ? "Sign out" : "Sign in"}
      </button>
    </div>
  );
};
