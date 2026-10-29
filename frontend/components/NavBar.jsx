import { Route, Router, Routes, Link } from "react-router-dom";
import { useContext } from "react";

function NavBar(){

    return(
    <>
    <nav m-0 p-0 className=" shadow-gray-900 fixed  w-full rounded-b-full shadow-2xl bg-gray-900 text-shadow-fuchsia-600">
        <div block>
        <span className="text-amber-50 block text-5xl pl-96 text-shadow-4xs">AI Chats Checker</span>
        {/* <Link to="/register" className=" border-2 p-3 rounded-2xl bg-mist-700 text-amber-50 hover:bg-gray-950" >WebSite Health Checker </Link> */}
        <span className="block text-center pr-96 text-emerald-200  rounded-br-full mask-r-from-0% bg-blue-950">We visit the website, so you don't deal with the mess on internet</span>
        {/* <Link to="/login" className="  border-2  p-3 rounded-2xl bg-mist-700 text-amber-50 hover:bg-gray-950" >Login</Link> */}
        </div>   
    </nav>
    </>
)

}
export default NavBar;
