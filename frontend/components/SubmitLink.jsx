import { useEffect, useState } from "react";
import axios from "axios";
import Login from "./Login";
import propsTypes from "prop-types"
import PropTypes from "prop-types";

function SubmitLink() {
    const [data, setData] = useState('')
    const [loading, setLoading] = useState(false)
    const [link1, setLink] = useState('')
    const [reply, setReply] = useState('')

    function separateLettersAndDigits(str) {
        return String(str).replace(/(\\d)/g, ' ');
    }

    async function handleSubmit(e) {
        e.preventDefault()
        console.log(`${link1}`)
        setLoading(true)

        if (`${link1}`) {
            try {
                const res = await axios.post('/api', { link: link1 }, { timeout: 300000 })

                const result = res.data;

                if (result.safe === false) {
                    const flagsMessage = result.flags && result.flags.length > 0 
                        ? ` [Detected: ${result.flags.join(', ')}]` 
                        : "";
                    setReply(`!DANGER!! ${result.reason || "Harmful content detected"}${flagsMessage}. GET BACK TO STUDY.`);
                } else {
                    setReply("Chats are safe.");
                }

            } catch (err) {
                console.log(err);
                setReply("An error occurred while analyzing the link.");
            }
            finally {
                setLoading(false)
            }
        } else {
            setLoading(false)
        }
    }

    return (
        <>
            <form action="/api" method="post" onSubmit={handleSubmit} className="text-white h-screen flex flex-col items-center justify-center gap-6 p-4">
                <div className="flex flex-col items-center gap-4 w-full max-w-2xl">
                    <label className="text-xl md:text-2xl text-blue-300 text-center"> Paste URL link here :</label>
                    <input type="text" name="link" id="lnk" value={link1} onChange={(e) => setLink(e.target.value)} className="w-full max-w-xl mx-auto border-2 border-blue-950 rounded-2xl bg-blue-950 p-3 text-white mask-radial-from-100% required"/> <br />
                    <input type="submit" value={loading ? 'Submitting…' : 'Submit'}
                        className="bg-blue-950 mx-auto text-gray-100 hover:bg-gray-900 rounded-2xl w-full max-w-xs h-12 text-lg transition-all"/>
                </div>
            </form>

            <div className="fixed bottom-10 left-0 right-0 flex justify-center px-4">
                <p className="text-lg md:text-2xl text-sky-400 border-b-4 border-blue-300 pb-4 m-auto text-center max-w-3xl">
                    {reply}
                </p>
            </div>
        </>
    )
}

export default SubmitLink;

