import React from "react";
import axios from "axios";
import { useState } from "react";

function Login(){
    
    

    function handleLogin(e){
        e.preventDefault()  
        let form = e.target
        let luname=form.uname.value
        let lpassword=form.password.value
        console.log(luname)

        


    }
    
    return (
        <>

            <form method="post" onSubmit={handleLogin} className="text-center">
                <label className="m-4">Email</label> : <input type="text" name="uname" required className="border-2 border-b-gray-950 rounded-xl m-4"/><br />
                <label>Password</label> : <input type="password" name="password" className="border-2 border-b-gray-950 rounded-xl" required /><br /><br />
                <input type="submit" value="Login" className="border-2 p-2 rounded-xl bg-gray-900 text-gray-100   border-2  p-3 rounded-2xl bg-mist-700 text-amber-50 hover:bg-gray-950"/>
            </form>
        </>
    )
}


export default Login