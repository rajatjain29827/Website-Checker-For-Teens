import { Route, Router, Routes, Link } from "react-router-dom";
import { useContext } from "react";

function NavBar(){

    return(
    <>
    <nav className="shadow-gray-900 fixed w-full rounded-b-full shadow-2xl bg-gray-900 text-shadow-fuchsia-600 z-50">
        <div className="flex flex-col items-center justify-center py-4 px-4 text-center">
            <span className="text-amber-50 text-3xl md:text-5xl font-bold text-shadow-4xs">AI Chats Checker</span>
            <span className="block text-sm md:text-base text-emerald-200 mt-2 max-w-2xl">
                We visit the website, so you don't deal with the mess on the internet
            </span>
        </div>   
    </nav>
    </>
    )

}
export default NavBar;
