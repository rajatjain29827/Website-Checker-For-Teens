import React from "react";

function Register(){

    async function handleRegister(e){
        e.preventDefault() 

        async 


    }

    return(
    <>
        <form method="post" onSubmit={handleRegister} className="text-center">    
            <label> Username </label> : <input type="text" className="border-2 border-b-gray-950 rounded-xl"  required/><br /><br />
            <label> Password </label> : <input type="password" className="border-2 border-b-gray-950 rounded-xl" required/><br /><br />
            <label> Repeat Password </label> : <input type="password" className="border-2 border-b-gray-950 rounded-xl" required/><br /><br />
            <input type="submit" value="Submit" className="border-2 p-2 rounded-xl bg-gray-900 text-gray-100   border-2  p-3 rounded-2xl bg-mist-700 text-amber-50 hover:bg-gray-950" />
        </form>
    </>
    )
}

export default Register