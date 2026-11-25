import { useState } from "react";
import api from "../src/api";

function SubmitLink() {
    const [loading, setLoading] = useState(false)
    const [link1, setLink] = useState('')
    const [reply, setReply] = useState('')
    const [flags, setFlags] = useState([])
    const [status, setStatus] = useState('')

    function waitForJob(jobId) {
        return new Promise((resolve, reject) => {
            let attempts = 0

            const timer = setInterval(async () => {
                attempts += 1

                try {
                    const { data } = await api.get(`/api/jobs/${jobId}`)

                    if (data.status === 'done') {
                        clearInterval(timer)
                        resolve(data.result)
                    } else if (data.status === 'error') {
                        clearInterval(timer)
                        reject(new Error(data.error || 'Analysis failed'))
                    }
                } catch (err) {
                    if (err.response?.status === 404) {
                        clearInterval(timer)
                        reject(new Error('This job expired. Please submit the link again.'))
                    }
                }

                if (attempts > 90) {
                    clearInterval(timer)
                    reject(new Error('Timed out waiting for the analysis.'))
                }
            }, 2000)
        })
    }

    async function handleSubmit(e) {
        e.preventDefault()

        if (!link1) return

        setLoading(true)
        setReply('')
        setFlags([])
        setStatus('Scraping the page and analysing the chat… this can take up to a minute.')

        try {
            const { data } = await api.post('/api', { link: link1 })
            const result = await waitForJob(data.jobId)

            setFlags(result.flags || [])

            if (result.safe === false) {
                setReply(`!DANGER!! ${result.reason || 'Harmful content detected'}`)
            } else {
                setReply('Chats are safe.')
            }
        } catch (err) {
            setReply(err.message || 'An error occurred while analysing the link.')
        } finally {
            setStatus('')
            setLoading(false)
        }
    }

    return (
        <>
            <form action="/api" method="post" onSubmit={handleSubmit} className="text-white h-screen flex flex-col items-center justify-center gap-6 p-4">
                <div className="flex flex-col items-center gap-4 w-full max-w-2xl">
                    <label className="text-xl md:text-2xl text-blue-300 text-center"> Paste URL link here :</label>
                    <input type="text" name="link" id="lnk" value={link1} onChange={(e) => setLink(e.target.value)} className="w-full max-w-xl mx-auto border-2 border-blue-950 rounded-2xl bg-blue-950 p-3 text-white mask-radial-from-100% required"/> <br />
                    <input type="submit" value={loading ? 'Analysing…' : 'Submit'} disabled={loading}
                        className="bg-blue-950 mx-auto text-gray-100 hover:bg-gray-900 rounded-2xl w-full max-w-xs h-12 text-lg transition-all disabled:opacity-60"/>
                </div>
            </form>

            <div className="fixed bottom-10 left-0 right-0 flex flex-col items-center gap-2 px-4">
                {status && <p className="text-sm md:text-base text-emerald-200 text-center max-w-3xl">{status}</p>}
                {flags.length > 0 && (
                    <p className="text-sm md:text-base text-amber-300 text-center max-w-3xl">
                        Flagged: {flags.join(', ')}
                    </p>
                )}
                <p className="text-lg md:text-2xl text-sky-400 border-b-4 border-blue-300 pb-4 m-auto text-center max-w-3xl">
                    {reply}
                </p>
            </div>
        </>
    )
}

export default SubmitLink;
