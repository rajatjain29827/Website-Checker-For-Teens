import { useEffect, useState } from "react";
import axios from "axios";
import Login from "./Login";
import propsTypes from "prop-types"
import PropTypes from "prop-types";


function SubmitLink(){
    const [data, setData]=useState('')
    const [loading, setLoading]=useState(false)
    const [link1, setLink]=useState('')
    const [reply, setReply]=useState('')
    
    function separateLettersAndDigits(str) {
  return String(str)
    .replace(/(\d)/g, ' ');
}


    async function handleSubmit(e){
    
    e.preventDefault()
    console.log(`${link1}`)
    setLoading(true)
    
    
    console.log(`${link1}`)
    if(`${link1}`){
    try{
        
        
        console.log(`${typeof link1}`)
        
    const res=await axios.post('/api',{link : link1}, {timeout:300000})
    
    let data1=res.data
    data1=separateLettersAndDigits(data1)
    setData(data1)
    if(data1=='Do not visit this website')
        {setReply("!DANGER!! Stop visiting such websites. GET BACK TO STUDY. ")}
    else
        {
            setReply("Website is safe to visit")
        }
    console.log(`${data}`)
        
    }catch(err){
        
        console.log(err)
    }
    finally{
        console.log('finally')
        setLoading(false)
    }}else{
        setLoading(false)
    }
    }

    return(
        <>
        <form action="/api" method="post" onSubmit={handleSubmit} className="text-white h-full align-bottom grid flex-col gap-2 ">
            <label className="text-2xl text-blue-300 inline-block text-center"> Paste URL link here :</label><br />
            <input type="text" name="link" id="lnk" value={link1} onChange={(e)=>setLink(e.target.value)} className="w-xl mx-auto border-2 border-blue-950 rounded-2xl bg-blue-950 grid-cols-12 pl-2 mask-radial-from-100% required"/> <br />
            <input type="submit" value={loading ? 'Submitting…' : 'Submit'}
  className=" bg-blue-950 mx-auto text-gray-100 hover:bg-gray-900 rounded-2xl w-2xs h-10"/>
        </form> 
        
        <p className="text-2xl text-sky-400 border-be-8 text-blue-300 border-2 pb-16 m-auto mask-radial-from-blue-950 inline text-center justify-center-safe">{reply}</p>
        </>
    )
}

export default SubmitLink;