import { type NextPage } from "next";
import Head from "next/head";
import Link from "next/link";
import { signIn, signOut, useSession } from "next-auth/react";

import { api } from "../utils/api";
import { useEffect, useState } from "react";
import SpeechRecognition, { useSpeechRecognition, } from 'react-speech-recognition';




interface QueryResultProps {
  question: string;
  startListen(): void;
  stopListen(): void;
}

const QueryResult: React.FC<QueryResultProps> = (props) => {
  const getAnswer = api.example.openai.useQuery({text: props.question});

  useEffect(() => {
    const answer = getAnswer.data?.answer || ""

    if(!answer) return

    SpeechRecognition.stopListening().then(() => {true?"":""}).catch(err => {true?"":""})  // @typescript-eslint/no-empty-function
    props.stopListen()

    const sayMsg = async (msgToSpk: string) => {
      return new Promise((res, rej) => {
        console.log("useEffect QR: ", msgToSpk)
        const msg = new window.SpeechSynthesisUtterance()
        if(!msgToSpk) return
        msg.text = msgToSpk

        window.speechSynthesis.speak(msg)
        msg.onend = res
        msg.onerror = rej
      })
    }


    const sayMessages = async () => {
      return new Promise((resolve, reject) => {
        const ans = getAnswer.data?.answer || ""
        // todo split into word chunks
        const words = ans.split(" ")
        const sentSize = 18
        const promises = []

        for(let i =0; i < words.length; i += sentSize){
          const wordsToSpk = words.slice(i, i+sentSize)
          promises.push(new Promise ((_res, _rej) => {
            sayMsg(wordsToSpk.join(" ")).then(() => {
              _res("")
            }).catch(err => {
              console.log("Error sayMsg", err)
              _rej()
            })

          }))


        }

       Promise.all(promises).then(() => {
          window.speechSynthesis.cancel()
          resolve("")
        })
        .catch(err => {
          console.log("SayMessages error: ", err)
          reject()
        })

      })
    }

    sayMessages().then(() => {
      window.speechSynthesis.cancel()
      props.startListen()
    })
    .catch(err => {
      console.log("Overall saymessages error: ", err)
    })



  }, [getAnswer.data?.answer])
  return (
    <h2 className="text-white"> {getAnswer.data?.answer}</h2>
  )
}



const AudioBox: React.FC = () => {
  const [isListening, setIsListening] = useState(false);
  const [init, setInit] = useState(true);

  const [question, setQuestion] = useState("")

  const commands = [
    {
      command: 'Hey Jamie *',
      callback: (msg: string) => setQuestion(msg)
    },
  ]

  const {
    transcript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition
  } = useSpeechRecognition({commands});

  useEffect(() => {
    if(question.length <= 0) return
    resetTranscript()
    console.log("Asking ChatGPT for the answer to: ", question)
  }, [question])


  useEffect(() => {
    console.log("CLicked", init, isListening, listening)
    if((listening && isListening) || listening){
      SpeechRecognition.stopListening().then(() => {true?"":""}).catch(err => {true?"":""})
    }else if(!init && !listening ){
      console.log("starting to listen")
      SpeechRecognition.startListening({continuous: true}).then(() => {true?"":""}).catch(err => {true?"":""})
    }else if(init){
      setInit(false)
    }
  }, [isListening])

  return (
    <div className="sm:w-[600px] items-center justify-center border border-white-400 sm:h-[600px]">
      <h1 className="text-5xl font-extrabold tracking-tight text-white sm:text-[5rem] text-center">
            Jay <span className="text-[hsl(280,100%,70%)]">Ver</span>N
      </h1>

      <div className={`${listening? "bg-rose-500":"bg-slate-600"} rounded-full sm:w-[25px] sm:h-[25px]`}/>
      <button
         id="record-btn"
         className={`sm:w-full mx-auto color-white ${isListening  ? "bg-rose-500":"bg-lime-500"}`}
         onClick={()=>setIsListening(!isListening)}>
            {isListening? "Stop": 'Start'}
      </button>

      <h3 className="text-white text-2xl">{transcript}</h3>

      <QueryResult
        question={question}
        startListen={() => setIsListening(true)}
        stopListen={() => setIsListening(false)}

      />
    </div>
  )
}


const Home: NextPage = () => {
  const hello = api.example.hello.useQuery({ text: "from tRPC" });

  return (
    <>
      <Head>
        <title>Create T3 App</title>
        <meta name="description" content="TTS Hey Jamie assistant for podcasts." />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-[#2e026d] to-[#15162c]">
        <div className="container flex flex-col items-center justify-center gap-12 px-4 py-16 ">
          <div className="flex flex-col items-center gap-2">
            <AuthShowcase />
          </div>
          <AudioBox />
        </div>
      </main>
    </>
  );
};

export default Home;

const AuthShowcase: React.FC = () => {
  const { data: sessionData } = useSession();

  const { data: secretMessage } = api.example.getSecretMessage.useQuery(
    undefined, // no input
    { enabled: sessionData?.user !== undefined },
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
